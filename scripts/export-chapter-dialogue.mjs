import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = 'docs/CHAPTER_01_SCRIPT.md';
const source = await readFile(path.join(root, sourcePath), 'utf8');
const lines = source.split(/\r?\n/);
const dialogue = [];
const exerciseCues = [];
const scenes = [];
const sceneCounts = new Map();
let scene = null;
let context = null;

for (let index = 0; index < lines.length; index++) {
  const line = lines[index];
  const sceneHeading = line.match(/^## Scene (\d{2}) — (.+)$/);
  if (sceneHeading) {
    scene = sceneHeading[1];
    context = sceneHeading[2];
    scenes.push({ id: 'C01_S' + scene, title: context });
    sceneCounts.set(scene, 0);
    continue;
  }
  if (line.startsWith('## ')) {
    scene = null;
    context = null;
  } else if (line.startsWith('### ')) {
    context = line.slice(4);
  }

  const spoken = line.match(/^\*\*(ALDEN|MARA|TOMAS|HERALD|REMEMBERED VOICE)(?: — (.*?))?:\*\* “(.*)”$/);
  if (spoken) {
    if (!scene) throw new Error('Dialogue outside a scene at line ' + (index + 1));
    const count = sceneCounts.get(scene) + 1;
    sceneCounts.set(scene, count);
    dialogue.push({
      id: 'C01_S' + scene + '_L' + String(count).padStart(3, '0'),
      scene: 'C01_S' + scene,
      context,
      speaker: spoken[1],
      condition: spoken[2] ?? null,
      text: spoken[3],
      sourceLine: index + 1,
    });
  }
  const cue = line.match(/^\| ([^|]+) \| ALDEN: “(.*)” \| ([^|]+) \|$/);
  if (cue) {
    exerciseCues.push({
      id: 'C01_CUE_' + cue[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      label: cue[1].trim(),
      speaker: 'ALDEN',
      text: cue[2],
      trigger: cue[3].trim(),
      sourceLine: index + 1,
    });
  }
}

if (scenes.length !== 8 || [...sceneCounts.values()].some(count => count === 0)) {
  throw new Error('Expected eight scenes with dialogue in every scene.');
}
if (exerciseCues.length !== 15) throw new Error('Expected all fifteen exercise cues.');
const ids = [...dialogue, ...exerciseCues].map(cue => cue.id);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate cue ID.');

const outputDir = path.join(root, 'content', 'story');
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'chapter-01-dialogue.json'), JSON.stringify({
  chapter: 'C01',
  title: 'The Gate That Stayed Shut',
  draft: 1,
  source: sourcePath,
  purpose: 'Voice recording and content integration catalogue. Conditions are authoring notes, not executable gameplay rules. Player choices, letters, rewards, and full scene directions remain in the screenplay.',
  scenes,
  dialogue,
  exerciseCues,
}, null, 2) + '\n');
console.log(JSON.stringify({ scenes: scenes.length, spokenLines: dialogue.length, exerciseCues: exerciseCues.length, uniqueIds: ids.length, output: 'content/story/chapter-01-dialogue.json' }));
