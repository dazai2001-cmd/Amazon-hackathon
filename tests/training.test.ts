import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TrainingCoach, DEFAULT_PREFERENCE, completeTraining, makeTrainingPlan, measureExercise, newTrainingSave, readTrainingSave, trainingCues, trainingPreviewPose, trainingStats, type TrainingBlock, type TrainingPlan } from '../shared/training';
import { syntheticPose } from '../shared/motion';
import { isPoseFrame, isCommand } from '../shared/protocol';
import { SwordDuel } from '../shared/duel';

const plan = (reps = 2, sets = 1, pushup: 'wall' | 'knees' | 'floor' = 'wall'): TrainingPlan => ({ blocks: [{ exercise: 'squat', variation: 'regular', reps, sets }, { exercise: 'pushup', variation: pushup, reps, sets }], rest: 45 });
class Driver {
  time = 0;
  constructor(public coach = new TrainingCoach(plan())) {}
  hold(lower: number, ms: number, modify = (p: ReturnType<typeof trainingPreviewPose>) => p) {
    for (let dt = 0; dt < ms; dt += 50) { this.time += 50; this.coach.update(modify(trainingPreviewPose(this.coach.block, lower)), this.time); }
  }
  move(from: number, to: number, ms = 800) {
    for (let dt = 50; dt <= ms; dt += 50) { this.time += 50; this.coach.update(trainingPreviewPose(this.coach.block, from + (to - from) * dt / ms), this.time); }
  }
  calibrate() { this.hold(0, 1450); assert.equal(this.coach.state.phase, 'calibrate-bottom'); this.move(0, 1); this.hold(1, 800); assert.equal(this.coach.state.phase, 'calibrate-return'); this.move(1, 0); this.hold(0, 1200); assert.equal(this.coach.state.phase, 'active'); assert.equal(this.coach.state.reps, 0); }
  rep() { this.hold(0, 400); this.move(0, 1); this.hold(1, 400); this.move(1, 0); this.hold(0, 500); }
  rest() { for (let i = 0; i < 230; i++) this.coach.tick(.2); this.time += 46000; }
  finish() {
    for (let block = 0; block < 2; block++) {
      this.calibrate();
      for (let set = 0; set < this.coach.block.sets; set++) { for (let rep = 0; rep < this.coach.block.reps; rep++) this.rep(); if (this.coach.state.phase === 'rest') this.rest(); }
    }
    assert.equal(this.coach.state.phase, 'complete');
  }
}

test('exercise measurement supports both sides, aspect ratios and every selected variation', () => {
  for (const block of [{ exercise: 'squat', variation: 'regular' }, { exercise: 'squat', variation: 'shallow' }, { exercise: 'pushup', variation: 'wall' }, { exercise: 'pushup', variation: 'knees' }, { exercise: 'pushup', variation: 'floor' }] as TrainingBlock[]) {
    for (const aspect of [.75, 4 / 3, 16 / 9]) for (const lower of [0, 1]) {
      const points = trainingPreviewPose(block, lower, aspect);
      // Shift the entire fixture into frame in portrait, keeping pixel angles.
      if (aspect === .75) {
        const min = Math.min(...points.map(p => p.x)), max = Math.max(...points.map(p => p.x)), size = Math.min(1, .86 / (max - min));
        points.forEach(p => { p.x = .07 + (p.x - min) * size; p.y = .1 + (p.y - .1) * size; });
      }
      const view = measureExercise(points, block, aspect);
      assert.ok(view.measurement, `${block.variation} ${aspect} ${lower} ${view.cue}`);
      assert.ok(Math.abs(view.measurement.angle - (lower ? block.exercise === 'squat' ? 92 : 95 : 180)) < .01);
      const mirrored = points.map(p => ({ ...p, x: 1 - p.x }));
      assert.ok(measureExercise(mirrored, block, aspect).measurement);
    }
  }
});

