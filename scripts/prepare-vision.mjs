import { mkdir, copyFile, readdir, stat, rename } from 'node:fs/promises';
import { existsSync, createWriteStream } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const destination = join(root, 'public/vision/wasm');
await mkdir(destination, { recursive: true });
if (existsSync(source)) {
  for (const file of await readdir(source)) {
    if ((await stat(join(source, file))).isFile()) await copyFile(join(source, file), join(destination, file));
  }
}
for (const variant of ['lite', 'full']) {
 const model = join(root, `public/vision/pose_landmarker_${variant}.task`);
 if (!existsSync(model) || (await stat(model)).size < 1_000_000) {
  console.log(`Downloading the official MediaPipe ${variant} pose model (one-time setup)...`);
  const response = await fetch(`https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${variant}/float16/1/pose_landmarker_${variant}.task`);
  if (!response.ok || !response.body) throw new Error(`Pose model download failed: ${response.status}. Run npm run assets to retry.`);
  const download = model + '.download';
  await pipeline(Readable.fromWeb(response.body), createWriteStream(download));
  if ((await stat(download)).size < 1_000_000) throw new Error('Incomplete pose model. Run npm run assets to retry.');
  await rename(download, model);
 }
}
console.log('Local camera tracking assets are ready. Camera frames stay on the phone.');
