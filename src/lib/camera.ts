import type { Landmark, PoseFrame, TrackingModel } from '../../shared/protocol';
import { PoseFilter } from '../../shared/pose-filter';
import { drawPose } from '../components/PoseView';
import { createPoseInference, type PoseInference } from './pose-inference';

export type CameraRuntime = {
  secure: () => boolean; hidden: () => boolean; now: () => number;
  media: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  inference: (delegate: 'GPU' | 'CPU', model: TrackingModel) => Promise<PoseInference>;
  schedule: (callback: FrameRequestCallback) => number; cancel: (id: number) => void;
};
type Options = { runtime?: Partial<CameraRuntime>; onFatal?: (error: Error) => void };

/** An old asynchronous camera request cannot touch its replacement's stream. */
export class PoseCamera {
  private stream: MediaStream | null = null;
  private processor: PoseInference | null = null;
  private raf = 0;
  private stopped = false;
  private started = false;
  private abort = new AbortController();
  private sequence = 0;
  private times: number[] = [];
  private imageFilter = new PoseFilter();
  private worldFilter = new PoseFilter(true);
  private runtime: CameraRuntime;
  constructor(private video: HTMLVideoElement, private canvas: HTMLCanvasElement,
    private onFrame: (frame: PoseFrame) => void, private onStatus: (message: string) => void,
    private model: TrackingModel = 'full', private options: Options = {}) {
    this.runtime = {
      secure: () => window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia),
      hidden: () => document.hidden, now: () => performance.now(),
      media: constraints => navigator.mediaDevices.getUserMedia(constraints),
      inference: (delegate, model) => createPoseInference(delegate, model, this.abort.signal),
      schedule: callback => requestAnimationFrame(callback), cancel: id => cancelAnimationFrame(id),
      ...options.runtime,
    };
  }
  async start(facingMode: 'user' | 'environment' = 'user') {
    if (this.started || this.stopped) throw new Error('Start a new camera session to restart tracking.');
    this.started = true;
    if (!this.runtime.secure()) throw new Error('Open the camera through USB localhost or a trusted HTTPS link. Camera access is unavailable on a plain Wi-Fi HTTP address.');
    this.onStatus('Opening your camera…');
    const stream = await this.runtime.media({ video: { facingMode: { ideal: facingMode }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } }, audio: false });
    if (this.stopped) { stream.getTracks().forEach(track => track.stop()); return; }
    this.stream = stream; this.video.srcObject = stream;
    await this.video.play();
    if (this.stopped) return;
    this.onStatus('Loading the movement tracker…');
    const processor = await this.runtime.inference('GPU', this.model);
    if (this.stopped) { processor.close(); return; }
    this.processor = processor;
    this.onStatus('Camera ready. Find your frame.');
    let lastTime = 0, lastVideoTime = -1, busy = false, recoveries = 0, hidden = false;
    const detect = (now: number) => {
      if (this.stopped) return;
      const isHidden = this.runtime.hidden();
      if (isHidden && !hidden) this.invalidate();
      hidden = isHidden;
      if (!busy && !isHidden && now - lastTime >= 30 && this.video.readyState >= 2 && this.video.currentTime !== lastVideoTime) {
        busy = true; lastTime = now; lastVideoTime = this.video.currentTime;
        void (async () => {
          try {
            const result = await this.processor!.detect(this.video, now);
            if (this.stopped || this.runtime.hidden()) return;
            const points = this.imageFilter.update(result.landmarks, now);
            const worldLandmarks = this.worldFilter.update(result.worldLandmarks, now);
            this.times.push(now); this.times = this.times.filter(t => now - t < 1000);
            this.onFrame({ type: 'pose', seq: this.sequence++, t: now, landmarks: points, worldLandmarks,
              imageAspect: this.video.videoWidth / this.video.videoHeight, fps: this.times.length,
              tracking: { model: result.model, delegate: result.delegate, inferenceMs: Math.min(2000, Math.round(result.inferenceMs)), execution: result.execution } });
            this.draw(points, facingMode === 'user');
          } catch (failure) {
            if (this.stopped) return;
            this.invalidate();
            this.processor?.close(); this.processor = null;
            const error = failure instanceof Error ? failure : new Error(String(failure));
            if (++recoveries > 2) { this.fail(error); return; }
            this.onStatus(`Tracking interrupted. Recovering on CPU (${recoveries}/2)…`);
            try {
              const replacement = await this.runtime.inference('CPU', this.model);
              if (this.stopped) { replacement.close(); return; }
              this.processor = replacement; lastVideoTime = -1;
              this.onStatus('Tracking recovered. Return to your frame.');
            } catch (error) { if (!this.stopped) this.fail(error instanceof Error ? error : new Error(String(error))); }
          } finally { busy = false; }
        })();
      }
      this.raf = this.runtime.schedule(detect);
    };
    this.raf = this.runtime.schedule(detect);
  }
  private invalidate() {
    this.times = []; this.imageFilter.reset(); this.worldFilter.reset();
    if (this.video.srcObject === this.stream) this.canvas.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.onFrame({ type: 'pose', seq: this.sequence++, t: this.runtime.now(), landmarks: [], worldLandmarks: [], fps: 0 });
  }
  private fail(error: Error) {
    this.stop();
    this.onStatus('Tracking could not recover. Tap Restart camera.');
    this.options.onFatal?.(error);
  }
  private draw(points: Landmark[], mirror: boolean) {
    const width = this.video.videoWidth, height = this.video.videoHeight;
    if (!width || !height) return;
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    const ctx = this.canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (points.length === 33) { ctx.shadowBlur = 7; ctx.shadowColor = '#c7f56b'; drawPose(ctx, points, width, height, '#c7f56b', mirror, 3); }
  }
  stop() {
    this.stopped = true; this.abort.abort(); this.runtime.cancel(this.raf);
    if (this.stream && this.video.srcObject === this.stream) {
      this.video.srcObject = null;
      this.canvas.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = null;
    this.processor?.close(); this.processor = null;
    this.times = []; this.imageFilter.reset(); this.worldFilter.reset();
  }
}
