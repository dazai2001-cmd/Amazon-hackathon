import type { Landmark, MovementMode } from './protocol';

export const POSE_CONNECTIONS = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [29, 31], [28, 30], [30, 32]];
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const average = (a: number, b: number) => (a + b) / 2;

export type BodyMeasurement = { centerX: number; shoulderY: number; hipY: number; torso: number; shoulderWidth: number; leftReach: number; rightReach: number; confidence: number };
export type CalibrationProfile = { mode: MovementMode; centerX: number; shoulderY: number; torso: number; shoulderWidth?: number; leftRange: number; rightRange: number; reachTarget: number; createdAt: number };
export type Motion = { tracked: boolean; lean: number; leftReach: number; rightReach: number; shield: boolean; duck: boolean; confidence: number; symmetry: number };
export const REST_MOTION: Motion = { tracked: false, lean: 0, leftReach: 0, rightReach: 0, shield: false, duck: false, confidence: 0, symmetry: 0 };
export const DEFAULT_PROFILE: CalibrationProfile = { mode: 'standing', centerX: 0.5, shoulderY: 0.3, torso: 0.22, shoulderWidth: .14, leftRange: 0.12, rightRange: 0.12, reachTarget: 0.8, createdAt: 0 };

export function readCalibrationProfile(value: unknown): CalibrationProfile | null {
  if (!value || typeof value !== 'object') return null;
  const p = value as CalibrationProfile;
  const between = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max;
  if (!['standing', 'seated'].includes(p.mode) || !between(p.centerX, 0, 1) || !between(p.shoulderY, 0, 1)
    || !between(p.torso, .04, 1) || p.shoulderY + p.torso > 1
    || !between(p.leftRange, .008, .35) || !between(p.rightRange, .008, .35)
    || !between(p.reachTarget, .05, 1.6) || !between(p.createdAt, 0, Number.MAX_SAFE_INTEGER)
    || p.shoulderWidth !== undefined && (!Number.isFinite(p.shoulderWidth) || p.shoulderWidth <= .02 || p.shoulderWidth >= .8)) return null;
  return { mode: p.mode, centerX: p.centerX, shoulderY: p.shoulderY, torso: p.torso, leftRange: p.leftRange,
    rightRange: p.rightRange, reachTarget: p.reachTarget, createdAt: p.createdAt,
    ...(p.shoulderWidth === undefined ? {} : { shoulderWidth: p.shoulderWidth }) };
}

export function measureBody(points: Landmark[]): BodyMeasurement | null {
  if (points.length !== 33) return null;
  const required = [11, 12, 23, 24, 15, 16];
  if (required.some(i => !points[i] || points[i].visibility < 0.5)) return null;
  const shoulderY = average(points[11].y, points[12].y);
  const hipY = average(points[23].y, points[24].y);
  const torso = hipY - shoulderY;
  if (torso < 0.04 || required.some(i => points[i].x < 0 || points[i].x > 1 || points[i].y < 0 || points[i].y > 1)) return null;
  return {
    centerX: average(points[11].x, points[12].x), shoulderY, hipY, torso, shoulderWidth: Math.abs(points[11].x - points[12].x),
    leftReach: (shoulderY - points[15].y) / torso,
    rightReach: (shoulderY - points[16].y) / torso,
    confidence: Math.min(...required.map(i => points[i].visibility)),
  };
}

export function makeProfile(neutral: BodyMeasurement[], left: BodyMeasurement[], right: BodyMeasurement[], reach: BodyMeasurement[], mode: MovementMode): CalibrationProfile {
  if (neutral.length < 5 || left.length < 3 || right.length < 3 || reach.length < 3) throw new Error('Complete all four calibration steps with your upper body in view.');
  const mean = (key: keyof BodyMeasurement) => neutral.reduce((sum, frame) => sum + frame[key], 0) / neutral.length;
  const centerX = mean('centerX');
  const torso = mean('torso');
  const leftRange = Math.max(...left.map(f => f.centerX - centerX));
  const rightRange = Math.max(...right.map(f => centerX - f.centerX));
  const reachHeight = Math.max(...reach.map(f => Math.min(f.leftReach, f.rightReach)));
  if (leftRange < minimumLean(torso) || rightRange < minimumLean(torso)) throw new Error('We need a small movement in each direction. Try the left and right steps again within your comfortable range.');
  if (reachHeight < 0.1) throw new Error('Bring both hands a little above your shoulders during the reach step. Only move within a comfortable range.');
  return {
    mode, centerX, shoulderY: mean('shoulderY'), torso, shoulderWidth: mean('shoulderWidth'),
    // The phone's preview is mirrored, so physical movement maps naturally to the TV.
    leftRange: clamp(leftRange, minimumLean(torso), 0.35),
    rightRange: clamp(rightRange, minimumLean(torso), 0.35),
    reachTarget: clamp(reachHeight * 0.85, 0.05, 1.6),
    createdAt: Date.now(),
  };
}

