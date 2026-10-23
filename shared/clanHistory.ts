export type ClanRecord = { name: string; wins: number; draws: number; wars: number; lastPlayed: number; members: string[] };
export type WarRecord = { id: string; completedAt: number; clans: [string, string]; size: number; score: [number, number]; winner: 0 | 1 | 'draw'; fighters: string[] };
export type ClanHistory = { version: 1; clans: ClanRecord[]; results: WarRecord[] };
export const emptyClanHistory = (): ClanHistory => ({ version: 1, clans: [], results: [] });
const label = (value: unknown, max: number): value is string => typeof value === 'string' && value.length >= 2 && value.length <= max && !/[\u0000-\u001f<>]/.test(value);
const integer = (value: number) => Number.isSafeInteger(value) && value >= 0 && value <= 1000000;
export function readClanHistory(value: unknown): ClanHistory | null {
  if (!value || typeof value !== 'object') return null;
  const h = value as ClanHistory;
  if (h.version !== 1 || !Array.isArray(h.clans) || !Array.isArray(h.results) || h.clans.length > 100 || h.results.length > 100
    || h.clans.some(c => !c || !label(c.name, 24) || ![c.wins, c.draws, c.wars].every(integer) || c.wins + c.draws > c.wars
      || !Number.isFinite(c.lastPlayed) || c.lastPlayed < 0 || !Array.isArray(c.members) || c.members.length > 20 || c.members.some(n => !label(n, 20)))
    || h.results.some(r => !r || typeof r.id !== 'string' || !/^[a-z0-9-]{6,60}$/.test(r.id) || !Number.isFinite(r.completedAt) || r.completedAt < 0
      || !Array.isArray(r.clans) || r.clans.length !== 2 || !r.clans.every(n => label(n, 24)) || ![1, 2, 3].includes(r.size)
      || !Array.isArray(r.score) || r.score.length !== 2 || r.score.some(n => !Number.isFinite(n) || n < 0 || n > r.size || n * 2 % 1 !== 0)
      || r.score[0] + r.score[1] !== r.size || ![0, 1, 'draw'].includes(r.winner)
      || r.winner !== (r.score[0] === r.score[1] ? 'draw' : r.score[0] > r.score[1] ? 0 : 1)
      || !Array.isArray(r.fighters) || r.fighters.length !== r.size * 2 || r.fighters.some(n => !label(n, 20)))
    || new Set(h.results.map(r => r.id)).size !== h.results.length
    || new Set(h.clans.map(c => c.name.toLocaleLowerCase())).size !== h.clans.length) return null;
  return { version: 1, clans: h.clans.map(c => ({ ...c, members: [...c.members] })), results: h.results.map(r => ({ ...r, clans: [...r.clans], score: [...r.score], fighters: [...r.fighters] })) };
}
