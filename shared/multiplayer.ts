import { clamp } from './motion';
import { segmentHitsCircle, type Point } from './game';
import { attackLane, coversAttack, type AttackLane, type WeaponPose } from './weapons';
import type { BodyPose } from './body';

export type ArenaInput = { seq: number; tracked: boolean; tip: Point; pose: WeaponPose | null; lean: number; body: BodyPose; forward: number };
export type ArenaCommand =
  | { type: 'arena-command'; action: 'create'; name: string; clan: string; size: number }
  | { type: 'arena-command'; action: 'join'; code: string; name: string; clan: string; team: 0 | 1 }
  | { type: 'arena-command'; action: 'ready'; ready: boolean }
  | { type: 'arena-command'; action: 'start' | 'leave' | 'sync' }
  | { type: 'arena-command'; action: 'pause'; paused: boolean }
  | { type: 'arena-command'; action: 'input'; input: ArenaInput };
export type ClanMember = { id: string; name: string; team: 0 | 1; ready: boolean; connected: boolean };
export type Fighter = {
  id: string; name: string; health: number; stamina: number; z: number; lean: number; body: BodyPose; pose: WeaponPose | null;
  cuts: number; blocks: number; perfectBlocks: number; damageDealt: number; damageTaken: number; cutAt: number; lane: AttackLane;
  event: { id: number; kind: 'cut' | 'block' | 'parry' | 'hit'; at: number } | null;
};
export type MatchView = { phase: 'countdown' | 'fighting' | 'held' | 'over'; elapsed: number; countdown: number; distance: number; self: Fighter; peer: Fighter; winner: string | 'draw' | null; feedback: string };
export type ArenaState = { type: 'arena-state'; me: string | null; war: null | { code: string; leader: string; size: number; phase: 'lobby' | 'fighting' | 'complete'; clans: [string, string]; members: ClanMember[]; score: [number, number]; winner: 0 | 1 | 'draw' | null }; match: MatchView | null };
export type ArenaError = { type: 'arena-error'; message: string };

const finite = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const point = (value: unknown): value is Point => Boolean(value && typeof value === 'object' && finite((value as Point).x, -2, 3) && finite((value as Point).y, -2, 3));
const vector = (value: unknown) => Boolean(value && typeof value === 'object' && ['x', 'y', 'z'].every(k => finite((value as Record<string, unknown>)[k], -2, 2)));
export function readArenaInput(value: unknown): ArenaInput | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as ArenaInput, p = v.pose, b = v.body;
  if (!Number.isSafeInteger(v.seq) || v.seq < 0 || typeof v.tracked !== 'boolean' || !point(v.tip) || !finite(v.lean, -1, 1) || !finite(v.forward, -1, 1)
    || !b || typeof b.tracked !== 'boolean' || !finite(b.forward, -1, 1) || !finite(b.crouch, 0, 1)
    || p !== null && (!p || ![p.hilt, p.elbow, p.axis, p.shield, p.shieldElbow].every(vector) || !point(p.tip) || !point(p.shieldPoint)
      || typeof p.guarding !== 'boolean' || !['world', 'image'].includes(p.depthSource) || Math.abs(Math.hypot(p.axis.x, p.axis.y, p.axis.z) - 1) > .08)) return null;
  if (p && (Math.abs(v.tip.x - p.tip.x) > .001 || Math.abs(v.tip.y - p.tip.y) > .001)) return null;
  // Copy only gameplay inputs. Claimed damage, coins, winners and stats from
  // clients have no place in authoritative match state.
  return { seq: v.seq, tracked: v.tracked && Boolean(p), tip: { ...v.tip }, lean: v.lean, forward: v.forward, body: { tracked: b.tracked, forward: b.forward, crouch: b.crouch }, pose: p ? {
    hilt: { ...p.hilt }, axis: { ...p.axis }, elbow: { ...p.elbow }, shield: { ...p.shield }, shieldElbow: { ...p.shieldElbow }, tip: { ...p.tip }, shieldPoint: { ...p.shieldPoint }, guarding: p.guarding, depthSource: p.depthSource,
  } : null };
}

