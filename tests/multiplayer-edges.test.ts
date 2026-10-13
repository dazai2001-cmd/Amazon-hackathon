import test from 'node:test';
import assert from 'node:assert/strict';
import { HumanDuel, readArenaInput, type ArenaInput } from '../shared/multiplayer';
import { ClanWars } from '../server/multiplayer';

const input = (seq: number, x = .1): ArenaInput => ({
  seq, tracked: true, tip: { x, y: .55 }, lean: 0, forward: 0,
  body: { tracked: true, forward: 0, crouch: 0 },
  pose: { hilt: { x: .3, y: -.4, z: -.7 }, elbow: { x: .15, y: -.5, z: -.6 }, axis: { x: 0, y: 1, z: 0 },
    shield: { x: -.3, y: -.4, z: -.7 }, shieldElbow: { x: -.15, y: -.5, z: -.6 },
    tip: { x, y: .55 }, shieldPoint: { x: .5, y: .3 }, guarding: false, depthSource: 'world' },
});
const liveDuel = () => {
  const duel = new HumanDuel({ id: 'a', name: 'Ada' }, { id: 'b', name: 'Ben' });
  let now = 10000, seq = 0;
  for (; seq < 70; seq++) { now += 50; duel.accept(0, input(seq), now); duel.accept(1, input(seq, .85), now); duel.step(.05, now); }
  assert.equal(duel.countdown, 0);
  return { duel, now, seq };
};

test('a tracking loss and return inside one server tick discard the queued sword stroke', () => {
  const { duel, now, seq } = liveDuel();
  duel.accept(0, input(seq, .55), now + 50);
  duel.accept(0, { ...input(seq + 1), tracked: false, pose: null }, now + 55);
  duel.accept(0, input(seq + 2, .8), now + 60);
  duel.accept(1, input(seq, .85), now + 60);
  duel.step(.05, now + 60);
  assert.equal(duel.fighters[1].health, 100);
  assert.equal(duel.fighters[0].cuts, 0);
});

test('pause and resume inside one tick discard attacks already in flight', () => {
  const { duel, now, seq } = liveDuel();
  duel.accept(0, input(seq, .55), now + 50);
  duel.pause(0, true); duel.pause(0, false);
  duel.accept(1, input(seq, .85), now + 50); duel.step(.05, now + 50);
  assert.equal(duel.fighters[1].health, 100);
  assert.equal(duel.fighters[0].cuts, 0);
});

test('reconnection resets sequences and both stroke histories before fresh inputs resume', () => {
  const { duel, now, seq } = liveDuel();
  duel.accept(1, input(seq, .45), now + 50);
  duel.reconnect(0);
  assert.equal(duel.accept(0, input(0, .7), now + 55), true);
  duel.step(.05, now + 55);
  assert.equal(duel.fighters[0].health, 100);
  assert.equal(duel.fighters[1].cuts, 0);
});

test('movement decoding strips nested client claims from the state sent to opponents', () => {
  const value = input(1);
  const decoded = readArenaInput({ ...value, tip: { ...value.tip, coins: 500 }, pose: { ...value.pose,
    hilt: { ...value.pose!.hilt, health: 0 }, tip: { ...value.pose!.tip, coins: 500 }, shieldPoint: { ...value.pose!.shieldPoint, winner: 'me' } } })!;
  assert.deepEqual(decoded, value);
  for (const value of [null, [], {}, 'pose', true, { ...input(1), seq: Number.MAX_SAFE_INTEGER + 1 },
    { ...input(1), body: null }, { ...input(1), pose: { ...input(1).pose, shield: null } }]) assert.equal(readArenaInput(value), null);
});

const warDriver = () => {
  let now = 10000;
  const output: { room: string; message: any }[] = [];
  const wars = new ClanWars((room, message) => output.push({ room, message }), () => now, false);
  const command = (room: string, data: object) => wars.command(room, { type: 'arena-command', ...data });
  const step = (ms: number) => { now += ms; wars.tick(now); };
  const create = (room: string, size = 1) => { command(room, { action: 'create', name: room + ' fighter', clan: 'Ash', size }); return wars.state(room).war!.code; };
  const join = (room: string, code: string, team = 1) => command(room, { action: 'join', name: room + ' fighter', clan: team ? 'Iron' : 'Ash', code, team });
  const start = (leader: string, rooms: string[]) => { for (const room of rooms) command(room, { action: 'ready', ready: true }); command(leader, { action: 'start' }); };
  return { wars, output, command, step, create, join, start };
};

test('expiring a previous war cannot evict a fighter from a newer war', () => {
  const d = warDriver(); try {
    const old = d.create('a'); d.join('b', old); d.start('a', ['a', 'b']);
    d.command('a', { action: 'leave' }); d.step(10000);
    const current = d.create('a'); d.join('c', current);
    d.step(3600001 - 10000);
    assert.equal(d.wars.state('a').war?.code, current);
    assert.equal(d.wars.state('c').war?.code, current);
    assert.equal(d.wars.state('b').war, null);
    assert.ok(d.output.some(o => o.room === 'b' && o.message.type === 'arena-state' && o.message.war === null), 'expired clients must leave their stale lobby/result screen');
  } finally { d.wars.close(); }
});

test('disconnecting a TV immediately freezes a pending strike for both fighters', () => {
  const d = warDriver(); try {
    const code = d.create('a'); d.join('b', code); d.start('a', ['a', 'b']);
    for (let seq = 0; seq < 70; seq++) { d.command('a', { action: 'input', input: input(seq) }); d.command('b', { action: 'input', input: input(seq, .85) }); d.step(50); }
    const elapsed = d.wars.state('b').match!.elapsed;
    d.command('a', { action: 'input', input: input(70, .55) });
    d.wars.connected('a', false); d.step(33);
    const match = d.wars.state('b').match!;
    assert.equal(match.phase, 'held'); assert.equal(match.elapsed, elapsed); assert.equal(match.self.health, 100);
    d.wars.connected('a', true); d.command('a', { action: 'input', input: input(0, .75) }); d.command('b', { action: 'input', input: input(71, .85) }); d.step(50);
    assert.equal(d.wars.state('b').match!.self.health, 100);
  } finally { d.wars.close(); }
});

test('three simultaneous clan pairings score independently and a tied war completes once', () => {
  const d = warDriver(); try {
    const code = d.create('a', 3);
    d.join('b', code); d.join('c', code, 0); d.join('d', code); d.join('e', code, 0); d.join('f', code);
    d.start('a', ['a', 'b', 'c', 'd', 'e', 'f']);
    assert.equal(d.wars.state('e').match!.peer.name, 'f fighter');
    d.command('b', { action: 'leave' }); d.command('c', { action: 'leave' }); d.step(50);
    assert.deepEqual(d.wars.state('a').war!.score, [1, 1]); assert.equal(d.wars.state('a').war!.phase, 'fighting');
    d.step(30001);
    const complete = d.wars.state('a').war!;
    assert.equal(complete.phase, 'complete'); assert.equal(complete.winner, 'draw'); assert.deepEqual(complete.score, [1.5, 1.5]);
    for (let i = 0; i < 10; i++) { d.command('a', { action: 'input', input: input(i) }); d.command('d', { action: 'pause', paused: true }); d.step(50); }
    assert.deepEqual(d.wars.state('d').war!.score, [1.5, 1.5]);
  } finally { d.wars.close(); }
});
