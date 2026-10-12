export type Landmark = { x: number; y: number; z: number; visibility: number };
export type TrackingModel = 'lite' | 'full';
export type PoseFrame = { type: 'pose'; seq: number; t: number; landmarks: Landmark[]; fps: number; imageAspect?: number; worldLandmarks?: Landmark[]; tracking?: { model: TrackingModel; delegate: 'GPU' | 'CPU'; inferenceMs: number } };
export type MovementMode = 'standing' | 'seated';
export type Activity = 'home' | 'play' | 'coach' | 'calibrate' | 'chapter';
export type Command = { type: 'command'; action: 'activity' | 'instruction' | 'stop' | 'exercise'; value: string };
export type SessionInfo = { code: string; tvToken: string; phoneToken: string; phoneUrl: string; expiresAt: number };
export type ServerMessage =
  | { type: 'connected'; role: 'tv' | 'phone'; phoneConnected: boolean; tvConnected: boolean }
  | { type: 'presence'; phoneConnected: boolean; tvConnected: boolean }
  | { type: 'error'; message: string }
  | { type: 'pong'; t: number }
  | Command
  | PoseFrame;

export function isPoseFrame(value: unknown): value is PoseFrame {
  if (!value || typeof value !== 'object') return false;
  const frame = value as PoseFrame;
  return frame.type === 'pose' && Number.isSafeInteger(frame.seq) && frame.seq >= 0
    && Number.isFinite(frame.t) && frame.t >= 0
    && Number.isFinite(frame.fps) && frame.fps >= 0 && frame.fps <= 120
    && (frame.imageAspect === undefined || Number.isFinite(frame.imageAspect) && frame.imageAspect >= .3 && frame.imageAspect <= 3)
    && Array.isArray(frame.landmarks) && (frame.landmarks.length === 0 || frame.landmarks.length === 33)
    && frame.landmarks.every(p => p && Number.isFinite(p.x) && p.x >= -2 && p.x <= 3
      && Number.isFinite(p.y) && p.y >= -2 && p.y <= 3
      && Number.isFinite(p.z) && Math.abs(p.z) <= 20
      && Number.isFinite(p.visibility) && p.visibility >= 0 && p.visibility <= 1)
    && (frame.worldLandmarks === undefined || Array.isArray(frame.worldLandmarks)
      && (frame.worldLandmarks.length === 0 || frame.landmarks.length === 33 && frame.worldLandmarks.length === 33)
      && frame.worldLandmarks.every(p => p && [p.x, p.y, p.z].every(n => Number.isFinite(n) && Math.abs(n) <= 5)
        && Number.isFinite(p.visibility) && p.visibility >= 0 && p.visibility <= 1))
    && (frame.tracking === undefined || Boolean(frame.tracking && ['lite', 'full'].includes(frame.tracking.model)
      && ['GPU', 'CPU'].includes(frame.tracking.delegate) && Number.isFinite(frame.tracking.inferenceMs)
      && frame.tracking.inferenceMs >= 0 && frame.tracking.inferenceMs <= 2000));
}

export function isCommand(value: unknown): value is Command {
  if (!value || typeof value !== 'object') return false;
  const command = value as Command;
  return command.type === 'command' && ['activity', 'instruction', 'stop', 'exercise'].includes(command.action)
    && typeof command.value === 'string' && command.value.length <= 200;
}
