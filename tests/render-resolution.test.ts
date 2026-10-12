import test from 'node:test';
import assert from 'node:assert/strict';
import { scenePixelRatio } from '../src/lib/renderResolution';

const buffer = (width: number, height: number, density: number, resolution: 720 | 1080) => {
  const ratio = scenePixelRatio(width, height, density, resolution);
  return [Math.round(width * ratio), Math.round(height * ratio)];
};
test('1080p renders a full HD buffer on both common TV WebView density layouts', () => {
  assert.deepEqual(buffer(1280, 720, 1.5, 1080), [1920, 1080]);
  assert.deepEqual(buffer(960, 540, 2, 1080), [1920, 1080]);
  assert.deepEqual(buffer(1920, 1080, 1, 1080), [1920, 1080]);
});
test('720p is an explicit performance cap, including on high density and 4K screens', () => {
  assert.deepEqual(buffer(1280, 720, 1.5, 720), [1280, 720]);
  assert.deepEqual(buffer(3840, 2160, 2, 720), [1280, 720]);
  assert.deepEqual(buffer(3840, 2160, 2, 1080), [1920, 1080]);
  assert.deepEqual(buffer(1919.9999, 1080, 1, 720), [1280, 720]);
});
test('non-TV shapes retain their aspect ratio and small displays are not upscaled', () => {
  assert.deepEqual(buffer(1000, 1000, 2, 1080), [1080, 1080]);
  assert.deepEqual(buffer(2560, 1080, 1, 1080), [1920, 810]);
  assert.deepEqual(buffer(640, 360, 1, 1080), [640, 360]);
  assert.equal(scenePixelRatio(0, 0, NaN, 1080), 1);
});
