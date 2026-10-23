export type RenderResolution = 'auto' | 720 | 1080;

/** Honor display density while bounding the 3D buffer to the chosen HD size. */
export function scenePixelRatio(width: number, height: number, density: number, resolution: RenderResolution) {
  const scale = Number.isFinite(density) && density > 0 ? density : 1;
  const cap = resolution === 'auto' ? 1080 : resolution;
  return Math.min(scale, cap * 16 / 9 / Math.max(1, width), cap / Math.max(1, height));
}

/** Two sustained slow samples lower quality once; manual choices remain fixed. */
export class SceneQuality {
  resolution: 720 | 1080;
  private slow = 0;
  constructor(private preference: RenderResolution) { this.resolution = preference === 720 ? 720 : 1080; }
  sample(fps: number, active: boolean) {
    if (this.preference !== 'auto' || this.resolution === 720 || !active || !Number.isFinite(fps) || fps <= 0) { this.slow = 0; return false; }
    this.slow = fps < 27 ? this.slow + 1 : 0;
    if (this.slow < 2) return false;
    this.resolution = 720; return true;
  }
}
