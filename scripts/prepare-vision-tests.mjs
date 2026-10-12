import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const directory = new URL('../public/vision/testdata/', import.meta.url);
await mkdir(directory, { recursive: true });
const fixtures = [
  ['pose.jpg', 'https://storage.googleapis.com/mediapipe-assets/pose.jpg', 'c8a830ed683c0276d713dd5aeda28f415f10cd6291972084a40d0d8b934ed62b'],
  ['pose_squats.mp4', 'https://raw.githubusercontent.com/tensorflow/tfjs-models/master/pose-detection/test_data/pose_squats.mp4', 'ea9151e447b301985d5d65666551ef863b369a2e0f3a71ddd58abef2e722f96a'],
];
for (const [name, url, expected] of fixtures) {
  const target = new URL(name, directory);
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  try { if (hash(await readFile(target)) === expected) { console.log(`${name}: verified`); continue; } } catch { /* Download a missing fixture. */ }
  const response = await fetch(url); if (!response.ok) throw new Error(`${name}: download failed (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer()); if (hash(bytes) !== expected) throw new Error(`${name}: upstream fixture changed; review its new checksum before use.`);
  await writeFile(target, bytes); console.log(`${name}: saved to ${fileURLToPath(target)}`);
}
