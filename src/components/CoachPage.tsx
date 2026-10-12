import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Hand, RotateCcw, Sparkles, Timer, Pause, Play } from 'lucide-react';
import { ReachCoach, type CoachSnapshot } from '../../shared/coach';
import { type CalibrationProfile, type Motion, syntheticPose } from '../../shared/motion';
import type { Landmark } from '../../shared/protocol';
import PoseView from './PoseView';

export default function CoachPage({ points, motion, tracking, frameTime, profile, preview, onBack, onInstruction }: {
  points: Landmark[]; motion: Motion; tracking: boolean; profile: CalibrationProfile; preview: boolean;
  frameTime?: number;
  onBack: () => void; onInstruction: (text: string) => void;
}) {
  const coach = useRef(new ReachCoach(profile.reachTarget));
  const [state, setState] = useState<CoachSnapshot>({ ...coach.current.state });
  const [started, setStarted] = useState(false), [paused, setPaused] = useState(false);
  const [first, setFirst] = useState<Landmark[]>([]), [latest, setLatest] = useState<Landmark[]>([]);
  const [replay, setReplay] = useState(false), [replayTick, setReplayTick] = useState(0);
  const recording = useRef<Landmark[][]>([]);
  const lastCue = useRef('');
  useEffect(() => { const pause = () => { if (started && state.phase !== 'complete') setPaused(p => !p); }; window.addEventListener('moveroom:pause', pause); return () => window.removeEventListener('moveroom:pause', pause); }, [started, state.phase]);
  useEffect(() => {
    if (!started || state.phase === 'complete') return;
    const next = coach.current.update(tracking && !paused ? motion : { ...motion, tracked: false }, frameTime ?? performance.now());
    setState({ ...next });
    if (tracking && !paused && points.length === 33) {
      recording.current.push(points.map(p => ({ ...p })));
      if (recording.current.length > 900) recording.current.shift();
      if (next.phase === 'hold' && next.progress > 0.9) {
        setFirst(saved => saved.length ? saved : points.map(p => ({ ...p })));
        setLatest(points.map(p => ({ ...p })));
      }
    }
    if (next.cue !== lastCue.current) { lastCue.current = next.cue; onInstruction(next.cue); }
  }, [points, motion, tracking, frameTime, started, paused, state.phase === 'complete', onInstruction]);
  useEffect(() => { if (!started || state.phase === 'complete') { const id = requestAnimationFrame(() => document.querySelector<HTMLElement>('.coach-copy [data-autofocus]')?.focus({ preventScroll: true })); return () => cancelAnimationFrame(id); } }, [started, state.phase === 'complete']);
  useEffect(() => {
    if (!replay) return;
    const interval = setInterval(() => setReplayTick(t => (t + 1) % Math.max(1, recording.current.length)), 90);
    return () => clearInterval(interval);
  }, [replay]);
  const restart = () => { coach.current = new ReachCoach(profile.reachTarget); setState({ ...coach.current.state }); setStarted(false); setPaused(false); setFirst([]); setLatest([]); recording.current = []; setReplay(false); lastCue.current = ''; };
  const complete = state.phase === 'complete';
  const shown = replay ? recording.current[replayTick] || latest : points;
  return <section className="activity-layout coach-layout"><div className="activity-heading"><button className="text-button" onClick={onBack}><ArrowLeft size={17}/> Playground</button><div className="activity-title"><span className="tag tag-lilac">COACH</span><h2>Reach & Reset</h2><span>A little practice. A steadier rhythm.</span></div><button className="button button-small button-secondary" disabled={!started || complete} onClick={() => setPaused(p => !p)}>{paused ? <Play size={17}/> : <Pause size={17}/>} {paused ? 'Resume' : 'Pause'}</button></div>
    <div className="coach-content"><div className="coach-stage"><div className="stage-grid"/><div className="stage-glow coach-glow"/><PoseView points={complete ? replay ? shown : latest : started ? points : syntheticPose(0, true)} ghost={complete ? first : undefined}/><span className={`stage-tracking ${tracking ? 'tracking-good' : ''}`}><i/>{complete ? replay ? 'Your movement replay' : 'First hold + latest hold' : preview ? 'Keyboard preview' : tracking ? 'Movement in view' : 'Looking for you'}</span><div className="coach-floor"/><div className="coach-phase-badge">{complete ? <><Check size={17}/> Practice complete</> : <><Hand size={17}/> {state.phase === 'hold' ? 'Hold together' : state.phase === 'lower' ? 'Lower and reset' : 'Reach at your pace'}</>}</div></div>
      <div className="coach-copy"><div className="section-kicker">{complete ? 'A LITTLE PROGRESS, MADE VISIBLE' : state.practice ? 'LET’S TRY A DIFFERENT WAY' : 'MOVE WITH INTENTION'}</div><h1>{complete ? <>Look how<br/><em>far you reached.</em></> : <>Find your<br/><em>own rhythm.</em></>}</h1>
      {!started && <><p>Raise both hands to your comfortable target, hold for two seconds, then lower to reset. We’ll guide five steady reaches.</p><div className="coach-details"><span><Timer size={16}/> Your pace</span><span><Hand size={16}/> 5 reaches</span><span><Sparkles size={16}/> Live guidance</span></div><button data-autofocus className="button button-primary" disabled={!tracking} onClick={() => setStarted(true)}>Begin a little practice <ArrowRight size={18}/></button><span className="small-note">This routine checks timing and hand coordination.</span></>}
      {started && !complete && <><div className={`coach-cue ${state.practice ? 'practice-cue' : ''}`}><span>{paused ? 'PAUSED' : !tracking ? 'FIND YOUR FRAME' : state.phase === 'hold' ? 'HOLD YOUR REACH' : state.phase === 'lower' ? 'RESET' : state.practice ? 'PRACTICE CUE' : 'YOUR NEXT MOVE'}</span><h3>{paused ? 'Take your time. Resume when you’re ready.' : !tracking ? 'Bring your hands, shoulders, and hips into view.' : state.cue}</h3><div className="progress-track"><i style={{ width: `${state.progress * 100}%` }}/></div></div><div className="coach-reps">{Array.from({ length: state.goal }, (_, i) => <span key={i} className={i < state.reps ? 'done' : i === state.reps ? 'current' : ''}>{i < state.reps ? <Check size={18}/> : i + 1}</span>)}<small>{state.reps} of {state.goal} steady reaches</small></div>{preview && <p className="keyboard-hint">Hold ↑ for at least two seconds. Release to reset.</p>}</>}
      {complete && <><p>You completed {state.reps} controlled reaches. The lime silhouette shows your latest hold; lilac shows your first.</p><div className="coach-result-stats"><div><b>{state.reps}</b><span>steady reaches</span></div><div><b>2<span>s</span></b><span>hold target</span></div></div><div className="coach-result-buttons"><button data-autofocus className="button button-primary" onClick={() => { setReplay(v => !v); setReplayTick(0); }}>{replay ? 'Compare your holds' : 'Replay your movement'} <Play size={17}/></button><button className="button button-secondary" onClick={restart}><RotateCcw size={17}/> Practice again</button></div></>}
    </div></div>
  </section>;
}
