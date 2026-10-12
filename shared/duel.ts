import { clamp } from './motion';
import { segmentHitsCircle, type BladeInput, type Point } from './game';
import { attackLane, coversAttack, type AttackLane, type WeaponPose } from './weapons';
import { REST_BODY, type BodyPose } from './body';

export type DuelPhase = 'ready' | 'guard' | 'windup' | 'strike' | 'recover' | 'reset' | 'over';
export type DuelEventKind = 'cut' | 'parry' | 'block' | 'dodge' | 'touch' | 'hit';
export type DuelEquipment = { sword: 'iron' | 'steel'; shield: 'oak' | 'heater' };
export type DuelSnapshot = {
  elapsed: number; phase: DuelPhase; phaseTime: number; phaseDuration: number;
  exchange: number; playerHits: number; rivalHits: number;
  health: number; rivalHealth: number; rivalStamina: number; damageDealt: number; damageTaken: number;
  attackLane: AttackLane; guardLane: AttackLane; shieldPoint: Point; perfectBlocks: number; riposteUntil: number;
  pose: WeaponPose | null; body: BodyPose;
  stamina: number; shielding: boolean; lean: number; blade: Point;
  swingAt: number; swingDirection: number; blocks: number; dodges: number; cuts: number;
  feedback: string; finished: boolean; won: boolean;
  playerZ: number; rivalZ: number; distance: number; attackAim: number;
  event: { id: number; kind: DuelEventKind; at: number } | null;
};

const starter: DuelEquipment = { sword: 'iron', shield: 'oak' };

