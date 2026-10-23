/* Uses the pinned npm runtime copied by npm run assets. Inference stays on this phone. */
importScripts('/vision/runtime.js');
let tracker = null, model = 'full', delegate = 'GPU';
const normalize = points => points.map(p => ({ x: p.x, y: p.y, z: p.z, visibility: Math.max(0, Math.min(1, p.visibility ?? 0)) }));
self.onmessage = async event => {
  const message = event.data;
  try {
    if (message.type === 'init') {
      tracker?.close(); model = message.model; delegate = message.delegate;
      const files = await Vision.FilesetResolver.forVisionTasks('/vision/wasm');
      const options = { baseOptions: { modelAssetPath: `/vision/pose_landmarker_${model}.task`, delegate }, runningMode: 'VIDEO', numPoses: 1,
        minPoseDetectionConfidence: .55, minPosePresenceConfidence: .55, minTrackingConfidence: .6, outputSegmentationMasks: false };
      try { tracker = await Vision.PoseLandmarker.createFromOptions(files, options); }
      catch (error) {
        if (delegate === 'CPU') throw error;
        delegate = 'CPU'; tracker = await Vision.PoseLandmarker.createFromOptions(files, { ...options, baseOptions: { ...options.baseOptions, delegate } });
      }
      self.postMessage({ id: message.id, result: null }); return;
    }
    if (!tracker || !message.bitmap) throw new Error('The movement tracker is not ready.');
    const before = performance.now(), result = tracker.detectForVideo(message.bitmap, message.t);
    try {
      self.postMessage({ id: message.id, result: { landmarks: normalize(result.landmarks[0] || []), worldLandmarks: normalize(result.worldLandmarks[0] || []),
        model, delegate, inferenceMs: performance.now() - before, execution: 'worker' } });
    } finally { result.close(); }
  } catch (error) { self.postMessage({ id: message.id, error: error instanceof Error ? error.message : String(error) }); }
  finally { message.bitmap?.close(); }
};
