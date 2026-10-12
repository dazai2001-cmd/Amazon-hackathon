import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Accessibility, ArrowDownLeft, ArrowRight, Check, ChevronRight, CircleHelp, Gamepad2, Hand, Keyboard, MoveHorizontal, PersonStanding, ScanLine, ShieldCheck, Smartphone, Sparkles, Timer, Volume2, VolumeX, X } from 'lucide-react';
import { DEFAULT_PROFILE, MotionEngine, REST_MOTION, measureBody, syntheticPose, type CalibrationProfile } from '../shared/motion';
import type { Activity, Landmark } from '../shared/protocol';
import Brand from './components/Brand';
import OrbitArt from './components/OrbitArt';
import PairDialog from './components/PairDialog';
import Calibration from './components/Calibration';
import GamePage from './components/GamePage';
import CoachPage from './components/CoachPage';
import { useRoom } from './lib/useRoom';
import { focusScope, moveFocus } from './lib/remote';
import { clamp } from '../shared/motion';
import { poseWithBlade, type Point } from '../shared/game';
import { lanePoint } from '../shared/weapons';
import { measureExercise, type TrainingBlock } from '../shared/training';
import './components/chapter.css';

const ChapterPage = lazy(() => import('./components/ChapterPage'));
const EMPTY_POSE: Landmark[] = [];

function loadProfile(): CalibrationProfile | null {
  try {
    const p = JSON.parse(localStorage.getItem('moveroom.profile') || 'null') as CalibrationProfile | null;
    if (p && ['standing', 'seated'].includes(p.mode) && ['centerX', 'shoulderY', 'torso', 'leftRange', 'rightRange', 'reachTarget', 'createdAt'].every(k => Number.isFinite(p[k as keyof CalibrationProfile])) && (p.shoulderWidth === undefined || Number.isFinite(p.shoulderWidth) && p.shoulderWidth > .02 && p.shoulderWidth < .8)) return p;
  } catch { /* Use calibration when there is no saved profile. */ }
  return null;
}

