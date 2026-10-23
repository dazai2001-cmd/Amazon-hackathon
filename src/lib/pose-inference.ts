import type { Landmark, TrackingModel } from '../../shared/protocol';
import { loadPoseTracker, normalizeLandmarks } from './pose-model';

export type PoseEstimate = { landmarks: Landmark[]; worldLandmarks: Landmark[]; model: TrackingModel; delegate: 'GPU' | 'CPU'; inferenceMs: number; execution: 'worker' | 'main' };
export type PoseInference = { detect: (video: HTMLVideoElement, t: number) => Promise<PoseEstimate>; close: () => void };

async function workerInference(delegate: 'GPU' | 'CPU', model: TrackingModel, signal?: AbortSignal): Promise<PoseInference> {
  if (signal?.aborted) throw new Error('Camera session closed.');
  // MediaPipe's WASM loader uses importScripts; it needs a classic worker.
  const worker = new Worker('/vision/pose-worker.js');
  let id = 0, closed = false;
  const pending = new Map<number, { resolve: (result: PoseEstimate) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const close = () => {
    if (closed) return; closed = true; signal?.removeEventListener('abort', close); worker.terminate();
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('Camera session closed.')); }
    pending.clear();
  };
  signal?.addEventListener('abort', close, { once: true });
  worker.onmessage = event => {
    const message = event.data, request = pending.get(message.id); if (!request) return;
    pending.delete(message.id); clearTimeout(request.timer);
    if (message.error) request.reject(new Error(message.error)); else request.resolve(message.result);
  };
  worker.onerror = () => close();
  const request = (message: object, transfer: Transferable[] = []) => new Promise<PoseEstimate>((resolve, reject) => {
    if (closed) { reject(new Error('Camera worker is unavailable.')); return; }
    const key = ++id, timer = setTimeout(() => { pending.delete(key); reject(new Error('Movement processing timed out.')); }, 12000);
    pending.set(key, { resolve, reject, timer });
    try { worker.postMessage({ ...message, id: key }, transfer); }
    catch (error) { clearTimeout(timer); pending.delete(key); reject(error instanceof Error ? error : new Error(String(error))); }
  });
  try { await request({ type: 'init', delegate, model }); } catch (error) { close(); throw error; }
  return { close, detect: async (video, t) => {
    const bitmap = await createImageBitmap(video);
    if (closed) { bitmap.close(); throw new Error('Camera session closed.'); }
    try { return await request({ type: 'frame', bitmap, t }, [bitmap]); }
    finally { bitmap.close(); }
  } };
}

export async function createPoseInference(delegate: 'GPU' | 'CPU', model: TrackingModel, signal?: AbortSignal): Promise<PoseInference> {
  if (signal?.aborted) throw new Error('Camera session closed.');
  if (typeof Worker !== 'undefined' && typeof createImageBitmap === 'function') {
    try { return await workerInference(delegate, model, signal); } catch {
      if (signal?.aborted) throw new Error('Camera session closed.');
      /* Older phone browsers retain a CPU compatibility path. */
    }
    delegate = 'CPU';
  }
  const loaded = await loadPoseTracker('VIDEO', delegate, model);
  if (signal?.aborted) { loaded.tracker.close(); throw new Error('Camera session closed.'); }
  let closed = false;
  return { close: () => { if (!closed) { closed = true; loaded.tracker.close(); } }, detect: async (video, t) => {
    if (closed) throw new Error('Camera session closed.');
    const before = performance.now(), result = loaded.tracker.detectForVideo(video, t);
    try { return { landmarks: normalizeLandmarks(result.landmarks[0] || []), worldLandmarks: normalizeLandmarks(result.worldLandmarks[0] || []),
      model: loaded.model, delegate: loaded.delegate, inferenceMs: performance.now() - before, execution: 'main' }; }
    finally { result.close(); }
  } };
}
