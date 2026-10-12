import * as THREE from 'three';

// Original courtyard figures. Kept small enough for the TV renderer, with
// distinct faces and clothing while bespoke rigged cast assets are developed.
export function storyCharacter(role: 'alden' | 'tomas'): THREE.Group {
  const root = new THREE.Group(), smith = role === 'tomas';
  const material = (color: string, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness: metalness ? .65 : .93, metalness, flatShading: true });
  const skin = material(smith ? '#ad8061' : '#b3957d'), hair = material(smith ? '#3b2d24' : '#7f827d');
  const cloth = material(smith ? '#6c5c46' : '#36484c'), leather = material(smith ? '#54362a' : '#3a3029');
  const steel = material('#747e7d', .45), pale = material('#b7b5a7'), dark = material('#252825');
  const add = (geometry: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, scale?: [number, number, number]) => {
    const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(x, y, z); if (scale) mesh.scale.set(...scale);
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); return mesh;
  };
  const oval = (mat: THREE.Material, x: number, y: number, z: number, scale: [number, number, number]) => add(new THREE.SphereGeometry(1, 14, 10), mat, x, y, z, scale);
  const capsule = (mat: THREE.Material, x: number, y: number, z: number, radius: number, length: number) => add(new THREE.CapsuleGeometry(radius, length, 4, 10), mat, x, y, z);
  for (const side of [-1, 1]) {
    oval(leather, side * .115, .09, .045, [.105, .09, .19]);
    capsule(leather, side * .115, .39, 0, .075, .48);
    capsule(cloth, side * .13, .72, 0, .09, .2);
    const arm = capsule(smith ? skin : cloth, side * .3, 1.11, 0, .075, .33); arm.rotation.z = side * .1;
    capsule(smith ? skin : leather, side * .325, .9, .025, .066, .18);
    oval(skin, side * .325, .74, .045, [.065, .09, .052]);
    oval(smith ? cloth : steel, side * .28, 1.3, 0, [.12, .09, .15]);
  }
  oval(cloth, 0, 1.105, 0, [smith ? .27 : .235, .315, .14]);
  add(new THREE.CylinderGeometry(.245, .2, .045, 12), leather, 0, .88, 0).scale.z = .62;
  add(new THREE.BoxGeometry(.065, .053, .019), steel, 0, .88, .16);
  capsule(skin, 0, 1.435, 0, .069, .05);
  oval(skin, 0, 1.625, 0, [.125, .175, .115]);
  for (const side of [-1, 1]) oval(skin, side * .12, 1.635, .005, [.027, .046, .027]);
  // Nose, recessed eyes, eyebrows and a small lip line face local +Z.
  oval(skin, 0, 1.63, .113, [.027, .043, .033]);
  for (const side of [-1, 1]) {
    oval(dark, side * .052, 1.675, .101, [.033, .017, .011]);
    oval(pale, side * .052, 1.675, .111, [.021, .009, .004]);
    oval(dark, side * .052, 1.675, .115, [.009, .009, .003]);
    add(new THREE.BoxGeometry(.064, .013, .012), hair, side * .051, 1.708, .098).rotation.z = side * .1;
  }
  add(new THREE.BoxGeometry(.045, .008, .009), leather, 0, 1.575, .112);
  oval(hair, 0, 1.525, .027, [.111, .093, .09]);
  oval(hair, -.037, 1.593, .108, [.04, .016, .017]);
  oval(hair, .037, 1.593, .108, [.04, .016, .017]);
  if (smith) {
    // Receding hair, rolled sleeves, broad leather apron and a held hammer.
    for (const side of [-1, 1]) oval(hair, side * .103, 1.715, -.008, [.035, .08, .09]);
    add(new THREE.BoxGeometry(.35, .47, .025), leather, 0, 1.045, .139);
    add(new THREE.BoxGeometry(.095, .16, .025), leather, 0, 1.355, .122);
    add(new THREE.BoxGeometry(.29, .16, .021), material('#684732'), 0, .975, .155);
    for (const side of [-1, 1]) add(new THREE.BoxGeometry(.037, .2, .025), leather, side * .1, 1.335, .117).rotation.z = side * .34;
    add(new THREE.CylinderGeometry(.018, .018, .34, 8), leather, .335, .73, .09);
    add(new THREE.BoxGeometry(.155, .075, .065), steel, .335, .9, .09);
  } else {
    // Cropped grey hair, worn armour, cloak and the Ashen Gate insignia.
    oval(hair, 0, 1.753, -.026, [.126, .076, .113]);
    for (const side of [-1, 1]) oval(hair, side * .107, 1.69, -.029, [.025, .078, .077]);
    add(new THREE.BoxGeometry(.32, .29, .029), steel, 0, 1.17, .137);
    add(new THREE.BoxGeometry(.36, .19, .021), cloth, 0, .948, .148);
    const cape = add(new THREE.PlaneGeometry(.55, .91, 2, 4), new THREE.MeshStandardMaterial({ color: '#303b3d', roughness: 1, side: THREE.DoubleSide }), 0, .99, -.177); cape.rotation.x = .08;
    for (const side of [-1, 1]) oval(steel, side * .105, 1.368, .108, [.046, .036, .019]);
    const emblem = material('#baa271', .1);
    add(new THREE.BoxGeometry(.011, .11, .007), emblem, 0, 1.175, .158);
    for (const side of [-1, 1]) add(new THREE.BoxGeometry(.01, .055, .007), emblem, side * .018, 1.186, .158).rotation.z = side * -.7;
    // A pale scar makes Alden recognizable without an extra texture download.
    add(new THREE.BoxGeometry(.006, .051, .005), pale, -.081, 1.625, .094).rotation.z = -.3;
  }
  root.userData.role = role;
  return root;
}
