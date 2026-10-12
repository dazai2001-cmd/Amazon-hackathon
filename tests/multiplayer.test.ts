import test from 'node:test';
import assert from 'node:assert/strict';
import { HumanDuel, readArenaInput, type ArenaInput } from '../shared/multiplayer';
import { ClanWars } from '../server/multiplayer';
import { lanePoint, type AttackLane, type WeaponPose } from '../shared/weapons';

const pose = (tip = { x: .5, y: .55 }, guarding = false, lane: AttackLane = 'high'): WeaponPose => ({ hilt: { x: .3, y: -.4, z: -.7 }, elbow: { x: .15, y: -.5, z: -.6 }, axis: { x: 0, y: 1, z: 0 }, shield: { x: -.3, y: -.4, z: -.7 }, shieldElbow: { x: -.15, y: -.5, z: -.6 }, shieldPoint: lanePoint(lane), tip, guarding, depthSource: 'world' });
const input = (seq: number, tip = { x: .5, y: .55 }, guarding = false, lane: AttackLane = 'high'): ArenaInput => ({ seq, tip, pose: pose(tip, guarding, lane), tracked: true, lean: 0, body: { tracked: true, forward: 0, crouch: 0 }, forward: 0 });
class DuelDriver {
  duel = new HumanDuel({ id: 'a', name: 'Ada' }, { id: 'b', name: 'Ben' }); time = 10000; seq = [0, 0];
  left = { x: .1, y: .55 }; right = { x: .85, y: .55 };
  frame(a = input(this.seq[0], this.left), b = input(this.seq[1], this.right)) { this.time += 50; a.seq = this.seq[0]++; b.seq = this.seq[1]++; this.duel.accept(0, a, this.time); this.duel.accept(1, b, this.time); this.duel.step(.05, this.time); }
  ready() { for (let i = 0; i < 70; i++) this.frame(); assert.equal(this.duel.countdown, 0); }
  cutA(block = false) { this.frame(input(0, this.left), input(0, this.right, block, 'left')); this.frame(input(0, { x: .25, y: .55 }), input(0, this.right, block, 'left')); this.frame(input(0, { x: .55, y: .55 }), input(0, this.right, block, 'left')); }
  rest(frames = 25) { for (let i = 0; i < frames; i++) this.frame(); }
}

