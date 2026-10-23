import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { maraFigure } from '../lib/maraFigure';
import { texture, sword, shield, disposeScene } from '../lib/arenaAssets';
import { storyCharacter } from '../lib/storyCharacters';
import { clamp } from '../../shared/motion';
import type { DuelEquipment, DuelSnapshot } from '../../shared/duel';
import { goalDistance, moveInCourtyard, routeTo, shots, spawn, type WorldState, type WorldPoint } from '../../shared/courtyard';
import type { Quest, StoryFocus } from '../../shared/chapter';
import type { WeaponPose } from '../../shared/weapons';
import type { BodyPose } from '../../shared/body';
import { SceneQuality, scenePixelRatio, type RenderResolution } from '../lib/renderResolution';

export type ArenaFrame = { duel: DuelSnapshot; active: boolean; equipment: DuelEquipment; opponent?: { pose: WeaponPose | null; body: BodyPose; lean: number }; world?: {
  mode: 'title' | 'memory' | 'explore' | 'dialogue' | 'lesson' | 'duel'; focus: StoryFocus; quest: Quest;
  guided: number; paused: boolean; hidden?: boolean; showWeapons: boolean; speaker?: string; tracking?: boolean;
} };
export type ArenaStatus = { ready: boolean; error: string | null; fps: number; triangles: number; resolution?: number; frameMs?: number };
type Props = { resolution?: RenderResolution; frame: MutableRefObject<ArenaFrame>; onStatus: (status: ArenaStatus) => void; onPointerMove: (x: number, y: number) => void; onWorldUpdate?: (state: WorldState) => void };

