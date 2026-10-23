import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { PoseCamera } from './camera';
import { CameraOwner } from './camera-owner';
import type { RoomSocket } from './socket';
import { measureBody } from '../../shared/motion';
import { measureExercise, type TrainingBlock } from '../../shared/training';
import type { Activity, TrackingModel } from '../../shared/protocol';

type Props = { video: RefObject<HTMLVideoElement | null>; canvas: RefObject<HTMLCanvasElement | null>; socket: RefObject<RoomSocket | null>;
  activity: RefObject<Activity>; exercise: RefObject<TrainingBlock | null>; model: TrackingModel; facing: 'user' | 'environment' };
export function usePhoneCamera({ video, canvas, socket, activity, exercise, model, facing }: Props) {
  const owner = useRef(new CameraOwner<PoseCamera>()), mounted = useRef(false);
  const wake = useRef<WakeLockSentinel | null>(null), sequence = useRef(0), lastFrame = useRef(0), lastUI = useRef(0);
  const wakePending = useRef<PoseCamera | null>(null);
  const [running, setRunning] = useState(false), [loading, setLoading] = useState(false), [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState('Ready when you are.'), [error, setError] = useState('');
  const [fps, setFps] = useState(0), [aspect, setAspect] = useState(4 / 3), [trackingInfo, setTrackingInfo] = useState('');
  const invalidate = useCallback(() => {
    socket.current?.send({ type: 'pose', seq: sequence.current++, t: performance.now(), landmarks: [], fps: 0 });
    lastFrame.current = 0; setTracking(false); setFps(0); setTrackingInfo('');
  }, [socket]);
  const releaseWake = useCallback(() => { void wake.current?.release().catch(() => {}); wake.current = null; }, []);
  const acquireWake = useCallback(async (camera: PoseCamera) => {
    if (!('wakeLock' in navigator) || document.hidden || wake.current && !wake.current.released || wakePending.current === camera) return;
    wakePending.current = camera;
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (!mounted.current || !owner.current.owns(camera) || document.hidden) { await lock.release(); return; }
      wake.current = lock;
    } catch { /* A wake lock is optional; visibility still invalidates movement. */ }
    finally { if (wakePending.current === camera) wakePending.current = null; }
  }, []);
  const stop = useCallback(() => {
    owner.current.stop(); releaseWake(); invalidate();
    setRunning(false); setLoading(false); setStatus('Camera paused. Take your time.');
  }, [releaseWake, invalidate]);
  const start = useCallback(async (direction = facing) => {
    if (!video.current || !canvas.current) return;
    releaseWake(); setError(''); setLoading(true); setRunning(false); invalidate();
    const camera = new PoseCamera(video.current, canvas.current, frame => {
      if (!mounted.current || !owner.current.owns(camera)) return;
      socket.current?.send({ ...frame, seq: sequence.current++ });
      lastFrame.current = frame.landmarks.length ? performance.now() : 0;
      if (frame.landmarks.length && performance.now() - lastUI.current < 120) return;
      lastUI.current = performance.now();
      setFps(frame.fps);
      setTrackingInfo(frame.tracking ? `${frame.tracking.model === 'full' ? 'Full pose' : 'Fast pose'} · ${frame.tracking.delegate} · ${frame.tracking.inferenceMs} ms · ${frame.tracking.execution === 'worker' ? 'Background processing' : 'Compatibility processing'}` : '');
      if (exercise.current) {
        const view = measureExercise(frame.landmarks, exercise.current, frame.imageAspect);
        setTracking(Boolean(view.measurement));
        setStatus(view.measurement ? 'Your exercise is in side view.' : view.cue === 'view' ? 'Move the phone to your side for this exercise.' : 'Keep the exercise joints fully in view.');
      } else {
        const body = measureBody(frame.landmarks), elbows = !['chapter', 'arena'].includes(activity.current) || [13, 14].every(i => frame.landmarks[i]?.visibility >= .5);
        setTracking(Boolean(body && elbows));
        setStatus(body ? elbows ? 'Your movement is in view.' : 'Bring both elbows into view for sword control.' : 'Step back until your hands and hips are in view.');
      }
    }, message => { if (mounted.current && owner.current.owns(camera)) setStatus(message); }, model, {
      onFatal: failure => {
        if (!mounted.current || !owner.current.clear(camera)) return;
        releaseWake(); invalidate(); setRunning(false); setLoading(false);
        setError(`Movement tracking stopped: ${failure.message}. Tap Restart camera to try again.`);
      },
    });
    owner.current.replace(camera);
    try {
      await camera.start(direction);
      if (!mounted.current || !owner.current.owns(camera)) return;
      setAspect(video.current.videoWidth / video.current.videoHeight || 4 / 3); setRunning(true);
      void acquireWake(camera);
    } catch (failure) {
      camera.stop();
      if (!mounted.current || !owner.current.clear(camera)) return;
      invalidate(); setRunning(false);
      const message = failure instanceof DOMException && failure.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in your browser, then restart.' : failure instanceof DOMException && failure.name === 'NotFoundError' ? 'No camera was found on this device.' : failure instanceof Error ? failure.message : String(failure);
      setError(message);
    } finally { if (mounted.current && (owner.current.owns(camera) || !owner.current.current)) setLoading(false); }
  }, [video, canvas, socket, activity, exercise, model, facing, releaseWake, invalidate, acquireWake]);
  useEffect(() => {
    mounted.current = true;
    const visibility = () => {
      if (document.hidden) { invalidate(); releaseWake(); }
      else if (owner.current.current) void acquireWake(owner.current.current);
    };
    const timer = setInterval(() => {
      if (lastFrame.current && performance.now() - lastFrame.current > 800) { invalidate(); setStatus('Waiting for fresh movement. Keep this page visible.'); }
    }, 250);
    document.addEventListener('visibilitychange', visibility);
    return () => { mounted.current = false; owner.current.stop(); releaseWake(); clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [invalidate, releaseWake, acquireWake]);
  return { running, loading, tracking, status, error, fps, aspect, trackingInfo, start, stop };
}
