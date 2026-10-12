import { clamp, measureBody, type CalibrationProfile } from './motion';
import type { Landmark } from './protocol';
import { weaponPose, type WeaponPose } from './weapons';
import { BodyTracker, type BodyPose } from './body';

export type Point = { x: number; y: number };
export type BladeSweep = { from: Point; to: Point; speed: number };
export type BladeInput = { tracked: boolean; blade: Point; shield: boolean; lean: number; sequence: number; slash: BladeSweep | null; pose?: WeaponPose | null; weaponSlash?: BladeSweep | null; body?: BodyPose };
export type Target = Point & { id: number; radius: number; age: number; lifetime: number; kind: 'drone' | 'bolt' };
export type GameSnapshot = { elapsed: number; duration: number; score: number; combo: number; bestCombo: number; sliced: number; blocked: number; dodged: number; missed: number; hits: number; energy: number; blade: Point; shielding: boolean; targets: Target[]; trail: (Point & { at: number })[]; bursts: (Point & { id: number; at: number; kind: 'slice' | 'block' | 'hit' })[]; finished: boolean; feedback: string };

// The camera frame is mirrored. Torso size and comfortable reach define the control area.
export function bladeFromPose(points: Landmark[], profile: CalibrationProfile): Point {
  const top = profile.shoulderY - profile.torso * (profile.reachTarget + 0.15);
  const height = profile.torso * (profile.reachTarget + 1.55);
  return { x: clamp(0.5 + (profile.centerX - points[16].x) / (profile.torso * 2.8), 0.04, 0.96), y: clamp((points[16].y - top) / height, 0.18, 0.91) };
}

export function poseWithBlade(points: Landmark[], blade: Point, shield: boolean, profile: CalibrationProfile, guardPoint?: Point, bodyRelative = false): Landmark[] {
  const copy = points.map(p => ({ ...p }));
  const top = (bodyRelative ? (copy[11].y + copy[12].y) / 2 : profile.shoulderY) - profile.torso * (profile.reachTarget + 0.15);
  const center = bodyRelative ? (copy[11].x + copy[12].x) / 2 : profile.centerX;
  copy[16].x = center - (blade.x - 0.5) * profile.torso * 2.8;
  copy[16].y = top + blade.y * profile.torso * (profile.reachTarget + 1.55);
  copy[14].x = (copy[12].x + copy[16].x) / 2; copy[14].y = (copy[12].y + copy[16].y) / 2;
  const leftPosition = shield ? guardPoint || { x: .23, y: .03 } : { x: .23, y: .94 };
  copy[15].x = center - (leftPosition.x - .5) * profile.torso * 2.8;
  copy[15].y = top + leftPosition.y * profile.torso * (profile.reachTarget + 1.55);
  copy[13].x = (copy[11].x + copy[15].x) / 2; copy[13].y = (copy[11].y + copy[15].y) / 2;
  return copy;
}

export class BladeTracker {
  aspect = 16 / 9;
  private previous: { blade: Point; tip: Point | null; depthSource: 'world' | 'image' | null; aspect: number; time: number } | null = null;
  private raisedAt: number | null = null;
  private sequence = 0;
  private bodyTracker: BodyTracker;
  constructor(public profile: CalibrationProfile) { this.bodyTracker = new BodyTracker(profile); }
  reset() { this.previous = null; this.raisedAt = null; this.bodyTracker.reset(); }
  update(points: Landmark[], now: number, world: Landmark[] = []): BladeInput {
    const body = measureBody(points);
    const sequence = ++this.sequence;
    if (!body) { this.reset(); return { tracked: false, blade: { x: 0.5, y: 0.6 }, shield: false, lean: 0, sequence, slash: null }; }
    const blade = bladeFromPose(points, this.profile);
    const pose = weaponPose(points, this.profile, world, this.aspect), bodyPose = this.bodyTracker.update(points, world);
    const gap = this.previous ? now - this.previous.time : Infinity;
    const distance = this.previous ? Math.hypot(blade.x - this.previous.blade.x, blade.y - this.previous.blade.y) : 0;
    const speed = distance / (gap / 1000);
    // Dropouts and implausible jumps cannot create a sword strike on reacquisition.
    const slash = this.previous && gap > 0 && gap <= 180 && distance >= 0.025 && speed >= 0.6 && speed <= 12
      ? { from: this.previous.blade, to: blade, speed } : null;
    const tipDistance = pose && this.previous?.tip ? Math.hypot(pose.tip.x - this.previous.tip.x, pose.tip.y - this.previous.tip.y) : 0;
    const tipSpeed = tipDistance / (gap / 1000);
    const weaponSlash = pose && this.previous?.tip && pose.depthSource === this.previous.depthSource && Math.abs(this.aspect - this.previous.aspect) < .01 && gap > 0 && gap <= 180 && tipDistance >= .02 && tipSpeed >= .55 && tipSpeed <= 12
      ? { from: this.previous.tip, to: pose.tip, speed: tipSpeed } : null;
    this.previous = { blade, tip: pose?.tip || null, depthSource: pose?.depthSource || null, aspect: this.aspect, time: now };
    if (gap > 180) this.raisedAt = null;
    if (body.leftReach >= this.profile.reachTarget) this.raisedAt ??= now;
    else this.raisedAt = null;
    const shift = this.profile.centerX - body.centerX;
    return { tracked: true, blade, shield: this.raisedAt !== null && now - this.raisedAt >= 140,
      lean: clamp(shift / (shift < 0 ? this.profile.leftRange : this.profile.rightRange), -1, 1), sequence, slash, pose, weaponSlash, body: bodyPose };
  }
}

