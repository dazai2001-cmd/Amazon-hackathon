import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROFILE, MotionEngine, readCalibrationProfile, syntheticPose } from '../shared/motion';
import { newChapterSave, readChapterSave } from '../shared/duel';
import { newStoryProgress, readStoryProgress } from '../shared/chapter';
import { newTrainingSave, readTrainingSave } from '../shared/training';

test('zero, negative and out-of-frame saved calibrations require a fresh calibration', () => {
  for (const invalid of [null, [], 'profile', {}, { ...DEFAULT_PROFILE, mode: 'flying' },
    ...['torso', 'leftRange', 'rightRange', 'reachTarget'].flatMap(key => [0, -1, NaN, Infinity, 1e6].map(value => ({ ...DEFAULT_PROFILE, [key]: value }))),
    { ...DEFAULT_PROFILE, centerX: 2 }, { ...DEFAULT_PROFILE, shoulderY: -.1 }, { ...DEFAULT_PROFILE, shoulderY: .95 },
    { ...DEFAULT_PROFILE, shoulderWidth: 0 }, { ...DEFAULT_PROFILE, createdAt: -1 }]) assert.equal(readCalibrationProfile(invalid), null);
});

test('current and older calibrations remain usable and produce finite movement', () => {
  const { shoulderWidth: _width, ...older } = DEFAULT_PROFILE;
  for (const value of [DEFAULT_PROFILE, older, { ...DEFAULT_PROFILE, mode: 'seated' }, { ...DEFAULT_PROFILE, leftRange: .008, rightRange: .008 }]) {
    const parsed = readCalibrationProfile(value)!; assert.ok(parsed);
    const engine = new MotionEngine(parsed);
    for (const lean of [-1, 0, 1]) { const movement = engine.update(syntheticPose(lean), 1000); assert.ok(Number.isFinite(movement.lean)); assert.ok(Math.abs(movement.lean) <= 1); }
  }
});

test('corrupted story, gear and training saves fall back without throwing or granting rewards', () => {
  const junk: unknown[] = [null, false, 0, '', [], {}, { version: 99 }, { __proto__: null }, { xp: Infinity }, { history: [null] }];
  for (const value of junk) {
    assert.deepEqual(readChapterSave(value), newChapterSave());
    assert.deepEqual(readStoryProgress(value), newStoryProgress());
    assert.deepEqual(readTrainingSave(value), newTrainingSave());
  }
  for (const coins of [-1, 41, NaN, Infinity, '40', null]) assert.deepEqual(readChapterSave({ ...newChapterSave(), coins }), newChapterSave());
  for (const xp of [-1, 1141, 1.5, NaN, Infinity, '60', null]) assert.deepEqual(readTrainingSave({ ...newTrainingSave(), xp }), newTrainingSave());
  for (const history of [[null], Array(21).fill({}), [{ id: 'bad', reps: 999, sets: 100, rejected: 0, day: '2026-10-13', preview: false, rewarded: true }]]) {
    assert.deepEqual(readTrainingSave({ ...newTrainingSave(), xp: 600, history }), newTrainingSave());
  }
  assert.deepEqual(readChapterSave({ ...newChapterSave(), equipment: null }), newChapterSave());
});
