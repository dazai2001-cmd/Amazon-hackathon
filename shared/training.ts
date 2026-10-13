import { clamp } from './motion';
import type { Landmark } from './protocol';

export type Exercise = 'squat' | 'pushup';
export type SquatVariation = 'shallow' | 'regular';
export type PushupVariation = 'wall' | 'knees' | 'floor';
export type TrainingPreference = { pace: 'start' | 'steady'; squat: SquatVariation; pushup: PushupVariation; effort: 'same' | 'lighter' | 'ready' };
export type TrainingBlock = { exercise: Exercise; variation: SquatVariation | PushupVariation; reps: number; sets: number };
export type TrainingPlan = { blocks: TrainingBlock[]; rest: number };
export type TrainingPhase = 'calibrate-top' | 'calibrate-bottom' | 'calibrate-return' | 'active' | 'rest' | 'complete';
export const TRAINING_KEY = 'moveroom.training.v1';
export const DEFAULT_PREFERENCE: TrainingPreference = { pace: 'start', squat: 'shallow', pushup: 'wall', effort: 'same' };
export const exerciseName = (block: TrainingBlock) => block.exercise === 'squat' ? block.variation === 'shallow' ? 'Shallow squats' : 'Squats' : block.variation === 'wall' ? 'Wall push-ups' : block.variation === 'knees' ? 'Knee push-ups' : 'Floor push-ups';

// These cues describe visible evidence. They do not diagnose joint health or
// claim that a single camera can certify every aspect of exercise technique.
export const trainingCues = {
  top: 'Begin from your starting position. Hold while I set the view.',
  bottom: 'Show one comfortable lower position. Hold it briefly for calibration.',
  return: 'Return to your starting position before the next.',
  down: 'Lower with control, then return to your starting position.',
  view: 'Set the view from your side for this lesson.',
  missing: 'Hold there. We’ll continue when the view is clear.',
  range: 'You haven’t reached the range we set. Reset, then try again.',
  speed: 'A little slower. Give me time to see the movement.',
  alignment: 'Your hips have drifted from the starting line. Reset.',
  feet: 'Your support point moved. Reset before the next repetition.',
  torso: 'Your torso moved beyond the range set for this lesson. Reset.',
  gap: 'The view paused. Begin again from your starting position.',
  rest: 'That’s your set. Rest before we continue.',
  complete: 'Training complete. Your discipline is growing, squire.',
  paused: 'Take your time. Tell me when you’re ready.',
} as const;
export type TrainingCue = keyof typeof trainingCues;
export const trainingVoice = (cue: TrainingCue) => `TRAIN_${cue}`;

export function makeTrainingPlan(preference: TrainingPreference, lastCompleted = false): TrainingPlan {
  let reps = preference.pace === 'steady' ? 6 : 4;
  let sets = preference.pace === 'steady' ? 2 : 1;
  if (preference.effort === 'lighter') { reps = Math.max(3, reps - 1); sets = 1; }
  // A harder target requires both a completed routine and the player's choice.
  if (preference.effort === 'ready' && lastCompleted) reps += 1;
  return { blocks: [{ exercise: 'squat', variation: preference.squat, reps, sets }, { exercise: 'pushup', variation: preference.pushup, reps, sets }], rest: 45 };
}

type Joint = { x: number; y: number };
const distance = (a: Joint, b: Joint) => Math.hypot(a.x - b.x, a.y - b.y);
const angle = (a: Joint, b: Joint, c: Joint) => {
  const ab = distance(a, b), bc = distance(b, c);
  if (Math.min(ab, bc) < .025) return NaN;
  return Math.acos(clamp(((a.x - b.x) * (c.x - b.x) + (a.y - b.y) * (c.y - b.y)) / (ab * bc), -1, 1)) * 180 / Math.PI;
};
type Measurement = { angle: number; side: 0 | 1; scale: number; anchor: Joint; hip: Joint; shoulder: Joint; wrist: Joint; supportDistance: number; alignment: number; tilt: number };
export type ExerciseView = { measurement: Measurement | null; cue: TrainingCue };