export function segmentHitsCircle(from: Point, to: Point, target: Point & { radius: number }, aspect = 1.6): boolean {
  const dx = (to.x - from.x) * aspect, dy = to.y - from.y;
  const length = dx * dx + dy * dy;
  const t = length ? clamp(((target.x - from.x) * aspect * dx + (target.y - from.y) * dy) / length, 0, 1) : 0;
  return Math.hypot((from.x + (to.x - from.x) * t - target.x) * aspect, from.y + dy * t - target.y) <= target.radius;
}

export class OrbitGame {
  state: GameSnapshot;
  aspect = 1.6;
  private spawnAt = 0.7;
  private nextId = 1;
  private rng: number;
  private lastSequence = -1;
  private messageUntil = 0;
  constructor(public duration = 45, seed = Date.now()) {
    this.rng = seed || 1;
    this.state = { elapsed: 0, duration, score: 0, combo: 0, bestCombo: 0, sliced: 0, blocked: 0, dodged: 0, missed: 0, hits: 0, energy: 1,
      blade: { x: 0.5, y: 0.6 }, shielding: false, targets: [], trail: [], bursts: [], finished: false, feedback: 'Sweep your right hand to slice. Raise your left hand to shield.' };
  }
  private random() { this.rng = (Math.imul(1664525, this.rng) + 1013904223) >>> 0; return this.rng / 4294967296; }
  suspend(input: BladeInput) { this.lastSequence = input.sequence; this.state.trail = []; this.state.shielding = false; if (input.tracked) this.state.blade = input.blade; }
  step(dt: number, input: BladeInput) {
    const s = this.state;
    if (s.finished || !input.tracked || dt <= 0) { this.suspend(input); return s; }
    dt = Math.min(dt, 0.05);
    s.elapsed = Math.min(s.duration, s.elapsed + dt); s.blade = input.blade;
    s.shielding = input.shield && s.energy > 0.08;
    s.energy = clamp(s.energy + (s.shielding ? -0.25 : 0.18) * dt, 0, 1);
    while (s.elapsed >= this.spawnAt) {
      const id = this.nextId++, kind = id % 4 === 0 ? 'bolt' : 'drone';
      s.targets.push({ id, kind, x: 0.18 + this.random() * 0.64, y: 0.33 + this.random() * 0.39, radius: kind === 'drone' ? 0.061 : 0.052, age: 0, lifetime: kind === 'drone' ? 2.65 : 2.1 });
      this.spawnAt += Math.max(0.62, 1.25 - s.elapsed * 0.014);
    }
    const cut = new Set<number>();
    if (input.sequence !== this.lastSequence) {
      this.lastSequence = input.sequence;
      s.trail.push({ ...input.blade, at: s.elapsed });
      if (input.slash) for (const target of s.targets) {
        if (target.kind !== 'drone' || !segmentHitsCircle(input.slash.from, input.slash.to, target, this.aspect)) continue;
        cut.add(target.id); s.sliced++; s.combo++; s.bestCombo = Math.max(s.bestCombo, s.combo); s.score += 100 + Math.min(10, s.combo) * 10;
        s.bursts.push({ id: target.id, x: target.x, y: target.y, at: s.elapsed, kind: 'slice' });
        s.feedback = s.combo > 1 ? s.combo + ' slices in a row!' : 'Clean slice!'; this.messageUntil = s.elapsed + 1;
      }
    }
    s.targets = s.targets.filter(target => {
      if (cut.has(target.id)) return false;
      target.age += dt;
      if (target.age < target.lifetime) return true;
      if (target.kind === 'bolt') {
        const dodged = Math.abs(input.lean) > 0.65;
        const saved = s.shielding || dodged;
        if (saved) { if (s.shielding) s.blocked++; else s.dodged++; s.score += 65; s.feedback = s.shielding ? 'Shield caught it!' : 'Smooth dodge!'; }
        else { s.hits++; s.combo = 0; s.feedback = 'Orange bolt: raise your left hand or lean away.'; }
        s.bursts.push({ id: target.id, x: target.x, y: target.y, at: s.elapsed, kind: saved ? 'block' : 'hit' }); this.messageUntil = s.elapsed + 1.3;
      } else { s.missed++; s.combo = 0; }
      return false;
    });
    s.trail = s.trail.filter(p => s.elapsed - p.at < 0.22);
    s.bursts = s.bursts.filter(p => s.elapsed - p.at < 0.55);
    if (s.elapsed > this.messageUntil) s.feedback = s.shielding ? 'Shield active · Sweep your sword hand' : 'Lime drones: slice · Orange bolts: shield';
    s.finished = s.elapsed >= s.duration;
    return s;
  }
}