test('multiplayer validates bounded control data and ignores claimed health or rewards', () => {
  const valid = input(1); assert.ok(readArenaInput(valid));
  const decoded = readArenaInput({ ...valid, damage: 10000, coins: 10000, health: 0 })!;
  assert.equal('damage' in decoded, false); assert.equal('health' in decoded, false);
  for (const value of [{ ...valid, lean: NaN }, { ...valid, forward: 2 }, { ...valid, seq: -1 }, { ...valid, pose: { ...valid.pose, axis: { x: 5, y: 0, z: 0 } } }, { ...valid, tip: { x: Infinity, y: 0 } }]) assert.equal(readArenaInput(value), null);
  assert.equal(readArenaInput({ ...valid, pose: null })!.tracked, false);
});
test('two fresh humans start together; no AI deals damage while stationary', () => {
  const d = new DuelDriver(); d.ready(); d.rest(400);
  assert.equal(d.duel.fighters[0].health, 100); assert.equal(d.duel.fighters[1].health, 100); assert.equal(d.duel.fighters[0].cuts, 0);
});
test('a player sword sweep damages the other player and stamina limits spam', () => {
  const d = new DuelDriver(); d.ready(); d.cutA(); const hp = d.duel.fighters[1].health;
  assert.ok(hp < 100 && hp > 75); assert.equal(d.duel.fighters[0].health, 100);
  d.cutA(); assert.equal(d.duel.fighters[1].health, hp);
  d.duel.fighters[0].stamina = .01; d.cutA(); assert.equal(d.duel.fighters[1].health, hp);
});
test('the opposite player can block the mirrored incoming line and earn a timed parry', () => {
  const held = new DuelDriver(); held.ready(); for (let i = 0; i < 12; i++) held.frame(input(0, held.left), input(0, held.right, true, 'left')); held.cutA(true);
  assert.equal(held.duel.fighters[1].health, 100); assert.equal(held.duel.fighters[1].blocks, 1); assert.equal(held.duel.fighters[1].perfectBlocks, 0);
  const timed = new DuelDriver(); timed.ready(); timed.cutA(true);
  assert.equal(timed.duel.fighters[1].perfectBlocks, 1); assert.equal(timed.duel.fighters[1].health, 100);
});
test('missing input and manual pause freeze both players and discard replayed cuts', () => {
  const d = new DuelDriver(); d.ready(); const elapsed = d.duel.elapsed;
  d.time += 600; d.duel.step(.05, d.time); assert.equal(d.duel.held, true); assert.equal(d.duel.elapsed, elapsed);
  d.frame(input(0, { x: .65, y: .55 }), input(0)); assert.equal(d.duel.fighters[1].health, 100);
  d.duel.pause(0, true); d.rest(30); assert.equal(d.duel.elapsed, elapsed + .05);
  assert.equal(d.duel.accept(0, input(0), d.time), false);
  d.duel.pause(0, false); d.frame(); assert.equal(d.duel.fighters[1].health, 100);
  assert.equal(d.duel.view(0).phase, 'fighting');
  assert.match(d.duel.feedback, /Controllers ready/);
});
test('footwork changes sword reach and cannot pass through the human opponent', () => {
  const d = new DuelDriver(); d.ready();
  for (let i = 0; i < 80; i++) { const a = input(0, d.left); a.forward = -1; d.frame(a); }
  assert.ok(d.duel.view(0).distance > 2.35); d.cutA(); assert.equal(d.duel.fighters[1].health, 100);
  for (let i = 0; i < 200; i++) { const a = input(0, d.left); a.forward = 1; d.frame(a); }
  assert.ok(d.duel.view(0).distance >= 1.29);
});
test('health reaches a real winner once; forfeit cannot override a completed duel', () => {
  const d = new DuelDriver(); d.ready();
  for (let i = 0; i < 20 && !d.duel.winner; i++) { d.cutA(); d.rest(25); }
  assert.equal(d.duel.winner, 'a'); assert.equal(d.duel.fighters[1].health, 0);
  assert.equal(d.duel.fighters[0].damageDealt, 100); assert.equal(d.duel.fighters[1].damageTaken, 100);
  d.duel.forfeit(0); assert.equal(d.duel.winner, 'a');
});
test('the later segment of a human stroke can hit, but its return cannot deal a second hit', () => {
  const d = new DuelDriver(); d.ready(); d.cutA(); const damage = d.duel.fighters[1].damageTaken;
  assert.ok(damage > 0); assert.equal(d.duel.fighters[0].cuts, 1);
  d.frame(input(0, { x: .2, y: .55 }), input(0)); assert.equal(d.duel.fighters[1].damageTaken, damage);
});
test('both humans can land a simultaneous final strike and share a draw', () => {
  const d = new DuelDriver(); d.ready(); d.duel.fighters[0].health = 10; d.duel.fighters[1].health = 10;
  d.frame(input(0, { x: .25, y: .55 }), input(0, { x: .75, y: .55 }));
  d.frame(input(0, { x: .55, y: .55 }), input(0, { x: .45, y: .55 }));
  assert.equal(d.duel.winner, 'draw'); assert.equal(d.duel.fighters[0].health, 0); assert.equal(d.duel.fighters[1].health, 0);
});
test('crouching moves the human target away from a high stroke', () => {
  const d = new DuelDriver(); d.ready(); const duck = input(0); duck.body.crouch = 1;
  d.frame(input(0, { x: .15, y: .3 }), duck); d.rest(20);
  for (const x of [.25, .55]) { const b = input(0); b.body.crouch = 1; d.frame(input(0, { x, y: .3 }), b); }
  assert.equal(d.duel.fighters[1].health, 100);
});

