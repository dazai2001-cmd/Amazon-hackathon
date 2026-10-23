export type DeviceSample = { at: number; visible: boolean; fps: number; inferenceMs: number | null };
export function summarizeDeviceRun(samples: DeviceSample[], window?: { start: number; end: number }) {
  const bounds = window && Number.isFinite(window.start) && Number.isFinite(window.end) && window.end >= window.start ? window : null;
  const valid = samples.filter(s => Number.isFinite(s.at) && s.at >= 0 && Number.isFinite(s.fps) && s.fps >= 0
    && (!bounds || s.at >= bounds.start && s.at <= bounds.end)).sort((a, b) => a.at - b.at);
  const arrivals = valid.slice(1).map((s, i) => s.at - valid[i].at).filter(n => n >= 0);
  const inference = valid.map(s => s.inferenceMs).filter((n): n is number => n !== null && Number.isFinite(n) && n >= 0);
  const percentile = (values: number[], p: number) => values.length ? Math.round([...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * p) - 1)]) : null;
  const gaps = bounds ? valid.length ? [...arrivals, valid[0].at - bounds.start, bounds.end - valid[valid.length - 1].at] : [bounds.end - bounds.start] : arrivals;
  return { frames: valid.length, durationMs: bounds ? Math.round(bounds.end - bounds.start) : valid.length > 1 ? Math.round(valid[valid.length - 1].at - valid[0].at) : 0,
    usablePercent: valid.length ? Math.round(valid.filter(s => s.visible).length * 100 / valid.length) : null,
    arrivalMedianMs: percentile(arrivals, .5), arrivalP95Ms: percentile(arrivals, .95), largestGapMs: percentile(gaps, 1),
    inferenceMedianMs: percentile(inference, .5), inferenceP95Ms: percentile(inference, .95) };
}
