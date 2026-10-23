import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Keyboard, Smartphone, X } from 'lucide-react';
import { DEFAULT_PROFILE, MotionEngine, measureBody, readCalibrationProfile, syntheticPose, type CalibrationProfile } from '../shared/motion';
import type { Activity, Landmark } from '../shared/protocol';
import { readStoryProgress } from '../shared/chapter';
import { TRAINING_KEY, readTrainingSave, measureExercise, type TrainingBlock, type TrainingSave } from '../shared/training';
import MainMenu from './components/MainMenu';
import PlayerProfiles from './components/PlayerProfiles';
import DeviceCheck from './components/DeviceCheck';
import TrainingProgress from './components/TrainingProgress';
import { playerStorage } from './lib/playerStorage';
import MenuPanel, { readMenuPreferences } from './components/MenuPanel';
import PairDialog from './components/PairDialog';
import PlayerGuide from './components/PlayerGuide';
import TrainingHall from './components/TrainingHall';
import Calibration from './components/Calibration';
import { hasSeenGuide, rememberGuide, type GuideTopic } from './lib/playerGuide';
import { useRoom } from './lib/useRoom';
import { focusScope, moveFocus } from './lib/remote';
import { clamp } from '../shared/motion';
import { poseWithBlade, type Point } from '../shared/game';
import { lanePoint } from '../shared/weapons';
import './components/chapter.css';

const ChapterPage = lazy(() => import('./components/ChapterPage'));
const ClanWarsPage = lazy(() => import('./components/ClanWarsPage'));
const EMPTY_POSE: Landmark[] = [];
type Screen = Exclude<Activity, 'play' | 'coach'>;
const paths: Record<Screen, string> = { home: '/', chapter: '/chapter', arena: '/arena', training: '/training', calibrate: '/calibrate' };
const screenAt = (path: string): Screen => (Object.entries(paths).find(([, value]) => value === path)?.[0] as Screen) || 'home';
const readStored = <T,>(key: string, parse: (value: unknown) => T): T => { try { return parse(JSON.parse(playerStorage.getItem(key) || 'null')); } catch { return parse(null); } };
function loadProfile(): CalibrationProfile | null {
  return readStored('moveroom.profile', readCalibrationProfile);
}

