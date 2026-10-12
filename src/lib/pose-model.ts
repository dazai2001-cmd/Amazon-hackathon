import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import type { TrackingModel } from '../../shared/protocol';

/** Shared by the phone and the recorded-input diagnostic. */
export async function loadPoseTracker(runningMode: 'IMAGE' | 'VIDEO' = 'VIDEO', delegate: 'GPU' | 'CPU' = 'GPU', model: TrackingModel = 'full'): Promise<{ tracker: PoseLandmarker; delegate: 'GPU' | 'CPU'; model: TrackingModel }> {
  const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
  const files = await FilesetResolver.forVisionTasks('/vision/wasm');
  const options = { baseOptions: { modelAssetPath: `/vision/pose_landmarker_${model}.task`, delegate }, runningMode, numPoses: 1, minPoseDetectionConfidence: 0.55, minPosePresenceConfidence: 0.55, minTrackingConfidence: 0.6, outputSegmentationMasks: false };
  try { return { tracker: await PoseLandmarker.createFromOptions(files, options), delegate, model }; }
  catch (error) {
    if (delegate === 'CPU') throw error;
    return { tracker: await PoseLandmarker.createFromOptions(files, { ...options, baseOptions: { ...options.baseOptions, delegate: 'CPU' } }), delegate: 'CPU', model };
  }
}
