import test from 'node:test';
import assert from 'node:assert/strict';
import { SwordDuel, buyChapterGear, claimChapterReward, newChapterSave, readChapterSave } from '../shared/duel';
import { poseWithBlade, type BladeInput } from '../shared/game';
import { DEFAULT_PROFILE, syntheticPose } from '../shared/motion';
import { lanePoint, weaponPose, type AttackLane } from '../shared/weapons';
const rest: BladeInput = { tracked: true, blade: { x: .75, y: .55 }, shield: false, lean: 0, sequence: 1, slash: null };
const cut = (sequence: number): BladeInput => ({ ...rest, sequence, slash: { from: { x: .78, y: .5 }, to: { x: .22, y: .58 }, speed: 2.5 } });
const guard = (lane: AttackLane, sequence = 1): BladeInput => ({ ...rest, sequence, shield: true, pose: weaponPose(poseWithBlade(syntheticPose(), rest.blade, true, DEFAULT_PROFILE, lanePoint(lane)), DEFAULT_PROFILE) });
function advanceUntil(game: SwordDuel, phase: string, input = rest) {
  for (let i = 0; i < 1000 && game.state.phase !== phase && !game.state.finished; i++) game.step(1 / 60, input);
  assert.equal(game.state.phase, phase);
}
function counter(game: SwordDuel, sequence: number) {
  advanceUntil(game, 'strike', { ...rest, sequence }); advanceUntil(game, 'recover', guard(game.state.attackLane, sequence)); game.step(1 / 60, cut(sequence + 1));
}
test('health needs more than three strikes; timed directional guards and counters win', () => {
  const game = new SwordDuel(); game.start(); for (let i = 0; i < 3; i++) counter(game, i * 10 + 2);
  assert.ok(game.state.rivalHealth > 0); assert.equal(game.state.finished, false);
  for (let i = 3; i < 15 && !game.state.finished; i++) counter(game, i * 10 + 2);
  assert.equal(game.state.rivalHealth, 0); assert.equal(game.state.won, true); assert.equal(game.state.health, 100); assert.ok(game.state.playerHits >= 4); assert.equal(game.state.damageDealt, 100); assert.equal(game.state.perfectBlocks, game.state.blocks);
});
test('undefended strikes remove bounded health until the player yields', () => {
  const game = new SwordDuel(); game.start(); for (let i = 0; i < 3000 && !game.state.finished; i++) game.step(1 / 60, rest);
  assert.equal(game.state.health, 0); assert.equal(game.state.won, false); assert.equal(game.state.damageTaken, 100); assert.ok(game.state.rivalHits > 3);
});
test('a covered line is parried; changing cut direction can beat the guard', () => {
  const blocked = new SwordDuel(); blocked.start(); blocked.step(1 / 60, cut(2)); assert.equal(blocked.state.rivalHealth, 100); assert.equal(blocked.state.event?.kind, 'parry'); assert.ok(blocked.state.stamina < .85);
  const flank = new SwordDuel(); flank.start(); flank.step(1 / 60, { ...cut(2), slash: { from: { x: .22, y: .5 }, to: { x: .78, y: .58 }, speed: 2.5 } }); assert.ok(flank.state.rivalHealth < 100);
});
test('a stationary or off-target wrist cannot damage the rival', () => {
  const game = new SwordDuel(); game.start(); advanceUntil(game, 'recover'); game.step(1 / 60, { ...rest, sequence: 2 }); game.step(1 / 60, { ...cut(3), slash: { from: { x: .9, y: .2 }, to: { x: .95, y: .2 }, speed: 1 } }); assert.equal(game.state.rivalHealth, 100);
});
test('replaying a camera packet cannot deal damage again in a later opening', () => {
  const game = new SwordDuel(); game.start(); advanceUntil(game, 'recover'); const input = cut(2); game.step(1 / 60, input); const health = game.state.rivalHealth; advanceUntil(game, 'recover', input); game.step(1 / 60, input); assert.equal(game.state.rivalHealth, health); assert.equal(game.state.cuts, 1);
});
test('a multi-packet sweep can enter the hit area after its leading segment', () => {
  const game = new SwordDuel(); game.start(); advanceUntil(game, 'recover'); game.step(.05, { ...cut(2), slash: { from: { x: .84, y: .53 }, to: { x: .76, y: .53 }, speed: 1.6 } }); assert.equal(game.state.rivalHealth, 100); assert.equal(game.state.cuts, 1); game.step(.05, { ...cut(3), slash: { from: { x: .76, y: .53 }, to: { x: .58, y: .53 }, speed: 2.6 } }); assert.ok(game.state.rivalHealth < 100); assert.equal(game.state.cuts, 1);
});
test('tracking loss freezes health, movement and exchange and discards stale cuts', () => {
  const game = new SwordDuel(); game.start(); advanceUntil(game, 'recover'); const before = [game.state.elapsed, game.state.phaseTime, game.state.stamina, game.state.health, game.state.playerZ]; for (let i = 0; i < 120; i++) game.step(1 / 30, { ...rest, tracked: false }, 1); assert.deepEqual([game.state.elapsed, game.state.phaseTime, game.state.stamina, game.state.health, game.state.playerZ], before); const input = cut(3); game.suspend(input); game.step(1 / 60, input); assert.equal(game.state.rivalHealth, 100); assert.equal(game.state.cuts, 0);
});
test('an exhausted guard cannot block or create a cut', () => {
  const game = new SwordDuel(); game.start(); advanceUntil(game, 'strike'); game.state.stamina = 0; for (let i = 0; i < 10; i++) game.step(1 / 60, { ...cut(2), shield: true }); assert.equal(game.state.blocks, 0); assert.equal(game.state.health, 84); assert.equal(game.state.cuts, 0);
});
test('covering high cannot stop a left-side strike', () => {
  const game = new SwordDuel(); game.start(); advanceUntil(game, 'recover'); advanceUntil(game, 'windup'); assert.equal(game.state.attackLane, 'left'); const health = game.state.health; advanceUntil(game, 'recover', guard('high')); assert.equal(game.state.health, health - 12); assert.equal(game.state.blocks, 0);
});
test('late coverage earns a perfect guard and stronger riposte than holding the shield', () => {
  const late = new SwordDuel(); late.start(); counter(late, 2); const held = new SwordDuel(); held.start(); advanceUntil(held, 'recover', guard('high')); held.step(1 / 60, cut(3)); assert.equal(late.state.perfectBlocks, 1); assert.equal(held.state.perfectBlocks, 0); assert.equal(held.state.blocks, 1); assert.ok(late.state.damageDealt > held.state.damageDealt); const stamina = held.state.stamina; held.step(.05, rest); assert.ok(held.state.stamina > stamina);
});
test('late evasion costs stamina, while a held lean can be retargeted', () => {
  const late = new SwordDuel(); late.start(); advanceUntil(late, 'strike'); const stamina = late.state.stamina; advanceUntil(late, 'recover', { ...rest, lean: -.8 }); assert.equal(late.state.dodges, 1); assert.equal(late.state.health, 100); assert.ok(late.state.stamina < stamina); const held = new SwordDuel(); held.start(); for (let i = 0; i < 3000 && !held.state.finished; i++) held.step(1 / 60, { ...rest, lean: 1 }); assert.equal(held.state.dodges, 0); assert.equal(held.state.health, 0);
});
test('retreat avoids reach, and a counter must step back into range', () => {
  const game = new SwordDuel(); game.start(); advanceUntil(game, 'windup'); for (let i = 0; i < 200 && game.state.phase !== 'recover'; i++) game.step(1 / 60, rest, -1); assert.equal(game.state.health, 100); assert.equal(game.state.dodges, 1); assert.ok(game.state.distance > 2.35); game.step(1 / 60, cut(2)); assert.equal(game.state.rivalHealth, 100); assert.match(game.state.feedback, /fell short/); for (let i = 0; i < 55 && game.state.phase === 'recover'; i++) game.step(1 / 60, rest, 1); game.step(1 / 60, cut(3)); assert.ok(game.state.rivalHealth < 100);
});
test('forward footwork cannot pass through the opponent', () => {
  const game = new SwordDuel(); game.start(); for (let i = 0; i < 70; i++) game.step(1 / 60, guard('high'), 1); assert.ok(game.state.distance >= 1.29);
});
test('30 and 60 fps produce the same health result and attack count', () => {
  const outcomes = [30, 60].map(fps => { const game = new SwordDuel(); game.start(); for (let i = 0; i < fps * 70 && !game.state.finished; i++) game.step(1 / fps, rest); return [game.state.health, game.state.rivalHits, game.state.won]; }); assert.deepEqual(outcomes[0], outcomes[1]); assert.equal(outcomes[0][0], 0);
});
test('direct-motion damage uses the rendered sword-tip sweep, rather than an unrelated wrist segment', () => {
  const game = new SwordDuel(); game.start(); advanceUntil(game, 'recover'); const pose = guard('high').pose!; game.step(1 / 60, { ...cut(2), pose, weaponSlash: null }); assert.equal(game.state.rivalHealth, 100); game.step(1 / 60, { ...cut(3), pose, weaponSlash: cut(3).slash }); assert.ok(game.state.rivalHealth < 100);
});
test('the once-only win and travel purse cannot be farmed', () => {
  let save = newChapterSave(); save = claimChapterReward(save, 'travel'); save = claimChapterReward(save, 'travel'); assert.equal(save.coins, 20); save = readChapterSave(JSON.parse(JSON.stringify(save))); save = claimChapterReward(save, 'win'); save = claimChapterReward(save, 'win'); assert.equal(save.coins, 40); save = buyChapterGear(save, 'steel'); assert.equal(save.coins, 10); assert.equal(save.equipment.sword, 'steel'); assert.equal(buyChapterGear(save, 'steel'), save); assert.equal(buyChapterGear(save, 'heater'), save); assert.equal(claimChapterReward(save, 'win'), save);
});
test('missing and invalid saved progression fall back to starter equipment', () => {
  for (const input of [null, {}, { ...newChapterSave(), coins: -1 }, { ...newChapterSave(), firstWinClaimed: 'false' }, { ...newChapterSave(), equipment: { sword: 'laser', shield: 'oak' } }]) assert.deepEqual(readChapterSave(input), newChapterSave());
});
