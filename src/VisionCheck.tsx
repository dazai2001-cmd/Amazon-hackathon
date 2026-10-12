import { useRef, useState } from 'react';
import type { Landmark, TrackingModel } from '../shared/protocol';
import { PoseFilter } from '../shared/pose-filter';
import { DEFAULT_PROFILE, measureBody } from '../shared/motion';
import { BladeTracker } from '../shared/game';
import { drawPose } from './components/PoseView';
import { loadPoseTracker } from './lib/pose-model';

type Check = { name: string; passed: boolean; detail: string };
const landmarks = (points: import('@mediapipe/tasks-vision').NormalizedLandmark[] = []): Landmark[] => points.map(p => ({ x: p.x, y: p.y, z: p.z, visibility: Math.max(0, Math.min(1, p.visibility ?? 0)) }));
function seek(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Test video seek timed out.')); }, 8000);
    const cleanup = () => { clearTimeout(timeout); video.removeEventListener('seeked', done); video.removeEventListener('error', fail); };
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error('Unable to decode the recorded test video.')); };
    video.addEventListener('seeked', done, { once: true }); video.addEventListener('error', fail, { once: true }); video.currentTime = time;
  });
}
export default function VisionCheck() {
  const [result, setResult] = useState('Not run'), [busy, setBusy] = useState(false), [checks, setChecks] = useState<Check[]>([]);
  const [delegate, setDelegate] = useState<'GPU' | 'CPU'>('GPU');
  const [model, setModel] = useState<TrackingModel>('full');
  const videoRef = useRef<HTMLVideoElement>(null), canvasRef = useRef<HTMLCanvasElement>(null);
  const run = async () => {
    setBusy(true); setChecks([]); setResult('Loading the phone’s local pose model…');
    let tracker: import('@mediapipe/tasks-vision').PoseLandmarker | null = null;
    let videoURL: string | null = null;
    const report: Check[] = [], times: number[] = [];
    const check = (name: string, passed: boolean, detail: string) => { report.push({ name, passed, detail }); setChecks([...report]); };
    try {
      const loaded = await loadPoseTracker('IMAGE', delegate, model); tracker = loaded.tracker;
      const image = new Image(); image.src = '/vision/testdata/pose.jpg';
      await image.decode().catch(() => { throw new Error('Test fixtures missing. Run npm run test:vision:fixtures, then npm run build.'); });
      const detection = tracker.detect(image), points = landmarks(detection.landmarks[0]), world = landmarks(detection.worldLandmarks[0]); detection.close();
      check('Human image recognition', points.length === 33 && Boolean(measureBody(points)), `${points.length} landmarks; shoulders, wrists and hips ${measureBody(points) ? 'accepted' : 'not accepted'} by the movement controller.`);
      check('3D joint output', world.length === 33 && world.every(p => [p.x, p.y, p.z].every(Number.isFinite)), `${world.length} hip-relative world joints. These are estimated 3D coordinates, not measured sword positions.`);
      const canvas = canvasRef.current!, context = canvas.getContext('2d')!;
      canvas.width = image.width; canvas.height = image.height; context.drawImage(image, 0, 0); drawPose(context, points, canvas.width, canvas.height, '#c7f56b', false, 4);
      const blank = document.createElement('canvas'); blank.width = 640; blank.height = 480;
      blank.getContext('2d')!.fillRect(0, 0, blank.width, blank.height);
      const empty = tracker.detect(blank); check('Empty image', empty.landmarks.length === 0, `${empty.landmarks.length} people detected.`); empty.close();
      await tracker.setOptions({ runningMode: 'VIDEO' });
      const video = videoRef.current!;
      const fixture = await fetch('/vision/testdata/pose_squats.mp4');
      if (!fixture.ok) throw new Error('Recorded video missing. Run npm run test:vision:fixtures, then npm run build.');
      videoURL = URL.createObjectURL(await fixture.blob());
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error('Unable to decode the test video.')); video.src = videoURL!; video.load();
      });
      const bladeTracker = new BladeTracker(DEFAULT_PROFILE), imageFilter = new PoseFilter(), worldFilter = new PoseFilter(true), wrists: { x: number; y: number }[] = [];
      let detected = 0, usable = 0, strikes = 0;
      for (let i = 0; i < 24; i++) {
        setResult(`Testing recorded movement: frame ${i + 1} of 24…`);
        const time = 0.1 + (video.duration - 0.2) * i / 23; await seek(video, time);
        if (Math.abs(video.currentTime - time) > 0.1) throw new Error(`Video did not seek: expected ${time.toFixed(2)} s, received ${video.currentTime.toFixed(2)} s.`);
        const before = performance.now(), frame = tracker.detectForVideo(video, time * 1000); times.push(performance.now() - before);
        const sample = imageFilter.update(landmarks(frame.landmarks[0]), time * 1000), worldSample = worldFilter.update(landmarks(frame.worldLandmarks[0]), time * 1000); frame.close();
        if (sample.length === 33) { detected++; wrists.push(sample[16]); }
        if (measureBody(sample)) usable++;
        if (bladeTracker.update(sample, time * 1000, worldSample).weaponSlash) strikes++;
        canvas.width = video.videoWidth; canvas.height = video.videoHeight; context.drawImage(video, 0, 0); drawPose(context, sample, canvas.width, canvas.height, '#c7f56b', false, 4);
      }
      const wristRange = wrists.length ? Math.max(...wrists.map(p => p.y)) - Math.min(...wrists.map(p => p.y)) : 0;
      check('Recorded movement recognition', detected >= 22 && usable >= 18 && wristRange > 0.04, `${detected}/24 frames detected; ${usable}/24 usable by controller; wrist movement ${(wristRange * 100).toFixed(1)}% of frame height. The sparse video samples are not sword-strike timing tests (${strikes} strikes).`);
      let people = -1;
      for (let i = 1; i <= 6; i++) { const frame = tracker.detectForVideo(blank, video.duration * 1000 + i * 100); people = frame.landmarks.length; frame.close(); }
      check('Tracking loss', people === 0 && !bladeTracker.update([], video.duration * 1000 + 600).tracked, `After empty frames: ${people} people; blade controller stopped.`);
      const restored = tracker.detectForVideo(image, video.duration * 1000 + 800), restoredPoints = landmarks(restored.landmarks[0]); restored.close();
      const input = bladeTracker.update(restoredPoints, video.duration * 1000 + 800);
      check('Reacquisition', input.tracked && input.slash === null, `${restoredPoints.length} landmarks recovered; no teleport strike on return.`);
      times.sort((a, b) => a - b);
      setResult(`${report.every(item => item.passed) ? 'PASS' : 'FAIL'}: ${loaded.model} model, ${loaded.delegate} delegate. Desktop inference median ${times[12].toFixed(0)} ms, p95 ${times[22].toFixed(0)} ms. ${report.filter(item => item.passed).length}/${report.length} checks passed.`);
    } catch (error) { setResult('FAIL: ' + (error as Error).message); }
    finally { tracker?.close(); if (videoURL) URL.revokeObjectURL(videoURL); setBusy(false); }
  };
  return <main style={{ padding: '36px', maxWidth: '1040px', margin: 'auto' }}><h1>Recorded-input vision test</h1><p>Uses the phone’s model, confidence settings, controller checks and GPU → CPU fallback. Inputs are a public test image and a recorded squat video. No camera permission or personal video is used.</p><div style={{ display: 'flex', gap: '12px', margin: '20px 0' }}><select aria-label="Pose model" value={model} disabled={busy} onChange={e => setModel(e.target.value as TrackingModel)}><option value="full">Full pose</option><option value="lite">Fast pose</option></select><select aria-label="Inference delegate" value={delegate} disabled={busy} onChange={e => setDelegate(e.target.value as 'GPU' | 'CPU')}><option value="GPU">GPU with CPU fallback</option><option value="CPU">CPU</option></select><button className="button button-primary" disabled={busy} onClick={() => void run()}>Run recorded vision test</button></div><p role="status">{result}</p><div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px' }}><canvas ref={canvasRef} style={{ width: '100%', maxHeight: '440px', objectFit: 'contain' }} aria-label="Recorded test frame with detected skeleton"/><ol>{checks.map(item => <li key={item.name} style={{ marginBottom: '12px' }}><strong>{item.passed ? 'PASS' : 'FAIL'} · {item.name}</strong><br/>{item.detail}</li>)}</ol></div><video ref={videoRef} muted playsInline hidden/><p>These tests verify inference and movement data handling. Android camera permissions, live latency and physical play accuracy require a connected phone.</p><p>Fixtures: <a href="https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/python/solutions/pose_test.py">MediaPipe pose test</a> and <a href="https://github.com/tensorflow/tfjs-models/blob/master/pose-detection/src/blazepose_tfjs/blazepose_test.ts">TensorFlow squat test</a>.</p><a href="/">Back to MoveRoom</a></main>;
}