// Use the image plane only after verifying a side view, with pixel aspect
// restored. Estimated monocular world depth is not a ground-truth joint angle.
export function measureExercise(points: Landmark[], block: TrainingBlock, aspect = 4 / 3, side?: 0 | 1): ExerciseView {
  if (points.length !== 33 || !Number.isFinite(aspect) || aspect < .3 || aspect > 3) return { measurement: null, cue: 'missing' };
  const joint = (index: number) => ({ x: points[index].x * aspect, y: points[index].y });
  const required = (s: number) => block.exercise === 'squat' ? [11 + s, 23 + s, 25 + s, 27 + s] : [11 + s, 13 + s, 15 + s, 23 + s, block.variation === 'knees' ? 25 + s : 27 + s];
  const visible = (i: number) => points[i] && points[i].visibility >= .65 && points[i].x > .02 && points[i].x < .98 && points[i].y > .02 && points[i].y < .98;
  const selected = side ?? (Math.min(...required(0).map(i => points[i]?.visibility || 0)) >= Math.min(...required(1).map(i => points[i]?.visibility || 0)) ? 0 : 1);
  if (required(selected).some(i => !visible(i)) || !visible(11) || !visible(12) || !visible(23) || !visible(24)) return { measurement: null, cue: 'missing' };
  const shoulder = joint(11 + selected), hip = joint(23 + selected), knee = joint(25 + selected), ankle = joint(27 + selected);
  const scale = distance(shoulder, hip);
  if (scale < .09 || distance(joint(11), joint(12)) > scale * .4 || distance(joint(23), joint(24)) > scale * .4) return { measurement: null, cue: 'view' };
  const anchor = block.exercise === 'squat' ? ankle : block.variation === 'knees' ? knee : ankle;
  const bodyLength = distance(shoulder, anchor);
  const alignment = Math.abs((anchor.x - shoulder.x) * (shoulder.y - hip.y) - (shoulder.x - hip.x) * (anchor.y - shoulder.y)) / Math.max(.01, bodyLength ** 2);
  const tilt = Math.atan2(Math.abs(shoulder.x - hip.x), Math.abs(hip.y - shoulder.y)) * 180 / Math.PI;
  const measuredAngle = block.exercise === 'squat' ? angle(hip, knee, ankle) : angle(shoulder, joint(13 + selected), joint(15 + selected));
  const wrist = joint(15 + selected);
  const posture = block.exercise === 'squat' ? hip.y > shoulder.y + .04 && ankle.y > hip.y + .06 : block.variation === 'wall' ? tilt < 40 : tilt > 55;
  if (!Number.isFinite(measuredAngle) || !posture) return { measurement: null, cue: 'view' };
  return { measurement: { angle: measuredAngle, side: selected, scale, anchor, hip, shoulder, wrist, supportDistance: distance(shoulder, wrist), alignment, tilt }, cue: 'down' };
}

export type TrainingSnapshot = {
  phase: TrainingPhase; block: number; set: number; reps: number; totalReps: number; completedSets: number;
  rejected: number; cue: TrainingCue; progress: number; restRemaining: number; tracked: boolean; angle: number | null;
  topAngle: number | null; bottomAngle: number | null; lastRep: number; lastCorrection: TrainingCue | null;
};

