import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pack = path.join(root, 'public', 'assets', 'medieval');
const prompts = JSON.parse(await readFile(path.join(pack, 'prompts.json'), 'utf8'));
const assets = [];
for (const asset of prompts.assets) {
  const bytes = await readFile(path.join(root, asset.path));
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`${asset.id}: invalid PNG`);
  const colorType = bytes[25];
  const hasAlpha = colorType === 4 || colorType === 6;
  if (asset.transparent && !hasAlpha) throw new Error(`${asset.id}: missing alpha channel`);
  assets.push({
    id: asset.id,
    category: asset.path.split('/').at(-2),
    file: '/' + asset.path.replace(/^public\//, ''),
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bytes: bytes.length,
    transparent: asset.transparent,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    source: 'Generated for this project with built-in image_gen.imagegen',
  });
}
const manifest = {
  title: 'Medieval first chapter artwork',
  created: prompts.created,
  generator: prompts.tool,
  status: 'Artwork ready; medieval gameplay integration pending',
  assets,
};
await writeFile(path.join(pack, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`${assets.length} PNGs verified; ${assets.filter(asset => asset.transparent).length} include alpha channels.`);
console.log(`Original artwork: ${(assets.reduce((sum, asset) => sum + asset.bytes, 0) / 1024 / 1024).toFixed(1)} MiB`);