const minimumLean = (torso: number) => Math.max(0.008, torso * 0.04);
export function calibrationCue(step: number, body: BodyMeasurement, neutral: BodyMeasurement[]): string | null {
  if (step === 0 || neutral.length === 0) return null;
  const center = neutral.reduce((sum, frame) => sum + frame.centerX, 0) / neutral.length;
  const torso = neutral.reduce((sum, frame) => sum + frame.torso, 0) / neutral.length;
  if (step === 1 && body.centerX - center < minimumLean(torso)) return 'Lean a little to your left, then hold that position.';
  if (step === 2 && center - body.centerX < minimumLean(torso)) return 'Lean a little to your right, then hold that position.';
  if (step === 3 && Math.min(body.leftReach, body.rightReach) < 0.1) return 'Bring both hands a little above your shoulders, within your comfortable range.';
  return null;
}

export class MotionEngine {
  private previousTime = 0;
  private lean = 0;
  private raiseSince: number | null = null;
  constructor(public profile: CalibrationProfile = DEFAULT_PROFILE) {}
  update(points: Landmark[], now: number): Motion {
    const body = measureBody(points);
    if (!body) { this.raiseSince = null; this.previousTime = 0; this.lean = 0; return { ...REST_MOTION }; }
    const displacement = this.profile.centerX - body.centerX;
    const rawLean = clamp(displacement / (displacement < 0 ? this.profile.leftRange : this.profile.rightRange), -1, 1);
    const alpha = this.previousTime ? 1 - Math.exp(-Math.max(0, now - this.previousTime) / 95) : 1;
    this.lean += (rawLean - this.lean) * alpha;
    this.previousTime = now;
    const armsUp = Math.min(body.leftReach, body.rightReach) >= this.profile.reachTarget;
    if (armsUp && this.raiseSince === null) this.raiseSince = now;
    if (!armsUp) this.raiseSince = null;
    return {
      tracked: true, lean: this.lean,
      leftReach: body.leftReach, rightReach: body.rightReach,
      shield: this.raiseSince !== null && now - this.raiseSince >= 140,
      duck: this.profile.mode === 'standing' && (body.shoulderY - this.profile.shoulderY) / this.profile.torso > 0.36,
      confidence: body.confidence,
      symmetry: Math.abs(body.leftReach - body.rightReach),
    };
  }
}

export function syntheticPose(lean = 0, raised = false, duck = false): Landmark[] {
  const points: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.2, z: 0, visibility: 0.98 }));
  const dx = -lean * 0.12;
  const dy = duck ? 0.12 : 0;
  const set = (i: number, x: number, y: number) => { points[i] = { x: x + dx, y: y + dy, z: 0, visibility: 0.98 }; };
  // MediaPipe labels the person's left, which is image-right before preview mirroring.
  set(0, 0.5, 0.18); set(7, 0.54, 0.18); set(8, 0.46, 0.18);
  set(11, 0.57, 0.3); set(12, 0.43, 0.3);
  set(13, 0.64, raised ? 0.18 : 0.43); set(14, 0.36, raised ? 0.18 : 0.43);
  set(15, 0.68, raised ? 0.05 : 0.55); set(16, 0.32, raised ? 0.05 : 0.55);
  set(23, 0.54, 0.52); set(24, 0.46, 0.52);
  set(25, 0.57, 0.72 - (duck ? 0.1 : 0)); set(26, 0.43, 0.72 - (duck ? 0.1 : 0));
  set(27, 0.58, 0.92 - dy); set(28, 0.42, 0.92 - dy);
  set(29, 0.58, 0.93 - dy); set(30, 0.42, 0.93 - dy); set(31, 0.6, 0.95 - dy); set(32, 0.4, 0.95 - dy);
  return points;
}