export class TrainingCoach {
  readonly state: TrainingSnapshot = { phase: 'calibrate-top', block: 0, set: 1, reps: 0, totalReps: 0, completedSets: 0, rejected: 0, cue: 'top', progress: 0, restRemaining: 0, tracked: false, angle: null, topAngle: null, bottomAngle: null, lastRep: 0, lastCorrection: null };
  private previous: number | null = null;
  private holdAt: number | null = null;
  private held: Measurement[] = [];
  private baseline: Measurement | null = null;
  private lower: Measurement | null = null;
  private cycle: 'reset' | 'top' | 'down' | 'up' = 'reset';
  private beganAt = 0;
  private bottomAt = 0;
  constructor(readonly plan: TrainingPlan) {
    if (plan.blocks.length !== 2 || plan.blocks[0].exercise !== 'squat' || plan.blocks[1].exercise !== 'pushup'
      || plan.blocks.some(b => !Number.isInteger(b.reps) || b.reps < 1 || b.reps > 10 || !Number.isInteger(b.sets) || b.sets < 1 || b.sets > 3
        || !(b.exercise === 'squat' ? ['shallow', 'regular'] : ['wall', 'knees', 'floor']).includes(b.variation))
      || !Number.isFinite(plan.rest) || plan.rest < 30 || plan.rest > 120) throw new Error('Invalid training plan.');
  }
  get block() { return this.plan.blocks[this.state.block]; }
  private clearHold() { this.holdAt = null; this.held = []; this.state.progress = 0; }
  suspend(cue: TrainingCue = 'paused') {
    this.previous = null; this.clearHold(); this.cycle = 'reset'; this.state.tracked = false; this.state.cue = cue;
    return this.state;
  }
  private hold(measurement: Measurement, now: number, duration: number) {
    if (this.held.length && (this.held[0].side !== measurement.side || Math.abs(this.held[0].angle - measurement.angle) > 12)) this.clearHold();
    this.holdAt ??= now; this.held.push(measurement);
    if (this.held.length > 30) this.held.shift();
    this.state.progress = clamp((now - this.holdAt) / duration, 0, 1);
    return now - this.holdAt >= duration && this.held.length >= 5;
  }
  private invalidate(cue: TrainingCue) {
    if (this.cycle === 'down' || this.cycle === 'up') { this.state.rejected++; this.state.lastCorrection = cue; }
    this.cycle = 'reset'; this.clearHold(); this.state.cue = cue;
  }
  tick(seconds: number) {
    const s = this.state;
    if (s.phase !== 'rest' || !Number.isFinite(seconds) || seconds <= 0) return s;
    s.restRemaining = Math.max(0, s.restRemaining - Math.min(seconds, 1));
    s.cue = 'rest';
    if (!s.restRemaining) {
      if (s.set < this.block.sets) { s.set++; s.reps = 0; s.phase = 'active'; s.cue = 'return'; }
      else { s.block++; s.set = 1; s.reps = 0; s.phase = 'calibrate-top'; this.baseline = null; this.lower = null; s.topAngle = null; s.bottomAngle = null; s.cue = 'top'; }
      this.previous = null; this.clearHold(); this.cycle = 'reset';
    }
    return s;
  }
  update(points: Landmark[], now: number, aspect = 4 / 3) {
    const s = this.state;
    if (s.phase === 'complete' || s.phase === 'rest' || !Number.isFinite(now)) return s;
    if (this.previous !== null && now <= this.previous) return s;
    const gap = this.previous !== null && now - this.previous > 300;
    this.previous = now;
    if (gap) { s.tracked = false; s.angle = null; this.invalidate('gap'); return s; }
    const view = measureExercise(points, this.block, aspect, this.baseline?.side);
    s.tracked = Boolean(view.measurement); s.angle = view.measurement?.angle ?? null;
    if (!view.measurement) { this.invalidate(view.cue); return s; }
    const m = view.measurement;
    const maxBottom = this.block.exercise === 'squat' ? this.block.variation === 'shallow' ? 135 : 110 : this.block.variation === 'wall' ? 125 : 105;
    const top = m.angle >= (this.baseline ? Math.max(155, this.baseline.angle - 10) : 165);
    const form: TrainingCue | null = this.block.exercise === 'pushup' && (m.alignment > .12 || this.baseline && m.alignment > this.baseline.alignment + .065) ? 'alignment'
      : this.block.exercise === 'squat' && m.tilt > 55 ? 'torso'
      : this.baseline && (distance(m.anchor, this.baseline.anchor) > this.baseline.scale * .22 || this.block.exercise === 'pushup' && distance(m.wrist, this.baseline.wrist) > this.baseline.scale * .18) ? 'feet' : null;
    if (form) { this.invalidate(form); return s; }
    if (s.phase === 'calibrate-top') {
      s.cue = 'top';
      if (!top || this.block.exercise === 'squat' && m.tilt > 25 || this.block.exercise === 'pushup' && this.block.variation === 'wall' && Math.abs(m.wrist.x - m.shoulder.x) < m.scale * .45) { this.clearHold(); return s; }
      if (this.hold(m, now, 1200)) { this.baseline = { ...m, angle: this.held.reduce((sum, h) => sum + h.angle, 0) / this.held.length }; s.topAngle = this.baseline.angle; s.phase = 'calibrate-bottom'; s.cue = 'bottom'; this.clearHold(); }
    } else if (s.phase === 'calibrate-bottom') {
      s.cue = 'bottom';
      if (m.angle > maxBottom || !this.reachedLower(m)) { this.clearHold(); return s; }
      if (this.hold(m, now, 600)) { this.lower = { ...m, angle: this.held.reduce((sum, h) => sum + h.angle, 0) / this.held.length }; s.bottomAngle = Math.min(maxBottom, this.lower.angle + 6); s.phase = 'calibrate-return'; s.cue = 'return'; this.clearHold(); }
    } else if (s.phase === 'calibrate-return') {
      s.cue = 'return';
      if (!top) { this.clearHold(); return s; }
      if (this.hold(m, now, 1000)) { s.phase = 'active'; this.cycle = 'top'; s.cue = 'down'; this.clearHold(); }
    } else {
      if (this.cycle === 'reset') {
        s.cue = 'return';
        if (!top) { this.clearHold(); return s; }
        if (this.hold(m, now, 300)) { this.cycle = 'top'; s.cue = 'down'; this.clearHold(); }
      } else if (this.cycle === 'top') {
        s.cue = 'down';
        if (!top) { this.cycle = 'down'; this.beganAt = now; this.clearHold(); }
      } else if (this.cycle === 'down') {
        s.cue = 'down';
        if (top) { this.invalidate('range'); return s; }
        if (m.angle <= s.bottomAngle! && this.reachedLower(m)) {
          if (this.hold(m, now, 200)) { this.cycle = 'up'; this.bottomAt = now; this.clearHold(); }
        } else this.clearHold();
      } else {
        s.cue = 'return';
        if (!top) { this.clearHold(); return s; }
        if (this.hold(m, now, 300)) {
          if (now - this.beganAt < 1400 || this.bottomAt - this.beganAt < 450 || now - this.bottomAt < 450) { this.invalidate('speed'); return s; }
          s.reps++; s.totalReps++; s.lastRep++; this.cycle = 'top'; this.clearHold();
          if (s.reps === this.block.reps) {
            s.completedSets++;
            if (s.block === this.plan.blocks.length - 1 && s.set === this.block.sets) { s.phase = 'complete'; s.cue = 'complete'; }
            else { s.phase = 'rest'; s.restRemaining = this.plan.rest; s.cue = 'rest'; }
          } else s.cue = 'down';
        }
      }
    }
    return s;
  }
  private reachedLower(m: Measurement) {
    return this.block.exercise === 'squat' ? m.hip.y >= this.baseline!.hip.y + this.baseline!.scale * .08
      : m.supportDistance <= this.baseline!.supportDistance - this.baseline!.scale * .08;
  }
}

