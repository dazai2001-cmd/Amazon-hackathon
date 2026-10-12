import type { Landmark } from './protocol';
import { clamp, measureBody, type CalibrationProfile } from './motion';
import type { Point } from './game';

export type Vec3 = { x: number; y: number; z: number };
export type WeaponPose = { hilt: Vec3; axis: Vec3; elbow: Vec3; shield: Vec3; shieldElbow: Vec3; shieldPoint: Point; tip: Point; guarding: boolean; depthSource: 'world' | 'image' };
export type AttackLane = 'high' | 'left' | 'right';
export const lanePoint = (lane: AttackLane): Point => lane === 'high' ? { x: .5, y: .26 } : { x: lane === 'left' ? .29 : .71, y: .51 };
export function attackLane(from: Point, to: Point): AttackLane {
  return Math.abs(to.y - from.y) > Math.abs(to.x - from.x) * 1.1 ? 'high' : to.x < from.x ? 'left' : 'right';
}
export function coversAttack(shield: Point, lane: AttackLane): boolean {
  const target = lanePoint(lane);
  return Math.hypot((shield.x - target.x) * 1.55, shield.y - target.y) <= .24;
}
export function weaponPose(points: Landmark[], profile: CalibrationProfile, world: Landmark[] = [], aspect = 16 / 9): WeaponPose | null {
  if ([11, 12, 13, 14, 15, 16].some(i => !points[i] || points[i].visibility < .5)) return null;
  const body = measureBody(points), torso = body?.torso || profile.torso, center = body?.centerX ?? profile.centerX;
  const top = (body?.shoulderY ?? profile.shoulderY) - torso * (profile.reachTarget + .15);
  const height = torso * (profile.reachTarget + 1.55);
  const worldDepth = world.length === 33 && [11, 12, 13, 14, 15, 16].every(i => world[i] && world[i].visibility >= .5 && [world[i].x, world[i].y, world[i].z].every(Number.isFinite));
  const point = (index: number): Point => ({ x: clamp(.5 + (center - points[index].x) / (torso * 2.8), .04, .96), y: clamp((points[index].y - top) / height, .06, .95) });
  const position = (index: number): Vec3 => {
    const p = point(index), shoulder = index % 2 ? points[11] : points[12];
    // World output adds hip-relative 3D depth; it remains a monocular estimate.
    const depth = worldDepth ? (world[index].z - world[index % 2 ? 11 : 12].z) * .9 : (points[index].z - shoulder.z) / torso * .2;
    return { x: (p.x - .5) * 1.14, y: (.6 - p.y) * 1.02 - .29, z: -.73 + clamp(depth, -.23, .14) };
  };
  const hilt = position(16), elbow = position(14), shield = position(15), shieldElbow = position(13);
  const raw = { x: hilt.x - elbow.x, y: hilt.y - elbow.y, z: -.24 + clamp(hilt.z - elbow.z, -.13, .1) };
  const length = Math.hypot(raw.x, raw.y, raw.z);
  const axis = { x: raw.x / length, y: raw.y / length, z: raw.z / length };
  const tip3 = { x: hilt.x + axis.x * .84, y: hilt.y + axis.y * .84, z: hilt.z + axis.z * .84 };
  const tangent = Math.tan(32 * Math.PI / 180);
  const tip = { x: clamp(.5 + tip3.x / (-tip3.z * tangent * 2 * clamp(aspect, .45, 3)), -.2, 1.2), y: clamp(.5 - tip3.y / (-tip3.z * tangent * 2), -.2, 1.2) };
  return { hilt, axis, elbow, shield, shieldElbow, shieldPoint: point(15), tip, guarding: point(15).y < .7, depthSource: worldDepth ? 'world' : 'image' };
}