type Runtime = { input: ArenaInput | null; receivedAt: number; previousTip: Point | null; previousAt: number; sequence: number; paused: boolean; physicalForward: number | null; coverSince: Record<AttackLane, number>; wasCovering: Record<AttackLane, boolean>; pending: { from: Point; to: Point; speed: number } | null; riposteUntil: number; swingUntil: number; swingResolved: boolean; swingPower: number };
const initial = (id: string, name: string, z: number): Fighter => ({ id, name, z, health: 100, stamina: 1, lean: 0, body: { tracked: false, forward: 0, crouch: 0 }, pose: null, cuts: 0, blocks: 0, perfectBlocks: 0, damageDealt: 0, damageTaken: 0, cutAt: -10, lane: 'high', event: null });
const runtime = (): Runtime => ({ input: null, receivedAt: -Infinity, previousTip: null, previousAt: 0, sequence: -1, paused: false, physicalForward: null, coverSince: { high: -10, left: -10, right: -10 }, wasCovering: { high: false, left: false, right: false }, pending: null, riposteUntil: -10, swingUntil: -10, swingResolved: true, swingPower: 0 });
const mirrorLane = (lane: AttackLane): AttackLane => lane === 'left' ? 'right' : lane === 'right' ? 'left' : lane;

// No opponent AI runs here. Every strike, guard and footstep comes from one of
// the two authenticated player streams; the server owns combat and scoring.
export class HumanDuel {
  fighters: [Fighter, Fighter];
  private runtime: [Runtime, Runtime] = [runtime(), runtime()];
  elapsed = 0; countdown = 3; held = true; winner: string | 'draw' | null = null; feedback = 'Both fighters need their movement controllers in view.';
  private eventId = 0;
  private active = false;
  constructor(a: { id: string; name: string }, b: { id: string; name: string }) { this.fighters = [initial(a.id, a.name, .6), initial(b.id, b.name, -1.65)]; }
  accept(index: 0 | 1, value: ArenaInput, now: number) {
    const r = this.runtime[index];
    if (value.seq <= r.sequence) return false;
    r.sequence = value.seq; r.input = value; r.receivedAt = now;
    const gap = now - r.previousAt;
    if (value.tracked && r.previousTip && gap > 0 && gap <= 180 && !r.paused && this.active) {
      const distance = Math.hypot(value.tip.x - r.previousTip.x, value.tip.y - r.previousTip.y), speed = distance / (gap / 1000);
      if (distance >= .02 && speed >= .55 && speed <= 12) r.pending = { from: { ...r.previousTip }, to: { ...value.tip }, speed };
    }
    r.previousTip = value.tracked ? { ...value.tip } : null; r.previousAt = now;
    return true;
  }
  pause(index: 0 | 1, paused: boolean) { this.runtime[index].paused = paused; }
  available(index: 0 | 1, now: number) { const r = this.runtime[index]; return Boolean(r.input?.tracked && !r.paused && now - r.receivedAt <= 500); }
  reconnect(index: 0 | 1) { this.runtime[index] = runtime(); }
  private suspend() {
    this.active = false; this.held = true;
    for (const r of this.runtime) { r.pending = null; r.previousTip = null; r.physicalForward = null; r.swingResolved = true; r.wasCovering = { high: false, left: false, right: false }; r.coverSince = { high: -10, left: -10, right: -10 }; }
  }
  private event(index: 0 | 1, kind: 'cut' | 'block' | 'parry' | 'hit') { this.fighters[index].event = { id: ++this.eventId, kind, at: this.elapsed }; }
  forfeit(index: 0 | 1 | 'both') {
    if (this.winner) return;
    this.winner = index === 'both' ? 'draw' : this.fighters[index === 0 ? 1 : 0].id;
    this.feedback = index === 'both' ? 'Both fighters left. This pairing is a draw.' : `${this.fighters[index === 0 ? 1 : 0].name} wins by forfeit.`;
  }
  step(seconds: number, now: number) {
    if (this.winner) return;
    if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(now)) return;
    if (this.runtime.some(r => !r.input?.tracked || r.paused || now - r.receivedAt > 500)) {
      this.suspend(); this.feedback = this.runtime.some(r => r.paused) ? 'A fighter has paused. Both blades wait.' : 'Movement missing. Both fighters must return to view.'; return;
    }
    const resumed = !this.active; this.active = true; this.held = false;
    if (resumed && this.countdown === 0) this.feedback = 'Controllers ready. Read the blade, cover its line, then counter.';
    const dt = clamp(seconds, 0, .05); this.elapsed += dt;
    for (const i of [0, 1] as const) {
      const r = this.runtime[i], p = this.fighters[i], input = r.input!;
      p.pose = input.pose; p.lean = input.lean; p.body = { ...input.body };
      if (resumed) r.pending = null;
      if (r.physicalForward !== null) p.z += (i === 0 ? -1 : 1) * clamp(input.body.forward - r.physicalForward, -.35, .35) * .75;
      r.physicalForward = input.body.tracked ? input.body.forward : null;
      p.z += (i === 0 ? -1 : 1) * input.forward * dt * 1.35;
      p.z = i === 0 ? clamp(p.z, this.fighters[1].z + 1.3, 3.5) : clamp(p.z, -4.5, this.fighters[0].z - 1.3);
      p.stamina = clamp(p.stamina + (input.pose?.guarding ? -.095 : .25) * dt, 0, 1);
      for (const lane of ['high', 'left', 'right'] as const) {
        const covering = Boolean(input.pose?.guarding && p.stamina > .08 && coversAttack(input.pose.shieldPoint, lane));
        if (covering && !r.wasCovering[lane]) r.coverSince[lane] = resumed ? -10 : this.elapsed;
        r.wasCovering[lane] = covering;
      }
    }
    if (this.countdown > 0) { this.countdown = Math.max(0, this.countdown - dt); for (const r of this.runtime) r.pending = null; this.feedback = this.countdown > 0 ? 'Take your guard. The duel begins together.' : 'Read the blade. Cover its line, then counter.'; return; }
    for (const i of [0, 1] as const) {
      const r = this.runtime[i], p = this.fighters[i], defender = this.fighters[i === 0 ? 1 : 0], other = this.runtime[i === 0 ? 1 : 0];
      const slash = r.pending; r.pending = null;
      if (!slash) continue;
      if (this.elapsed - p.cutAt >= .65 && p.stamina >= .18) {
        p.stamina -= .18; p.cuts++; p.cutAt = this.elapsed; p.lane = attackLane(slash.from, slash.to); this.event(i, 'cut');
        r.swingUntil = this.elapsed + .3; r.swingResolved = false; r.swingPower = 12 + Math.round(clamp(slash.speed - .55, 0, 2) * 2);
      }
      if (r.swingResolved || this.elapsed > r.swingUntil) continue;
      if (Math.abs(p.z - defender.z) > 2.35) { this.feedback = `${p.name} swings outside sword reach.`; continue; }
      const target = { x: .5 - defender.lean * .15, y: .57 + defender.body.crouch * .15, radius: .19 };
      const head = { x: target.x, y: .32 + defender.body.crouch * .17, radius: .13 };
      if (!segmentHitsCircle(slash.from, slash.to, target, 16 / 9) && !segmentHitsCircle(slash.from, slash.to, head, 16 / 9)) continue;
      r.swingResolved = true;
      const lane = mirrorLane(p.lane), perfect = other.wasCovering[lane] && this.elapsed - other.coverSince[lane] <= .32;
      if (other.wasCovering[lane] && defender.stamina >= (perfect ? .12 : .22)) {
        defender.stamina -= perfect ? .12 : .22; defender.blocks++; if (perfect) { defender.perfectBlocks++; other.riposteUntil = this.elapsed + 1.25; }
        this.event(i === 0 ? 1 : 0, perfect ? 'parry' : 'block'); this.feedback = `${defender.name} ${perfect ? 'parries: counter now' : 'covers the incoming line'}.`; continue;
      }
      const damage = r.swingPower + (r.riposteUntil > this.elapsed ? 5 : 0);
      const actual = Math.min(defender.health, damage);
      defender.health -= actual; defender.damageTaken += actual; p.damageDealt += actual; r.riposteUntil = -10;
      this.event(i === 0 ? 1 : 0, 'hit'); this.feedback = `${p.name} lands ${actual} damage.`;
    }
    if (this.fighters.some(p => p.health <= 0)) {
      this.winner = this.fighters.every(p => p.health <= 0) ? 'draw' : this.fighters.find(p => p.health > 0)!.id;
      this.feedback = this.winner === 'draw' ? 'Both fighters yield. A drawn pairing.' : `${this.fighters.find(p => p.id === this.winner)!.name} wins the pairing.`;
    }
  }
  view(index: 0 | 1): MatchView {
    return { phase: this.winner ? 'over' : this.held ? 'held' : this.countdown > 0 ? 'countdown' : 'fighting', countdown: this.countdown, elapsed: this.elapsed,
      distance: Math.abs(this.fighters[0].z - this.fighters[1].z), self: this.fighters[index], peer: this.fighters[index === 0 ? 1 : 0], winner: this.winner, feedback: this.feedback };
  }
}