// A deterministic sparring opponent. Both fighters share this simulation clock,
// so tracking loss, tab blur and manual pauses freeze the whole exchange.
export class SwordDuel {
  aspect = 16 / 9;
  state: DuelSnapshot = {
    elapsed: 0, phase: 'ready', phaseTime: 0, phaseDuration: 1.25,
    exchange: 0, playerHits: 0, rivalHits: 0,
    health: 100, rivalHealth: 100, rivalStamina: 1, damageDealt: 0, damageTaken: 0,
    attackLane: 'high', guardLane: 'left', shieldPoint: { x: .5, y: .26 }, perfectBlocks: 0, riposteUntil: -1, pose: null, body: { ...REST_BODY },
    stamina: 1, shielding: false, lean: 0, blade: { x: 0.7, y: 0.6 },
    swingAt: -10, swingDirection: 1, blocks: 0, dodges: 0, cuts: 0,
    feedback: 'Read her guard. Cover the incoming line, then answer.', finished: false, won: false, event: null,
    playerZ: .6, rivalZ: -1.65, distance: 2.25, attackAim: 0,
  };
  private sequence = -1;
  private nextEvent = 0;
  private attackResolved = false;
  private hitThisOpening = false;
  private swingResolved = true;
  private covering = false;
  private coverAt = -10;
  private swingPower = 0;
  private swingLane: AttackLane = 'left';
  private physicalForward: number | null = null;
  private crouchAim = 0;
  private resuming = false;
  private damageBonus: number;
  private recoveryBonus: number;
  constructor(public equipment: DuelEquipment = starter, training: { damageBonus: number; recoveryBonus: number } = { damageBonus: 0, recoveryBonus: 0 }) {
    this.damageBonus = Number.isFinite(training.damageBonus) ? clamp(training.damageBonus, 0, .08) : 0;
    this.recoveryBonus = Number.isFinite(training.recoveryBonus) ? clamp(training.recoveryBonus, 0, .10) : 0;
  }
  start() { this.phase('guard', 1.25); }
  suspend(input: BladeInput, freezePose = false) {
    this.sequence = input.sequence;
    this.swingResolved = true;
    this.state.shielding = false;
    this.covering = false;
    this.physicalForward = null; this.resuming = true;
    if (input.tracked && !freezePose) { this.state.blade = input.blade; this.state.lean = input.lean; this.state.pose = input.pose || null; this.state.body = input.body || { ...REST_BODY }; }
  }
  private phase(phase: DuelPhase, duration: number) {
    this.state.phase = phase; this.state.phaseTime = 0; this.state.phaseDuration = duration;
  }
  private event(kind: DuelEventKind, feedback: string) {
    this.state.event = { id: ++this.nextEvent, kind, at: this.state.elapsed };
    this.state.feedback = feedback;
  }
  private finish() {
    const s = this.state;
    if (s.rivalHealth <= 0 || s.health <= 0) {
      s.finished = true; s.won = s.rivalHealth <= 0; this.phase('over', 0);
      s.feedback = s.won ? 'Mara yields. You earned the opening and the victory.' : 'You yield. Read her line and manage your stamina on the next attempt.';
    }
  }
  step(delta: number, input: BladeInput, forward = 0) {
    const s = this.state;
    if (!input.tracked || input.pose === null || !Number.isFinite(delta) || delta <= 0 || s.finished || s.phase === 'ready') { this.suspend(input, input.pose === null); return s; }
    const dt = Math.min(delta, 0.05);
    const resumed = this.resuming; this.resuming = false;
    s.body = input.body || { ...REST_BODY };
    if (resumed) { s.attackAim = input.lean; this.crouchAim = s.body.crouch; }
    if (s.body.tracked) {
      if (this.physicalForward !== null) s.playerZ -= clamp(s.body.forward - this.physicalForward, -.35, .35) * .75;
      this.physicalForward = s.body.forward;
    } else this.physicalForward = null;
    s.elapsed += dt; s.phaseTime += dt; s.blade = input.blade; s.lean = input.lean; s.pose = input.pose || null;
    s.playerZ = clamp(s.playerZ - clamp(forward, -1, 1) * 1.35 * dt, Math.max(-1.25, s.rivalZ + 1.3), 1.5);
    if (s.phase === 'guard' || s.phase === 'reset') {
      const target = s.playerZ - 2.15;
      s.rivalZ += clamp(target - s.rivalZ, -1.5 * dt, 1.5 * dt);
      s.attackAim = input.lean;
      this.crouchAim = s.body.crouch;
    } else if (s.phase === 'windup') {
      s.rivalZ = Math.min(s.rivalZ + .46 * dt, s.playerZ - 1.45);
      // She tracks a held stance, then commits to her line late in the wind-up.
      // Moving after this commitment is a dodge; staying leaned is not one.
      if (s.phaseTime < s.phaseDuration * .62) { s.attackAim = input.lean; this.crouchAim = s.body.crouch; }
    } else if (s.phase === 'recover') s.rivalZ -= .20 * dt;
    s.distance = Math.abs(s.playerZ - s.rivalZ);
    s.shielding = (input.pose ? input.pose.guarding : input.shield) && s.stamina > .08;
    s.shieldPoint = input.pose?.shieldPoint || { x: .5, y: .26 };
    const covering = s.shielding && coversAttack(s.shieldPoint, s.attackLane);
    if (covering && !this.covering) this.coverAt = resumed ? -10 : s.elapsed;
    this.covering = covering;
    s.stamina = clamp(s.stamina + (s.shielding ? -(this.equipment.shield === 'heater' ? .14 : .095) : .25 * (1 + this.recoveryBonus)) * dt, 0, 1);
    s.rivalStamina = clamp(s.rivalStamina + (s.phase === 'guard' || s.phase === 'reset' ? .17 : .035) * dt, 0, 1);
    const slash = input.pose ? input.weaponSlash : input.slash;

    if (input.sequence !== this.sequence) {
      this.sequence = input.sequence;
      const cost = this.equipment.sword === 'steel' ? 0.22 : 0.18;
      if (slash && s.elapsed - s.swingAt >= .55 && s.stamina >= cost) {
        s.swingAt = s.elapsed; s.swingDirection = slash.to.x >= slash.from.x ? 1 : -1;
        this.swingLane = attackLane(slash.from, slash.to);
        this.swingPower = (9 + Math.round(clamp((slash.speed - .55) / 2, 0, 1) * 4) + (this.equipment.sword === 'steel' ? 2 : 0)) * (1 + this.damageBonus);
        s.stamina -= cost; s.cuts++;
        this.swingResolved = false;
        this.event('cut', s.phase === 'recover' ? 'Cut across her centre while the opening lasts.' : 'Your cut needs an opening. Watch her shoulder.');
      }
      // A real sweep spans several camera packets. Its leading segment may
      // start outside the rival; keep checking the following segments of the
      // same swing without charging another attack or replaying a packet.
      if (slash && !this.swingResolved && s.elapsed - s.swingAt < .42) {
        const target = { x: .5, y: .61, radius: this.equipment.sword === 'steel' ? .24 : .20 };
        const head = segmentHitsCircle(slash.from, slash.to, { x: .5, y: .43, radius: .09 }, this.aspect);
        const reachesRival = head || segmentHitsCircle(slash.from, slash.to, target, this.aspect);
        const inReach = s.distance <= (this.equipment.sword === 'steel' ? 2.55 : 2.35);
        const guarded = (s.phase === 'guard' || s.phase === 'windup') && this.swingLane === s.guardLane && s.rivalStamina > .10;
        if (!this.hitThisOpening && reachesRival && inReach && !guarded && s.phase !== 'reset') {
          this.hitThisOpening = true; this.swingResolved = true; s.playerHits++;
          const counter = s.phase === 'recover' && s.elapsed <= s.riposteUntil;
          const damage = Math.round(Math.min(25, this.swingPower + (s.phase === 'recover' ? 4 : 0) + (counter ? 5 : 0) + (head ? 3 : 0)));
          const dealt = Math.min(s.rivalHealth, damage); s.rivalHealth -= dealt; s.damageDealt += dealt;
          s.rivalStamina = Math.max(0, s.rivalStamina - .1);
          this.event('touch', `${counter ? 'Riposte' : head ? 'High cut' : 'Clean cut'} · ${dealt} damage. Recover your stance.`);
          this.phase('reset', .75); this.finish();
        } else if (reachesRival && inReach && guarded) {
          this.swingResolved = true;
          s.rivalStamina = Math.max(0, s.rivalStamina - .22);
          if (s.rivalStamina <= .1) { this.phase('recover', 1.3); this.hitThisOpening = false; this.event('parry', 'Her guard broke. Change your line and answer.'); }
          else this.event('parry', 'She covered that line. Change your cut or earn a counter.');
        } else if (reachesRival && !inReach) {
          this.swingResolved = true; s.feedback = 'Your blade fell short. Step closer before the next cut.';
        }
      }
    }

    if (s.phase === 'strike' && !this.attackResolved && s.phaseTime >= 0.10) {
      this.attackResolved = true;
      const guardCost = this.equipment.shield === 'heater' ? 0.16 : 0.22;
      if (s.distance > 2.05) {
        s.dodges++; this.event('dodge', 'Her blade fell short. Step in to answer.');
      } else if (Math.abs(input.lean - s.attackAim) >= .65 && s.stamina >= .12) {
        s.stamina -= .12; s.dodges++; this.event('dodge', 'You left the line of her blade. Now answer.');
      } else if (s.attackLane === 'high' && s.body.tracked && s.body.crouch - this.crouchAim >= .45 && s.stamina >= .12) {
        s.stamina -= .12; s.dodges++; this.event('dodge', 'You ducked beneath her high cut. Now answer.');
      } else if (covering && s.stamina >= guardCost) {
        const perfect = s.elapsed - this.coverAt <= .32;
        s.stamina -= perfect ? guardCost * .5 : guardCost; s.blocks++;
        if (perfect) s.perfectBlocks++;
        s.riposteUntil = perfect ? s.elapsed + 1.25 : -1;
        s.rivalStamina = Math.max(0, s.rivalStamina - (perfect ? .28 : .12));
        this.event('block', perfect ? 'Perfect guard. Answer quickly for a riposte.' : 'Your shield covered her line. Her guard is open.');
      } else {
        const damage = Math.min(s.health, s.attackLane === 'high' ? 16 : 12);
        s.health -= damage; s.damageTaken += damage; s.rivalHits++;
        this.event('hit', `${damage} damage. ${s.shielding && !covering ? 'Move your shield into her attack line.' : 'Cover her line, or move after she commits.'}`); this.finish();
      }
    }
    if (s.finished) return s;
    if (s.phaseTime >= s.phaseDuration) {
      switch (s.phase) {
        case 'guard':
          s.exchange++; this.attackResolved = false; this.hitThisOpening = false;
          s.attackLane = (['high', 'left', 'right', 'left', 'high', 'right'] as AttackLane[])[(s.exchange - 1) % 6];
          s.guardLane = (['left', 'high', 'right'] as AttackLane[])[s.exchange % 3];
          this.phase('windup', (s.exchange % 2 ? 1.04 : .90) - (s.rivalHealth < 35 ? .12 : 0));
          s.feedback = `She commits ${s.attackLane}. Cover that line or evade late.`;
          break;
        case 'windup': this.phase('strike', 0.30); break;
        case 'strike': this.phase('recover', 1.35); if (s.event?.kind !== 'hit') s.feedback = 'Her blade has passed. Cut across her centre.'; break;
        case 'recover': case 'reset': this.hitThisOpening = false; this.phase('guard', 1.05); s.feedback = 'Lower your shield to recover. Read her guard before your cut.'; break;
      }
    }
    return s;
  }
}

