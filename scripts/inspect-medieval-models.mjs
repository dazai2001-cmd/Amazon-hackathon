import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelDir = path.join(root, 'assets', 'medieval', 'models');

async function inspect(filename) {
  const bytes = await readFile(path.join(modelDir, filename));
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) {
    throw new Error(`${filename}: invalid GLB 2.0 header`);
  }
  let json;
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    if (offset + 8 + length > bytes.length) throw new Error(`${filename}: invalid chunk length`);
    if (type === 0x4e4f534a) json = JSON.parse(bytes.subarray(offset + 8, offset + 8 + length).toString('utf8').trim());
    offset += 8 + length;
  }
  if (!json || json.asset?.version !== '2.0') throw new Error(`${filename}: missing glTF JSON`);
  const externalResources = [...(json.images ?? []), ...(json.buffers ?? [])]
    .map(resource => resource.uri).filter(uri => uri && !uri.startsWith('data:'));
  for (const uri of externalResources) {
    const resolved = path.resolve(modelDir, decodeURIComponent(uri));
    if (!resolved.startsWith(modelDir + path.sep)) throw new Error(`${filename}: unexpected external resource path`);
    await access(resolved);
  }
  let triangles = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      if ((primitive.mode ?? 4) !== 4) continue;
      const accessor = json.accessors[primitive.indices ?? primitive.attributes.POSITION];
      triangles += accessor.count / 3;
    }
  }
  const animationClips = (json.animations ?? []).map((clip, index) => ({
    name: clip.name ?? `Animation ${index + 1}`,
    channels: clip.channels.length,
    durationSeconds: Math.max(0, ...clip.samplers.map(sampler => json.accessors[sampler.input].max?.[0] ?? 0)),
  }));
  return {
    filename,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    gltfVersion: json.asset.version,
    meshes: json.meshes?.length ?? 0,
    triangles,
    skins: json.skins?.length ?? 0,
    joints: (json.skins ?? []).map(skin => skin.joints.length),
    embeddedImages: (json.images ?? []).filter(image => image.bufferView !== undefined).length,
    externalResources,
    animationClips,
  };
}

const reports = await Promise.all(['kaykit-knight.glb', 'sentinel.glb'].map(inspect));
await writeFile(path.join(root, 'assets', 'medieval', 'model-inspection.json'), JSON.stringify(reports, null, 2) + '\n');
for (const report of reports) {
  console.log(JSON.stringify({
    ...report,
    animationClips: report.animationClips.length,
    combatClips: report.animationClips.filter(clip => /melee|block|attack|hit|death|roll|sword/i.test(clip.name)).map(clip => clip.name),
  }));
}
