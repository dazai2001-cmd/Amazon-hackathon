import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROFILE, MotionEngine, REST_MOTION, calibrationCue, makeProfile, measureBody, syntheticPose } from '../shared/motion';
import { BladeTracker, OrbitGame, bladeFromPose, poseWithBlade, segmentHitsCircle, type BladeInput } from '../shared/game';
import { ReachCoach } from '../shared/coach';
import { isPoseFrame } from '../shared/protocol';

const pose = (x: number, y = 0.5, shield = false) => poseWithBlade(syntheticPose(), { x, y }, shield, DEFAULT_PROFILE);
const rest: BladeInput = { tracked: true, blade: { x: 0.5, y: 0.5 }, shield: false, lean: 0, sequence: 1, slash: null };
const raised = { ...REST_MOTION, tracked: true, leftReach: 1, rightReach: 1, symmetry: 0 };
const lowered = { ...raised, leftReach: -1, rightReach: -1 };
const drone = () => ({ id: 99, kind: 'drone' as const, x: 0.5, y: 0.5, radius: 0.06, age: 0, lifetime: 2.65 });

test('calibration maps physical left/right into mirrored steering and scales comfortable reach', () => {
  const samples = (lean: number, up = false) => Array.from({ length: 6 }, () => measureBody(syntheticPose(lean, up))!);
  const profile = makeProfile(samples(0), samples(-0.6), samples(0.8), samples(0, true), 'seated');
  assert.ok(Math.abs(profile.leftRange - 0.072) < 0.00001);
  assert.ok(Math.abs(profile.rightRange - 0.096) < 0.00001);
  const left = new MotionEngine(profile).update(syntheticPose(-0.6), 100);
  assert.ok(left.lean < -0.99);
  assert.ok(new MotionEngine(profile).update(syntheticPose(0.8), 100).lean > 0.99);
  assert.equal(new MotionEngine(profile).update(syntheticPose(0, false, true), 100).duck, false);
});

test('low-confidence tracking resets gesture holds before reacquisition', () => {
  const engine = new MotionEngine();
  engine.update(syntheticPose(0, true), 100);
  assert.equal(engine.update(syntheticPose(0, true), 300).shield, true);
  const obscured = syntheticPose(0, true); obscured[16].visibility = 0.1;
  assert.equal(engine.update(obscured, 400).tracked, false);
  assert.equal(engine.update(syntheticPose(0, true), 1000).shield, false);
  assert.equal(engine.update(syntheticPose(0, true), 1150).shield, true);
});

test('calibration requires actual movement in the requested direction and both hands reaching', () => {
  const neutral = Array.from({ length: 6 }, () => measureBody(syntheticPose())!);
  assert.throws(() => makeProfile(neutral, neutral, neutral, neutral, 'standing'), /small movement/);
  assert.ok(calibrationCue(1, neutral[0], neutral));
  assert.ok(calibrationCue(1, measureBody(syntheticPose(1))!, neutral), 'wrong direction cannot advance the left step');
  assert.equal(calibrationCue(1, measureBody(syntheticPose(-0.1))!, neutral), null, 'a small comfortable lean is accepted');
  assert.equal(calibrationCue(2, measureBody(syntheticPose(0.1))!, neutral), null);
  const oneHand = syntheticPose(0, true); oneHand[16].y = 0.55;
  assert.ok(calibrationCue(3, measureBody(oneHand)!, neutral));
  assert.equal(calibrationCue(3, measureBody(syntheticPose(0, true))!, neutral), null);
});

test('wrist position follows the calibrated arena mapping and left hand controls shield independently', () => {
  const point = bladeFromPose(pose(0.73, 0.43), DEFAULT_PROFILE);
  assert.ok(Math.abs(point.x - 0.73) < 0.00001); assert.ok(Math.abs(point.y - 0.43) < 0.00001);
  const tracker = new BladeTracker(DEFAULT_PROFILE);
  assert.equal(tracker.update(pose(0.5, 0.7, true), 100).shield, false);
  const input = tracker.update(pose(0.5, 0.7, true), 250);
  assert.equal(input.shield, true);
  assert.ok(measureBody(pose(0.5, 0.7, true))!.rightReach < DEFAULT_PROFILE.reachTarget);
});

test('a swept segment slices a drone even when neither sampled wrist endpoint overlaps it', () => {
  const tracker = new BladeTracker(DEFAULT_PROFILE), game = new OrbitGame(45, 1);
  const before = tracker.update(pose(0.2), 100); game.suspend(before);
  game.state.targets.push(drone());
  const input = tracker.update(pose(0.8), 200);
  assert.ok(input.slash);
  assert.equal(segmentHitsCircle(input.slash.from, input.slash.to, drone()), true);
  game.step(0.016, input);
  assert.equal(game.state.sliced, 1); assert.equal(game.state.score, 110);
  game.state.targets.push(drone());
  game.step(0.016, input);
  assert.equal(game.state.sliced, 1, 'a reused packet cannot swing twice');
});