export type ChapterSave = {
  version: 1; coins: number; firstWinClaimed: boolean; travelClaimed: boolean;
  equipment: DuelEquipment; motive: 'coin' | 'belonging' | 'truth' | null;
  relationship: 'trust' | 'truth' | 'lucan' | null; completed: boolean;
};
export const newChapterSave = (): ChapterSave => ({ version: 1, coins: 0, firstWinClaimed: false, travelClaimed: false, equipment: { ...starter }, motive: null, relationship: null, completed: false });
export function readChapterSave(value: unknown): ChapterSave {
  const fallback = newChapterSave();
  if (!value || typeof value !== 'object') return fallback;
  const s = value as ChapterSave;
  if (s.version !== 1 || !Number.isSafeInteger(s.coins) || s.coins < 0 || s.coins > 40
    || typeof s.firstWinClaimed !== 'boolean' || typeof s.travelClaimed !== 'boolean' || typeof s.completed !== 'boolean'
    || !['iron', 'steel'].includes(s.equipment?.sword) || !['oak', 'heater'].includes(s.equipment?.shield)
    || ![null, 'coin', 'belonging', 'truth'].includes(s.motive) || ![null, 'trust', 'truth', 'lucan'].includes(s.relationship)) return fallback;
  return { ...s, equipment: { ...s.equipment } };
}
export function claimChapterReward(save: ChapterSave, reward: 'win' | 'travel'): ChapterSave {
  const flag = reward === 'win' ? 'firstWinClaimed' : 'travelClaimed';
  if (save[flag]) return save;
  return { ...save, [flag]: true, coins: save.coins + 20 };
}
export function buyChapterGear(save: ChapterSave, item: 'steel' | 'heater'): ChapterSave {
  const slot = item === 'steel' ? 'sword' : 'shield';
  if (save.coins < 30 || save.equipment[slot] === item) return save;
  return { ...save, coins: save.coins - 30, equipment: { ...save.equipment, [slot]: item } };
}