export default function TVApp() {
  const room = useRoom();
  const [activity, setActivity] = useState<Screen>(() => screenAt(window.location.pathname));
  const [pairOpen, setPairOpen] = useState(false), [panel, setPanel] = useState<'setup' | 'settings' | null>(null);
  const [guide, setGuide] = useState<GuideTopic | null>(null);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false), [progressOpen, setProgressOpen] = useState(false);
  const [playerId, setPlayerId] = useState(() => playerStorage.active().id);
  const guideOpen = guide !== null, overlayOpen = pairOpen || panel !== null || guideOpen || playersOpen || progressOpen || deviceOpen;
  const [intent, setIntent] = useState<Screen>('home');
  const [trainingPair, setTrainingPair] = useState(false), [trainingBlock, setTrainingBlock] = useState<TrainingBlock | null>(null);
  const [trainingSave, setTrainingSave] = useState(() => readStored(TRAINING_KEY, readTrainingSave));
  const saveTraining = useCallback((next: TrainingSave) => { setTrainingSave(next); try { playerStorage.setItem(TRAINING_KEY, JSON.stringify(next)); } catch { /* Keep session progress. */ } }, []);
  const [afterCalibration, setAfterCalibration] = useState<Screen>('home');
  const [profile, setProfile] = useState<CalibrationProfile | null>(loadProfile);
  const [preview, setPreview] = useState(false), [previewProfile, setPreviewProfile] = useState<CalibrationProfile>(DEFAULT_PROFILE);
  const [previewPoints, setPreviewPoints] = useState<Landmark[]>([]), [clock, setClock] = useState(performance.now());
  const [preferences, setPreferences] = useState(readMenuPreferences), sound = preferences.sound;
  useEffect(() => { try { localStorage.setItem('moveroom.settings.v1', JSON.stringify(preferences)); } catch { /* Session preferences remain usable. */ } }, [preferences]);
  const toggleSound = useCallback(() => setPreferences(p => ({ ...p, sound: !p.sound })), []);
  const setAutoDialogue = useCallback((autoDialogue: boolean) => setPreferences(p => p.autoDialogue === autoDialogue ? p : { ...p, autoDialogue }), []);
  const keys = useRef(new Set<string>()), previewBlade = useRef<Point>({ x: .5, y: .6 }), previewSwing = useRef(-1000), previewCut = useRef('j');
  const movePreviewBlade = useCallback((point: Point) => { previewBlade.current = { x: clamp(point.x, .04, .96), y: clamp(point.y, .18, .91) }; }, []);
  const activeProfile = preview ? previewProfile : profile || DEFAULT_PROFILE;
  const engine = useMemo(() => new MotionEngine(activeProfile), [activeProfile]);
  const fresh = Boolean(room.phoneConnected && room.frame && clock - room.frame.receivedAt < 800);
  const points = preview ? previewPoints : fresh ? room.frame!.packet.landmarks : EMPTY_POSE;
  const worldPoints = !preview && fresh ? room.frame!.packet.worldLandmarks || EMPTY_POSE : EMPTY_POSE;
  const analyzed = useMemo(() => engine.update(points, performance.now()), [engine, points]), tracking = analyzed.tracked;
  const menuProgress = useMemo(() => readStored('moveroom.story.v2', readStoryProgress), [activity, playerId]);
  useEffect(() => { const id = setInterval(() => setClock(performance.now()), 160); return () => clearInterval(id); }, []);
  useEffect(() => {
    if (!preview) return;
    let last = 0;
    const update = (now: number) => {
      if (now - last < 30) return;
      const dt = last ? Math.min(.1, (now - last) / 1000) : 0; last = now;
      if (activity === 'chapter' || activity === 'arena') {
        const blade = previewBlade.current;
        blade.x = clamp(blade.x + ((keys.current.has('ArrowRight') ? 1 : 0) - (keys.current.has('ArrowLeft') ? 1 : 0)) * dt * 1.5, .04, .96);
        blade.y = clamp(blade.y + ((keys.current.has('ArrowDown') ? 1 : 0) - (keys.current.has('ArrowUp') ? 1 : 0)) * dt * 1.5, .18, .91);
        if (now - previewSwing.current < 250) {
          const progress = clamp((now - previewSwing.current) / 250, 0, 1);
          blade.x = previewCut.current === 'k' ? .5 : previewCut.current === 'l' ? .18 + progress * .64 : .82 - progress * .64;
          blade.y = previewCut.current === 'k' ? .18 + progress * .64 : .22 + progress * .42;
        }
        const lean = (keys.current.has('d') ? 1 : 0) - (keys.current.has('a') ? 1 : 0), motionActive = Boolean(document.querySelector('[data-motion-active="true"]'));
        const guard = lanePoint(keys.current.has('z') ? 'left' : keys.current.has('c') ? 'right' : 'high');
        setPreviewPoints(poseWithBlade(syntheticPose(lean, false, keys.current.has('v')), blade, keys.current.has('Shift'), activeProfile, motionActive ? guard : undefined, true));
      } else setPreviewPoints(syntheticPose((keys.current.has('ArrowRight') ? 1 : 0) - (keys.current.has('ArrowLeft') ? 1 : 0), keys.current.has('ArrowUp'), keys.current.has('ArrowDown')));
    };
    // The simulated controller clock stays independent of 3D rendering.
    const interval = window.setInterval(() => { if (!document.hidden) update(performance.now()); }, 45);
    update(performance.now()); return () => { clearInterval(interval); keys.current.clear(); };
  }, [preview, activity, activeProfile]);
  const speak = useCallback((text: string) => {
    room.command('instruction', text);
    if (sound && 'speechSynthesis' in window) { window.speechSynthesis.cancel(); const voice = new SpeechSynthesisUtterance(text); voice.rate = .94; voice.volume = .7; window.speechSynthesis.speak(voice); }
  }, [room.command, sound]);
  const trainingExercise = useCallback((block: TrainingBlock | null) => { setTrainingBlock(block); room.command('exercise', block ? `${block.exercise}:${block.variation}` : 'none'); }, [room.command, room.phoneConnected]);
  const chapterInstruction = useCallback((text: string) => room.command('instruction', text), [room.command]);
  const hasWar = Boolean(room.arena.war);
  const navigate = useCallback((next: Screen) => {
    if (hasWar && next !== 'arena' && next !== 'calibrate') room.arenaCommand({ type: 'arena-command', action: 'leave' });
    setActivity(next); room.command('activity', next); keys.current.clear();
    if (window.location.pathname !== paths[next]) window.history.pushState({}, '', `${paths[next]}${window.location.search}`);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [hasWar, room.command, room.arenaCommand]);
  useEffect(() => {
    const back = () => { const next = screenAt(window.location.pathname); if (hasWar && next !== 'arena' && next !== 'calibrate') room.arenaCommand({ type: 'arena-command', action: 'leave' }); setActivity(next); setPanel(null); setPairOpen(false); setGuide(null); keys.current.clear(); room.command('activity', next); };
    window.addEventListener('popstate', back); return () => window.removeEventListener('popstate', back);
  }, [hasWar, room.command, room.arenaCommand]);
  const calibrate = () => { setPanel(null); setTrainingPair(false); setAfterCalibration('home'); if (!tracking && !preview) { setIntent('calibrate'); setPairOpen(true); } else navigate('calibrate'); };
  const pair = (next: Screen, exercise = false) => { setPanel(null); setTrainingPair(exercise); setIntent(next); setPairOpen(true); };
  const startPreview = () => { setPreview(true); setPairOpen(false); setPanel(null); setTrainingPair(false); navigate(intent); };
  const continuePairing = () => {
    setPairOpen(false); setPreview(false);
    if (trainingPair) { setTrainingPair(false); navigate(intent === 'training' ? 'training' : 'chapter'); return; }
    if (intent === 'calibrate' || !profile) { setAfterCalibration(intent === 'calibrate' ? 'home' : intent); navigate('calibrate'); }
    else navigate(intent);
  };
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (guideOpen) return;
      const focused = document.activeElement as HTMLElement | null;
      const editing = focused && ['INPUT', 'SELECT', 'TEXTAREA'].includes(focused.tagName);
      if (editing && event.key !== 'Escape' && !event.key.startsWith('Arrow')) return;
      const combatActive = !overlayOpen && (activity === 'chapter' || activity === 'arena') && Boolean(document.querySelector('[data-motion-active="true"]'));
      if (event.key === 'Shift' && preview && combatActive) { keys.current.add('Shift'); return; }
      if (preview && combatActive && ['a', 'd', 'j', 'k', 'l', 'z', 'x', 'c', 'v'].includes(event.key.toLowerCase())) {
        event.preventDefault(); const key = event.key.toLowerCase();
        if (['j', 'k', 'l'].includes(key)) { if (!event.repeat) { previewSwing.current = performance.now(); previewCut.current = key; } } else keys.current.add(key);
        return;
      }
      if (!overlayOpen && document.querySelector('.training-hall') && ['Escape', 'Backspace'].includes(event.key)) return;
      if (event.key === 'Escape' || event.key === 'Backspace') { if (activity === 'home' && !overlayOpen) return; event.preventDefault(); if (pairOpen) { setPairOpen(false); setTrainingPair(false); } else if (panel) setPanel(null); else if (playersOpen) setPlayersOpen(false); else if (progressOpen) setProgressOpen(false); else if (deviceOpen) setDeviceOpen(false); else navigate('home'); return; }
      if (event.key === ' ' && ['chapter', 'arena', 'training'].includes(activity) && !overlayOpen) { event.preventDefault(); window.dispatchEvent(new Event('moveroom:pause')); return; }
      if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        if (preview && !document.querySelector('.training-hall') && !overlayOpen && (Boolean(document.querySelector('.calibration-instruction')) || combatActive && focused?.tagName === 'CANVAS')) keys.current.add(event.key); else moveFocus(event.key);
      }
      if (event.key === 'Enter') { event.preventDefault(); if (event.repeat) return; if (focused?.tagName === 'BUTTON' || focused?.tagName === 'A') focused.click(); else if (combatActive) window.dispatchEvent(new Event('moveroom:pause')); }
    };
    const up = (event: KeyboardEvent) => { keys.current.delete(event.key); keys.current.delete(event.key.toLowerCase()); }, blur = () => keys.current.clear();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, [activity, preview, pairOpen, panel, guideOpen, playersOpen, progressOpen, deviceOpen, overlayOpen, navigate]);
  useLayoutEffect(() => {
    if (guideOpen) return;
    const scope = focusScope();
    (scope.querySelector<HTMLElement>('[data-autofocus]:not(:disabled)') || scope.querySelector<HTMLElement>('button:not(:disabled)'))?.focus({ preventScroll: true });
  }, [activity, pairOpen, panel, guideOpen, playersOpen, progressOpen, deviceOpen]);
  const onCalibration = (saved: CalibrationProfile) => { if (preview) setPreviewProfile(saved); else { setProfile(saved); try { playerStorage.setItem('moveroom.profile', JSON.stringify(saved)); } catch { /* Keep session calibration. */ } } navigate(afterCalibration); };
  const openGuide = useCallback((topic: GuideTopic) => { keys.current.clear(); setPanel(null); setGuide(topic); }, []);
  const closeGuide = useCallback(() => { rememberGuide(); keys.current.clear(); setGuide(null); }, []);
  useEffect(() => { if ((activity === 'chapter' || activity === 'arena') && !hasSeenGuide()) setGuide(activity === 'arena' ? 'clans' : 'setup'); }, [activity]);

  return <div className={`tv-app ashen-app ${preview ? 'preview-mode' : ''} ${activity === 'chapter' || activity === 'arena' ? 'chapter-active' : ''}`}><div className="tv-main" inert={overlayOpen} aria-hidden={overlayOpen || undefined}>
    {preview && <div className="preview-banner"><Keyboard size={15}/><span>Desktop preview · Camera tracking is off</span><button onClick={() => { setPreview(false); keys.current.clear(); navigate('home'); }}>Exit preview <X size={14}/></button></div>}
    {room.error && <div className="ashen-network-error" role="alert"><span>{room.error}</span><button onClick={room.renew}>Reconnect</button></div>}
    {activity === 'home' && <MainMenu progress={menuProgress} training={trainingSave} preview={preview} connected={room.phoneConnected} tracking={tracking} sound={sound} playerName={playerStorage.active().name} calibrated={Boolean(profile)} onPlayers={() => setPlayersOpen(true)} onProgress={() => setProgressOpen(true)} onStory={() => preview || profile && room.phoneConnected ? navigate('chapter') : pair('chapter')} onTraining={() => preview || room.phoneConnected ? navigate('training') : pair('training', true)} onClans={() => navigate('arena')} onSetup={() => setPanel('setup')} onSettings={() => setPanel('settings')} onGuide={() => openGuide('setup')} onToggleSound={toggleSound}/>}
    {activity === 'chapter' && <Suspense fallback={<div className="loading-screen">Opening Alden’s courtyard…</div>}><ChapterPage resolution={preferences.resolution} trainingSave={trainingSave} onTrainingSave={saveTraining} autoDialogue={preferences.autoDialogue} onAutoDialogueChange={setAutoDialogue} guideOpen={overlayOpen} onGuide={openGuide} points={points} worldPoints={worldPoints} imageAspect={room.frame?.packet.imageAspect} profile={activeProfile} frameTime={preview ? undefined : room.frame?.packet.t} tracking={tracking} controllerReady={preview || Boolean(profile && room.phoneConnected)} preview={preview} sound={sound} onPreviewMove={movePreviewBlade} onBack={() => navigate('home')} onPair={() => pair('chapter')} onTrainingPair={() => pair('chapter', true)} onArena={() => navigate('arena')} onInstruction={chapterInstruction} onTrainingExercise={trainingExercise} onToggleSound={toggleSound}/></Suspense>}
    {activity === 'training' && <div className="standalone-training"><TrainingHall returnLabel="Main menu" guideOpen={overlayOpen} onGuide={() => openGuide('training')} points={points} frameTime={preview ? undefined : room.frame?.packet.t} aspect={room.frame?.packet.imageAspect || 4 / 3} preview={preview} sound={sound} save={trainingSave} onSave={saveTraining} onClose={() => navigate('home')} onPair={() => pair('training', true)} onInstruction={chapterInstruction} onExercise={trainingExercise} onToggleSound={toggleSound}/></div>}
    {activity === 'arena' && <Suspense fallback={<div className="loading-screen">Opening the war hall…</div>}><ClanWarsPage resolution={preferences.resolution} guideOpen={overlayOpen} onGuide={() => openGuide('clans')} points={points} worldPoints={worldPoints} frameTime={preview ? undefined : room.frame?.packet.t} profile={activeProfile} tracking={tracking} preview={preview} controllerReady={preview || Boolean(profile && room.phoneConnected)} sound={sound} state={room.arena} error={room.arenaError} connected={room.connected} send={room.arenaCommand} onPair={() => pair('arena')} onBack={() => navigate('home')} onPreviewMove={movePreviewBlade} onToggleSound={toggleSound}/></Suspense>}
    {activity === 'calibrate' && <><header className="ashen-utility-header"><button onClick={() => navigate('home')}><ArrowLeft size={17}/> Main menu</button><span>CONTROLLER CALIBRATION</span><button onClick={() => pair('calibrate')}><Smartphone size={17}/> Connect phone</button></header><div className="ashen-controller-page"><Calibration points={points} tracking={tracking && !overlayOpen} preview={preview} onBack={() => navigate('home')} onComplete={onCalibration} onInstruction={speak}/></div></>}
    </div>
    {panel && <MenuPanel panel={panel} preferences={preferences} profile={profile} preview={preview} connected={room.phoneConnected} onClose={() => setPanel(null)} onPair={() => pair('home')} onCalibrate={calibrate} onPreview={() => { setPanel(null); setPreview(true); keys.current.clear(); }} onExitPreview={() => { setPanel(null); setPreview(false); keys.current.clear(); }} onDeviceCheck={() => { setPanel(null); setDeviceOpen(true); }} onGuide={() => openGuide('setup')} onSound={toggleSound} onAutoDialogue={() => setAutoDialogue(!preferences.autoDialogue)} onResolution={() => setPreferences(previous => ({ ...previous, resolution: previous.resolution === 'auto' ? 1080 : previous.resolution === 1080 ? 720 : 'auto' }))} tracking={tracking}/>}
    {deviceOpen && <DeviceCheck frame={room.frame} latency={room.latency} training={trainingSave} onClose={() => setDeviceOpen(false)}/>}
    {playersOpen && <PlayerProfiles onClose={() => setPlayersOpen(false)} onSelect={() => { setPlayerId(playerStorage.active().id); setProfile(loadProfile()); setTrainingSave(readStored(TRAINING_KEY, readTrainingSave)); setPlayersOpen(false); navigate('home'); }}/>}
    {progressOpen && <TrainingProgress save={trainingSave} name={playerStorage.active().name} onClose={() => setProgressOpen(false)}/>}
    {guide && <PlayerGuide topic={guide} preview={preview} phoneConnected={room.phoneConnected} tracking={tracking} calibrated={Boolean(profile)} liveDuel={activity === 'arena' && room.arena.war?.phase === 'fighting' && Boolean(room.arena.match && !room.arena.match.winner)} onClose={closeGuide} onPair={() => { closeGuide(); pair(activity === 'training' ? 'training' : activity === 'arena' ? 'arena' : activity === 'chapter' ? 'chapter' : 'home', Boolean(trainingBlock)); }}/>}
    {pairOpen && <PairDialog calibrated={Boolean(profile)} exercise={trainingPair} session={room.session} phoneConnected={room.phoneConnected} tracking={Boolean(fresh && room.frame && (trainingPair && trainingBlock ? measureExercise(room.frame.packet.landmarks, trainingBlock, room.frame.packet.imageAspect).measurement : measureBody(room.frame.packet.landmarks)))} error={room.error} onClose={() => { setPairOpen(false); setTrainingPair(false); }} onContinue={continuePairing} onPreview={startPreview} onRenew={room.renew}/>}
  </div>;
}
