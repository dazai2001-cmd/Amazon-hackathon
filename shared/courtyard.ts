import { clamp } from './motion';
import type { Quest, StoryFocus } from './chapter';

export type WorldPoint = { x: number; z: number };
export type WorldPose = WorldPoint & { yaw: number };
export type WorldState = WorldPose & { distance: number; moving: boolean; arrived: boolean };
export const spawn: WorldPose = { x: 0, z: 5.7, yaw: 0 };
export const targets: Record<Quest, WorldPoint> = {
  alden: { x: -2.5, z: 1.3 }, training: { x: -2.5, z: 1.3 }, mara: { x: 0, z: -2.0 },
  forge: { x: -8.4, z: -5.3 }, orders: { x: 7.5, z: -6.8 }, gate: { x: 0, z: -8.2 }, done: { x: 0, z: -8.2 },
};
export const shots: Record<StoryFocus, { position: [number, number, number]; look: [number, number, number] }> = {
  alden: { position: [-1.0, 1.58, 3.15], look: [-2.5, 1.4, 1.3] },
  mara: { position: [.45, 1.58, .6], look: [0, 1.38, -2] },
  forge: { position: [-6.45, 1.58, -3.6], look: [-8.4, 1.3, -5.3] },
  orders: { position: [6.2, 1.58, -4.3], look: [7.3, 1.3, -6.8] },
  gate: { position: [.7, 1.6, -5.8], look: [-1.2, 1.3, -8.1] },
  memory: { position: [.1, 1.65, -6.8], look: [0, 2.7, -10] },
  panorama: { position: [7.4, 3.4, 6.3], look: [0, 1.9, -4] },
};

// The fences have an opening at either end. Guided routes use the front lane.
const solids = [
  { x: -4.4, z: -.85, w: .4, d: 11.7 }, { x: 4.4, z: -.85, w: .4, d: 11.7 },
  { x: -8.4, z: -5.6, w: 3.2, d: 1.8 }, { x: 8.4, z: -7.8, w: 2.8, d: 1.6 },
];
export function moveInCourtyard(position: WorldPoint, dx: number, dz: number): WorldPoint {
  const collides = (x: number, z: number) => solids.some(s => Math.abs(x - s.x) < s.w / 2 + .25 && Math.abs(z - s.z) < s.d / 2 + .25);
  let x = position.x, z = position.z;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / .1));
  for (let i = 0; i < steps; i++) {
    const nextX = clamp(x + dx / steps, -10.9, 10.9);
    if (!collides(nextX, z)) x = nextX;
    const nextZ = clamp(z + dz / steps, -8.9, 6.6);
    if (!collides(x, nextZ)) z = nextZ;
  }
  return { x, z };
}
export const goalDistance = (position: WorldPoint, quest: Quest) => Math.hypot(position.x - targets[quest].x, position.z - targets[quest].z);
export function routeTo(quest: Quest, from: WorldPoint): WorldPoint[] {
  const target = targets[quest];
  const end = { x: target.x, z: target.z + (quest === 'forge' ? 1.5 : 1.7) };
  const lane = from.z < -6.95 ? -7.35 : 5.6;
  if ((Math.abs(from.x) > 4.2) !== (Math.abs(end.x) > 4.2) || from.x * end.x < 0 && Math.abs(from.x) > 4.2) {
    return [{ x: from.x, z: lane }, { x: end.x, z: lane }, end];
  }
  return [end];
}