test('camera setup rejects a front view, missing joints, wrong posture and low confidence', () => {
  const block = plan().blocks[0];
  assert.equal(measureExercise(syntheticPose(), block).cue, 'view');
  for (const index of [11, 23, 25, 27]) { const points = trainingPreviewPose(block, 0); points[index].visibility = .3; points[index + 1].visibility = .3; assert.equal(measureExercise(points, block).measurement, null); }
  const floor = plan(2, 1, 'floor').blocks[1];
  assert.equal(measureExercise(trainingPreviewPose(plan().blocks[1], 0), floor).measurement, null);
  assert.equal(measureExercise([], floor).measurement, null);
});

test('the calibration lower pose is never counted as a rep; complete sets and both exercises are required', () => {
  const d = new Driver(); d.calibrate(); d.rep(); assert.equal(d.coach.state.reps, 1); assert.equal(d.coach.state.totalReps, 1);
  d.rep(); assert.equal(d.coach.state.phase, 'rest'); assert.equal(d.coach.state.completedSets, 1);
  d.rest(); assert.equal(d.coach.state.phase, 'calibrate-top'); assert.equal(d.coach.state.block, 1);
  d.calibrate(); d.rep(); d.rep(); assert.equal(d.coach.state.phase, 'complete'); assert.equal(d.coach.state.totalReps, 4);
});

test('knee and floor push-ups use an exercise calibration rather than the upright game calibration', () => {
  for (const variation of ['knees', 'floor'] as const) { const d = new Driver(new TrainingCoach(plan(1, 1, variation))); d.finish(); assert.equal(d.coach.state.totalReps, 2); }
});

test('partial range, bouncing and a held lower pose cannot add reps', () => {
  const d = new Driver(); d.calibrate(); d.move(0, .45); d.hold(.45, 400); d.move(.45, 0); d.hold(0, 600);
  assert.equal(d.coach.state.reps, 0); assert.ok(d.coach.state.rejected > 0);
  d.rep(); assert.equal(d.coach.state.reps, 1);
  d.move(0, 1); d.hold(1, 10000); d.move(1, .8); d.hold(.8, 500); assert.equal(d.coach.state.reps, 1);
});

test('a fast full excursion is rejected even when its endpoints are visible', () => {
  const d = new Driver(); d.calibrate(); d.move(0, 1, 100); d.hold(1, 250); d.move(1, 0, 100); d.hold(0, 350);
  assert.equal(d.coach.state.reps, 0); assert.equal(d.coach.state.lastCorrection, 'speed'); assert.equal(d.coach.state.rejected, 1);
});

test('duplicate frames, tracking gaps and pause/resume never complete a partial rep', () => {
  const d = new Driver(); d.calibrate(); d.move(0, 1); d.hold(1, 300);
  const top = trainingPreviewPose(d.coach.block, 0);
  for (let i = 0; i < 50; i++) d.coach.update(top, d.time);
  assert.equal(d.coach.state.reps, 0);
  d.time += 1000; d.coach.update(top, d.time); d.hold(0, 500); assert.equal(d.coach.state.reps, 0);
  d.move(0, 1); d.hold(1, 300); d.coach.suspend(); d.move(1, 0); d.hold(0, 500); assert.equal(d.coach.state.reps, 0);
  d.rep(); assert.equal(d.coach.state.reps, 1);
});

test('interrupted calibration requires a fresh continuous hold; frame gaps visibly stop tracking', () => {
  const d = new Driver(); d.hold(0, 1000); d.coach.update([], d.time += 50); d.hold(0, 700);
  assert.equal(d.coach.state.phase, 'calibrate-top'); d.hold(0, 700);
  assert.equal(d.coach.state.phase, 'calibrate-bottom');
  d.time += 1000; d.coach.update(trainingPreviewPose(d.coach.block, 1), d.time);
  assert.equal(d.coach.state.tracked, false); assert.equal(d.coach.state.angle, null);
  assert.equal(d.coach.state.cue, 'gap'); assert.equal(d.coach.state.totalReps, 0);
});

