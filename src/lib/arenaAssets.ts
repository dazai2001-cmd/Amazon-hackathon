import * as THREE from 'three';

export function texture(kind: 'stone' | 'earth' | 'wood' | 'banner' | 'shadow') {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = kind === 'banner' ? 512 : 256;
  const ctx = canvas.getContext('2d')!;
  let seed = 812;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  if (kind === 'shadow') {
    const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
    gradient.addColorStop(0, '#000000a0'); gradient.addColorStop(1, '#00000000'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256);
  } else if (kind === 'banner') {
    ctx.fillStyle = '#60252b'; ctx.fillRect(0, 0, 256, 512);
    ctx.strokeStyle = '#c49c67'; ctx.lineWidth = 7; ctx.strokeRect(14, 14, 228, 484);
    ctx.beginPath(); ctx.moveTo(68, 143); ctx.lineTo(188, 143); ctx.lineTo(188, 243); ctx.quadraticCurveTo(175, 286, 128, 309); ctx.quadraticCurveTo(81, 286, 68, 243); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(128, 173); ctx.lineTo(128, 271); ctx.moveTo(128, 234); ctx.lineTo(99, 208); ctx.moveTo(128, 220); ctx.lineTo(158, 190); ctx.stroke();
    for (let x = 0; x < 256; x += 4) { ctx.fillStyle = `rgba(0,0,0,${random() * 0.1})`; ctx.fillRect(x, 0, 1, 512); }
  } else {
    ctx.fillStyle = kind === 'stone' ? '#8b8473' : kind === 'wood' ? '#534332' : '#77715a'; ctx.fillRect(0, 0, 256, 256);
    if (kind === 'stone') for (let row = 0; row < 8; row++) for (let col = -1; col < 4; col++) {
      const shade = 102 + Math.floor(random() * 39), x = col * 86 + (row % 2) * 43;
      ctx.fillStyle = `rgb(${shade + 8},${shade + 3},${shade - 8})`; ctx.fillRect(x + 2, row * 32 + 2, 82, 28);
      ctx.strokeStyle = '#c8baa933'; ctx.strokeRect(x + 3, row * 32 + 3, 80, 26);
    }
    if (kind === 'wood') for (let x = 0; x < 256; x += 26) { ctx.fillStyle = '#211a14'; ctx.fillRect(x, 0, 2, 256); }
    for (let i = 0; i < 13000; i++) {
      ctx.fillStyle = random() > 0.5 ? `rgba(215,205,180,${random() * 0.18})` : `rgba(20,25,16,${random() * 0.21})`;
      ctx.fillRect(random() * 256, random() * 256, kind === 'wood' ? 1 : random() * 3, kind === 'wood' ? random() * 30 : random() * 3);
    }
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  if (kind !== 'shadow' && kind !== 'banner') { map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 4; }
  return map;
}

export function sword(upgraded = false) {
  const root = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: upgraded ? '#c9d8de' : '#9ba6a8', metalness: 0.68, roughness: 0.30 });
  const leather = new THREE.MeshStandardMaterial({ color: '#302821', roughness: 0.96 });
  const brass = new THREE.MeshStandardMaterial({ color: upgraded ? '#bda06b' : '#6c6c63', metalness: 0.6, roughness: 0.4 });
  const shape = new THREE.Shape(); shape.moveTo(-0.034, 0.02); shape.lineTo(-0.029, 0.76); shape.lineTo(0, 0.84); shape.lineTo(0.029, 0.76); shape.lineTo(0.034, 0.02); shape.closePath();
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.005, bevelSegments: 1, steps: 1 }), steel);
  root.add(blade);
  const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.68, 0.014), new THREE.MeshStandardMaterial({ color: '#58656a', metalness: 0.55, roughness: 0.45 })); fuller.position.set(0, 0.38, 0.016); root.add(fuller);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.032, 0.045), brass); root.add(guard);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.18, 8), leather); grip.position.y = -0.11; root.add(grip);
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), brass); pommel.position.y = -0.23; root.add(pommel);
  return root;
}

export function shield(heater = false) {
  const root = new THREE.Group();
  const map = texture('wood'); map.repeat.set(1.8, 1.2);
  const wood = new THREE.MeshStandardMaterial({ color: '#9b7950', map, roughness: 0.95 });
  const metal = new THREE.MeshStandardMaterial({ color: '#7d8583', metalness: 0.65, roughness: 0.48 });
  if (heater) {
    const shape = new THREE.Shape(); shape.moveTo(-0.30, 0.32); shape.lineTo(0.30, 0.32); shape.lineTo(0.28, -0.10); shape.quadraticCurveTo(0.20, -0.35, 0, -0.48); shape.quadraticCurveTo(-0.20, -0.35, -0.28, -0.10); shape.closePath();
    root.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.01, bevelSegments: 1 }), wood));
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.055, 0.06), metal); band.position.set(0, 0.2, 0.05); root.add(band);
  } else {
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.048, 32), wood); face.rotation.x = Math.PI / 2; root.add(face);
    root.add(new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.019, 6, 32), metal));
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.082, 14, 10), metal); boss.scale.z = 0.60; boss.position.z = 0.045; root.add(boss);
    for (let i = 0; i < 8; i++) { const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 4), metal); rivet.position.set(Math.cos(i * Math.PI / 4) * 0.33, Math.sin(i * Math.PI / 4) * 0.33, 0.027); root.add(rivet); }
  }
  return root;
}

export function disposeScene(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>(), geometries = new Set<THREE.BufferGeometry>();
  root.traverse(object => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
    }
  });
  for (const material of materials) { for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value); material.dispose(); }
  for (const map of textures) { if (typeof ImageBitmap !== 'undefined' && map.image instanceof ImageBitmap) map.image.close(); map.dispose(); }
  for (const geometry of geometries) geometry.dispose();
}
