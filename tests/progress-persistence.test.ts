import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { PlayerStorage } from '../src/lib/playerStorage';
import { newTrainingSave, trainingProgress } from '../shared/training';
import { ClanArchive } from '../server/clanArchive';
import { ClanWars } from '../server/multiplayer';
import { readClanHistory, type WarRecord } from '../shared/clanHistory';
import { SceneQuality } from '../src/lib/renderResolution';
import { summarizeDeviceRun } from '../shared/deviceMetrics';
const cleanTemporaryDirectory = async (directory: string) => {
  assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
  assert.ok(basename(directory).startsWith('earnedvalor-'));
  await rm(directory, { recursive: true, force: true });
};

test('player profiles migrate original saves and isolate gear, rewards and calibrations across restarts', () => {
  const values = new Map([['moveroom.training.v1', '{"xp":180}'], ['moveroom.chapter-one.v1', '{"coins":120}']]);
  const storage = { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const players = new PlayerStorage(storage); assert.equal(players.getItem('moveroom.training.v1'), '{"xp":180}');
  players.add('Mara', 'new-player'); assert.equal(players.getItem('moveroom.training.v1'), null);
  players.setItem('moveroom.training.v1', '{"xp":60}'); players.setItem('moveroom.profile', 'new range');
  const reload = new PlayerStorage(storage); assert.equal(reload.active().name, 'Mara'); assert.equal(reload.getItem('moveroom.training.v1'), '{"xp":60}');
  reload.select('original'); assert.equal(reload.getItem('moveroom.chapter-one.v1'), '{"coins":120}'); assert.equal(reload.getItem('moveroom.profile'), null);
});
test('unavailable player storage still keeps independent session profiles', () => {
  const players = new PlayerStorage({ getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
  players.setItem('training', 'first'); players.add('Alden', 'alden'); players.setItem('training', 'second');
  players.select('original'); assert.equal(players.getItem('training'), 'first'); players.select('alden'); assert.equal(players.getItem('training'), 'second');
});
test('weekly training counts separate real days and excludes previews and future dates', () => {
  const save = newTrainingSave(); save.xp = 180;
  save.history = ['2026-10-11', '2026-10-12', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'].map((day, i) => ({ id: String(i), day, reps: 8, sets: 2, rejected: 0, preview: i === 3, rewarded: i !== 3 }));
  const progress = trainingProgress(save, '2026-10-14'); assert.equal(progress.weekStart, '2026-10-12'); assert.equal(progress.days, 2); assert.equal(progress.rank, 'Oathkeeper'); assert.equal(progress.damagePercent, 6);
  save.xp = 1140; assert.equal(trainingProgress(save, '2026-10-14').xpToNext, 0);
});
test('automatic scene quality reacts only to sustained active low FPS and respects manual settings', () => {
  const auto = new SceneQuality('auto'); assert.equal(auto.sample(22, true), false); assert.equal(auto.sample(30, true), false); assert.equal(auto.sample(24, true), false); assert.equal(auto.sample(23, true), true); assert.equal(auto.resolution, 720);
  assert.equal(auto.sample(60, true), false); const fixed = new SceneQuality(1080); fixed.sample(10, true); fixed.sample(10, true); assert.equal(fixed.resolution, 1080);
  const held = new SceneQuality('auto'); held.sample(10, false); held.sample(10, false); assert.equal(held.resolution, 1080);
});
test('completed wars survive restart and cannot duplicate clan points or leak controller state', async context => {
  const directory = await mkdtemp(join(tmpdir(), 'earnedvalor-history-')); context.after(() => cleanTemporaryDirectory(directory));
  const path = join(directory, 'clans.json'), archive = await ClanArchive.open(path);
  const result: WarRecord = { id: 'sample-war', completedAt: 1000, clans: ['Ashen Guard', 'Ironbridge'], size: 1, score: [1, 0], winner: 0, fighters: ['Alden', 'Mara'] };
  assert.equal(archive.record(result), true); assert.equal(archive.record(result), false); await archive.flush();
  const reload = await ClanArchive.open(path); assert.equal(reload.snapshot().results.length, 1); assert.equal(reload.record(result), false);
  assert.equal(reload.snapshot().clans.find(c => c.name === 'Ashen Guard')?.wins, 1);
  const raw = await readFile(path, 'utf8'); assert.ok(!/phoneToken|tvToken|landmarks|pose/.test(raw));
  const copy = reload.snapshot(); copy.clans[0].members.push('Changed'); assert.ok(!reload.snapshot().clans[0].members.includes('Changed'));
});
test('only a server-completed war enters the archive once', async context => {
  const directory = await mkdtemp(join(tmpdir(), 'earnedvalor-war-')); context.after(() => cleanTemporaryDirectory(directory));
  const archive = await ClanArchive.open(join(directory, 'clans.json')); let now = 100;
  const wars = new ClanWars(() => {}, () => now, false, archive);
  wars.command('one', { type: 'arena-command', action: 'create', name: 'Alden', clan: 'Ashen Guard', size: 1 });
  const code = wars.state('one').war!.code;
  wars.command('two', { type: 'arena-command', action: 'join', code, name: 'Mara', clan: 'Ironbridge', team: 1 });
  for (const room of ['one', 'two']) wars.command(room, { type: 'arena-command', action: 'ready', ready: true });
  wars.command('one', { type: 'arena-command', action: 'start' }); assert.equal(archive.snapshot().results.length, 0);
  wars.command('one', { type: 'arena-command', action: 'leave' }); now += 34; wars.tick(now); now += 34; wars.tick(now);
  assert.equal(archive.snapshot().results.length, 1); assert.deepEqual(archive.snapshot().results[0].score, [0, 1]);
  await archive.flush(); wars.close();
});
test('corrupt archived history is contained and an invalid winner is rejected', async context => {
  const directory = await mkdtemp(join(tmpdir(), 'earnedvalor-corrupt-')); context.after(() => cleanTemporaryDirectory(directory));
  const path = join(directory, 'clans.json'); await writeFile(path, '{broken'); const archive = await ClanArchive.open(path);
  assert.equal(archive.snapshot().results.length, 0); assert.ok(archive.error); assert.equal(await readFile(path, 'utf8'), '{broken');
  assert.equal(readClanHistory({ version: 1, clans: [], results: [{ id: 'bad-result', completedAt: 1, clans: ['First', 'Second'], size: 1, score: [1, 0], winner: 1, fighters: ['Alden', 'Mara'] }] }), null);
});

test('device timing summaries preserve tracking gaps and exclude invalid measurements', () => {
  const summary = summarizeDeviceRun([{ at: 100, visible: true, fps: 20, inferenceMs: 20 }, { at: 150, visible: true, fps: 20, inferenceMs: 25 }, { at: 1000, visible: false, fps: 0, inferenceMs: null }]);
  assert.equal(summary.frames, 3); assert.equal(summary.usablePercent, 67); assert.equal(summary.arrivalP95Ms, 850); assert.equal(summary.inferenceP95Ms, 25);
  assert.equal(summarizeDeviceRun([]).inferenceMedianMs, null);
  const stopped = summarizeDeviceRun([{ at: 150, visible: true, fps: 20, inferenceMs: 20 }], { start: 100, end: 30100 });
  assert.equal(stopped.durationMs, 30000); assert.equal(stopped.largestGapMs, 29950);
  assert.equal(summarizeDeviceRun([], { start: 100, end: 30100 }).largestGapMs, 30000);
});

test('weekly practice dates survive a truncated session history', () => {
  const save = newTrainingSave(); save.practiceDays = ['2026-10-12', '2026-10-13', '2026-10-14'];
  assert.equal(trainingProgress(save, '2026-10-14').days, 3); assert.throws(() => trainingProgress(save, '2026-02-31'));
});

test('recovering from a corrupt primary archive preserves its valid backup on the next write', async context => {
  const directory = await mkdtemp(join(tmpdir(), 'earnedvalor-backup-')); context.after(() => cleanTemporaryDirectory(directory));
  const path = join(directory, 'clans.json'), archive = await ClanArchive.open(path);
  const result: WarRecord = { id: 'backup-war', completedAt: 1000, clans: ['Ashen Guard', 'Ironbridge'], size: 1, score: [1, 0], winner: 0, fighters: ['Alden', 'Mara'] };
  archive.record(result); await archive.flush();
  await writeFile(`${path}.previous`, await readFile(path, 'utf8')); await writeFile(path, '{corrupt');
  const recovered = await ClanArchive.open(path); assert.equal(recovered.snapshot().results.length, 1);
  recovered.record({ ...result, id: 'second-war', completedAt: 2000 }); await recovered.flush();
  assert.equal(readClanHistory(JSON.parse(await readFile(`${path}.previous`, 'utf8')))?.results[0].id, 'backup-war');
  assert.equal((await ClanArchive.open(path)).snapshot().results.length, 2);
});
