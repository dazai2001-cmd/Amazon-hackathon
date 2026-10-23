import { useEffect, useRef, useState } from 'react';
import { Download, Play, Square, X } from 'lucide-react';
import type { PoseFrame } from '../../shared/protocol';
import { measureBody } from '../../shared/motion';
import { summarizeDeviceRun, type DeviceSample } from '../../shared/deviceMetrics';
import type { TrainingSave } from '../../shared/training';
import RemoteTextField from './RemoteTextField';
import './progress.css';

export default function DeviceCheck({ frame, latency, training, onClose }: { frame: { packet: PoseFrame; receivedAt: number } | null; latency: number | null; training: TrainingSave; onClose: () => void }) {
  const [recording, setRecording] = useState(false), [clock, setClock] = useState(performance.now()), [duration, setDuration] = useState(0);
  const [samples, setSamples] = useState<DeviceSample[]>([]), [manual, setManual] = useState('');
  const [editing, setEditing] = useState(false);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const captured = useRef<DeviceSample[]>([]), began = useRef(0);
  const fresh = Boolean(frame && clock - frame.receivedAt < 800), summary = summarizeDeviceRun(samples, endedAt === null ? undefined : { start: began.current, end: endedAt });
  const lastCircuit = [...training.history].reverse().find(log => !log.preview), manualCount = manual === '' ? null : Number(manual);
  useEffect(() => { const id = setInterval(() => setClock(performance.now()), 200); return () => clearInterval(id); }, []);
  useEffect(() => {
    if (!recording || !frame || captured.current.length >= 1800) return;
    captured.current.push({ at: frame.receivedAt, visible: Boolean(measureBody(frame.packet.landmarks)), fps: frame.packet.fps, inferenceMs: frame.packet.tracking?.inferenceMs ?? null });
  }, [frame?.packet.seq, recording]);
  useEffect(() => {
    if (!recording) return;
    const elapsed = clock - began.current; setDuration(Math.min(30, Math.floor(elapsed / 1000)));
    if (elapsed >= 30000) { setRecording(false); setSamples([...captured.current]); setEndedAt(began.current + 30000); }
  }, [clock, recording]);
  const finish = () => { setRecording(false); setSamples([...captured.current]); setEndedAt(Math.min(performance.now(), began.current + 30000)); };
  const download = () => {
    const canvas = document.querySelector<HTMLCanvasElement>('.first-person-canvas');
    const report = { recordedAt: new Date().toISOString(), durationSeconds: duration, ...summary, tvServerRoundTripMs: latency,
      graphics: canvas ? { width: canvas.width, height: canvas.height, quality: canvas.dataset.quality, fps: canvas.dataset.fps } : null,
      repComparison: lastCircuit && manualCount !== null ? { session: lastCircuit.id, day: lastCircuit.day, manual: manualCount, detected: lastCircuit.reps, difference: lastCircuit.reps - manualCount } : null,
      note: 'TV arrival intervals and round-trip receipt are transport measurements. They do not measure physical motion-to-display latency or certify exercise form.' };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `earnedvalor-device-check-${Date.now()}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="menu-panel-scrim"><section className="menu-panel device-check" role="dialog" aria-modal="true" aria-labelledby="device-check-title" inert={editing}><button className="menu-panel-close" aria-label="Close device check" onClick={onClose}><X/></button>
    <span className="menu-eyebrow">REHEARSE YOUR REAL CAMERA DEMO</span><h2 id="device-check-title">Device check</h2><p>Pair your phone, stay in view and record 30 seconds while you move your arms. Only timing and summary counts are retained here.</p>
    <div className="device-readout" role="status"><strong>{fresh && frame?.packet.landmarks.length ? 'Fresh camera frames arriving' : 'Waiting for fresh camera frames'}</strong><span>{fresh ? frame?.packet.fps : 0} phone FPS · {frame?.packet.tracking?.inferenceMs ?? '—'} ms inference · {latency ?? '—'} ms TV/server round trip</span></div>
    <button data-autofocus className="menu-panel-primary" disabled={!fresh && !recording} onClick={() => { if (recording) finish(); else { captured.current = []; setSamples([]); setEndedAt(null); began.current = performance.now(); setDuration(0); setRecording(true); } }}>{recording ? <Square size={18}/> : <Play size={18}/>} {recording ? `Finish recording · ${duration}/30 seconds` : 'Record 30 seconds'}</button>
    {samples.length > 0 && <p>{summary.frames} frames · {summary.usablePercent}% usable standing poses · {summary.arrivalP95Ms} ms p95 arrival interval · {summary.largestGapMs} ms largest frame gap</p>}
    <h3>Check rep counting</h3><p>Complete a camera circuit in Training, then enter the total reps you counted yourself. Your latest completed camera circuit: {lastCircuit ? `${lastCircuit.day} · ${lastCircuit.reps} reps` : 'None yet'}.</p>
    <label className="device-manual">Manually counted reps <RemoteTextField label="Manually counted reps" numeric maxLength={3} value={manual} onChange={setManual} onEditing={setEditing}/></label>
    {lastCircuit && manualCount !== null && <p role="status">Game count {lastCircuit.reps} · Manual count {manualCount} · Difference {lastCircuit.reps - manualCount}. Repeat in different lighting and camera positions; a matching total alone does not establish every rep’s accuracy.</p>}
    <button className="menu-panel-option" disabled={!samples.length} onClick={download}><Download size={18}/> Download this check</button>
  </section></div>;
}
