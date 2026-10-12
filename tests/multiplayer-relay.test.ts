import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { WebSocket } from 'ws';
import { SessionRelay } from '../server/relay';
import { ClanWars } from '../server/multiplayer';
import type { ArenaInput } from '../shared/multiplayer';

test('two authenticated TV clients share one human duel and clan result over the real relay', async context => {
  const server = http.createServer(), relay = new SessionRelay('http://localhost');
  const wars = new ClanWars((room, message) => relay.sendToTV(room, message)); relay.onTVMessage = (room, message) => wars.command(room, message); relay.onTVPresence = (room, state) => wars.connected(room, state);
  relay.attach(server); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const host = `127.0.0.1:${(server.address() as { port: number }).port}`, clients: WebSocket[] = []; let interval: ReturnType<typeof setInterval> | null = null;
  context.after(async () => { if (interval) clearInterval(interval); clients.forEach(ws => ws.terminate()); wars.close(); relay.close(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const connect = async () => {
    const session = relay.create(), ws = new WebSocket(`ws://${host}/relay?${new URLSearchParams({ role: 'tv', code: session.code, token: session.tvToken })}`, { origin: `http://${host}` }); clients.push(ws);
    const messages: any[] = []; ws.on('message', raw => messages.push(JSON.parse(raw.toString()))); await once(ws, 'open');
    const until = async (predicate: (m: any) => boolean) => {
      const found = messages.find(predicate); if (found) return found;
      return new Promise<any>((resolve, reject) => { const timer = setTimeout(() => { ws.off('message', listener); reject(new Error('Multiplayer relay timeout')); }, 7000);
        const listener = (raw: Buffer) => { const value = JSON.parse(raw.toString()); if (predicate(value)) { clearTimeout(timer); ws.off('message', listener); resolve(value); } }; ws.on('message', listener); });
    };
    return { ws, messages, until, send: (data: object) => ws.send(JSON.stringify({ type: 'arena-command', ...data })) };
  };
  const a = await connect(), b = await connect();
  a.send({ action: 'create', name: 'Ada', clan: 'Ashen Guard', size: 1 }); const lobby = await a.until(m => m.type === 'arena-state' && m.war?.phase === 'lobby');
  b.send({ action: 'join', code: lobby.war.code, name: 'Ben', clan: 'Iron Hawks', team: 1 }); await a.until(m => m.type === 'arena-state' && m.war?.members.length === 2);
  a.send({ action: 'ready', ready: true }); b.send({ action: 'ready', ready: true }); await a.until(m => m.type === 'arena-state' && m.war?.members.every((p: any) => p.ready));
  a.send({ action: 'start' });
  const control = (seq: number, x: number): ArenaInput => ({ seq, tracked: true, tip: { x, y: .55 }, lean: 0, body: { tracked: true, forward: 0, crouch: 0 }, forward: 0, pose: {
    hilt: { x: .3, y: -.4, z: -.7 }, axis: { x: 0, y: 1, z: 0 }, elbow: { x: .15, y: -.5, z: -.6 }, shield: { x: -.3, y: -.4, z: -.7 }, shieldElbow: { x: -.15, y: -.5, z: -.6 }, shieldPoint: { x: .1, y: .9 }, tip: { x, y: .55 }, guarding: false, depthSource: 'world',
  } });
  let seqA = 0, seqB = 0, x = .1;
  interval = setInterval(() => { a.send({ action: 'input', input: control(seqA++, x) }); b.send({ action: 'input', input: control(seqB++, .85) }); }, 50);
  await a.until(m => m.type === 'arena-state' && m.match?.phase === 'fighting');
  x = .25; await delay(65); x = .55;
  const hit = await a.until(m => m.type === 'arena-state' && m.match?.peer.health < 100), reflected = await b.until(m => m.type === 'arena-state' && m.match?.self.health < 100);
  assert.equal(hit.match.peer.health, reflected.match.self.health); assert.equal(hit.match.self.health, 100);
  b.send({ action: 'win', health: 0, winner: 'Ben', coins: 10000 }); await b.until(m => m.type === 'arena-error');
  b.send({ action: 'leave' }); const result = await a.until(m => m.type === 'arena-state' && m.war?.phase === 'complete');
  assert.deepEqual(result.war.score, [1, 0]); assert.equal(result.war.winner, 0); assert.equal(result.match.winner, result.me);
});
