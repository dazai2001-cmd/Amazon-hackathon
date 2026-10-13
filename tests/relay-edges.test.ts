import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { SessionRelay } from '../server/relay';
import { syntheticPose } from '../shared/motion';

async function harness(context: TestContext) {
  const server = http.createServer(), relay = new SessionRelay('http://localhost');
  relay.attach(server); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const session = relay.create(), clients: WebSocket[] = [];
  context.after(async () => { clients.forEach(client => client.terminate()); relay.close(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const host = '127.0.0.1:' + (server.address() as { port: number }).port;
  const connect = async (role: 'tv' | 'phone') => {
    const ws = new WebSocket('ws://' + host + '/relay?' + new URLSearchParams({ role, code: session.code, token: role === 'tv' ? session.tvToken : session.phoneToken }));
    clients.push(ws); ws.on('error', () => {});
    const messages: any[] = []; ws.on('message', raw => messages.push(JSON.parse(raw.toString())));
    await once(ws, 'open');
    const until = (predicate: (value: any) => boolean, after = 0) => {
      const found = messages.slice(after).find(predicate); if (found) return Promise.resolve(found);
      return new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => { ws.off('message', listener); reject(new Error('Edge relay message timeout')); }, 2000);
        const listener = (raw: Buffer) => { const value = JSON.parse(raw.toString()); if (predicate(value)) { clearTimeout(timer); ws.off('message', listener); resolve(value); } };
        ws.on('message', listener);
      });
    };
    return { ws, messages, until };
  };
  return { relay, session, connect };
}
const packet = (seq = 0) => ({ type: 'pose', seq, t: 1000, fps: 20, landmarks: syntheticPose() });

test('malformed JSON and invalid poses leave the relay alive without reaching the TV', async context => {
  const { connect } = await harness(context), tv = await connect('tv'), phone = await connect('phone');
  const bad = [null, [], 'movement', {}, { ...packet(), seq: -1 }, { ...packet(), seq: 1.5 },
    { ...packet(), landmarks: [null] }, { ...packet(), landmarks: syntheticPose().map(p => ({ ...p, visibility: 2 })) },
    { ...packet(), imageAspect: 0 }, { ...packet(), tracking: null }, { ...packet(), worldLandmarks: syntheticPose().slice(1) }];
  phone.ws.send('{broken'); for (const value of bad) phone.ws.send(JSON.stringify(value));
  phone.ws.send(JSON.stringify(packet()));
  await tv.until(m => m.type === 'pose');
  phone.ws.send(JSON.stringify({ type: 'ping', t: 42 })); await phone.until(m => m.type === 'pong' && m.t === 42);
  assert.equal(tv.messages.filter(m => m.type === 'pose').length, 1);
  assert.equal(phone.messages.filter(m => m.type === 'error').length, bad.length + 1);
});

test('message floods disconnect only the offending controller and allow a fresh phone', async context => {
  const { relay, session, connect } = await harness(context), tv = await connect('tv'), phone = await connect('phone');
  await tv.until(m => m.type === 'presence' && m.phoneConnected);
  const mark = tv.messages.length, closed = once(phone.ws, 'close');
  for (let i = 0; i < 46; i++) phone.ws.send(JSON.stringify({ type: 'ping', t: i }));
  assert.equal((await closed)[0], 4408);
  await tv.until(m => m.type === 'presence' && !m.phoneConnected, mark);
  assert.ok(relay.join(session.code));
  tv.ws.send(JSON.stringify({ type: 'ping', t: 99 })); await tv.until(m => m.type === 'pong' && m.t === 99);
  const replacement = await connect('phone'); replacement.ws.send(JSON.stringify(packet()));
  await tv.until(m => m.type === 'pose' && m.seq === 0);
});

test('oversized WebSocket packets cannot crash the room or strand its phone slot', async context => {
  const { relay, session, connect } = await harness(context), tv = await connect('tv'), phone = await connect('phone');
  await tv.until(m => m.type === 'presence' && m.phoneConnected);
  const mark = tv.messages.length, closed = once(phone.ws, 'close'); phone.ws.send('x'.repeat(17000));
  assert.equal((await closed)[0], 1009);
  await tv.until(m => m.type === 'presence' && !m.phoneConnected, mark);
  assert.ok(relay.join(session.code));
  tv.ws.send(JSON.stringify({ type: 'ping', t: 100 })); await tv.until(m => m.type === 'pong' && m.t === 100);
});

test('replacing a TV preserves phone presence and a reconnected phone can restart its sequence', async context => {
  const { relay, connect } = await harness(context), presence: boolean[] = [];
  relay.onTVPresence = (_room, connected) => presence.push(connected);
  const oldTV = await connect('tv'), phone = await connect('phone');
  phone.ws.send(JSON.stringify(packet(50))); await oldTV.until(m => m.type === 'pose' && m.seq === 50);
  const closed = once(oldTV.ws, 'close'), tv = await connect('tv'); assert.equal((await closed)[0], 4001);
  await tv.until(m => m.type === 'connected' && m.phoneConnected);
  phone.ws.send(JSON.stringify(packet(51))); await tv.until(m => m.type === 'pose' && m.seq === 51);
  assert.deepEqual(presence, [true, true]);
  const mark = tv.messages.length; phone.ws.close(); await tv.until(m => m.type === 'presence' && !m.phoneConnected, mark);
  const newPhone = await connect('phone'); newPhone.ws.send(JSON.stringify(packet()));
  await tv.until(m => m.type === 'pose' && m.seq === 0);
  assert.deepEqual(tv.messages.filter(m => m.type === 'pose').map(m => m.seq), [51, 0]);
});