test('a visibility loss on the calibrated side cannot switch sides to finish a rep', () => {
  const d = new Driver(); d.calibrate(); d.move(0, 1); d.hold(1, 300);
  d.hold(1, 200, p => { for (const i of [11, 23, 25, 27]) p[i].visibility = .1; return p; });
  d.move(1, 0); d.hold(0, 500);
  assert.equal(d.coach.state.reps, 0); assert.ok(d.coach.state.rejected > 0);
  d.rep(); assert.equal(d.coach.state.reps, 1);
});

test('invalid rest ticks and repeated complete frames cannot skip sets or add reps', () => {
  const d = new Driver(new TrainingCoach(plan(1))); d.calibrate(); d.rep();
  const remaining = d.coach.state.restRemaining;
  for (const seconds of [0, -1, NaN, Infinity]) d.coach.tick(seconds);
  assert.equal(d.coach.state.restRemaining, remaining); assert.equal(d.coach.state.completedSets, 1);
  d.rest(); d.calibrate(); d.rep();
  const receipt = { ...d.coach.state };
  for (let i = 0; i < 100; i++) { d.time += 50; d.coach.update(trainingPreviewPose(d.coach.block, i % 2), d.time); d.coach.tick(100); }
  assert.deepEqual(d.coach.state, receipt);
});

test('occlusion, support movement, or hip-line drift invalidate the current repetition', () => {
  const d = new Driver(); d.calibrate(); d.move(0, 1); d.hold(1, 300); d.hold(1, 100, p => { p[27].visibility = .1; return p; }); d.move(1, 0); d.hold(0, 600); assert.equal(d.coach.state.reps, 0);
  d.move(0, 1); d.hold(1, 100, p => { p[27].x += .1; return p; }); d.move(1, 0); d.hold(0, 600); assert.equal(d.coach.state.reps, 0);
  d.rep(); d.rep(); d.rest(); d.calibrate(); d.move(0, 1); d.hold(1, 200, p => { p[23].x -= .14; return p; }); d.move(1, 0); d.hold(0, 600); assert.equal(d.coach.state.reps, 0); assert.ok(d.coach.state.rejected >= 3);
});

test('arm-only flexion and moving the support wrist cannot pass a push-up', () => {
  const d = new Driver(new TrainingCoach(plan(1))); d.calibrate(); d.rep(); d.rest(); d.calibrate();
  const top = trainingPreviewPose(d.coach.block, 0), lower = trainingPreviewPose(d.coach.block, 1);
  d.hold(0, 400);
  // Keep the entire body and hands at the top, bend only the elbows.
  d.hold(1, 2000, p => { for (const i of [11, 12, 23, 24, 25, 26, 27, 28, 15, 16]) p[i] = { ...top[i] }; p[13] = { ...lower[13] }; p[14] = { ...lower[14] }; return p; });
  d.hold(0, 600); assert.equal(d.coach.state.reps, 0);
  d.move(0, 1); d.hold(1, 100, p => { p[15].x += .1; return p; }); d.move(1, 0); d.hold(0, 600); assert.equal(d.coach.state.reps, 0);
  d.rep(); assert.equal(d.coach.state.phase, 'complete');
});

test('multiple sets enforce a rest, restart from top, and recalibrate on exercise change', () => {
  const d = new Driver(new TrainingCoach(plan(1, 2))); d.calibrate(); d.rep(); assert.equal(d.coach.state.phase, 'rest');
  d.hold(0, 5000); assert.equal(d.coach.state.totalReps, 1); d.coach.tick(60); assert.ok(d.coach.state.restRemaining > 40);
  d.rest(); assert.equal(d.coach.state.set, 2); assert.equal(d.coach.state.phase, 'active'); d.rep(); assert.equal(d.coach.state.totalReps, 2); d.rest(); assert.equal(d.coach.state.phase, 'calibrate-top');
});

