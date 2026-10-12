import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, CircleHelp, Dumbbell, Pause, Play, Shield, Volume2, VolumeX } from 'lucide-react';
import { completeTraining, exerciseName, makeTrainingPlan, measureExercise, TrainingCoach, trainingCues, trainingPreviewPose, trainingStats, trainingVoice, type TrainingBlock, type TrainingPreference, type TrainingSave, type TrainingSnapshot } from '../../shared/training';
import type { Landmark } from '../../shared/protocol';
import { ChapterAudio, type VoiceState } from '../lib/chapterAudio';
import PoseView from './PoseView';
import './training.css';

type Props = { guideOpen: boolean; onGuide: () => void; points: Landmark[]; frameTime?: number; aspect: number; preview: boolean; sound: boolean; save: TrainingSave;
  onSave: (value: TrainingSave) => void; onClose: () => void; onPair: () => void; onInstruction: (text: string) => void; onExercise: (block: TrainingBlock | null) => void; onToggleSound: () => void };
const localDay = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };

export default function TrainingHall({ guideOpen, onGuide, points, frameTime, aspect, preview, sound, save, onSave, onClose, onPair, onInstruction, onExercise, onToggleSound }: Props) {
  const [preference, setPreference] = useState<TrainingPreference>({ ...save.preference });
  const [coach, setCoach] = useState<TrainingCoach | null>(null), [state, setState] = useState<TrainingSnapshot | null>(null);
  const [userPaused, setPaused] = useState(false), [lowered, setLowered] = useState(false), [previewPoints, setPreviewPoints] = useState<Landmark[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle'), [receipt, setReceipt] = useState<'earned' | 'preview' | 'capped' | null>(null);
  const audio = useRef<ChapterAudio | null>(null), lastVoice = useRef(''), lastVoiceAt = useRef(-10000), finished = useRef(false), lastRep = useRef(0), lastRejected = useRef(0);
  const sessionId = useRef(''), lowerTarget = useRef(false), currentLower = useRef(0), preferenceRef = useRef(preference), mounted = useRef(true);
  preferenceRef.current = preference;
  const paused = userPaused || guideOpen;
  const latest = useRef({ points, frameTime, aspect, preview, paused }); latest.current = { points, frameTime, aspect, preview, paused };
  const lastCompleted = save.history.some(h => !h.preview);
  const plan = makeTrainingPlan(preference, lastCompleted), stats = trainingStats(save);
  const block = coach?.block ?? plan.blocks[0];
  const view = measureExercise(points, block, aspect);
  const shown = preview ? previewPoints : points;
  useEffect(() => { onExercise(block); return () => onExercise(null); }, [block.exercise, block.variation, onExercise]);
  useEffect(() => {
    mounted.current = true; audio.current = new ChapterAudio();
    return () => { mounted.current = false; audio.current?.close(); audio.current = null; };
  }, []);
  useEffect(() => { audio.current?.setEnabled(sound); lastVoice.current = ''; }, [sound]);
  useEffect(() => { audio.current?.setPaused(paused); }, [paused]);
  const voice = useCallback((id: string) => {
    if (lastVoice.current === id) return;
    lastVoice.current = id; lastVoiceAt.current = performance.now();
    void audio.current?.speak(id, () => undefined, state => { if (mounted.current) setVoiceState(state); });
  }, []);
  useEffect(() => {
    if (!coach) return;
    let raf = 0, previous = performance.now(), previewTime = 0, publishAt = 0, lastFrame: number | undefined;
    const tick = (now: number) => {
      const dt = Math.min(1, (now - previous) / 1000); previous = now;
      const input = latest.current;
      if (input.paused || document.hidden) coach.suspend('paused');
      else {
        coach.tick(dt);
        if (input.preview) {
          // The labelled, reward-free preview has a fixed-step simulated
          // controller, independent of display FPS. Live frames are never
          // interpolated or given synthetic hold time.
          let remaining = dt;
          while (remaining > .00001) {
            const step = Math.min(1 / 30, remaining); remaining -= step; previewTime += step * 1000;
            const target = lowerTarget.current ? 1 : 0;
            currentLower.current += Math.sign(target - currentLower.current) * Math.min(Math.abs(target - currentLower.current), step / .8);
            coach.update(trainingPreviewPose(coach.block, currentLower.current), previewTime, 4 / 3);
          }
          const pose = trainingPreviewPose(coach.block, currentLower.current);
          if (now - publishAt > 90) setPreviewPoints(pose);
        } else if (input.frameTime !== undefined && input.frameTime !== lastFrame) {
          lastFrame = input.frameTime; coach.update(input.points, input.frameTime, input.aspect);
        } else if (!input.points.length) coach.suspend('missing');
      }
      if (now - publishAt > 90) { publishAt = now; setState({ ...coach.state }); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [coach]);
  useEffect(() => {
    if (!state) return;
    const text = paused ? trainingCues.paused : trainingCues[state.cue];
    onInstruction(text);
    let id = trainingVoice(paused ? 'paused' : state.cue);
    let immediate = false;
    if (state.rejected > lastRejected.current && state.lastCorrection) {
      lastRejected.current = state.rejected; id = trainingVoice(state.lastCorrection);
      immediate = true;
    } else if (state.lastRep > lastRep.current) {
      lastRep.current = state.lastRep;
      if (state.phase === 'active') id = `TRAIN_count_${state.reps}`;
      immediate = true;
    }
    if (immediate) { voice(id); return; }
    const delay = Math.max(0, 2500 - (performance.now() - lastVoiceAt.current));
    const timer = setTimeout(() => voice(id), delay);
    return () => clearTimeout(timer);
  }, [state?.cue, state?.lastRep, state?.rejected, state?.phase, paused, sound, voice, onInstruction]);
  useEffect(() => {
    if (!coach || state?.phase !== 'complete' || finished.current) return;
    finished.current = true;
    const next = completeTraining(save, coach, sessionId.current, localDay(), preview);
    onSave(next); setReceipt(next.xp > save.xp ? 'earned' : preview ? 'preview' : 'capped');
  }, [state?.phase, coach, save, preview, onSave]);
  useEffect(() => {
    const focus = requestAnimationFrame(() => document.querySelector<HTMLElement>('.training-hall [data-autofocus]:not(:disabled)')?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(focus);
  }, [Boolean(coach), state?.phase === 'complete']);
  useEffect(() => {
    const pause = () => { if (coach && coach.state.phase !== 'complete') setPaused(p => !p); };
    const down = (event: KeyboardEvent) => {
      if (guideOpen) return;
      const key = event.key.toLowerCase();
      if (['escape', 'backspace', 'q'].includes(key)) { event.preventDefault(); event.stopImmediatePropagation(); if (key !== 'q') { if (coach && coach.state.phase !== 'complete') setPaused(p => !p); else onClose(); } }
      if (preview && key === 'b' && coach) { event.preventDefault(); event.stopImmediatePropagation(); lowerTarget.current = true; setLowered(true); }
    };
    const up = (event: KeyboardEvent) => { if (event.key.toLowerCase() === 'b') { lowerTarget.current = false; setLowered(false); } };
    const blur = () => { lowerTarget.current = false; setLowered(false); if (coach) setPaused(true); };
    window.addEventListener('keydown', down, true); window.addEventListener('keyup', up); window.addEventListener('moveroom:pause', pause); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', up); window.removeEventListener('moveroom:pause', pause); window.removeEventListener('blur', blur); };
  }, [coach, preview, onClose, guideOpen]);
  const begin = () => {
    onSave({ ...save, preference }); sessionId.current = crypto.randomUUID(); finished.current = false; lastRep.current = 0; lastRejected.current = 0;
    lastVoice.current = ''; currentLower.current = 0; lowerTarget.current = false; setLowered(false); setPaused(false); setReceipt(null);
    const next = new TrainingCoach(makeTrainingPlan(preference, lastCompleted)); setCoach(next); setState({ ...next.state });
  };
  const choose = <K extends keyof TrainingPreference>(key: K, value: TrainingPreference[K]) => setPreference(p => ({ ...p, [key]: value }));
  const reportEffort = (effort: TrainingPreference['effort']) => { choose('effort', effort); onSave({ ...save, preference: { ...preferenceRef.current, effort } }); };
  const changeRoutine = () => { audio.current?.stopVoice(); setCoach(null); setState(null); setPaused(false); lowerTarget.current = false; setLowered(false); };
  const complete = state?.phase === 'complete';
  return <section className="training-hall" role="dialog" aria-modal="true" aria-label="Alden’s training hall" data-training-phase={state?.phase || 'plan'} data-voice-state={voiceState}>
    <header className="training-header"><button className="chapter-text-button" onClick={onClose}><ArrowLeft size={17}/> Return to adventure</button><span><Dumbbell size={18}/> ALDEN’S TRAINING HALL</span><button className="chapter-text-button" onClick={onGuide}><CircleHelp size={17}/> Training guide</button><button className="chapter-text-button" aria-label={sound ? 'Turn training sound off' : 'Turn training sound on'} onClick={onToggleSound}>{sound ? <Volume2 size={19}/> : <VolumeX size={19}/>}</button></header>
    <div className="training-body"><aside className="training-mentor"><img src="/assets/medieval/characters/instructor.png" alt="Sir Alden Vale"/><span className="chapter-eyebrow">YOUR INSTRUCTOR</span><h2>Discipline<br/><em>before glory.</em></h2><p>“An honest repetition earns its place. Reset the movement, and we begin again.”</p><div className="training-stats"><div><b>{stats.level}</b><span>Squire level</span></div><div><b>{stats.strength}</b><span>Strength</span></div><div><b>{stats.endurance}</b><span>Endurance</span></div></div><small>{save.xp} training XP · Story damage +{Math.round(stats.damageBonus * 100)}% · Stamina recovery +{Math.round(stats.recoveryBonus * 100)}%</small></aside>
    {!coach ? <div className="training-plan"><span className="chapter-eyebrow">A ROUTINE FOR TODAY</span><h1>Build your squire.</h1><p>Choose a starting pace and comfortable variations. Alden sets the reps, sets and rest, using your last completed routine and effort feedback.</p>
      <fieldset><legend>Today’s pace</legend><div>{(['start', 'steady'] as const).map(value => <button data-autofocus={value === 'start' || undefined} className={preference.pace === value ? 'selected' : ''} aria-pressed={preference.pace === value} key={value} onClick={() => choose('pace', value)}>{value === 'start' ? 'Starting out' : 'Steady practice'}</button>)}</div></fieldset>
      <fieldset><legend>Squat variation</legend><div>{(['shallow', 'regular'] as const).map(value => <button className={preference.squat === value ? 'selected' : ''} aria-pressed={preference.squat === value} key={value} onClick={() => choose('squat', value)}>{value === 'shallow' ? 'Shallow' : 'Regular'}</button>)}</div></fieldset>
      <fieldset><legend>Push-up variation</legend><div>{(['wall', 'knees', 'floor'] as const).map(value => <button className={preference.pushup === value ? 'selected' : ''} aria-pressed={preference.pushup === value} key={value} onClick={() => choose('pushup', value)}>{value === 'wall' ? 'Wall' : value === 'knees' ? 'Knees' : 'Floor'}</button>)}</div></fieldset>
      <div className="training-routine">{plan.blocks.map((b, i) => <div key={b.exercise}><span>0{i + 1}</span><strong>{exerciseName(b)}</strong><b>{b.sets} × {b.reps}</b></div>)}<small>45 seconds between sets and exercises · Recalibrate for each exercise</small></div>
      <p className="training-reward"><Shield size={15}/>{preview ? 'Desktop preview · Camera off · XP rewards disabled' : save.lastRewardDay === localDay() ? 'Today’s XP earned. Training remains available.' : 'Complete both exercises for 60 XP. One reward per day.'}</p><div className="training-actions"><button className="chapter-button" onClick={begin}>Begin calibration <Dumbbell size={17}/></button>{!preview && <button className="chapter-button secondary" onClick={onPair}>Connect camera</button>}</div><small className="training-note">Side view required. Choose an easier variation if the range is uncomfortable. Stop if a movement hurts. This short routine is a starting point, not a complete fitness programme.</small>
    </div> : complete ? <div className="training-complete"><Check size={36}/><span className="chapter-eyebrow">A DAY’S DISCIPLINE</span><h1>Training complete.</h1><p>{state!.totalReps} counted reps · {state!.completedSets} completed sets · {state!.rejected} attempts reset</p><strong>{receipt === 'earned' ? '+60 XP · Your squire grows stronger' : receipt === 'preview' ? 'Preview complete · No XP awarded' : 'Practice complete · Today’s XP already claimed'}</strong><h3>How did the routine feel?</h3><div className="training-effort">{([['lighter', 'Too demanding'], ['same', 'About right'], ['ready', 'Ready for a little more']] as const).map(([value, label]) => <button aria-pressed={preference.effort === value} className={preference.effort === value ? 'selected' : ''} key={value} onClick={() => reportEffort(value)}>{label}</button>)}</div><p className="training-note">The next recommendation changes only with your feedback. Story bonuses stop at +8% damage and +10% recovery.</p><button data-autofocus className="chapter-button" onClick={onClose}>Return to your adventure</button></div>
    : <div className="training-live"><div className="training-live-heading"><div><span className="chapter-eyebrow">EXERCISE {state!.block + 1} / 2</span><h1>{exerciseName(block)}</h1></div><div className="training-live-actions"><button className="chapter-text-button" onClick={changeRoutine}>Change routine</button><button data-autofocus className="chapter-button secondary" onClick={() => setPaused(p => !p)}>{paused ? <Play size={16}/> : <Pause size={16}/>} {paused ? 'Resume' : 'Pause'}</button></div></div>
      <div className="training-live-grid"><div className="training-pose"><PoseView points={shown}/><span>{preview ? 'DESKTOP PREVIEW · CAMERA OFF' : state!.tracked ? 'SIDE VIEW IN FRAME' : 'COUNTING HELD · CHECK VIEW'}</span>{preview && <button className="chapter-button secondary" aria-pressed={lowered} onClick={() => { lowerTarget.current = !lowerTarget.current; setLowered(lowerTarget.current); }}>{lowered ? 'Preview return to start' : 'Preview lower position'}</button>}</div><div className="training-counter"><span>SET {state!.set} / {block.sets}</span><b>{state!.reps}<small> / {block.reps}</small></b><span>COUNTED REPS</span><div className="training-set-dots">{Array.from({ length: block.reps }, (_, i) => <i key={i} className={i < state!.reps ? 'done' : ''}/>)}</div><small>{state!.completedSets} sets complete · {state!.rejected} attempts reset</small>{state!.lastCorrection && <small className="training-last-reset">Last reset: {trainingCues[state!.lastCorrection]}</small>}{state!.angle !== null && <small>{block.exercise === 'squat' ? 'Visible knee' : 'Visible elbow'} bend {Math.round(state!.angle)}°</small>}</div></div>
      <div className={`training-cue ${paused || !state!.tracked ? 'held' : ''}`}><span>{paused ? 'PAUSED' : state!.phase === 'rest' ? `REST · ${Math.ceil(state!.restRemaining)} SECONDS` : state!.phase === 'active' ? 'ALDEN’S GUIDANCE' : state!.phase === 'calibrate-top' ? 'CALIBRATE · START POSITION' : state!.phase === 'calibrate-bottom' ? 'CALIBRATE · LOWER POSITION' : 'CALIBRATE · RETURN TO START'}</span><h3>{paused ? trainingCues.paused : trainingCues[state!.cue]}</h3>{state!.phase !== 'active' && <div className="training-progress"><i style={{ width: `${state!.phase === 'rest' ? (1 - state!.restRemaining / coach.plan.rest) * 100 : state!.progress * 100}%` }}/></div>}</div>
      <p className="training-setup">{block.exercise === 'squat' ? 'Phone at hip height, to your side. Keep shoulders, hips, knees and ankles visible.' : block.variation === 'wall' ? 'Phone to your side. Use a stable wall; keep elbows, wrists, hips and ankles visible.' : 'Place the phone low, to your side. Keep shoulders, elbows, wrists, hips and your support point visible.'}</p><p className="training-note">{preview ? 'Hold B to lower; release B to return. Calibration starts counting automatically after your return.' : 'Hold the starting pose, show one comfortable lower pose, then return. Counting begins automatically.'} {sound ? voiceState === 'blocked' || voiceState === 'unavailable' ? 'Voice unavailable; follow the captions.' : voiceState === 'playing' ? 'Alden is speaking.' : 'Alden’s voice guidance is on.' : 'Voice guidance is off.'}</p>
    </div>}</div>
    {!coach && !preview && !view.measurement && <div className="training-view-note">{trainingCues[view.cue]}</div>}
  </section>;
}
