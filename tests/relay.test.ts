import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { SessionRelay } from '../server/relay';
import { syntheticPose } from '../shared/motion';

test('relay enforces tokens, origins, device roles, sequence order, and one phone per room', async context => {
  const server = http.createServer(), relay = new SessionRelay('http://localhost', 60000);
  relay.attach(server); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address() as { port: number }, host = '127.0.0.1:' + address.port;
  const session = relay.create(), clients: WebSocket[] = [];
  context.after(async () => { clients.forEach(client => client.terminate()); relay.close(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const link = (role: string, token: string) => 'ws://' + host + '/relay?' + new URLSearchParams({ role, token, code: session.code });
  const rejected = async (url: string, origin?: string) => {
    const ws = new WebSocket(url, origin ? { origin } : undefined); clients.push(ws);
    ws.on('error', () => {});
    const [, response] = await once(ws, 'unexpected-response'); assert.equal(response.statusCode, 403); ws.terminate();
  };
  await rejected(link('tv', 'x'.repeat(48)));
  await rejected(link('tv', 'é'.repeat(48)));
  await rejected(link('tv', session.tvToken), 'https://different.example');
  const connect = async (role: 'tv' | 'phone') => {
    const ws = new WebSocket(link(role, role === 'tv' ? session.tvToken : session.phoneToken), { origin: 'http://' + host }); clients.push(ws);
    const messages: any[] = []; ws.on('message', raw => messages.push(JSON.parse(raw.toString())));
    await once(ws, 'open');
    const until = async (predicate: (m: any) => boolean) => {
      const found = messages.find(predicate); if (found) return found;
      return new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => { ws.off('message', listener); reject(new Error('Relay message timeout')); }, 2000);
        const listener = (raw: Buffer) => { const value = JSON.parse(raw.toString()); if (predicate(value)) { clearTimeout(timer); ws.off('message', listener); resolve(value); } };
        ws.on('message', listener);
      });
    };
    return { ws, messages, until };
  };
  const tv = await connect('tv'), phone = await connect('phone');
  await tv.until(m => m.type === 'presence' && m.phoneConnected);
  assert.deepEqual(relay.join(session.code), { busy: true });
  const other = new WebSocket(link('phone', session.phoneToken)); clients.push(other); other.on('error', () => {});
  const [closeCode] = await once(other, 'close'); assert.equal(closeCode, 4409);
  const pose = { type: 'pose', seq: 0, t: 100, landmarks: syntheticPose(), worldLandmarks: syntheticPose(), imageAspect: 16 / 9, tracking: { model: 'full', delegate: 'GPU', inferenceMs: 20 }, fps: 18 };
  phone.ws.send(JSON.stringify(pose)); phone.ws.send(JSON.stringify(pose)); phone.ws.send(JSON.stringify({ ...pose, seq: 1 }));
  await tv.until(m => m.type === 'pose' && m.seq === 1);
  assert.deepEqual(tv.messages.filter(m => m.type === 'pose').map(m => m.seq), [0, 1]);
  assert.deepEqual(tv.messages.find(m => m.type === 'pose').worldLandmarks, pose.worldLandmarks);
  assert.equal(tv.messages.find(m => m.type === 'pose').imageAspect, pose.imageAspect);
  tv.ws.send(JSON.stringify({ type: 'pose-ack', seq: 1, t: 100, injected: 'not forwarded' }));
  const ack = await phone.until(m => m.type === 'pose-ack');
  assert.deepEqual(ack, { type: 'pose-ack', seq: 1, t: 100 });
  phone.ws.send(JSON.stringify({ type: 'pose-ack', seq: 1, t: 100 }));
  await phone.until(m => m.type === 'error' && m.message.includes('Unsupported'));
  tv.ws.send(JSON.stringify(pose)); await tv.until(m => m.type === 'error' && m.message.includes('Unsupported'));
  tv.ws.send(JSON.stringify({ type: 'command', action: 'activity', value: 'play' }));
  await phone.until(m => m.type === 'command' && m.value === 'play');
  tv.ws.send(JSON.stringify({ type: 'command', action: 'exercise', value: 'pushup:floor' }));
  await phone.until(m => m.type === 'command' && m.action === 'exercise' && m.value === 'pushup:floor');
  phone.ws.close(); await tv.until(m => m.type === 'presence' && !m.phoneConnected);
  assert.ok(relay.join(session.code));
});

test('expired rooms cannot be joined', () => {
  const relay = new SessionRelay('http://localhost', -1);
  try { const session = relay.create(); assert.equal(relay.join(session.code), null); relay.expire(); assert.equal(relay.rooms.size, 0); }
  finally { relay.close(); }
});