test('holding a wrist on a drone and slowly drifting cannot create a slice', () => {
  const tracker = new BladeTracker(DEFAULT_PROFILE), game = new OrbitGame(45, 1);
  tracker.update(pose(0.5), 100);
  const stationary = tracker.update(pose(0.5), 200);
  assert.equal(stationary.slash, null); game.state.targets.push(drone()); game.step(0.016, stationary); assert.equal(game.state.score, 0);
  assert.equal(tracker.update(pose(0.52), 300).slash, null);
});

test('tracking gaps and hidden wrists never produce teleport strikes or advance the round', () => {
  const tracker = new BladeTracker(DEFAULT_PROFILE), game = new OrbitGame();
  tracker.update(pose(0.2), 100);
  assert.equal(tracker.update(pose(0.8), 500).slash, null);
  const lost = tracker.update([], 600); game.step(1, lost); assert.equal(game.state.elapsed, 0);
  assert.equal(tracker.update(pose(0.2), 700).slash, null);
});

test('bolts can be blocked or dodged, while unprotected impacts reset the streak', () => {
  const bolt = () => ({ ...drone(), kind: 'bolt' as const, age: 2.09, lifetime: 2.1 });
  const shielded = new OrbitGame(); shielded.state.targets.push(bolt()); shielded.step(0.02, { ...rest, shield: true });
  assert.equal(shielded.state.blocked, 1); assert.equal(shielded.state.hits, 0);
  const dodged = new OrbitGame(); dodged.state.targets.push(bolt()); dodged.step(0.02, { ...rest, lean: 0.8 }); assert.equal(dodged.state.dodged, 1);
  const hit = new OrbitGame(); hit.state.combo = 4; hit.state.targets.push(bolt()); hit.step(0.02, rest); assert.equal(hit.state.hits, 1); assert.equal(hit.state.combo, 0);
});

test('round duration and seeded waves stay consistent at 30 and 60 fps', () => {
  const simulate = (fps: number) => { const game = new OrbitGame(10, 123); for (let i = 0; i < fps * 10 + 2; i++) game.step(1 / fps, rest); return game.state; };
  const a = simulate(30), b = simulate(60);
  assert.equal(a.finished, true); assert.equal(b.finished, true); assert.equal(a.elapsed, 10); assert.equal(b.elapsed, 10);
  assert.equal(a.hits, b.hits); assert.equal(a.missed, b.missed);
  assert.deepEqual(a.targets.map(t => [t.id, t.x, t.y]), b.targets.map(t => [t.id, t.x, t.y]));
});

test('coach requires a complete hold and a lower/reset before counting each rep', () => {
  const coach = new ReachCoach(0.8, 2);
  for (let t = 0; t <= 2100; t += 100) coach.update(raised, t);
  assert.equal(coach.state.phase, 'lower'); assert.equal(coach.state.reps, 0);
  for (let t = 2200; t <= 2800; t += 100) coach.update(raised, t);
  assert.equal(coach.state.reps, 0);
  for (let t = 2900; t <= 3300; t += 100) coach.update(lowered, t);
  assert.equal(coach.state.reps, 1); assert.equal(coach.state.phase, 'reach');
  for (let t = 3400; t <= 5500; t += 100) coach.update(raised, t);
  for (let t = 5600; t <= 6000; t += 100) coach.update(lowered, t);
  assert.equal(coach.state.phase, 'complete'); assert.equal(coach.state.reps, 2);
});

test('a camera gap cannot count as hold time, and persistent asymmetry triggers practice guidance', () => {
  const coach = new ReachCoach();
  coach.update(raised, 100); coach.update(raised, 1000);
  assert.equal(coach.state.progress, 0);
  coach.update({ ...raised, tracked: false }, 1100);
  coach.update(raised, 3000); assert.equal(coach.state.progress, 0); assert.equal(coach.state.reps, 0);
  const uneven = { ...raised, leftReach: 1.2, rightReach: 0.2, symmetry: 1 };
  for (let t = 3100; t <= 4400; t += 100) coach.update(uneven, t);
  assert.equal(coach.state.practice, true); assert.match(coach.state.cue, /together/);
});

test('duplicate camera timestamps and a pause cannot count toward the coach hold', () => {
  const coach = new ReachCoach(); coach.update(raised, 100);
  for (let i = 0; i < 30; i++) coach.update(raised, 100);
  assert.equal(coach.state.samples, 1); assert.equal(coach.state.progress, 0); assert.equal(coach.state.phase, 'hold');
  for (let t = 200; t <= 1900; t += 100) coach.update(raised, t);
  coach.update({ ...raised, tracked: false }, 1900);
  coach.update(raised, 2000); coach.update(raised, 2100);
  assert.equal(coach.state.phase, 'hold'); assert.ok(coach.state.progress < 0.1); assert.equal(coach.state.reps, 0);
});

test('pose packet validation rejects non-finite coordinates and malformed skeletons', () => {
  const packet = { type: 'pose', seq: 0, t: 100, landmarks: syntheticPose(), fps: 18 };
  assert.equal(isPoseFrame(packet), true);
  packet.landmarks[16].x = NaN; assert.equal(isPoseFrame(packet), false);
  assert.equal(isPoseFrame({ ...packet, landmarks: [syntheticPose()[0]] }), false);
  assert.equal(isPoseFrame({ ...packet, landmarks: [], seq: -1 }), false);
});