const warDriver = () => {
  let now = 10000; const output: { room: string; message: any }[] = [];
  const wars = new ClanWars((room, message) => output.push({ room, message }), () => now, false);
  const command = (room: string, data: object) => wars.command(room, { type: 'arena-command', ...data });
  const step = (ms: number) => { now += ms; wars.tick(now); };
  return { wars, output, command, step };
};
test('clan rosters require equal size and ready humans; only the captain can start', () => {
  const d = warDriver(); try {
    d.command('a', { action: 'create', name: 'Ada', clan: 'Ashen Guard', size: 2 }); const code = d.wars.state('a').war!.code;
    d.command('b', { action: 'join', code, name: 'Ben', clan: 'Iron Hawks', team: 1 });
    d.command('a', { action: 'start' }); assert.equal(d.wars.state('a').war!.phase, 'lobby');
    d.command('c', { action: 'join', code, name: 'Cora', clan: 'Ashen Guard', team: 0 }); d.command('d', { action: 'join', code, name: 'Dara', clan: 'Iron Hawks', team: 1 });
    for (const room of ['a', 'b', 'c', 'd']) d.command(room, { action: 'ready', ready: true });
    d.command('b', { action: 'start' }); assert.equal(d.wars.state('a').war!.phase, 'lobby');
    d.command('a', { action: 'start' }); assert.equal(d.wars.state('a').war!.phase, 'fighting');
    assert.equal(d.wars.state('a').match!.peer.name, 'Ben'); assert.equal(d.wars.state('c').match!.peer.name, 'Dara');
    assert.equal(JSON.stringify(d.wars.state('a')).includes('"room"'), false);
  } finally { d.wars.close(); }
});
test('full clans, invalid invites, oversized names and claimed winners are rejected', () => {
  const d = warDriver(); try {
    d.command('a', { action: 'create', name: 'Ada', clan: 'Ash', size: 1 }); const code = d.wars.state('a').war!.code;
    d.command('b', { action: 'join', code, name: 'Ben', clan: 'Iron', team: 0 }); assert.equal(d.wars.state('b').war, null);
    d.command('b', { action: 'join', code: 'AAAAAA', name: 'Ben', clan: 'Iron', team: 1 }); assert.equal(d.wars.state('b').war, null);
    d.command('b', { action: 'create', name: '<script>', clan: 'Iron', size: 1 }); assert.equal(d.wars.state('b').war, null);
    d.command('b', { action: 'win', winner: 'b' }); assert.deepEqual(d.wars.state('a').war!.score, [0, 0]);
  } finally { d.wars.close(); }
});
test('paired duel results contribute once to clan score and wait for remaining clanmates', () => {
  const d = warDriver(); try {
    d.command('a', { action: 'create', name: 'Ada', clan: 'Ash', size: 2 }); const code = d.wars.state('a').war!.code;
    d.command('b', { action: 'join', code, name: 'Ben', clan: 'Iron', team: 1 }); d.command('c', { action: 'join', code, name: 'Cora', clan: 'Ash', team: 0 }); d.command('e', { action: 'join', code, name: 'Edda', clan: 'Iron', team: 1 });
    for (const room of ['a', 'b', 'c', 'e']) d.command(room, { action: 'ready', ready: true }); d.command('a', { action: 'start' });
    d.command('b', { action: 'leave' }); d.step(50); assert.deepEqual(d.wars.state('a').war!.score, [1, 0]); assert.equal(d.wars.state('a').war!.phase, 'fighting');
    d.command('e', { action: 'leave' }); d.step(50); assert.deepEqual(d.wars.state('a').war!.score, [2, 0]); assert.equal(d.wars.state('a').war!.winner, 0);
    d.step(500); assert.deepEqual(d.wars.state('a').war!.score, [2, 0]);
  } finally { d.wars.close(); }
});
test('controller loss gives a grace period then a server-declared forfeit or draw', () => {
  const d = warDriver(); try {
    d.command('a', { action: 'create', name: 'Ada', clan: 'Ash', size: 1 }); const code = d.wars.state('a').war!.code;
    d.command('b', { action: 'join', code, name: 'Ben', clan: 'Iron', team: 1 }); for (const room of ['a', 'b']) d.command(room, { action: 'ready', ready: true }); d.command('a', { action: 'start' });
    d.step(50); assert.equal(d.wars.state('a').match!.phase, 'held'); d.step(29900); assert.equal(d.wars.state('a').war!.phase, 'fighting'); d.step(200);
    assert.equal(d.wars.state('a').war!.winner, 'draw'); assert.deepEqual(d.wars.state('a').war!.score, [.5, .5]);
  } finally { d.wars.close(); }
});
test('a replacement host-clan fighter can captain after the original captain leaves the lobby', () => {
  const d = warDriver(); try {
    d.command('a', { action: 'create', name: 'Ada', clan: 'Ash', size: 1 }); const code = d.wars.state('a').war!.code;
    d.command('b', { action: 'join', code, name: 'Ben', clan: 'Iron', team: 1 }); d.command('a', { action: 'leave' }); d.command('c', { action: 'join', code, name: 'Cora', clan: 'Ash', team: 0 });
    assert.equal(d.wars.state('c').war!.leader, d.wars.state('c').me);
  } finally { d.wars.close(); }
});
test('in-flight inputs after victory do not create an error or another clan point', () => {
  const d = warDriver(); try {
    d.command('a', { action: 'create', name: 'Ada', clan: 'Ash', size: 1 }); const code = d.wars.state('a').war!.code;
    d.command('b', { action: 'join', code, name: 'Ben', clan: 'Iron', team: 1 }); for (const room of ['a', 'b']) d.command(room, { action: 'ready', ready: true }); d.command('a', { action: 'start' });
    d.command('b', { action: 'leave' }); d.step(50);
    const errors = d.output.filter(o => o.message.type === 'arena-error').length;
    d.command('a', { action: 'input', input: input(1) }); d.command('a', { action: 'pause', paused: true }); d.step(50);
    assert.equal(d.output.filter(o => o.message.type === 'arena-error').length, errors); assert.deepEqual(d.wars.state('a').war!.score, [1, 0]);
  } finally { d.wars.close(); }
});