test('the trainer adapts only to self-selected pace, completion and effort feedback', () => {
  assert.deepEqual(makeTrainingPlan(DEFAULT_PREFERENCE).blocks.map(b => [b.reps, b.sets]), [[4, 1], [4, 1]]);
  assert.equal(makeTrainingPlan({ ...DEFAULT_PREFERENCE, effort: 'ready' }, false).blocks[0].reps, 4);
  assert.equal(makeTrainingPlan({ ...DEFAULT_PREFERENCE, effort: 'ready' }, true).blocks[0].reps, 5);
  assert.equal(makeTrainingPlan({ ...DEFAULT_PREFERENCE, pace: 'steady', effort: 'lighter' }, true).blocks[0].sets, 1);
});

test('incomplete and preview routines cannot earn XP; completed camera sessions have a daily reward cap', () => {
  const d = new Driver(new TrainingCoach(plan(1)));
  const initial = newTrainingSave(); assert.equal(completeTraining(initial, d.coach, 'first', '2026-10-12', false), initial);
  d.finish(); const preview = completeTraining(initial, d.coach, 'preview', '2026-10-12', true); assert.equal(preview.xp, 0);
  const first = completeTraining(preview, d.coach, 'first', '2026-10-12', false); assert.equal(first.xp, 60);
  assert.equal(completeTraining(first, d.coach, 'first', '2026-10-12', false), first);
  const second = completeTraining(first, d.coach, 'second', '2026-10-12', false); assert.equal(second.xp, 60);
  assert.equal(completeTraining(second, d.coach, 'yesterday', '2026-10-11', false).xp, 60);
  const nextDay = completeTraining(second, d.coach, 'next', '2026-10-13', false); assert.equal(nextDay.xp, 120); assert.equal(trainingStats(nextDay).strength, 3);
  assert.deepEqual(readTrainingSave(JSON.parse(JSON.stringify(nextDay))), nextDay);
  assert.equal(readTrainingSave({ ...nextDay, xp: Infinity }).xp, 0);
});

test('training bonuses and history remain bounded, with saved preferences preserved', () => {
  const d = new Driver(new TrainingCoach(plan(1))); d.finish(); let save = newTrainingSave();
  for (let i = 1; i <= 28; i++) save = completeTraining(save, d.coach, `session-${i}`, `2026-11-${String(i).padStart(2, '0')}`, false);
  assert.equal(save.xp, 1140); assert.equal(save.history.length, 20); assert.equal(trainingStats(save).damageBonus, .08); assert.equal(trainingStats(save).recoveryBonus, .1);
  const normal = new SwordDuel(), trained = new SwordDuel(undefined, trainingStats(save)), invalid = new SwordDuel(undefined, { damageBonus: Infinity, recoveryBonus: NaN });
  const input = { tracked: true, blade: { x: .5, y: .6 }, shield: false, lean: 0, sequence: 1, slash: null };
  for (const duel of [normal, trained, invalid]) { duel.start(); duel.state.stamina = .5; duel.step(.05, input); }
  assert.ok(trained.state.stamina > normal.state.stamina); assert.equal(invalid.state.stamina, normal.state.stamina);
});

test('relay frames carry a validated image aspect and exercise commands', () => {
  const packet = { type: 'pose', seq: 1, t: 10, landmarks: syntheticPose(), fps: 20, imageAspect: 16 / 9 };
  assert.ok(isPoseFrame(packet)); for (const imageAspect of [0, NaN, Infinity, 4]) assert.equal(isPoseFrame({ ...packet, imageAspect }), false);
  assert.ok(isCommand({ type: 'command', action: 'exercise', value: 'pushup:floor' }));
});

test('every trainer caption and counted rep has a scripted Alden voice cue', () => {
  const catalogue = JSON.parse(readFileSync('content/story/chapter-01-dialogue.json', 'utf8'));
  for (const [key, text] of Object.entries(trainingCues)) { const entry = catalogue.trainingCues.find((c: { id: string }) => c.id === `TRAIN_${key}`); assert.equal(entry?.text, text); assert.equal(entry.speaker, 'ALDEN'); }
  for (let i = 1; i <= 10; i++) assert.ok(catalogue.trainingCues.some((c: { id: string }) => c.id === `TRAIN_count_${i}`));
});