export default function TVApp() {
  const room = useRoom();
  const [activity, setActivity] = useState<Activity>(window.location.pathname === '/chapter' ? 'chapter' : 'home');
  const [pairOpen, setPairOpen] = useState(false), [helpOpen, setHelpOpen] = useState(false);
  const [intent, setIntent] = useState<Activity>('home');
  const [trainingPair, setTrainingPair] = useState(false), [trainingBlock, setTrainingBlock] = useState<TrainingBlock | null>(null);
  const [afterCalibration, setAfterCalibration] = useState<Activity>('home');
  const [profile, setProfile] = useState<CalibrationProfile | null>(loadProfile);
  const [preview, setPreview] = useState(false), [previewProfile, setPreviewProfile] = useState<CalibrationProfile>(DEFAULT_PROFILE);
  const [previewPoints, setPreviewPoints] = useState<Landmark[]>([]);
  const [clock, setClock] = useState(performance.now());
  const [sound, setSound] = useState(false);
  const keys = useRef(new Set<string>());
  const previewBlade = useRef<Point>({ x: 0.5, y: 0.6 });
  const previewSwing = useRef(-1000);
  const previewCut = useRef('j');
  const movePreviewBlade = useCallback((point: Point) => { previewBlade.current = { x: clamp(point.x, 0.04, 0.96), y: clamp(point.y, 0.18, 0.91) }; }, []);
  const activeProfile = preview ? previewProfile : profile || DEFAULT_PROFILE;
  const engine = useMemo(() => new MotionEngine(activeProfile), [activeProfile]);
  const fresh = Boolean(room.phoneConnected && room.frame && clock - room.frame.receivedAt < 800);
  const points = preview ? previewPoints : fresh ? room.frame!.packet.landmarks : EMPTY_POSE;
  const worldPoints = !preview && fresh ? room.frame!.packet.worldLandmarks || EMPTY_POSE : EMPTY_POSE;
  const analyzed = useMemo(() => engine.update(points, performance.now()), [engine, points]);
  const tracking = analyzed.tracked;
  useEffect(() => { const id = setInterval(() => setClock(performance.now()), 160); return () => clearInterval(id); }, []);
  useEffect(() => {
    if (!preview) return;
    let raf = 0, last = 0;
    const update = (now: number) => {
      if (now - last >= 45) {
        const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
        if (activity === 'play' || activity === 'chapter') {
          const blade = previewBlade.current;
          blade.x = clamp(blade.x + ((keys.current.has('ArrowRight') ? 1 : 0) - (keys.current.has('ArrowLeft') ? 1 : 0)) * dt * 1.5, 0.04, 0.96);
          blade.y = clamp(blade.y + ((keys.current.has('ArrowDown') ? 1 : 0) - (keys.current.has('ArrowUp') ? 1 : 0)) * dt * 1.5, 0.18, 0.91);
          if (activity === 'chapter' && now - previewSwing.current < 250) {
            const progress = clamp((now - previewSwing.current) / 250, 0, 1);
            blade.x = previewCut.current === 'k' ? .5 : previewCut.current === 'l' ? .18 + progress * .64 : .82 - progress * .64;
            blade.y = previewCut.current === 'k' ? .18 + progress * .64 : .22 + progress * .42;
          }
          const lean = activity === 'chapter' ? (keys.current.has('d') ? 1 : 0) - (keys.current.has('a') ? 1 : 0) : 0;
          const motionActive = activity === 'chapter' && Boolean(document.querySelector('[data-motion-active="true"]'));
          const guard = lanePoint(keys.current.has('z') ? 'left' : keys.current.has('c') ? 'right' : 'high');
          setPreviewPoints(poseWithBlade(syntheticPose(lean, false, keys.current.has('v')), blade, keys.current.has('Shift'), activeProfile, motionActive ? guard : undefined, activity === 'chapter'));
        } else setPreviewPoints(syntheticPose((keys.current.has('ArrowRight') ? 1 : 0) - (keys.current.has('ArrowLeft') ? 1 : 0), keys.current.has('ArrowUp'), keys.current.has('ArrowDown')));
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update); return () => { cancelAnimationFrame(raf); keys.current.clear(); };
  }, [preview, activity, activeProfile]);
  const speak = useCallback((text: string) => {
    room.command('instruction', text);
    if (sound && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const voice = new SpeechSynthesisUtterance(text); voice.rate = 0.94; voice.volume = 0.7;
      window.speechSynthesis.speak(voice);
    }
  }, [room.command, sound]);
  const trainingExercise = useCallback((block: TrainingBlock | null) => { setTrainingBlock(block); room.command('exercise', block ? `${block.exercise}:${block.variation}` : 'none'); }, [room.command, room.phoneConnected]);
  const chapterInstruction = useCallback((text: string) => { room.command('instruction', text); }, [room.command]);
  const navigate = useCallback((next: Activity) => { setActivity(next); room.command('activity', next); keys.current.clear(); window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [room.command]);
  const begin = (next: Activity) => {
    setTrainingPair(false);
    if (next === 'home') return navigate('home');
    if (!tracking && !preview) { setIntent(next); setPairOpen(true); return; }
    if (next !== 'calibrate' && !preview && !profile) { setAfterCalibration(next); navigate('calibrate'); return; }
    if (next === 'calibrate') setAfterCalibration('home');
    navigate(next);
  };
  const startPreview = () => { setPreview(true); setPairOpen(false); setHelpOpen(false); setTrainingPair(false); navigate(intent === 'home' ? 'chapter' : intent); };
  const continuePairing = () => {
    setPairOpen(false); setPreview(false);
    if (trainingPair) { setTrainingPair(false); navigate('chapter'); return; }
    if (intent === 'home') navigate('home');
    else if (intent === 'calibrate' || !profile) { setAfterCalibration(intent === 'calibrate' ? 'home' : intent); navigate('calibrate'); }
    else navigate(intent);
  };
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (['INPUT', 'SELECT'].includes((event.target as HTMLElement)?.tagName)) return;
      const combatActive = activity === 'chapter' && Boolean(document.querySelector('[data-motion-active="true"]'));
      if (event.key === 'Shift' && preview && (activity === 'play' || combatActive)) { keys.current.add('Shift'); return; }
      if (preview && combatActive && ['a', 'd', 'j', 'k', 'l', 'z', 'x', 'c', 'v'].includes(event.key.toLowerCase())) {
        event.preventDefault(); const key = event.key.toLowerCase();
        if (['j', 'k', 'l'].includes(key)) { if (!event.repeat) { previewSwing.current = performance.now(); previewCut.current = key; } }
        else keys.current.add(key);
        return;
      }
      if (document.querySelector('.training-hall') && ['Escape', 'Backspace'].includes(event.key)) return;
      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault(); if (pairOpen) setPairOpen(false); else if (helpOpen) setHelpOpen(false); else navigate('home'); return;
      }
      if (event.key === ' ' && (activity === 'play' || activity === 'coach' || activity === 'chapter') && !pairOpen && !helpOpen) { event.preventDefault(); window.dispatchEvent(new Event('moveroom:pause')); return; }
      if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        if (preview && !document.querySelector('.training-hall') && activity !== 'home' && (activity !== 'chapter' || combatActive) && !pairOpen && !helpOpen) keys.current.add(event.key);
        else moveFocus(event.key);
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const focused = document.activeElement as HTMLElement;
        if (focused?.tagName === 'BUTTON' || focused?.tagName === 'A') focused.click();
        else if (activity === 'play' || combatActive) window.dispatchEvent(new Event('moveroom:pause'));
      }
    };
    const up = (event: KeyboardEvent) => { keys.current.delete(event.key); keys.current.delete(event.key.toLowerCase()); };
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, [activity, preview, pairOpen, helpOpen, navigate]);
  useEffect(() => {
    const timer = setTimeout(() => {
      const scope = focusScope();
      (scope.querySelector<HTMLElement>('[data-autofocus]') || scope.querySelector<HTMLElement>('button:not(:disabled)'))?.focus({ preventScroll: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [activity, pairOpen, helpOpen]);
  const onCalibration = (saved: CalibrationProfile) => {
    if (preview) setPreviewProfile(saved);
    else { setProfile(saved); localStorage.setItem('moveroom.profile', JSON.stringify(saved)); }
    navigate(afterCalibration);
  };
  const status = preview ? 'Desktop preview' : tracking ? 'Movement connected' : room.phoneConnected ? 'Phone connected' : 'Pair your phone';

  return <div className={`tv-app ${activity === 'chapter' ? 'chapter-active' : ''}`}><div className="ambient-grain" aria-hidden="true"/><div className="tv-main" aria-hidden={pairOpen || helpOpen || undefined}>
    <header className="app-header"><button className="brand-button" aria-label="MoveRoom home" onClick={() => navigate('home')}><Brand/></button><nav aria-label="Main navigation"><button className={activity === 'home' ? 'active' : ''} onClick={() => navigate('home')}>Discover</button><button className={activity === 'play' ? 'active' : ''} onClick={() => begin('play')}>Play</button><button className={activity === 'coach' ? 'active' : ''} onClick={() => begin('coach')}>Practice</button></nav><div className="header-actions"><button className={`connection-button ${tracking && !preview ? 'connected' : ''}`} onClick={() => { setIntent('home'); setPairOpen(true); }}>{preview ? <Keyboard size={17}/> : <Smartphone size={17}/>}<span>{status}</span>{tracking && !preview ? <i/> : <ChevronRight size={15}/>}</button><button className="icon-button" aria-label={sound ? 'Turn sound off' : 'Turn sound on'} title={sound ? 'Sound on' : 'Sound off'} onClick={() => setSound(v => !v)}>{sound ? <Volume2 size={19}/> : <VolumeX size={19}/>}</button><button className="icon-button" aria-label="How MoveRoom works" onClick={() => setHelpOpen(true)}><CircleHelp size={19}/></button></div></header>
    {preview && <div className="preview-banner"><Keyboard size={15}/><span>Desktop preview · Camera tracking is off</span><button onClick={() => { setPreview(false); keys.current.clear(); navigate('home'); }}>Exit preview <X size={14}/></button></div>}
    {room.error && <div className="server-error" role="alert"><span>{room.error}</span><button className="text-button" onClick={room.renew}>Reconnect</button></div>}
    {activity === 'home' && <section className="medieval-feature"><div><span className="chapter-eyebrow">A NEW ADVENTURE · FIRST-PERSON 3D</span><h2>The Ashen Gate</h2><p>Begin as a squire. Meet a blade with your shield.<br/>Earn your first victory in Alden’s courtyard.</p><button data-autofocus className="chapter-button" onClick={() => begin('chapter')}>Begin Chapter I <ArrowRight size={16}/></button></div><img src="/assets/medieval/characters/instructor.png" alt="Sir Alden Vale"/><span>YOUR BODY. YOUR SWORD. YOUR STORY.</span></section>}
    {activity === 'home' && <main className="home-content"><section className="hero"><div className="hero-copy"><div className="eyebrow"><i/> MAKE ROOM FOR SOMETHING GOOD</div><h1>A little space.<br/>A lot of <em>play.</em></h1><p>Your body is the controller.<br/>Your living room is the playground.</p><div className="hero-actions"><button data-autofocus className="button button-primary" onClick={() => begin('play')}>Let’s get moving <ArrowRight size={19}/></button><button className="button button-secondary" onClick={() => { setIntent('home'); setPairOpen(true); }}><ScanLine size={18}/> Pair your phone</button></div><div className="hero-benefits"><span><Check size={13}/> No wearables</span><span><Check size={13}/> Your own pace</span><span><Check size={13}/> Standing or seated</span></div></div><div className="hero-visual"><div className="floating-label label-top"><i/> A NEW KIND OF SCREEN TIME</div><OrbitArt/><div className="floating-label label-bottom"><MoveHorizontal size={17}/><span>A little sweep.<br/><b>A whole new adventure.</b></span><ArrowDownLeft size={19}/></div><span className="hero-visual-caption">LESS WATCHING. MORE DOING.</span></div></section>
      <section className="experience-section"><div className="section-heading"><div><span className="section-kicker">GOOD TIMES START HERE</span><h2>What moves you today?</h2></div><span className="section-heading-note">Small moves. Real moments.</span></div><div className="experience-grid"><button className="experience-card play-card" onClick={() => begin('play')}><div className="card-art orbit-card-art"><OrbitArt small/><span className="tag tag-lime">PLAY</span><span className="card-art-arrow"><ArrowRight size={19}/></span></div><div className="card-copy"><div className="card-meta"><span>45-SECOND ADVENTURE</span><span><Gamepad2 size={13}/> 1 player</span></div><h3>Orbit Arena</h3><p>Sweep. Slice. Shield. Your body plays.</p></div></button>
      <button className="experience-card coach-card" onClick={() => begin('coach')}><div className="card-art coach-card-art"><span className="tag tag-lilac">PRACTICE</span><div className="mini-person"><svg viewBox="0 0 180 160" fill="none"><ellipse cx="90" cy="148" rx="44" ry="5" fill="#beafff" opacity=".12"/><circle cx="90" cy="45" r="13" stroke="#c5b5f5" strokeWidth="10"/><path d="M67 72L51 47L35 20M113 72L129 47L145 20M67 72L75 108H105L113 72M75 108L65 142M105 108L115 142M67 72H113" stroke="#c5b5f5" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/><circle cx="35" cy="20" r="5" fill="#ede6ff"/><circle cx="145" cy="20" r="5" fill="#ede6ff"/></svg></div><div className="hold-label"><Timer size={13}/> Find your rhythm</div><span className="card-art-arrow"><ArrowRight size={19}/></span></div><div className="card-copy"><div className="card-meta"><span>GUIDED MOVEMENT</span><span><Hand size={13}/> 5 reaches</span></div><h3>Reach & Reset</h3><p>A little practice goes a long way.</p></div></button>
      <button className="experience-card calibration-card" onClick={() => begin('calibrate')}><div className="card-art calibration-card-art"><span className="tag tag-peach">MAKE IT YOURS</span><div className="range-art"><span/><span/><span/><span/><span/><div className="range-art-center"><Accessibility size={40}/></div></div><div className="range-art-caption">YOUR RANGE. YOUR RULES.</div><span className="card-art-arrow"><ArrowRight size={19}/></span></div><div className="card-copy"><div className="card-meta"><span>PERSONALIZED CONTROLS</span><span>{profile?.mode === 'seated' ? <Accessibility size={13}/> : <PersonStanding size={13}/>} {profile ? 'Calibrated' : 'Quick setup'}</span></div><h3>Made for your moves</h3><p>Make the playground fit you.</p></div></button></div></section>
      <div className="home-bottom-note"><span><ShieldCheck size={15}/> Your video stays on your phone. Just your movements make the trip.</span><button className="text-button" onClick={() => setHelpOpen(true)}>A little more about MoveRoom <ArrowRight size={15}/></button></div>
    </main>}
    {activity === 'play' && <GamePage points={points} profile={activeProfile} frameTime={preview ? undefined : room.frame?.packet.t} tracking={tracking} preview={preview} sound={sound} onPreviewMove={movePreviewBlade} onBack={() => navigate('home')} onPair={() => { setIntent('play'); setPairOpen(true); }}/>}
    {activity === 'coach' && <CoachPage points={points} motion={analyzed} tracking={tracking} frameTime={preview ? undefined : room.frame?.packet.t} preview={preview} profile={activeProfile} onBack={() => navigate('home')} onInstruction={speak}/>}
    {activity === 'chapter' && <Suspense fallback={<div className="loading-screen">Opening Alden’s courtyard…</div>}><ChapterPage points={points} worldPoints={worldPoints} imageAspect={room.frame?.packet.imageAspect} profile={activeProfile} frameTime={preview ? undefined : room.frame?.packet.t} tracking={tracking} controllerReady={preview || Boolean(profile && room.phoneConnected)} preview={preview} sound={sound} onPreviewMove={movePreviewBlade} onBack={() => navigate('home')} onPair={() => { setTrainingPair(false); setIntent('chapter'); setPairOpen(true); }} onTrainingPair={() => { setTrainingPair(true); setIntent('chapter'); setPairOpen(true); }} onInstruction={chapterInstruction} onTrainingExercise={trainingExercise} onToggleSound={() => setSound(v => !v)}/></Suspense>}
    {activity === 'calibrate' && <Calibration points={points} tracking={tracking} preview={preview} onBack={() => navigate('home')} onComplete={onCalibration} onInstruction={speak}/>}
    <footer className="app-footer"><span>MADE FOR YOUR LIVING ROOM <i/> POWERED BY YOUR MOVES</span><div><span>{new URLSearchParams(window.location.search).get('platform') === 'firetv' ? 'Fire OS app' : 'TV preview'}</span><i/><span>{preview ? 'Preview input' : room.phoneConnected && tracking ? `${Math.round(room.frame?.packet.fps || 0)} fps tracking` : 'Phone camera controller'}</span>{room.latency !== null && !preview && room.phoneConnected && <><i/><span>{room.latency} ms relay round trip</span></>}</div></footer>
    </div>
    {pairOpen && <PairDialog session={room.session} phoneConnected={room.phoneConnected} tracking={Boolean(fresh && room.frame && (trainingPair && trainingBlock ? measureExercise(room.frame.packet.landmarks, trainingBlock, room.frame.packet.imageAspect).measurement : measureBody(room.frame.packet.landmarks)))} error={room.error} onClose={() => { setPairOpen(false); setTrainingPair(false); }} onContinue={continuePairing} onPreview={startPreview} onRenew={room.renew}/>}
    {helpOpen && <div className="modal-scrim" onClick={() => setHelpOpen(false)}><section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={event => event.stopPropagation()}><button className="icon-button modal-close" aria-label="Close help" onClick={() => setHelpOpen(false)}><X size={22}/></button><div className="eyebrow"><Sparkles size={16}/> A LITTLE DIFFERENT</div><h2 id="help-title">Your phone sees the moves.<br/><span>Your TV brings them to life.</span></h2><div className="help-features"><div><Smartphone/><h3>Prop. Pair. Play.</h3><p>Use your Android phone’s camera. Leave it near your TV with your upper body in view.</p></div><div><MoveHorizontal/><h3>Controls that fit you.</h3><p>Calibrate a comfortable movement range. Choose standing or seated controls.</p></div><div><ShieldCheck/><h3>Your space stays yours.</h3><p>Camera frames are processed on your phone. Only movement landmarks reach the TV.</p></div></div><div className="help-bottom"><span>Remote: D-pad to browse · Select to choose · Back to return</span><button className="button button-primary" onClick={() => { setHelpOpen(false); setIntent('home'); setPairOpen(true); }}>Pair my phone <ArrowRight size={18}/></button></div></section></div>}
  </div>;
}
