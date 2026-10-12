import { clamp, measureBody, type CalibrationProfile } from './motion';
import type { Landmark } from './protocol';

export type BodyPose = { tracked: boolean; forward: number; crouch: number };
export const REST_BODY: BodyPose = { tracked: false, forward: 0, crouch: 0 };
const deadzone = (value: number, zone: number) => Math.abs(value) <= zone ? 0 : Math.sign(value) * (Math.abs(value) - zone);

/** Position changes make a bounded step; holding a stance never keeps walking. */
export class BodyTracker {
  private width: number | null = null;
  private forward = 0;
  constructor(private profile: CalibrationProfile) {}
  reset() { this.width = null; this.forward = 0; }
  update(points: Landmark[], world: Landmark[] = []): BodyPose {
    const body = measureBody(points);
    if (!body) { this.reset(); return { ...REST_BODY }; }
    const baseline = this.profile.shoulderWidth || (this.width ??= body.shoulderWidth);
    const frontal = world.length === 33 && [11, 12].every(i => world[i].visibility >= .5)
      ? Math.abs(world[11].z - world[12].z) < Math.hypot(world[11].x - world[12].x, world[11].z - world[12].z) * .5
      : Math.abs(body.centerX - (points[23].x + points[24].x) / 2) < body.torso * .35;
    const shoulderDrop = (body.shoulderY - this.profile.shoulderY) / this.profile.torso;
    const hipDrop = (body.hipY - this.profile.shoulderY - this.profile.torso) / this.profile.torso;
    const crouch = this.profile.mode === 'standing' ? clamp((Math.min(shoulderDrop, hipDrop) - .08) / .55, 0, 1) : 0;
    if (this.profile.mode === 'standing' && frontal && crouch < .2 && baseline > .02) this.forward = clamp(deadzone(body.shoulderWidth / baseline - 1, .075) / .28, -1, 1);
    return { tracked: true, forward: this.forward, crouch };
  }
}
