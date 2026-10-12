import { randomBytes, randomInt } from 'node:crypto';
import { HumanDuel, readArenaInput, type ArenaCommand, type ArenaState, type ClanMember } from '../shared/multiplayer';

type Member = ClanMember & { room: string; lastSeen: number; pauseAt: number | null };
type Pairing = { members: [string, string]; duel: HumanDuel; scored: boolean; missingSince: [number | null, number | null] };
type War = { code: string; leader: string; size: number; phase: 'lobby' | 'fighting' | 'complete'; clans: [string, string]; members: Member[]; pairs: Pairing[]; score: [number, number]; winner: 0 | 1 | 'draw' | null; createdAt: number };
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const name = (value: unknown, max: number) => typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= max && !/[\u0000-\u001f<>]/.test(value) ? value.trim() : null;

export class ClanWars {
  private wars = new Map<string, War>();
  private membership = new Map<string, { war: War; member: Member }>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTick: number;
  private broadcastAt = 0;
  constructor(private send: (room: string, message: object) => void, private clock = () => Date.now(), autoTick = true) {
    this.lastTick = clock();
    if (autoTick) { this.timer = setInterval(() => this.tick(clock()), 1000 / 30); this.timer.unref(); }
  }
  close() { if (this.timer) clearInterval(this.timer); this.wars.clear(); this.membership.clear(); }
  private error(room: string, message: string) { this.send(room, { type: 'arena-error', message }); }
  state(room: string): ArenaState {
    const found = this.membership.get(room);
    if (!found) return { type: 'arena-state', me: null, war: null, match: null };
    const { war, member } = found, pair = war.pairs.find(p => p.members.includes(member.id));
    return { type: 'arena-state', me: member.id, war: { code: war.code, leader: war.leader, size: war.size, phase: war.phase, clans: [...war.clans],
      members: war.members.map(({ id, name, team, ready, connected }) => ({ id, name, team, ready, connected })), score: [...war.score], winner: war.winner },
      match: pair ? pair.duel.view(pair.members[0] === member.id ? 0 : 1) : null };
  }
  private publish(war: War) { for (const m of war.members) if (m.connected) this.send(m.room, this.state(m.room)); }
  private member(room: string, alias: string, team: 0 | 1): Member { return { room, id: randomBytes(8).toString('hex'), name: alias, team, ready: false, connected: true, lastSeen: this.clock(), pauseAt: null }; }
  command(room: string, value: unknown): boolean {
    if (!value || typeof value !== 'object' || (value as { type?: string }).type !== 'arena-command') return false;
    const message = value as ArenaCommand, found = this.membership.get(room);
    if (message.action === 'sync') { this.send(room, this.state(room)); return true; }
    if (message.action === 'leave') { this.leave(room); return true; }
    if (message.action === 'create') {
      if (found) { this.error(room, 'Leave your current war before creating another.'); return true; }
      const alias = name(message.name, 20), clan = name(message.clan, 24);
      if (!alias || !clan || ![1, 2, 3].includes(message.size) || this.wars.size >= 100) { this.error(room, 'Choose a fighter name, clan name and one to three fighters per clan.'); return true; }
      let code: string; do { code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''); } while (this.wars.has(code));
      const member = this.member(room, alias, 0), war: War = { code, leader: member.id, size: message.size, phase: 'lobby', clans: [clan, 'Challengers'], members: [member], pairs: [], score: [0, 0], winner: null, createdAt: this.clock() };
      this.wars.set(code, war); this.membership.set(room, { war, member }); this.publish(war); return true;
    }
    if (message.action === 'join') {
      if (found) { this.error(room, 'Leave your current war before joining another.'); return true; }
      const alias = name(message.name, 20), clan = name(message.clan, 24), war = typeof message.code === 'string' ? this.wars.get(message.code.toUpperCase()) : undefined;
      if (!alias || !clan || !war || war.phase !== 'lobby' || ![0, 1].includes(message.team)) { this.error(room, 'That war is unavailable. Check the invite code and names.'); return true; }
      if (war.members.filter(m => m.team === message.team).length >= war.size) { this.error(room, 'That clan roster is full.'); return true; }
      if (message.team === 1 && !war.members.some(m => m.team === 1)) war.clans[1] = clan;
      const member = this.member(room, alias, message.team); war.members.push(member); if (!war.leader && message.team === 0) war.leader = member.id; this.membership.set(room, { war, member }); this.publish(war); return true;
    }
    if (!found) { this.error(room, 'Create or join a clan war first.'); return true; }
    const { war, member } = found; member.lastSeen = this.clock();
    // A final input can already be in flight when the server declares victory.
    // It must not turn a legitimate result screen into a connection error.
    if (war.phase === 'complete' && (message.action === 'input' || message.action === 'pause')) return true;
    if (message.action === 'ready' && typeof message.ready === 'boolean' && war.phase === 'lobby') { member.ready = message.ready; this.publish(war); return true; }
    if (message.action === 'start') {
      const teams = ([0, 1] as const).map(team => war.members.filter(m => m.team === team));
      if (war.leader !== member.id || war.phase !== 'lobby' || teams.some(team => team.length !== war.size || team.some(m => !m.ready || !m.connected))) { this.error(room, 'The captain starts when both rosters are full and ready.'); return true; }
      war.pairs = teams[0].map((a, index) => ({ members: [a.id, teams[1][index].id], duel: new HumanDuel(a, teams[1][index]), scored: false, missingSince: [null, null] })); war.phase = 'fighting'; this.publish(war); return true;
    }
    const pair = war.pairs.find(p => p.members.includes(member.id));
    if (!pair || war.phase !== 'fighting') { this.error(room, 'There is no active pairing for this fighter.'); return true; }
    const index = pair.members[0] === member.id ? 0 : 1;
    if (pair.duel.winner && (message.action === 'input' || message.action === 'pause')) return true;
    if (message.action === 'pause' && typeof message.paused === 'boolean') { pair.duel.pause(index, message.paused); member.pauseAt = message.paused ? this.clock() : null; return true; }
    if (message.action === 'input') {
      const input = readArenaInput(message.input);
      if (input) pair.duel.accept(index, input, this.clock()); else this.error(room, 'Invalid movement input.');
      return true;
    }
    this.error(room, 'Unsupported clan-war action.'); return true;
  }
  connected(room: string, connected: boolean) {
    const found = this.membership.get(room); if (!found) return;
    found.member.connected = connected;
    if (connected) {
      found.member.lastSeen = this.clock(); found.member.pauseAt = null;
      const pair = found.war.pairs.find(p => p.members.includes(found.member.id));
      if (pair) pair.duel.reconnect(pair.members[0] === found.member.id ? 0 : 1);
    }
    this.publish(found.war);
  }
  leave(room: string) {
    const found = this.membership.get(room); if (!found) { this.send(room, this.state(room)); return; }
    const { war, member } = found, pair = war.pairs.find(p => p.members.includes(member.id));
    if (pair) pair.duel.forfeit(pair.members[0] === member.id ? 0 : 1);
    member.connected = false; this.membership.delete(room);
    if (war.phase === 'lobby') { war.members = war.members.filter(m => m !== member); if (war.leader === member.id) war.leader = war.members.find(m => m.team === 0)?.id || ''; }
    this.send(room, { type: 'arena-state', me: null, war: null, match: null });
    if (!war.members.some(m => this.membership.has(m.room))) this.wars.delete(war.code); else this.publish(war);
  }
  tick(now: number) {
    const dt = Math.min(.05, Math.max(0, (now - this.lastTick) / 1000)); this.lastTick = now;
    for (const war of this.wars.values()) {
      if (now - war.createdAt > 60 * 60 * 1000) { for (const m of war.members) this.membership.delete(m.room); this.wars.delete(war.code); continue; }
      if (war.phase === 'fighting') {
        for (const pair of war.pairs) {
          const members = pair.members.map(id => war.members.find(m => m.id === id)!);
          const absent = members.map((m, index) => !m.connected || !pair.duel.available(index as 0 | 1, now) || now - m.lastSeen > 1000);
          for (const i of [0, 1] as const) { if (!absent[i]) pair.missingSince[i] = null; else pair.missingSince[i] ??= now; }
          const forfeits = pair.missingSince.map(t => t !== null && now - t >= 30000);
          if (forfeits.some(Boolean)) pair.duel.forfeit(forfeits.every(Boolean) ? 'both' : forfeits[0] ? 0 : 1);
          pair.duel.step(dt, now);
          if (pair.duel.winner && !pair.scored) {
            pair.scored = true;
            if (pair.duel.winner === 'draw') { war.score[0] += .5; war.score[1] += .5; }
            else war.score[war.members.find(m => m.id === pair.duel.winner)!.team]++;
          }
        }
        if (war.pairs.every(pair => pair.scored)) { war.phase = 'complete'; war.winner = war.score[0] === war.score[1] ? 'draw' : war.score[0] > war.score[1] ? 0 : 1; }
      }
      if (now - this.broadcastAt >= 65) this.publish(war);
    }
    if (now - this.broadcastAt >= 65) this.broadcastAt = now;
  }
}
