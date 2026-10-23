import { mkdir, readFile, writeFile, rename, copyFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { emptyClanHistory, readClanHistory, type ClanHistory, type WarRecord } from '../shared/clanHistory';

/** Only server-declared, finished results are archived; movement and pairing tokens are never saved. */
export class ClanArchive {
  private data = emptyClanHistory();
  private queue: Promise<void> = Promise.resolve();
  private primaryValid = false;
  private recovered = false;
  error: string | null = null;
  private constructor(private path: string) {}
  static async open(path: string) {
    const archive = new ClanArchive(path);
    try {
      const data = readClanHistory(JSON.parse(await readFile(path, 'utf8')));
      if (!data) throw new Error('Saved clan history is invalid.');
      archive.data = data;
      archive.primaryValid = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        try { const previous = readClanHistory(JSON.parse(await readFile(`${path}.previous`, 'utf8'))); if (!previous) throw error; archive.data = previous; archive.recovered = true; }
        catch { archive.error = 'Saved clan history could not be loaded. Its file is preserved; new results will begin a fresh record.'; }
      }
    }
    return archive;
  }
  snapshot(): ClanHistory { return readClanHistory(this.data)!; }
  register(name: string, members: string[], now: number, persist = true) {
    let clan = this.data.clans.find(c => c.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (!clan) { clan = { name, wins: 0, draws: 0, wars: 0, lastPlayed: now, members: [] }; this.data.clans.push(clan); }
    clan.lastPlayed = now; clan.members = [...new Set([...clan.members, ...members])].slice(-20);
    this.data.clans.sort((a, b) => b.lastPlayed - a.lastPlayed); this.data.clans = this.data.clans.slice(0, 100);
    if (persist) this.persist();
  }
  record(result: WarRecord) {
    if (this.data.results.some(r => r.id === result.id)) return false;
    // Keep persistence's contract at its boundary even if a caller is changed later.
    if (!readClanHistory({ ...emptyClanHistory(), results: [result] })) throw new Error('Invalid completed clan result.');
    for (const team of [0, 1] as const) {
      this.register(result.clans[team], result.fighters.slice(team * result.size, (team + 1) * result.size), result.completedAt, false);
      const clan = this.data.clans.find(c => c.name.toLocaleLowerCase() === result.clans[team].toLocaleLowerCase())!;
      clan.wars = Math.min(1000000, clan.wars + 1);
      if (result.winner === team) clan.wins = Math.min(clan.wars - clan.draws, clan.wins + 1);
      if (result.winner === 'draw') clan.draws = Math.min(clan.wars - clan.wins, clan.draws + 1);
    }
    const copy: WarRecord = { ...result, clans: [...result.clans], score: [...result.score], fighters: [...result.fighters] };
    this.data.results = [...this.data.results, copy].slice(-100);
    this.persist(); return true;
  }
  private persist() {
    const snapshot = JSON.stringify(this.data);
    this.queue = this.queue.then(async () => {
      await mkdir(dirname(this.path), { recursive: true });
      await writeFile(`${this.path}.tmp`, snapshot, { mode: 0o600 });
      if (this.primaryValid || !this.recovered) {
        try { await copyFile(this.path, `${this.path}.previous`); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      }
      await rename(`${this.path}.tmp`, this.path); this.primaryValid = true; this.error = null;
    }).catch(() => { this.error = 'Clan history could not be saved. Results remain visible for this server session.'; });
  }
  async flush() { await this.queue; }
}
