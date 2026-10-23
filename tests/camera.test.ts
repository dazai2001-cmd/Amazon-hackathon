import test from 'node:test';
import assert from 'node:assert/strict';
import { PoseCamera, type CameraRuntime } from '../src/lib/camera';
import { CameraOwner } from '../src/lib/camera-owner';
import type { PoseFrame } from '../shared/protocol';
import type { PoseInference } from '../src/lib/pose-inference';
import { syntheticPose } from '../shared/motion';

const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
const stream = () => { const track = { stopped: false, stop() { this.stopped = true; } }; return { track, getTracks: () => [track] } as unknown as MediaStream & { track: { stopped: boolean } }; };
function fixture(load: CameraRuntime['inference'], media: CameraRuntime['media'] = async () => stream()) {
  const video = { srcObject: null, play: async () => {}, readyState: 2, currentTime: 0, videoWidth: 640, videoHeight: 480 } as unknown as HTMLVideoElement;
  const canvas = { width: 640, height: 480, getContext: () => null } as unknown as HTMLCanvasElement;
  const frames: PoseFrame[] = [], statuses: string[] = [], failures: Error[] = [];
  let id = 0, now = 0, hidden = false; const callbacks = new Map<number, FrameRequestCallback>();
  const runtime: CameraRuntime = { secure: () => true, hidden: () => hidden, now: () => now, media, inference: load,
    schedule: callback => { callbacks.set(++id, callback); return id; }, cancel: key => { callbacks.delete(key); } };
  const camera = new PoseCamera(video, canvas, frame => frames.push(frame), status => statuses.push(status), 'full', { runtime, onFatal: error => failures.push(error) });
  return { camera, video, canvas, frames, statuses, failures, runtime, hide: (value: boolean) => { hidden = value; },
    pump: async (time: number) => { now = time; video.currentTime = time / 1000; const queued = [...callbacks.values()]; callbacks.clear(); queued.forEach(callback => callback(time)); await flush(); } };
}
const processor = (detect?: PoseInference['detect']): PoseInference => ({ close() {}, detect: detect || (async () => ({ landmarks: syntheticPose(), worldLandmarks: [], model: 'full', delegate: 'CPU', inferenceMs: 8, execution: 'main' })) });

test('inference failure immediately invalidates tracking and recovers with a fresh CPU baseline', async () => {
  let calls = 0; const delegates: string[] = [], f = fixture(async delegate => {
    delegates.push(delegate); return calls++ === 0 ? processor(async () => { throw new Error('GPU failed'); }) : processor();
  });
  await f.camera.start(); await f.pump(50);
  assert.equal(f.frames[f.frames.length - 1]?.landmarks.length, 0); assert.equal(f.frames[f.frames.length - 1]?.fps, 0);
  assert.deepEqual(delegates, ['GPU', 'CPU']); await f.pump(100);
  assert.equal(f.frames[f.frames.length - 1]?.landmarks.length, 33); assert.equal(f.frames[f.frames.length - 1]?.fps, 1); f.camera.stop();
});
test('persistent inference errors have bounded recovery and release the camera', async () => {
  let loads = 0; const source = stream(), f = fixture(async () => { loads++; return processor(async () => { throw new Error('inference failed'); }); }, async () => source);
  await f.camera.start(); await f.pump(50); await f.pump(100); await f.pump(150); await f.pump(200);
  assert.equal(loads, 3); assert.equal(f.failures.length, 1); assert.equal(source.track.stopped, true);
  assert.equal(f.frames[f.frames.length - 1]?.landmarks.length, 0); assert.equal(f.video.srcObject, null);
});
test('late failure cleanup never detaches a replacement camera', async () => {
  let rejectOld!: (error: Error) => void;
  const oldSource = stream(), newSource = stream(), f = fixture(() => new Promise((_resolve, reject) => { rejectOld = reject; }), async () => oldSource);
  const oldStart = f.camera.start().catch(() => f.camera.stop()); await flush(); f.camera.stop();
  const replacement = new PoseCamera(f.video, f.canvas, () => {}, () => {}, 'full', { runtime: { ...f.runtime, inference: async () => processor(), media: async () => newSource } });
  await replacement.start(); rejectOld(new Error('old startup failed')); await oldStart;
  assert.equal(f.video.srcObject, newSource); assert.equal(newSource.track.stopped, false); replacement.stop();
});
test('late model and media successes release their resources after cancellation', async () => {
  let resolveMedia!: (source: MediaStream) => void;
  const f = fixture(async () => processor(), () => new Promise(resolve => { resolveMedia = resolve; }));
  const pending = f.camera.start(); f.camera.stop(); const source = stream(); resolveMedia(source); await pending;
  assert.equal(source.track.stopped, true); assert.equal(f.video.srcObject, null);
  let resolveModel!: (value: PoseInference) => void, closed = 0;
  const g = fixture(() => new Promise(resolve => { resolveModel = resolve; }));
  const loading = g.camera.start(); await flush(); g.camera.stop(); resolveModel({ ...processor(), close: () => closed++ }); await loading;
  assert.equal(closed, 1);
});
test('hidden phone pages invalidate tracking without completing another pose', async () => {
  const f = fixture(async () => processor()); await f.camera.start(); await f.pump(50);
  f.hide(true); await f.pump(100); assert.equal(f.frames[f.frames.length - 1]?.landmarks.length, 0);
  const count = f.frames.length; await f.pump(150); assert.equal(f.frames.length, count);
  f.hide(false); await f.pump(200); assert.equal(f.frames[f.frames.length - 1]?.fps, 1); f.camera.stop();
});
test('a stale camera callback cannot clear a newer session owner', () => {
  let stopped = 0; const first = { stop: () => stopped++ }, next = { stop: () => stopped++ }, owner = new CameraOwner<typeof first>();
  owner.replace(first); owner.replace(next); assert.equal(stopped, 1);
  assert.equal(owner.clear(first), false); assert.equal(owner.owns(next), true); owner.stop(); assert.equal(stopped, 2);
});