export type TrainingLog = { id: string; day: string; reps: number; sets: number; rejected: number; preview: boolean; rewarded: boolean };
export type TrainingSave = { version: 1; xp: number; lastRewardDay: string | null; preference: TrainingPreference; history: TrainingLog[] };
export const newTrainingSave = (): TrainingSave => ({ version: 1, xp: 0, lastRewardDay: null, preference: { ...DEFAULT_PREFERENCE }, history: [] });
export function readTrainingSave(value: unknown): TrainingSave {
  const fallback = newTrainingSave();
  if (!value || typeof value !== 'object') return fallback;
  const s = value as TrainingSave, p = s.preference;
  if (s.version !== 1 || !Number.isInteger(s.xp) || s.xp < 0 || s.xp > 1140 || !p || !['start', 'steady'].includes(p.pace)
    || !['shallow', 'regular'].includes(p.squat) || !['wall', 'knees', 'floor'].includes(p.pushup) || !['same', 'lighter', 'ready'].includes(p.effort)
    || s.lastRewardDay !== null && (typeof s.lastRewardDay !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.lastRewardDay))
    || !Array.isArray(s.history) || s.history.length > 20 || s.history.some(h => !h || typeof h.id !== 'string' || h.id.length > 80 || !/^\d{4}-\d{2}-\d{2}$/.test(h.day)
      || !Number.isInteger(h.reps) || h.reps < 0 || h.reps > 60 || !Number.isInteger(h.sets) || h.sets < 0 || h.sets > 6
      || !Number.isInteger(h.rejected) || h.rejected < 0 || h.rejected > 10000 || typeof h.preview !== 'boolean' || typeof h.rewarded !== 'boolean')) return fallback;
  return { ...s, preference: { ...p }, history: s.history.map(h => ({ ...h })) };
}
export function trainingStats(save: TrainingSave) {
  const strength = 1 + Math.min(4, Math.floor(save.xp / 60));
  return { level: 1 + Math.floor(save.xp / 60), strength, endurance: strength, damageBonus: (strength - 1) * .02, recoveryBonus: (strength - 1) * .025 };
}
export function completeTraining(save: TrainingSave, coach: TrainingCoach, id: string, day: string, preview: boolean): TrainingSave {
  if (coach.state.phase !== 'complete' || save.history.some(h => h.id === id) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return save;
  const rewarded = !preview && (save.lastRewardDay === null || day > save.lastRewardDay) && save.xp < 1140;
  const log: TrainingLog = { id, day, preview, rewarded, reps: coach.state.totalReps, sets: coach.state.completedSets, rejected: Math.min(10000, coach.state.rejected) };
  return { ...save, xp: Math.min(1140, save.xp + (rewarded ? 60 : 0)), lastRewardDay: rewarded ? day : save.lastRewardDay, history: [...save.history, log].slice(-20) };
}

// A synthetic side view for the labelled desktop preview and deterministic
// tests. It exercises the same calibration/cycle rules; it cannot earn XP.
export function trainingPreviewPose(block: TrainingBlock, lower: number, aspect = 4 / 3): Landmark[] {
  const p = Array.from({ length: 33 }, () => ({ x: .5, y: .15, z: 0, visibility: .98 }));
  const put = (i: number, x: number, y: number) => { p[i] = { x: x / aspect, y, z: 0, visibility: .98 }; p[i + 1] = { ...p[i], x: p[i].x + .008 }; };
  const radians = (180 - (180 - (block.exercise === 'squat' ? 92 : 95)) * clamp(lower, 0, 1)) * Math.PI / 180;
  const flex = Math.PI - radians;
  if (block.exercise === 'squat') {
    const ankle = { x: .67, y: .91 }, knee = { x: .67, y: .66 };
    const hip = { x: knee.x - .25 * Math.sin(flex), y: knee.y - .25 * Math.cos(flex) };
    put(27, ankle.x, ankle.y); put(25, knee.x, knee.y); put(23, hip.x, hip.y); put(11, hip.x + lower * .035, hip.y - .22);
    put(13, hip.x + .07, hip.y - .13); put(15, hip.x + .14, hip.y - .19);
  } else if (block.variation === 'wall') {
    const span = .4 * Math.sin(radians / 2), shoulder = { x: .86 - span, y: .30 };
    put(11, shoulder.x, shoulder.y); put(13, .86 - span / 2, .30 + Math.sqrt(Math.max(0, .2 ** 2 - (span / 2) ** 2))); put(15, .86, .30);
    put(23, shoulder.x * .53 + .40 * .47, shoulder.y * .53 + .91 * .47); put(25, .40, .74); put(27, .40, .91);
  } else {
    const span = .32 * Math.sin(radians / 2), shoulder = { x: .38, y: .88 - span };
    const anchor = { x: block.variation === 'knees' ? .90 : 1.07, y: .88 };
    put(11, shoulder.x, shoulder.y); put(13, .38 + Math.sqrt(Math.max(0, .16 ** 2 - (span / 2) ** 2)), .88 - span / 2); put(15, .38, .88);
    put(23, shoulder.x * .55 + anchor.x * .45, shoulder.y * .55 + anchor.y * .45); put(25, .90, .88); put(27, 1.07, .88);
  }
  return p;
}