export default function FirstPersonArena({ resolution = 1080, frame, onStatus, onPointerMove, onWorldUpdate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseLook = useRef({ x: 0, y: 0 }), previousPointer = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const tv = new URLSearchParams(location.search).get('platform') === 'firetv';
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !tv, powerPreference: 'high-performance', alpha: false }); }
    catch { onStatus({ ready: false, error: 'This display could not start the 3D scene. Try a browser or TV with WebGL 2 support.', fps: 0, triangles: 0 }); return; }
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = !tv; renderer.shadowMap.type = THREE.PCFShadowMap;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#a9beb5'); scene.fog = new THREE.FogExp2('#a9b8a6', 0.019);
    const camera = new THREE.PerspectiveCamera(64, 1.6, 0.04, 140); camera.position.set(0, 1.6, 5.7); camera.rotation.order = 'YXZ'; scene.add(camera);
    const shotCamera = new THREE.PerspectiveCamera(), lookPoint = new THREE.Vector3();
    const skyLight = new THREE.HemisphereLight('#dae7ec', '#76674b', 2.05); scene.add(skyLight);
    const sun = new THREE.DirectionalLight('#ffe4b5', 3.1); sun.position.set(-8, 13, 3); sun.castShadow = !tv;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -13; sun.shadow.camera.right = 13; sun.shadow.camera.top = 13; sun.shadow.camera.bottom = -13; sun.shadow.camera.far = 45; sun.shadow.normalBias = 0.045; scene.add(sun);
    const stoneMap = texture('stone'), earthMap = texture('earth'), woodMap = texture('wood');
    stoneMap.repeat.set(2.5, 2); earthMap.repeat.set(28, 28); woodMap.repeat.set(1, 3);
    const stone = new THREE.MeshStandardMaterial({ color: '#b8b4a1', map: stoneMap, roughness: 0.98 });
    const darkStone = new THREE.MeshStandardMaterial({ color: '#6b6b5c', map: stoneMap, roughness: 1 });
    const wood = new THREE.MeshStandardMaterial({ color: '#9e8c70', map: woodMap, roughness: 0.92 });
    const iron = new THREE.MeshStandardMaterial({ color: '#444d49', metalness: 0.45, roughness: 0.65 });
    const cube = new THREE.BoxGeometry(1, 1, 1);
    const box = (x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material = stone) => {
      const mesh = new THREE.Mesh(cube, mat); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); return mesh;
    };
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(110, 110), new THREE.MeshStandardMaterial({ map: earthMap, roughness: 1, color: '#aaa58b' })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    // Stone keep, open timber training ring, working props and distant hills.
    box(-7.3, 2.4, -10, 9, 4.8, 1.25); box(7.3, 2.4, -10, 9, 4.8, 1.25); box(0, 4.1, -10, 5.6, 1.4, 1.3);
    const gate = box(0, 1.8, -10.4, 5.6, 3.6, 0.28, wood); box(0, 1.15, -10.13, 5.5, 0.13, 0.10, iron); box(0, 2.6, -10.13, 5.5, 0.13, 0.10, iron);
    box(-12, 2, -2, 1.2, 4, 17); box(12, 2, -2, 1.2, 4, 17);
    for (const x of [-5, 5]) {
      box(x, 3.1, -10, 2.4, 6.2, 2.6); box(x, 6.35, -10, 2.7, 0.36, 2.9, darkStone);
      box(x, 4.8, -8.67, 0.35, 1.4, 0.04, iron);
      for (let c = -1; c <= 1; c++) box(x + c * 0.88, 6.8, -8.95, 0.52, 0.62, 0.66);
    }
    for (let x = -11; x <= 11; x += 1.1) box(x, 5.05, -10, 0.65, 0.60, 1.28);
    const awning = box(-8.3, 2.9, -5.8, 5, 0.2, 4, wood); awning.rotation.z = 0.08;
    for (const x of [-10.3, -6.3]) box(x, 1.3, -4.2, 0.14, 2.6, 0.14, wood);
    box(-8.4, 0.75, -5.6, 3, 0.18, 1.2, wood);
    for (let z = -6.5; z < 5; z += 1.65) for (const x of [-4.4, 4.4]) { box(x, 0.52, z, 0.12, 1.04, 0.12, wood); box(x, 0.65, z + 0.76, 0.07, 0.07, 1.6, wood); }
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.66, 64), new THREE.MeshBasicMaterial({ color: '#c4ba90', transparent: true, opacity: 0.45, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.008, -1); scene.add(ring);
    const barrelGeometry = new THREE.CylinderGeometry(0.33, 0.31, 0.86, 12);
    for (const [x, z] of [[7, -6.5], [7.7, -6.8], [-7, -3.6]]) {
      const barrel = new THREE.Mesh(barrelGeometry, wood); barrel.position.set(x, 0.44, z); barrel.castShadow = true; scene.add(barrel);
      for (const y of [0.18, 0.68]) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.326, 0.015, 4, 12), iron); hoop.rotation.x = Math.PI / 2; hoop.position.set(x, y, z); scene.add(hoop); }
    }
    const hay = new THREE.MeshStandardMaterial({ color: '#a49255', roughness: 1 }); box(8.6, 0.35, -8, 2, 0.7, 1.2, hay); box(9, 1.03, -8, 1.1, 0.64, 1.2, hay);
    // A working forge, Orders board, village roofs, lamps and ground detail make
    // the same courtyard a navigable story location instead of a single backdrop.
    box(-9.1, 1.15, -7.1, 1.8, 2.3, 1.5, darkStone); box(-9.1, 2.9, -7.1, .6, 1.6, .7, darkStone);
    const coals = box(-9.1, .8, -6.27, 1.1, .12, .55, new THREE.MeshStandardMaterial({ color: '#c45922', emissive: '#f66113', emissiveIntensity: 1.7, roughness: 1 }));
    const forgeLight = new THREE.PointLight('#ffad55', 5, 7, 2); forgeLight.position.set(-9.1, 1.2, -6); scene.add(forgeLight);
    box(-8.3, 1.02, -5.52, .75, .32, .4, iron); box(-8.3, 1.21, -5.52, 1.15, .15, .45, iron);
    for (const [x, z] of [[-7.2, -5.4], [-9.4, -5.45]]) { const tool = sword(); tool.rotation.z = .35; tool.position.set(x, .92, z); scene.add(tool); }
    const board = document.createElement('canvas'); board.width = 512; board.height = 512; const boardCtx = board.getContext('2d')!;
    boardCtx.fillStyle = '#d2bd8b'; boardCtx.fillRect(0, 0, 512, 512); boardCtx.strokeStyle = '#6c5132'; boardCtx.lineWidth = 10; boardCtx.strokeRect(24, 24, 464, 464);
    boardCtx.fillStyle = '#433c2c'; boardCtx.textAlign = 'center'; boardCtx.font = '36px Georgia'; boardCtx.fillText('THE FIVE SEALS', 256, 83); boardCtx.font = '22px Georgia';
    ['IRONBRIDGE', 'THE HIGH PASS', 'THE RED HEARTH', 'THE SILENT WOOD', 'THE CROWN'].forEach((name, i) => boardCtx.fillText(name, 256, 152 + i * 48));
    boardCtx.font = '17px Georgia'; boardCtx.fillText('Orders and independent champions', 256, 452);
    const boardMap = new THREE.CanvasTexture(board); boardMap.colorSpace = THREE.SRGBColorSpace;
    box(7.5, 1.65, -7.3, 2, 1.7, .12, wood); box(6.75, .65, -7.3, .1, 1.3, .12, wood); box(8.25, .65, -7.3, .1, 1.3, .12, wood);
    const notices = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.45), new THREE.MeshStandardMaterial({ map: boardMap, roughness: 1 })); notices.position.set(7.5, 1.65, -7.22); scene.add(notices);
    const plaster = new THREE.MeshStandardMaterial({ color: '#c0b397', roughness: 1 }), roofMaterial = new THREE.MeshStandardMaterial({ color: '#55483d', roughness: 1 });
    for (const [x, z, height] of [[-17, -13, 5], [16, -16, 5.8], [-15, 7, 4.7], [17, 3, 4.2]]) {
      box(x, height / 2, z, 6, height, 5, plaster);
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0, 4.7, 2.4, 4), roofMaterial); roof.rotation.y = Math.PI / 4; roof.scale.z = .9; roof.position.set(x, height + 1.1, z); scene.add(roof);
      for (const dx of [-2, 0, 2]) box(x + dx, height / 2, z + 2.53, .12, height, .10, wood);
      box(x, height + 1.6, z, .65, 2.2, .75, darkStone);
    }
    const lamps: THREE.Mesh[] = [];
    for (const [x, z] of [[-3, -8.7], [3, -8.7], [-6.4, -4.2]]) {
      box(x, 1.9, z, .08, .65, .12, iron);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(.075, 7, 5), new THREE.MeshBasicMaterial({ color: '#ffd47b' })); flame.position.set(x, 2.22, z); flame.scale.y = 1.9; scene.add(flame); lamps.push(flame);
    }
    const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(.09, .25, 3), new THREE.MeshLambertMaterial({ color: '#646c45' }), 130);
    const instance = new THREE.Object3D();
    for (let i = 0; i < 130; i++) { const side = i % 2 ? -1 : 1; instance.position.set(side * (9.7 + i % 6 * .12), .08, -8.5 + (i * 1.13 % 14)); instance.scale.set(1, .8 + i % 3 * .25, 1); instance.updateMatrix(); grass.setMatrixAt(i, instance.matrix); } scene.add(grass);
    const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.065, 0), darkStone, 100);
    for (let i = 0; i < 100; i++) { instance.position.set(Math.sin(i * 47) * 10.4, .018, Math.cos(i * 13) * 6.5 - 1); instance.scale.set(1, .25, 1.5); instance.updateMatrix(); stones.setMatrixAt(i, instance.matrix); } scene.add(stones);
    const rainPositions = new Float32Array(270 * 3);
    for (let i = 0; i < 270; i++) { rainPositions[i * 3] = Math.sin(i * 47) * 11; rainPositions[i * 3 + 1] = i % 9; rainPositions[i * 3 + 2] = Math.cos(i * 13) * 8 - 5; }
    const rainGeometry = new THREE.BufferGeometry(); rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rain = new THREE.Points(rainGeometry, new THREE.PointsMaterial({ color: '#c9d7db', size: .035, transparent: true, opacity: .45 })); rain.visible = false; scene.add(rain);
    for (let i = 0; i < 12; i++) {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(12 + i % 3 * 5, 10 + i % 4 * 4, 7), new THREE.MeshLambertMaterial({ color: i % 2 ? '#899d9a' : '#82958f' })); hill.position.set(-70 + i * 13, 0, -55 - i % 3 * 8); hill.rotation.y = i; scene.add(hill);
    }
    const bannerMap = texture('banner'); const banners: THREE.Mesh<THREE.PlaneGeometry>[] = [];
    for (const x of [-3.55, 3.55]) {
      box(x, 3, -9.16, 0.04, 3.5, 0.04, iron); box(x, 4.65, -9.16, 1.16, 0.04, 0.04, iron);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.85, 6, 12), new THREE.MeshStandardMaterial({ map: bannerMap, roughness: 1, side: THREE.DoubleSide })); flag.position.set(x, 3.7, -9.05); scene.add(flag); banners.push(flag);
    }
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.4), new THREE.MeshBasicMaterial({ map: texture('shadow'), transparent: true, depthWrite: false, opacity: 0.8 })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; scene.add(shadow);

    const hands = new THREE.Group(); camera.add(hands);
    let ownSword = sword(frame.current.equipment.sword === 'steel'), ownShield = shield(frame.current.equipment.shield === 'heater'); hands.add(ownSword, ownShield);
    let physicalForward: number | null = null, gaitSpeed = 0, gaitPhase = 0;
    const gauntletMaterial = new THREE.MeshStandardMaterial({ color: '#72664f', roughness: 0.83 });
    const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.32, 4, 8), gauntletMaterial); rightArm.rotation.z = -0.2; rightArm.position.set(0.37, -0.58, -0.62); hands.add(rightArm);
    const leftArm = rightArm.clone(); leftArm.position.x = -0.44; leftArm.rotation.z = 0.7; hands.add(leftArm);
    const rightUpperArm = new THREE.Mesh(new THREE.CapsuleGeometry(.05, .26, 4, 8), gauntletMaterial);
    const leftUpperArm = rightUpperArm.clone(); hands.add(rightUpperArm, leftUpperArm);
    hands.traverse(object => { if (object instanceof THREE.Mesh) object.frustumCulled = false; });
    const rival = new THREE.Group(); rival.position.set(0, 0, -2.2); scene.add(rival);
    const instructor = new THREE.Group(); instructor.position.set(-2.5, 0, 1.3); scene.add(instructor);
    const smith = new THREE.Group(); smith.position.set(-8.4, 0, -5.3); scene.add(smith);
    const aldenFigure = storyCharacter('alden'), tomasFigure = storyCharacter('tomas');
    instructor.add(aldenFigure); smith.add(tomasFigure);
    let mixer: THREE.AnimationMixer | null = null, action: THREE.AnimationAction | null = null, disposed = false, ready = false;
    let rivalBlade: THREE.Group | null = null;
    const peerBones: Record<string, THREE.Object3D> = {};
    const clips = new Map<string, THREE.AnimationClip>();
    const controller = new AbortController();
    const load = () => {
      try {
        const model = maraFigure();
        for (const clip of model.animations) clips.set(clip.name, clip);
        for (const required of ['sword_idle', 'sword_attack', 'sword_block', 'hit_chest']) if (!clips.has(required)) throw new Error('The opponent is missing a combat animation.');
        const bounds = new THREE.Box3().setFromObject(model.scene); const size = bounds.getSize(new THREE.Vector3());
        const scale = 1.83 / size.y; model.scene.scale.setScalar(scale); model.scene.position.y = -bounds.min.y * scale;
        model.scene.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
        rival.add(model.scene); mixer = new THREE.AnimationMixer(model.scene);
        let rightHand: THREE.Object3D | null = null, leftHand: THREE.Object3D | null = null;
        model.scene.traverse(object => { if (object.name.endsWith('RightHand')) rightHand = object; if (object.name.endsWith('LeftHand')) leftHand = object; });
        model.scene.traverse(object => { for (const name of ['RightArm', 'RightForeArm', 'RightHand', 'LeftArm', 'LeftForeArm', 'LeftHand']) if (object.name.endsWith(name)) peerBones[name] = object; });
        if (rightHand) { const blade = sword(); rivalBlade = blade; blade.scale.setScalar(1 / scale); blade.rotation.x = Math.PI / 2; blade.position.y = 0.015; (rightHand as THREE.Object3D).add(blade); }
        if (leftHand) { const guard = shield(); guard.scale.setScalar(0.75 / scale); guard.rotation.x = Math.PI / 2; (leftHand as THREE.Object3D).add(guard); }
        ready = true; onStatus({ ready: true, error: null, fps: 0, triangles: 0 });
      } catch (error) { if (!disposed) onStatus({ ready: false, error: error instanceof Error ? error.message : 'The opponent could not load.', fps: 0, triangles: 0 }); }
    };
    load();
    const quality = new SceneQuality(resolution);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = scenePixelRatio(rect.width, rect.height, window.devicePixelRatio || 1, quality.resolution);
      // CSS can report fractional sizes; round physical pixels explicitly so
      // a 1280-wide buffer does not become 1279 through WebGL's floor rounding.
      renderer.setSize(Math.max(1, Math.round(rect.width * ratio)), Math.max(1, Math.round(rect.height * ratio)), false);
      camera.aspect = rect.width / Math.max(1, rect.height); camera.updateProjectionMatrix();
      canvas.dataset.quality = String(quality.resolution);
      canvas.dataset.renderWidth = String(canvas.width); canvas.dataset.renderHeight = String(canvas.height);
      if (new URLSearchParams(location.search).get('qa') === 'render') console.info('[AshenGateRender]', JSON.stringify({ width: canvas.width, height: canvas.height, resolution, density: window.devicePixelRatio }));
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    const lost = (event: Event) => { event.preventDefault(); onStatus({ ready: false, error: 'The 3D display was interrupted. Reload the scene to continue.', fps: 0, triangles: 0 }); };
    canvas.addEventListener('webglcontextlost', lost);
    const heldKeys = new Set<string>();
    let position: WorldPoint = { ...spawn }, yaw = spawn.yaw, pitch = -.025, previousMode = '', guideVersion = 0, guidePath: WorldPoint[] = [], moving = false;
    const keyDown = (event: KeyboardEvent) => {
      if (frame.current.world?.mode !== 'explore' || frame.current.world.paused || document.activeElement !== canvas) return;
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault(); event.stopImmediatePropagation(); heldKeys.add(key); guidePath = [];
      }
    };
    const keyUp = (event: KeyboardEvent) => heldKeys.delete(event.key.toLowerCase());
    const clearKeys = () => heldKeys.clear();
    window.addEventListener('keydown', keyDown, true); window.addEventListener('keyup', keyUp); window.addEventListener('blur', clearKeys);
    let raf = 0, previous = performance.now(), world = 0, sampleAt = previous, frames = 0, swordType = frame.current.equipment.sword, shieldType = frame.current.equipment.shield;
    const upAxis = new THREE.Vector3(0, 1, 0), limbStart = new THREE.Vector3(), limbEnd = new THREE.Vector3(), limbDelta = new THREE.Vector3();
    const connectLimb = (mesh: THREE.Mesh, start: THREE.Vector3, end: THREE.Vector3, length: number) => {
      limbDelta.subVectors(end, start); mesh.position.copy(start).add(end).multiplyScalar(.5);
      mesh.quaternion.setFromUnitVectors(upAxis, limbDelta.clone().normalize()); mesh.scale.y = limbDelta.length() / length;
    };
    const retargetArm = (side: 'Right' | 'Left', hand: THREE.Vector3, elbow: THREE.Vector3) => {
      const upper = peerBones[`${side}Arm`], lower = peerBones[`${side}ForeArm`], wrist = peerBones[`${side}Hand`];
      if (!upper || !lower || !wrist || !upper.parent || !lower.parent) return;
      const root = upper.getWorldPosition(new THREE.Vector3()), scale = lower.getWorldScale(new THREE.Vector3()).y;
      const a = lower.position.length() * scale, b = wrist.position.length() * scale, ray = hand.clone().sub(root), distance = clamp(ray.length(), .04, a + b - .005);
      ray.normalize(); const pole = elbow.clone().sub(root); pole.addScaledVector(ray, -pole.dot(ray)); if (pole.lengthSq() < .0001) pole.set(0, -1, 0); pole.normalize();
      const along = clamp((a * a + distance * distance - b * b) / (2 * distance), -a, a);
      const bend = root.clone().addScaledVector(ray, along).addScaledVector(pole, Math.sqrt(Math.max(0, a * a - along * along)));
      const rotate = (bone: THREE.Object3D, rest: THREE.Vector3, destination: THREE.Vector3) => {
        const direction = destination.clone().sub(bone.getWorldPosition(new THREE.Vector3())).normalize();
        direction.applyQuaternion(bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert());
        bone.quaternion.setFromUnitVectors(rest.clone().normalize(), direction); bone.updateWorldMatrix(false, true);
      };
      rotate(upper, lower.position, bend); rotate(lower, wrist.position, root.clone().addScaledVector(ray, distance));
    };
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      if (document.hidden || frame.current.world?.hidden) { previous = now; sampleAt = now; frames = 0; return; }
      if (now - previous < 1000 / (tv ? 30 : 60) - 0.5) return;
      const dt = Math.min((now - previous) / 1000, 0.05); previous = now; world += dt; frames++;
      const f = frame.current, s = f.duel;
      const mode = f.world?.mode || 'duel', focus = f.world?.focus || 'mara', quest = f.world?.quest || 'mara';
      const rivalSpeed = mode === 'duel' && previousMode === 'duel' ? clamp((s.rivalZ - rival.position.z) / dt, -1.6, 1.6) : 0;
      if (f.active) { gaitSpeed = THREE.MathUtils.damp(gaitSpeed, rivalSpeed, 12, dt); gaitPhase += gaitSpeed * dt / 1.25; }
      if (mode !== previousMode) {
        physicalForward = null;
        gaitSpeed = 0; gaitPhase = 0;
        heldKeys.clear(); mouseLook.current = { x: 0, y: 0 };
        if (mode === 'explore') { position = { x: camera.position.x, z: camera.position.z }; yaw = camera.rotation.y; }
        guidePath = []; guideVersion = 0; previousMode = mode;
      }
      if (swordType !== f.equipment.sword) { hands.remove(ownSword); disposeScene(ownSword); ownSword = sword(f.equipment.sword === 'steel'); hands.add(ownSword); swordType = f.equipment.sword; }
      if (shieldType !== f.equipment.shield) { hands.remove(ownShield); disposeScene(ownShield); ownShield = shield(f.equipment.shield === 'heater'); hands.add(ownShield); shieldType = f.equipment.shield; }
      const sway = Math.sin(world * 1.7) * 0.008;
      moving = false;
      if (mode === 'explore') {
        if (f.world!.guided !== guideVersion) { guideVersion = f.world!.guided; guidePath = guideVersion ? routeTo(quest, position) : []; }
        if (!f.world!.paused) {
          if (f.world!.tracking && s.body.tracked && !guidePath.length) {
            const travel = physicalForward === null ? 0 : clamp(s.body.forward - physicalForward, -.35, .35) * .75;
            position = moveInCourtyard(position, -Math.sin(yaw) * travel, -Math.cos(yaw) * travel);
            moving = Math.abs(travel) > .004;
          }
          physicalForward = f.world!.tracking && s.body.tracked ? s.body.forward : null;
          yaw += ((heldKeys.has('arrowleft') ? 1 : 0) - (heldKeys.has('arrowright') ? 1 : 0)) * dt * 1.35;
          yaw -= mouseLook.current.x * .003; pitch = clamp(pitch - mouseLook.current.y * .003, -.48, .48); mouseLook.current = { x: 0, y: 0 };
          const forward = (heldKeys.has('w') || heldKeys.has('arrowup') ? 1 : 0) - (heldKeys.has('s') || heldKeys.has('arrowdown') ? 1 : 0);
          const strafe = (heldKeys.has('d') ? 1 : 0) - (heldKeys.has('a') ? 1 : 0);
          if (forward || strafe) { const length = Math.max(1, Math.hypot(forward, strafe)); position = moveInCourtyard(position, (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * dt * 2 / length, (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * dt * 2 / length); moving = true; }
          if (guidePath.length) {
            const waypoint = guidePath[0], dx = waypoint.x - position.x, dz = waypoint.z - position.z, distance = Math.hypot(dx, dz);
            if (distance < .1) guidePath.shift();
            else { position = moveInCourtyard(position, dx / distance * Math.min(distance, dt * 2.25), dz / distance * Math.min(distance, dt * 2.25)); yaw = Math.atan2(-dx, -dz); pitch = -.025; moving = true; }
          }
        }
        else physicalForward = null;
        camera.position.set(position.x, 1.6 - s.body.crouch * .42 + (moving ? Math.sin(world * 11) * .015 : sway), position.z); camera.rotation.set(pitch, yaw, 0, 'YXZ');
      } else if (mode === 'duel') {
        if (!f.world?.paused) {
          camera.position.x = THREE.MathUtils.damp(camera.position.x, s.lean * .63, 12, dt); camera.position.z = THREE.MathUtils.damp(camera.position.z, s.playerZ, 12, dt); camera.position.y = THREE.MathUtils.damp(camera.position.y, 1.6 - s.body.crouch * .42 + sway, 18, dt);
          camera.rotation.set(-.025, Math.atan2(camera.position.x - rival.position.x, Math.max(1, s.distance)) * .65, -s.lean * .012);
        }
      } else {
        const actualFocus = mode === 'dialogue' && focus === 'alden' && quest === 'orders' ? 'orders' : focus;
        const shot = shots[actualFocus];
        const targetPosition = new THREE.Vector3(...shot.position); if (mode === 'title') { targetPosition.x += Math.sin(world * .1) * .7; targetPosition.z += Math.cos(world * .1) * .35; }
        camera.position.lerp(targetPosition, Math.min(1, dt * (mode === 'title' ? 1.8 : 4.5)));
        shotCamera.position.copy(targetPosition); lookPoint.set(...shot.look);
        if (mode === 'dialogue' && f.world?.speaker === 'ALDEN') lookPoint.set(instructor.position.x, 1.4, instructor.position.z);
        else if (mode === 'dialogue' && f.world?.speaker === 'MARA') lookPoint.set(rival.position.x, 1.4, rival.position.z);
        else if (mode === 'dialogue' && f.world?.speaker === 'TOMAS') lookPoint.set(smith.position.x, 1.4, smith.position.z);
        shotCamera.lookAt(lookPoint); camera.quaternion.slerp(shotCamera.quaternion, Math.min(1, dt * 4.5));
      }
      const desiredFov = mode === 'dialogue' ? 52 : mode === 'memory' ? 58 : 64;
      camera.fov = THREE.MathUtils.damp(camera.fov, desiredFov, 5, dt); camera.updateProjectionMatrix();
      hands.visible = Boolean(f.world ? f.world.showWeapons && ['explore', 'lesson', 'duel'].includes(mode) : true);
      const storm = mode === 'memory'; rain.visible = storm; skyLight.intensity = storm ? .35 : 2.05; sun.intensity = storm ? .1 : 3.1;
      scene.background = new THREE.Color(storm ? '#273b41' : '#bccacb'); (scene.fog as THREE.FogExp2).color.copy(scene.background);
      if (storm) { for (let i = 1; i < rainPositions.length; i += 3) { rainPositions[i] -= dt * 8; if (rainPositions[i] < .1) rainPositions[i] = 8.8; } rainGeometry.attributes.position.needsUpdate = true; }
      gate.position.y = 1.8 + (storm ? Math.sin(world * 16) * .007 : 0);
      forgeLight.intensity = 4.4 + Math.sin(world * 17) * .5; coals.scale.y = .12 + Math.sin(world * 12) * .02;
      lamps.forEach((lamp, i) => { lamp.scale.y = 1.75 + Math.sin(world * 11 + i) * .2; });
      const swingAge = s.elapsed - s.swingAt, swinging = swingAge >= 0 && swingAge < 0.42;
      const arc = swinging ? Math.sin(swingAge / 0.42 * Math.PI) : 0;
      const handX = (s.blade.x - 0.5) * 0.24, handY = (0.6 - s.blade.y) * 0.15;
      ownSword.position.set(0.43 + handX - arc * 0.70 * s.swingDirection, -0.41 + handY + arc * 0.19 + sway, -0.71 - arc * 0.14);
      ownSword.rotation.set(-0.16 - arc * 0.65, -arc * 0.95 * s.swingDirection, -0.16 + arc * 1.30 * s.swingDirection);
      ownShield.position.x = THREE.MathUtils.damp(ownShield.position.x, s.shielding ? -0.18 : -0.52, 16, dt);
      ownShield.position.y = THREE.MathUtils.damp(ownShield.position.y, s.shielding ? -0.12 : -0.47, 16, dt);
      ownShield.position.z = -0.81; ownShield.rotation.set(0.02, s.shielding ? 0.10 : 0.45, -0.09);
      leftArm.position.set(ownShield.position.x - 0.03, ownShield.position.y - 0.24, -0.62);
      const direct = ['duel', 'lesson', 'explore'].includes(mode) && s.pose;
      // The near-camera guard stays readable without filling the opponent's view.
      ownShield.scale.setScalar(direct ? .62 : 1);
      rightUpperArm.visible = leftUpperArm.visible = Boolean(direct);
      if (direct) {
        // Hilt translation and blade orientation come from the tracked wrist
        // and forearm on every pose packet; no attack arc overrides the player.
        const pose = s.pose!;
        ownSword.position.set(pose.hilt.x, pose.hilt.y, pose.hilt.z);
        ownSword.quaternion.setFromUnitVectors(upAxis, limbDelta.set(pose.axis.x, pose.axis.y, pose.axis.z));
        ownShield.position.set(pose.shield.x, pose.shield.y, pose.shield.z);
        ownShield.rotation.set(clamp((pose.shield.y - pose.shieldElbow.y) * .35, -.3, .3), clamp(pose.shield.x * -.3, -.3, .3), 0);
        limbStart.set(pose.elbow.x, pose.elbow.y, pose.elbow.z); limbEnd.set(pose.hilt.x, pose.hilt.y, pose.hilt.z);
        connectLimb(rightArm, limbStart, limbEnd, .44);
        connectLimb(rightUpperArm, limbStart.set(.26, -.5, -.30), limbEnd.set(pose.elbow.x, pose.elbow.y, pose.elbow.z), .39);
        connectLimb(leftArm, limbStart.set(pose.shieldElbow.x, pose.shieldElbow.y, pose.shieldElbow.z), limbEnd.set(pose.shield.x, pose.shield.y, pose.shield.z), .44);
        connectLimb(leftUpperArm, limbStart.set(-.26, -.5, -.30), limbEnd.set(pose.shieldElbow.x, pose.shieldElbow.y, pose.shieldElbow.z), .39);
      } else { rightArm.scale.y = leftArm.scale.y = 1; rightArm.rotation.set(0,0,-.2); leftArm.rotation.set(0,0,.7); }
      if (mode === 'duel') { rival.position.z = s.rivalZ; if (!f.opponent) rival.position.x = Math.sin(s.exchange * 1.9) * .12; }
      else if (quest === 'orders' || focus === 'orders') rival.position.set(7.2, 0, -6.5);
      else if (quest === 'gate' || quest === 'done') rival.position.set(1.5, 0, -8);
      else rival.position.set(0, 0, -2);
      if (quest === 'gate' || quest === 'done') instructor.position.set(-1.2, 0, -8.1);
      else if (quest === 'orders') instructor.position.set(6, 0, -6.5);
      else if (quest === 'forge') instructor.position.set(-6.95, 0, -5.4);
      else instructor.position.set(-2.5, 0, 1.3);
      for (const character of [rival, instructor, smith]) character.lookAt(camera.position.x, 0, camera.position.z);
      if (rivalBlade) {
        const attacking = s.phase === 'windup' || s.phase === 'strike';
        rivalBlade.rotation.z = attacking ? s.attackLane === 'left' ? .75 : s.attackLane === 'right' ? -.75 : 0 : s.guardLane === 'left' ? -.3 : s.guardLane === 'right' ? .3 : 0;
        rival.rotation.z = attacking ? s.attackLane === 'left' ? -.09 : s.attackLane === 'right' ? .09 : 0 : 0;
      }
      instructor.visible = mode !== 'memory'; smith.visible = mode !== 'memory'; rival.visible = mode !== 'memory';
      shadow.position.set(rival.position.x, 0.012, rival.position.z);
      if (!f.world?.paused) {
        aldenFigure.scale.y = 1 + Math.sin(world * 1.7) * .0018;
        tomasFigure.scale.y = 1 + Math.sin(world * 1.5 + 1) * .002;
      }
      if (mixer && ready && !f.world?.paused && (mode !== 'duel' || f.active || s.finished)) {
        const hitAge = s.event?.kind === 'touch' ? s.elapsed - s.event.at : 10;
        const name = mode !== 'duel' && clips.has('idle') ? 'idle' : hitAge < 0.37 ? 'hit_chest' : s.phase === 'windup' || s.phase === 'strike' ? 'sword_attack' : s.phase === 'guard' && s.event?.kind === 'parry' && s.elapsed - s.event.at < 0.45 ? 'sword_block' : Math.abs(gaitSpeed) > .05 && clips.has('walk_loop') ? 'walk_loop' : 'sword_idle';
        const clip = clips.get(name)!;
        if (action?.getClip() !== clip) { const previousAction = action; action = mixer.clipAction(clip); action.reset().setEffectiveWeight(1).setLoop(THREE.LoopRepeat, Infinity).play(); action.paused = true; previousAction?.crossFadeTo(action, .12, false); }
        if (action) {
          if (name === 'sword_attack') action.time = clip.duration * (s.phase === 'windup' ? 0.03 + s.phaseTime / s.phaseDuration * 0.58 : 0.61 + s.phaseTime / s.phaseDuration * 0.32);
          else if (name === 'hit_chest') action.time = Math.min(hitAge, clip.duration - 0.001);
          else if (name === 'walk_loop') action.time = (gaitPhase % clip.duration + clip.duration) % clip.duration;
          else action.time = (s.phase === 'ready' || s.finished ? world : s.elapsed) % clip.duration;
          mixer.update(dt);
        }
      }
      if (f.opponent && !f.world?.paused) {
        const peer = f.opponent, pose = peer.pose;
        rival.position.x = THREE.MathUtils.damp(rival.position.x, -peer.lean * .6, 12, dt);
        rival.position.y = THREE.MathUtils.damp(rival.position.y, -peer.body.crouch * .28, 12, dt);
        rival.updateWorldMatrix(true, true);
        if (pose) {
          const worldPoint = (v: { x: number; y: number; z: number }) => new THREE.Vector3(rival.position.x - v.x, 1.6 + rival.position.y + v.y, rival.position.z - v.z);
          retargetArm('Right', worldPoint(pose.hilt), worldPoint(pose.elbow)); retargetArm('Left', worldPoint(pose.shield), worldPoint(pose.shieldElbow));
          if (rivalBlade?.parent) {
            const direction = new THREE.Vector3(-pose.axis.x, pose.axis.y, -pose.axis.z).normalize();
            const rotation = new THREE.Quaternion().setFromUnitVectors(upAxis, direction);
            rivalBlade.quaternion.copy(rivalBlade.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));
          }
        }
      }
      for (const flag of banners) {
        const positions = flag.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) positions.setZ(i, Math.sin(positions.getY(i) * 4 + world * 1.7 + positions.getX(i) * 3) * 0.055);
        positions.needsUpdate = true;
      }
      renderer.render(scene, camera);
      if (onWorldUpdate && frames % 5 === 0) onWorldUpdate({ ...position, yaw, distance: goalDistance(position, quest), moving, arrived: Boolean(guideVersion && !guidePath.length && goalDistance(position, quest) < 2.9) });
      if (ready && now - sampleAt >= 1500) {
        const fps = Math.round(frames * 1000 / (now - sampleAt));
        if (quality.sample(fps, !f.world?.paused)) resize();
        canvas.dataset.fps = String(fps);
        onStatus({ ready: true, error: null, fps, triangles: renderer.info.render.triangles, resolution: quality.resolution, frameMs: Math.round(1000 / Math.max(1, fps)) }); sampleAt = now; frames = 0;
      }
    };
    raf = requestAnimationFrame(render);
    return () => { disposed = true; controller.abort(); cancelAnimationFrame(raf); observer.disconnect(); canvas.removeEventListener('webglcontextlost', lost); window.removeEventListener('keydown', keyDown, true); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', clearKeys); mixer?.stopAllAction(); disposeScene(scene); rainGeometry.dispose(); (rain.material as THREE.Material).dispose(); renderer.dispose(); };
  }, [frame, onStatus, onWorldUpdate, resolution]);
  return <canvas ref={canvasRef} tabIndex={0} className="first-person-canvas" aria-label="First-person 3D courtyard: Alden, Mara, the forge and the east gate" onPointerDown={event => { previousPointer.current = { x: event.clientX, y: event.clientY }; event.currentTarget.focus(); }} onPointerUp={() => { previousPointer.current = null; }} onPointerMove={event => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (frame.current.world?.mode === 'explore') { if (event.buttons === 1 && previousPointer.current) { mouseLook.current.x += event.clientX - previousPointer.current.x; mouseLook.current.y += event.clientY - previousPointer.current.y; previousPointer.current = { x: event.clientX, y: event.clientY }; } }
    else onPointerMove((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
  }} onContextMenu={event => event.preventDefault()}/>;
}
