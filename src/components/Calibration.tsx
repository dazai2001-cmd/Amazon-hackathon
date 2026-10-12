import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, MoveHorizontal, Accessibility, PersonStanding } from 'lucide-react';
import { calibrationCue, makeProfile, measureBody, type BodyMeasurement, type CalibrationProfile } from '../../shared/motion';
import type { Landmark, MovementMode } from '../../shared/protocol';
import PoseView from './PoseView';
import { useHandsFreeCountdown } from '../lib/useHandsFreeCountdown';
import './hands-free.css';

const STEPS = [
  { title: 'Find your starting position', cue: 'Relax your arms. Face your phone and hold still.', duration: 2000 },
  { title: 'A little to the left', cue: 'Lean left as far as feels comfortable. Hold there.', duration: 1600 },
  { title: 'Now to the right', cue: 'Lean right within your comfortable range. Hold there.', duration: 1600 },
  { title: 'Show us your reach', cue: 'Raise both hands to your comfortable target. Hold there.', duration: 2000 },
];

export default function Calibration({ points, tracking, preview, onBack, onComplete, onInstruction }: {
  points: Landmark[]; tracking: boolean; preview: boolean; onBack: () => void;
  onComplete: (profile: CalibrationProfile) => void; onInstruction: (text: string) => void;
}) {
  const [mode, setMode] = useState<MovementMode>('standing');
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CalibrationProfile | null>(null);
  const [error, setError] = useState('');
  const [movementCue, setMovementCue] = useState('');
  const [seenTracking, setSeenTracking] = useState(tracking), [holdStart, setHoldStart] = useState(false), [holdFinish, setHoldFinish] = useState(false);
  useEffect(() => { if (tracking) setSeenTracking(true); }, [tracking]);
  const data = useRef<BodyMeasurement[][]>([[], [], [], []]);
  const elapsed = useRef(0), lastTime = useRef(0);
  useEffect(() => { if (started && step < 4) onInstruction(STEPS[step].cue); }, [started, step, onInstruction]);
  useEffect(() => {
    if (!started || result || step >= 4) return;
    const body = tracking ? measureBody(points) : null;
    const now = performance.now();
    if (!body || (lastTime.current && now - lastTime.current > 350)) { lastTime.current = 0; elapsed.current = 0; data.current[step] = []; setProgress(0); if (!body) return; }
    const cue = calibrationCue(step, body, data.current[0]);
    setMovementCue(cue || '');
    if (cue) { elapsed.current = 0; lastTime.current = 0; setProgress(0); data.current[step] = []; return; }
    if (lastTime.current) elapsed.current += Math.min(150, now - lastTime.current);
    lastTime.current = now; data.current[step].push(body);
    setProgress(Math.min(1, elapsed.current / STEPS[step].duration));
    if (elapsed.current >= STEPS[step].duration) {
      elapsed.current = 0; lastTime.current = 0; setProgress(0);
      if (step === 3) {
        try { setResult(makeProfile(data.current[0], data.current[1], data.current[2], data.current[3], mode)); onInstruction('Calibration complete. Look at your TV.'); }
        catch (e) { setError((e as Error).message); setStarted(false); }
      } else setStep(v => v + 1);
    }
  }, [points, tracking, started, step, mode, result, onInstruction]);
  useEffect(() => { if (result || (!started && error)) requestAnimationFrame(() => document.querySelector<HTMLElement>('.calibration-copy .button-primary')?.focus({ preventScroll: true })); }, [result, started, error]);
  const start = () => { data.current = [[], [], [], []]; elapsed.current = 0; lastTime.current = 0; setStep(0); setProgress(0); setError(''); setStarted(true); };
  const startingIn = useHandsFreeCountdown(!preview && tracking && !started && !result && !error && !holdStart, start, 5, mode);
  const finishingIn = useHandsFreeCountdown(!preview && tracking && Boolean(result) && !holdFinish, () => { if (result) onComplete(result); });
  return <section className="activity-layout calibration-layout">
    <div className="activity-heading"><button className="text-button" onClick={onBack}><ArrowLeft size={17}/> Back</button><span className="eyebrow">YOUR MOVEMENT, YOUR RULES</span></div>
    <div className="calibration-content"><div className="calibration-copy"><div className="section-kicker">MAKE IT YOURS</div><h1>{result ? <>Perfectly<br/><em>your pace.</em></> : <>Every body<br/><em>plays differently.</em></>}</h1>
      <p>{result ? 'Your movement range is saved on this device. Every lean and reach now starts with you.' : 'A quick setup helps us fit the controls to your comfortable movement range.'}</p>
      {!started && !result && <><div className="mode-toggle"><button className={mode === 'standing' ? 'selected' : ''} onClick={() => setMode('standing')}><PersonStanding size={20}/> Standing</button><button className={mode === 'seated' ? 'selected' : ''} onClick={() => setMode('seated')}><Accessibility size={20}/> Seated</button></div><button className="button button-primary" onClick={start} disabled={!tracking && !seenTracking}>Find my range <ArrowRight size={19}/></button>{!preview && <div className={`hands-free-start ${startingIn === null ? 'waiting' : ''}`} role="status"><span>{startingIn !== null ? `${mode === 'standing' ? 'Standing' : 'Seated'} setup starts in ${startingIn}… Stay in view.` : holdStart || error ? 'Click Find my range, then return to view. Setup will wait for you.' : 'Return to view to begin setup automatically.'}</span><button className="text-button" onClick={() => setHoldStart(v => !v)}>{holdStart ? 'Start hands-free' : 'Choose settings first'}</button></div>}<span className="small-note">Only move within a range that feels comfortable.</span></>}
      {started && !result && <div className="calibration-instruction"><span>STEP {step + 1} OF 4</span><h3>{STEPS[step].title}</h3><p>{tracking ? movementCue || STEPS[step].cue : 'Bring your hands, shoulders, and hips into view to continue.'}</p><div className="progress-track"><i style={{ width: `${progress * 100}%` }}/></div>{preview && <span className="small-note">Preview controls: hold ← / → to lean, ↑ to raise hands.</span>}</div>}
      {result && <><div className="calibration-success"><Check size={20}/><span>{result.mode === 'seated' ? 'Seated' : 'Standing'} controls · Personalized reach · Calibrated steering</span></div><button className="button button-primary" onClick={() => onComplete(result)}>Ready to move <ArrowRight size={19}/></button>{!preview && <div className={`hands-free-start ${finishingIn === null ? 'waiting' : ''}`} role="status"><span>{finishingIn !== null ? `Returning to your game in ${finishingIn}… No click needed.` : holdFinish ? 'Your range is saved. Continue when you’re ready.' : 'Stay in view to return to your game automatically.'}</span><button className="text-button" onClick={() => setHoldFinish(v => !v)}>{holdFinish ? 'Continue hands-free' : 'Wait here'}</button></div>}</>}
      {error && <p className="error-note">{error}</p>}
    </div><div className="calibration-stage"><div className="stage-grid"/><div className="stage-glow"/><PoseView points={points}/><span className={`stage-tracking ${tracking ? 'tracking-good' : ''}`}><i/>{preview ? 'Keyboard preview' : tracking ? 'Movement in view' : 'Looking for you'}</span><div className="range-guide"><MoveHorizontal size={20}/><span>Your comfortable range</span></div><div className="calibration-step-dots">{STEPS.map((_, i) => <i key={i} className={result || step > i ? 'complete' : step === i && started ? 'active' : ''}/>)}</div></div></div>
  </section>;
}
