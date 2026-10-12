import test from 'node:test';
import assert from 'node:assert/strict';
import { BladeTracker, poseWithBlade } from '../shared/game';
import { DEFAULT_PROFILE, syntheticPose } from '../shared/motion';
import { coversAttack, lanePoint, weaponPose } from '../shared/weapons';

test('front-facing preview puts the resting shield on the left and the sword on the right', () => {
  const neutral = weaponPose(syntheticPose(), DEFAULT_PROFILE)!;
  assert.ok(neutral.shield.x < 0 && neutral.hilt.x > 0);
  const lowered = weaponPose(poseWithBlade(syntheticPose(), { x: .75, y: .35 }, false, DEFAULT_PROFILE), DEFAULT_PROFILE)!;
  assert.ok(lowered.shield.x < 0 && lowered.hilt.x > 0);
  assert.equal(lowered.guarding, false);
});
test('either wrist independently changes the corresponding 3D weapon placement', () => {
  const original = poseWithBlade(syntheticPose(), { x: .75, y: .35 }, true, DEFAULT_PROFILE, lanePoint('left')), first = weaponPose(original, DEFAULT_PROFILE)!; const moved = original.map(p => ({ ...p })); moved[16].x -= .04; const second = weaponPose(moved, DEFAULT_PROFILE)!; assert.ok(second.hilt.x > first.hilt.x); assert.deepEqual(second.shield, first.shield); moved[15].y -= .04; assert.ok(weaponPose(moved, DEFAULT_PROFILE)!.shield.y > second.shield.y);
});
test('forearm orientation changes the blade and its tip sweep without moving the wrist', () => {
  const points = poseWithBlade(syntheticPose(), { x: .7, y: .4 }, false, DEFAULT_PROFILE), tracker = new BladeTracker(DEFAULT_PROFILE); const first = tracker.update(points, 1000), turned = points.map(p => ({ ...p })); turned[14].x += .06; const second = tracker.update(turned, 1080); assert.deepEqual(second.pose?.hilt, first.pose?.hilt); assert.notDeepEqual(second.pose?.axis, first.pose?.axis); assert.equal(second.slash, null); assert.ok(second.weaponSlash);
});
test('gaps, duplicate timestamps and hidden elbows do not fabricate a tip sweep', () => {
  const tracker = new BladeTracker(DEFAULT_PROFILE), first = poseWithBlade(syntheticPose(), { x: .8, y: .3 }, false, DEFAULT_PROFILE), other = poseWithBlade(syntheticPose(), { x: .2, y: .7 }, false, DEFAULT_PROFILE); tracker.update(first, 1000); assert.equal(tracker.update(other, 1500).weaponSlash, null); assert.equal(tracker.update(first, 1500).weaponSlash, null); tracker.update([], 1600); assert.equal(tracker.update(other, 1650).weaponSlash, null); other[14].visibility = .1; assert.equal(tracker.update(other, 1700).pose, null);
});
test('left-hand calibration covers distinct high, left and right attack lines', () => {
  for (const lane of ['high', 'left', 'right'] as const) { const pose = weaponPose(poseWithBlade(syntheticPose(), { x: .7, y: .4 }, true, DEFAULT_PROFILE, lanePoint(lane)), DEFAULT_PROFILE)!; assert.ok(pose.guarding); assert.ok(coversAttack(pose.shieldPoint, lane)); for (const other of ['high', 'left', 'right'] as const) if (other !== lane) assert.equal(coversAttack(pose.shieldPoint, other), false); }
});
