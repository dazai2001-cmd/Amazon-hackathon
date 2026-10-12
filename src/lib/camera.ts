import type { Landmark, PoseFrame, TrackingModel } from '../../shared/protocol';
import { PoseFilter } from '../../shared/pose-filter';
import { drawPose } from '../components/PoseView';
import { loadPoseTracker } from './pose-model';

export class PoseCamera {
  private stream: MediaStream | null = null;
  private tracker: import('@mediapipe/tasks-vision').PoseLandmarker | null = null;
  private raf = 0;
  private stopped = false;
  private sequence = 0;
  private times: number[] = [];
  private imageFilter = new PoseFilter();
  private worldFilter = new PoseFilter(true);
  constructor(private video: HTMLVideoElement, private canvas: HTMLCanvasElement,
    private onFrame: (frame: PoseFrame) => void, private onStatus: (message: string) => void, private model: TrackingModel = 'full') {}
  async start(facingMode: 'user' | 'environment' = 'user') {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs HTTPS or localhost. Use the camera link from your TV, or connect by USB with npm run phone:usb.');
    this.onStatus('Opening your camera…');
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } }, audio: false });
    if (this.stopped) { this.stream.getTracks().forEach(t => t.stop()); return; }
    this.video.srcObject = this.stream;
    await this.video.play();
    this.onStatus('Loading the movement tracker…');
    const loaded = await loadPoseTracker('VIDEO', 'GPU', this.model);
    this.tracker = loaded.tracker;
    if (this.stopped) { this.tracker.close(); return; }
    this.onStatus('Camera ready. Find your frame.');
    let lastTime = 0, lastVideoTime = -1;
    const detect = (now: number) => {
      if (this.stopped) return;
      if (now - lastTime >= 34 && this.video.readyState >= 2 && this.video.currentTime !== lastVideoTime && !document.hidden) {
        lastTime = now; lastVideoTime = this.video.currentTime;
        try {
          const before = performance.now(), result = this.tracker!.detectForVideo(this.video, now);
          const inferenceMs = performance.now() - before;
          const normalize = (points: { x: number; y: number; z: number; visibility?: number }[]): Landmark[] => points.map(p => ({ x: p.x, y: p.y, z: p.z, visibility: Math.max(0, Math.min(1, p.visibility ?? 0)) }));
          const points = this.imageFilter.update(normalize(result.landmarks[0] || []), now);
          const worldLandmarks = this.worldFilter.update(normalize(result.worldLandmarks[0] || []), now);
          result.close();
          this.times.push(now); this.times = this.times.filter(t => now - t < 1000);
          this.onFrame({ type: 'pose', seq: this.sequence++, t: now, landmarks: points, imageAspect: this.video.videoWidth / this.video.videoHeight, worldLandmarks, fps: this.times.length, tracking: { model: loaded.model, delegate: loaded.delegate, inferenceMs: Math.min(2000, Math.round(inferenceMs)) } });
          this.draw(points, facingMode === 'user');
        } catch (e) { this.onStatus(`Tracking paused: ${(e as Error).message}`); }
      }
      this.raf = requestAnimationFrame(detect);
    };
    this.raf = requestAnimationFrame(detect);
  }
  private draw(points: Landmark[], mirror: boolean) {
    const width = this.video.videoWidth, height = this.video.videoHeight;
    if (!width || !height) return;
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    const ctx = this.canvas.getContext('2d')!; ctx.clearRect(0, 0, width, height);
    if (points.length === 33) { ctx.shadowBlur = 7; ctx.shadowColor = '#c7f56b'; drawPose(ctx, points, width, height, '#c7f56b', mirror, 3); }
  }
  stop() {
    this.stopped = true; cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach(t => t.stop()); this.tracker?.close(); this.tracker = null;
    this.video.srcObject = null;
    this.imageFilter.reset(); this.worldFilter.reset();
    const ctx = this.canvas.getContext('2d'); ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
