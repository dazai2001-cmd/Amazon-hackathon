import * as THREE from 'three';

/** Original, lightweight courtyard champion. The same articulated arms support human opponents. */
export function maraFigure() {
  const scene = new THREE.Group(); scene.name = 'Mara';
  const materials = {
    skin: new THREE.MeshStandardMaterial({ color: '#b98969', roughness: .85, flatShading: true }),
    hair: new THREE.MeshStandardMaterial({ color: '#3c2621', roughness: .97, flatShading: true }),
    cloth: new THREE.MeshStandardMaterial({ color: '#334c47', roughness: .93, flatShading: true }),
    leather: new THREE.MeshStandardMaterial({ color: '#493a2d', roughness: .88 }),
    steel: new THREE.MeshStandardMaterial({ color: '#929f99', metalness: .55, roughness: .5, flatShading: true }),
    gold: new THREE.MeshStandardMaterial({ color: '#c5a970', metalness: .4, roughness: .55 }),
    eye: new THREE.MeshStandardMaterial({ color: '#252e29', roughness: 1 }),
  };
  const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, scale?: [number, number, number]) => {
    const object = new THREE.Mesh(geometry, material); object.position.set(x, y, z); if (scale) object.scale.set(...scale);
    object.castShadow = object.receiveShadow = true; parent.add(object); return object;
  };
  const oval = (parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, scale: [number, number, number]) => mesh(parent, new THREE.SphereGeometry(1, 12, 8), material, x, y, z, scale);
  const chest = new THREE.Group(); chest.name = 'Chest'; chest.position.y = 1.13; scene.add(chest);
  oval(chest, materials.cloth, 0, -.07, 0, [.22, .32, .13]);
  mesh(chest, new THREE.BoxGeometry(.33, .29, .03), materials.steel, 0, .035, .12);
  mesh(chest, new THREE.BoxGeometry(.014, .1, .012), materials.gold, 0, .04, .145);
  for (const side of [-1, 1]) mesh(chest, new THREE.BoxGeometry(.012, .047, .012), materials.gold, side * .014, .045, .145).rotation.z = -side * .7;
  mesh(scene, new THREE.CylinderGeometry(.23, .205, .047, 12), materials.leather, 0, .87, 0).scale.z = .65;
  mesh(scene, new THREE.BoxGeometry(.055, .05, .023), materials.gold, 0, .87, .145);
  const legs: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.name = side < 0 ? 'RightLeg' : 'LeftLeg'; leg.position.set(side * .105, .79, 0); scene.add(leg); legs.push(leg);
    mesh(leg, new THREE.CapsuleGeometry(.077, .48, 3, 8), materials.cloth, 0, -.31, 0);
    oval(leg, materials.steel, 0, -.47, .075, [.082, .11, .03]);
    oval(leg, materials.leather, 0, -.7, .04, [.088, .095, .16]);
  }
  oval(scene, materials.skin, 0, 1.45, 0, [.065, .08, .065]);
  oval(scene, materials.skin, 0, 1.64, .01, [.112, .16, .104]);
  oval(scene, materials.hair, 0, 1.76, -.035, [.116, .08, .106]);
  for (const side of [-1, 1]) {
    oval(scene, materials.hair, side * .108, 1.64, -.04, [.029, .115, .06]);
    oval(scene, materials.eye, side * .044, 1.68, .105, [.018, .011, .009]);
    mesh(scene, new THREE.BoxGeometry(.046, .011, .012), materials.hair, side * .045, 1.707, .097).rotation.z = side * .14;
  }
  oval(scene, materials.skin, 0, 1.65, .113, [.018, .033, .027]);
  mesh(scene, new THREE.BoxGeometry(.041, .006, .012), materials.leather, 0, 1.59, .107);
  for (let i = 0; i < 7; i++) oval(scene, materials.hair, .12 + Math.sin(i * .9) * .01, 1.61 - i * .06, -.08, [.026, .045, .033]);
  const cape = mesh(chest, new THREE.PlaneGeometry(.44, .72, 1, 2), new THREE.MeshStandardMaterial({ color: '#2d3e36', side: THREE.DoubleSide, roughness: 1 }), 0, -.16, -.145); cape.rotation.x = .1;
  const bones: Record<string, THREE.Object3D> = {};
  for (const side of ['Right', 'Left']) {
    const sign = side === 'Right' ? -1 : 1;
    const upper = new THREE.Group(), lower = new THREE.Group(), hand = new THREE.Group();
    upper.name = `${side}Arm`; lower.name = `${side}ForeArm`; hand.name = `${side}Hand`;
    upper.position.set(sign * .255, 1.34, 0); lower.position.set(0, -.28, 0); hand.position.set(0, -.27, 0);
    scene.add(upper); upper.add(lower); lower.add(hand); Object.assign(bones, { [upper.name]: upper, [lower.name]: lower, [hand.name]: hand });
    oval(upper, materials.steel, 0, .01, 0, [.113, .084, .13]);
    mesh(upper, new THREE.CapsuleGeometry(.059, .17, 3, 8), materials.cloth, 0, -.14, 0);
    mesh(lower, new THREE.CapsuleGeometry(.052, .16, 3, 8), materials.leather, 0, -.13, 0);
    oval(lower, materials.steel, 0, -.15, .04, [.058, .095, .024]);
    oval(hand, materials.leather, 0, -.017, 0, [.055, .075, .052]);
  }
  const tracks = (name: string, duration: number, values: [string, number[], number[]][]) => new THREE.AnimationClip(name, duration, values.map(([path, times, values]) => new THREE.NumberKeyframeTrack(path, times, values)));
  const idle = [['RightArm.rotation[x]', [0, 1, 2], [-1.25, -1.29, -1.25]], ['LeftArm.rotation[x]', [0, 1, 2], [-1.13, -1.17, -1.13]], ['RightForeArm.rotation[x]', [0, 2], [-.4, -.4]], ['LeftForeArm.rotation[x]', [0, 2], [-.7, -.7]]] as [string, number[], number[]][];
  const animations = [tracks('idle', 2, idle), tracks('sword_idle', 2, idle),
    tracks('sword_attack', 1.2, [['RightArm.rotation[x]', [0, .3, .6, .82, 1.2], [-1.25, -2.3, -2.75, -.45, -1.25]], ['RightForeArm.rotation[x]', [0, .6, .82, 1.2], [-.4, -.9, -.1, -.4]]]),
    tracks('sword_block', .7, [['LeftArm.rotation[x]', [0, .18, .5, .7], [-1.13, -1.65, -1.65, -1.13]], ['LeftForeArm.rotation[x]', [0, .2, .7], [-.7, -.95, -.7]]]),
    tracks('hit_chest', .45, [['Chest.rotation[x]', [0, .12, .45], [0, -.18, 0]], ['RightArm.rotation[x]', [0, .12, .45], [-1.25, -1.6, -1.25]]]),
    tracks('walk_loop', 1, [['RightLeg.rotation[x]', [0, .25, .75, 1], [0, .22, -.22, 0]], ['LeftLeg.rotation[x]', [0, .25, .75, 1], [0, -.22, .22, 0]]])];
  return { scene, animations, bones };
}
