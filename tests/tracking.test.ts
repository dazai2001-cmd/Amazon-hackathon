import test from 'node:test';
import assert from 'node:assert/strict';
import { PoseFilter } from '../shared/pose-filter';
import { BodyTracker } from '../shared/body';
import { BladeTracker, poseWithBlade, type BladeInput } from '../shared/game';
import { DEFAULT_PROFILE, syntheticPose } from '../shared/motion';
import { isPoseFrame } from '../shared/protocol';
import { SwordDuel } from '../shared/duel';
import { weaponPose } from '../shared/weapons';

const rest: BladeInput = { tracked: true, blade: { x: .7, y: .6 }, shield: false, lean: 0, sequence: 1, slash: null };
const bodyInput = (forward = 0, crouch = 0): BladeInput => ({ ...rest, body: { tracked: true, forward, crouch } });
function reach(game: SwordDuel, phase: string, input = rest) {
  for (let i = 0; i < 1000 && game.state.phase !== phase; i++) game.step(1 / 60, input);
  assert.equal(game.state.phase, phase);
}

test('adaptive smoothing reduces stationary jitter and follows a fast deliberate movement', () => {
  const filter = new PoseFilter(); let rawEnergy = 0, smoothEnergy = 0, last = syntheticPose();
  for (let i = 0; i < 80; i++) { const points = syntheticPose(); points[16].x += Math.sin(i * 2) * .006; last = filter.update(points, 1000 + i * 40); if (i > 10) { rawEnergy += (points[16].x - .32) ** 2; smoothEnergy += (last[16].x - .32) ** 2; } }
  assert.ok(smoothEnergy < rawEnergy * .45);
  for (let i = 1; i <= 5; i++) { const points = syntheticPose(); points[16].x = .32 + i * .07; last = filter.update(points, 4160 + i * 40); }
  assert.ok(Math.abs(last[16].x - .67) < .09, 'a fast cut must not lag behind a slow hold filter');
});

test('filter gaps and hidden joints discard history without promoting confidence', () => {
  const filter = new PoseFilter(), first = syntheticPose(); filter.update(first, 1000);
  const hidden = syntheticPose(); hidden[16] = { x: .9, y: .9, z: 0, visibility: .1 };
  assert.deepEqual(filter.update(hidden, 1040)[16], hidden[16]);
  const restored = syntheticPose(); restored[16].x = .8;
  assert.equal(filter.update(restored, 1080)[16].x, .8);
  restored[16].x = .1; assert.equal(filter.update(restored, 1500)[16].x, .1);
  assert.deepEqual(filter.update([], 1540), []);
});

test('whole-body translation, crouching and image scale do not create a sword cut', () => {
  const points = poseWithBlade(syntheticPose(), { x: .75, y: .4 }, false, DEFAULT_PROFILE);
  const moved = points.map(p => ({ ...p, x: p.x + .08, y: p.y + .12 }));
  const scaled = points.map(p => ({ ...p, x: .5 + (p.x - .5) * 1.2, y: .3 + (p.y - .3) * 1.2 }));
  for (const sample of [moved, scaled]) { const tracker = new BladeTracker(DEFAULT_PROFILE); const before = tracker.update(points, 1000); const after = tracker.update(sample, 1055); assert.equal(after.weaponSlash, null); assert.ok(Math.abs(before.pose!.hilt.x - after.pose!.hilt.x) < 1e-8); assert.ok(Math.abs(before.pose!.hilt.y - after.pose!.hilt.y) < 1e-8); }
});

test('3D joint depth changes the weapon; changing depth sources cannot fabricate a strike', () => {
  const points = poseWithBlade(syntheticPose(), { x: .75, y: .4 }, false, DEFAULT_PROFILE), world = syntheticPose();
  const imagePose = weaponPose(points, DEFAULT_PROFILE)!; world[16].z = -.2; world[14].z = -.1;
  const fullPose = weaponPose(points, DEFAULT_PROFILE, world)!;
  assert.equal(fullPose.depthSource, 'world'); assert.ok(fullPose.hilt.z < imagePose.hilt.z); assert.notDeepEqual(fullPose.axis, imagePose.axis);
  const tracker = new BladeTracker(DEFAULT_PROFILE); tracker.update(points, 1000); assert.equal(tracker.update(points, 1055, world).weaponSlash, null);
  world[14].visibility = .1; assert.equal(tracker.update(points, 1110, world).weaponSlash, null);
});

test('body approach is bounded, held through turns, and disabled for seated play', () => {
  const engine = new BodyTracker(DEFAULT_PROFILE), neutral = syntheticPose(); assert.equal(engine.update(neutral).forward, 0);
  const closer = neutral.map(p => ({ ...p, x: .5 + (p.x - .5) * 1.25 }));
  const advanced = engine.update(closer).forward; assert.ok(advanced > .5 && advanced < 1);
  const turned = syntheticPose(); turned[11].z = -.3; turned[12].z = .3;
  assert.equal(engine.update(closer, turned).forward, advanced);
  const seated = new BodyTracker({ ...DEFAULT_PROFILE, mode: 'seated' }).update(syntheticPose(0, false, true)); assert.equal(seated.forward, 0); assert.equal(seated.crouch, 0);
});

