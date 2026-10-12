export type RenderResolution = 720 | 1080;

/** Honor display density while bounding the 3D buffer to the chosen HD size. */
export function scenePixelRatio(width: number, height: number, density: number, resolution: RenderResolution) {
  const scale = Number.isFinite(density) && density > 0 ? density : 1;
  return Math.min(scale, resolution * 16 / 9 / Math.max(1, width), resolution / Math.max(1, height));
}
