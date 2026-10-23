type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export type Player = { id: string; name: string };
export type Players = { version: 1; active: string; players: Player[] };
const key = 'earnedvalor.players.v1';
const fallback = (): Players => ({ version: 1, active: 'original', players: [{ id: 'original', name: 'Squire' }] });
export function readPlayers(value: unknown): Players {
  if (!value || typeof value !== 'object') return fallback();
  const data = value as Players;
  if (data.version !== 1 || !Array.isArray(data.players) || !data.players.length || data.players.length > 6
    || data.players.some(p => !p || !/^[a-z0-9-]{1,40}$/.test(p.id) || typeof p.name !== 'string' || p.name.trim().length < 2 || p.name.length > 20 || /[\u0000-\u001f<>]/.test(p.name))
    || new Set(data.players.map(p => p.id)).size !== data.players.length || !data.players.some(p => p.id === data.active)) return fallback();
  return { version: 1, active: data.active, players: data.players.map(p => ({ id: p.id, name: p.name.trim() })) };
}
export class PlayerStorage {
  private data: Players;
  private memory = new Map<string, string>();
  constructor(private storage?: StorageLike) {
    try { this.data = readPlayers(JSON.parse(storage?.getItem(key) || 'null')); } catch { this.data = fallback(); }
  }
  roster() { return readPlayers(this.data); }
  active() { return this.data.players.find(p => p.id === this.data.active)!; }
  private save() { try { this.storage?.setItem(key, JSON.stringify(this.data)); } catch { /* Session profiles remain available. */ } }
  add(name: string, id = `p${Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8, '0')).join('')}`) {
    if (this.data.players.length >= 6) throw new Error('This device already has six squires. Choose an existing profile.');
    const next = readPlayers({ ...this.data, active: id, players: [...this.data.players, { id, name: name.trim() }] });
    if (next.active !== id || this.data.players.some(p => p.id === id)) throw new Error('Choose a name between 2 and 20 characters.');
    this.data = next; this.save(); return this.active();
  }
  select(id: string) { if (!this.data.players.some(p => p.id === id)) return false; this.data.active = id; this.save(); return true; }
  getItem(name: string) {
    const scoped = `earnedvalor.player.${this.data.active}.${name}`;
    if (this.memory.has(scoped)) return this.memory.get(scoped)!;
    try {
      const saved = this.storage?.getItem(scoped);
      // Original saves stay attached to the first squire, including old rewards and gear.
      return saved ?? (this.data.active === 'original' ? this.storage?.getItem(name) : null) ?? null;
    } catch { return null; }
  }
  setItem(name: string, value: string) {
    const scoped = `earnedvalor.player.${this.data.active}.${name}`; this.memory.set(scoped, value);
    try { this.storage?.setItem(scoped, value); } catch { /* Keep this player's session progress. */ }
  }
}
let storage: StorageLike | undefined;
try { storage = typeof localStorage === 'undefined' ? undefined : localStorage; } catch { /* Browser storage can be disabled. */ }
export const playerStorage = new PlayerStorage(storage);
