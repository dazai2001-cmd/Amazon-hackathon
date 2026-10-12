import type { Landmark } from './protocol';

/** Speed-adaptive low-pass filtering (1 Euro): steadier holds, faster cuts. */
class AdaptiveAxis {
  private raw = 0;
  private value = 0;
  private derivative = 0;
  private time: number | null = null;
  constructor(private minimum: number, private beta: number) {}
  update(raw: number, now: number) {
    if (this.time === null || now <= this.time || now - this.time > 180) {
      this.time = now; this.raw = this.value = raw; this.derivative = 0; return raw;
    }
    const dt = (now - this.time) / 1000;
    const alpha = (cutoff: number) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));
    this.derivative += alpha(1) * ((raw - this.raw) / dt - this.derivative);
    this.value += alpha(this.minimum + this.beta * Math.abs(this.derivative)) * (raw - this.value);
    this.raw = raw; this.time = now;
    return this.value;
  }
}

export class PoseFilter {
  private joints = new Map<number, AdaptiveAxis[]>();
  private previous: number | null = null;
  constructor(private world = false) {}
  reset() { this.joints.clear(); this.previous = null; }
  update(points: Landmark[], now: number): Landmark[] {
    if (points.length !== 33 || !Number.isFinite(now)) { this.reset(); return []; }
    if (this.previous !== null && (now <= this.previous || now - this.previous > 180)) this.reset();
    this.previous = now;
    return points.map((p, index) => {
      if (p.visibility < .5 || ![p.x, p.y, p.z].every(Number.isFinite)) { this.joints.delete(index); return { ...p }; }
      let axes = this.joints.get(index);
      if (!axes) { axes = Array.from({ length: 3 }, () => new AdaptiveAxis(this.world ? 3 : 2.4, this.world ? 2 : 3)); this.joints.set(index, axes); }
      return { x: axes[0].update(p.x, now), y: axes[1].update(p.y, now), z: axes[2].update(p.z, now), visibility: p.visibility };
    });
  }
}