test('both hips and shoulders must lower to crouch; bowing shoulders alone is insufficient', () => {
  const engine = new BodyTracker(DEFAULT_PROFILE), bow = syntheticPose(); bow[11].y += .1; bow[12].y += .1;
  assert.equal(engine.update(bow).crouch, 0); assert.ok(engine.update(syntheticPose(0, false, true)).crouch > .8);
  bow[15].visibility = .1; assert.equal(engine.update(bow).tracked, false);
});

test('character footwork moves once with body position and never walks from a held pose or a tracking gap', () => {
  const game = new SwordDuel(); game.start(); game.step(1 / 60, bodyInput()); const start = game.state.playerZ;
  game.step(1 / 60, bodyInput(.2)); const moved = game.state.playerZ; assert.ok(moved < start);
  for (let i = 0; i < 10; i++) game.step(1 / 60, bodyInput(.2)); assert.equal(game.state.playerZ, moved);
  game.step(1 / 60, { ...rest, tracked: false }); game.step(1 / 60, bodyInput(-.8)); assert.equal(game.state.playerZ, moved);
});

test('a late crouch evades a high cut, while a held crouch is retargeted', () => {
  const late = new SwordDuel(); late.start(); reach(late, 'strike', bodyInput()); reach(late, 'recover', bodyInput(0, .9)); assert.equal(late.state.health, 100); assert.equal(late.state.dodges, 1);
  const held = new SwordDuel(); held.start(); reach(held, 'recover', bodyInput(0, .9)); assert.equal(held.state.health, 84); assert.equal(held.state.dodges, 0);
});

test('side cuts and reacquisition cannot grant a crouch evasion', () => {
  const side = new SwordDuel(); side.start(); reach(side, 'recover', bodyInput()); side.state.attackLane = 'left'; reach(side, 'strike', bodyInput()); side.state.attackLane = 'left'; reach(side, 'recover', bodyInput(0, 1)); assert.equal(side.state.dodges, 0);
  const gap = new SwordDuel(); gap.start(); reach(gap, 'strike', bodyInput()); gap.step(1 / 60, { ...rest, tracked: false }); reach(gap, 'recover', bodyInput(0, 1)); assert.equal(gap.state.dodges, 0); assert.equal(gap.state.health, 84);
});

test('optional 3D packets remain bounded and compatible with the old controller', () => {
  const frame = { type: 'pose', seq: 1, t: 1000, landmarks: syntheticPose(), fps: 30 };
  assert.ok(isPoseFrame(frame));
  const full = { ...frame, worldLandmarks: syntheticPose(), tracking: { model: 'full', delegate: 'GPU', inferenceMs: 25 } }; assert.ok(isPoseFrame(full)); assert.ok(JSON.stringify(full).length < 16384);
  assert.equal(isPoseFrame({ ...full, worldLandmarks: full.worldLandmarks.slice(1) }), false);
  assert.equal(isPoseFrame({ ...full, landmarks: [] }), false);
  assert.equal(isPoseFrame({ ...full, tracking: null }), false);
  full.worldLandmarks[16].z = Infinity; assert.equal(isPoseFrame(full), false);
});

test('hidden elbows freeze a camera-controlled duel instead of falling back to canned strikes', () => {
  const points = syntheticPose(); points[14].visibility = .1;
  const tracked = new BladeTracker(DEFAULT_PROFILE).update(points, 1000);
  assert.equal(tracked.pose, null);
  const game = new SwordDuel(); game.start(); const before = [game.state.elapsed, game.state.health, game.state.playerZ];
  game.step(.05, tracked, 1);
  assert.deepEqual([game.state.elapsed, game.state.health, game.state.playerZ], before);
});

test('weapon-tip projection follows the actual viewport, including narrower desktop previews', () => {
  const points = poseWithBlade(syntheticPose(), { x: .7, y: .4 }, false, DEFAULT_PROFILE);
  const television = weaponPose(points, DEFAULT_PROFILE, [], 16 / 9)!, preview = weaponPose(points, DEFAULT_PROFILE, [], 4 / 3)!;
  assert.ok(Math.abs((television.tip.x - .5) * 16 / 9 - (preview.tip.x - .5) * 4 / 3) < 1e-8);
  assert.equal(television.tip.y, preview.tip.y);
  const tracker = new BladeTracker(DEFAULT_PROFILE); tracker.update(points, 1000); tracker.aspect = 4 / 3;
  assert.equal(tracker.update(points, 1055).weaponSlash, null, 'resizing a preview cannot create a sword strike');
});
