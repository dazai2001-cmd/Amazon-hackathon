import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Coins, Compass, CircleHelp, Dumbbell, Flag, Footprints, Pause, Play, RotateCcw, Settings2, Shield, Smartphone, Swords, Volume2, VolumeX, X } from 'lucide-react';
import { BladeTracker, type BladeInput, type Point } from '../../shared/game';
import { SwordDuel, buyChapterGear, claimChapterReward, newChapterSave, readChapterSave, type ChapterSave, type DuelSnapshot } from '../../shared/duel';
import { conversations, dialogueLine, newStoryProgress, questText, readStoryProgress, type ConversationId, type Quest, type StoryAction, type StoryChoice, type StoryNode, type StoryProgress } from '../../shared/chapter';
import { spawn, type WorldState } from '../../shared/courtyard';
import type { CalibrationProfile } from '../../shared/motion';
import type { Landmark } from '../../shared/protocol';
import CombatFeedback from './CombatFeedback';
import FirstPersonArena, { type ArenaFrame, type ArenaStatus } from './FirstPersonArena';
import { ChapterAudio, type AudioMix, type VoiceState } from '../lib/chapterAudio';
import TrainingHall from './TrainingHall';
import type { GuideTopic } from '../lib/playerGuide';
import type { RenderResolution } from '../lib/renderResolution';
import { trainingStats, type TrainingBlock, type TrainingSave } from '../../shared/training';
import { playerStorage } from '../lib/playerStorage';
import './chapter.css';
import './adventure.css';

type Props = { resolution: RenderResolution; trainingSave: TrainingSave; onTrainingSave: (value: TrainingSave) => void; autoDialogue: boolean; onAutoDialogueChange: (value: boolean) => void; guideOpen: boolean; onGuide: (topic: GuideTopic) => void; points: Landmark[]; worldPoints?: Landmark[]; imageAspect?: number; profile: CalibrationProfile; frameTime?: number; tracking: boolean; controllerReady: boolean; preview: boolean; sound: boolean; onPreviewMove: (point: Point) => void; onBack: () => void; onPair: () => void; onArena: () => void; onTrainingPair: () => void; onInstruction: (text: string) => void; onTrainingExercise: (block: TrainingBlock | null) => void; onToggleSound: () => void };
type Stage = 'title' | 'memory' | 'explore' | 'dialogue' | 'lesson' | 'briefing' | 'duel' | 'result' | 'shop' | 'complete';
type Lesson = 'shield' | 'cut' | 'evade';
const EMPTY_POSE: Landmark[] = [];
const art = '/assets/medieval/';
const readStored = <T,>(key: string, parse: (value: unknown) => T): T => { try { return parse(JSON.parse(playerStorage.getItem(key) || 'null')); } catch { return parse(null); } };
const speakerName = (speaker: string) => ({ ALDEN: 'Sir Alden Vale', MARA: 'Mara Venn', TOMAS: 'Tomas', HERALD: 'The royal herald', 'REMEMBERED VOICE': 'At the Ashen Gate', YOU: 'You' }[speaker] || speaker);
const portraitFor = (speaker: string) => speaker === 'MARA' ? 'rival' : speaker === 'ALDEN' ? 'instructor' : speaker === 'YOU' ? 'squire' : null;
function Crest({ small = false }: { small?: boolean }) { return <svg className={`ashen-crest ${small ? 'small' : ''}`} viewBox="0 0 48 58" aria-hidden="true"><path d="M5 5H43V31Q39 44 24 53Q9 44 5 31Z"/><path d="M24 15V40M24 30L15 22M24 26L34 17"/></svg>; }
function Health({ value, name }: { value: number; name: string }) { return <div className={`combat-health ${value < 30 ? 'critical' : ''}`}><div><span>{name}</span><b>{value} / 100</b></div><div role="progressbar" aria-label={`${name} health`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><i style={{width:`${value}%`}}/></div></div>; }

export default function ChapterPage({ resolution, trainingSave, onTrainingSave: saveTraining, autoDialogue, onAutoDialogueChange, guideOpen, onGuide, points, worldPoints = EMPTY_POSE, imageAspect = 4 / 3, profile, frameTime, tracking, controllerReady, preview, sound, onPreviewMove, onBack, onPair, onArena, onTrainingPair, onInstruction, onTrainingExercise, onToggleSound }: Props) {
  const [trainingOpen, setTrainingOpen] = useState(false);
  const openTraining = () => { keys.current.clear(); tracker.reset(); setPaused(false); setJournal(false); setSettings(false); setTrainingOpen(true); };
  const [save, setSave] = useState(() => readStored('moveroom.chapter-one.v1', readChapterSave)), saveRef = useRef(save);
  const [progress, setProgress] = useState(() => readStored('moveroom.story.v2', readStoryProgress)), progressRef = useRef(progress);
  const [stage, setStage] = useState<Stage>('title'), [memoryBeat, setMemoryBeat] = useState(0);
  const [conversation, setConversation] = useState<ConversationId>('arrival'), [nodeKey, setNodeKey] = useState('early');
  const [selectedChoice, setSelectedChoice] = useState(0), [revealed, setRevealed] = useState(0), [autoAdvance, setAutoAdvance] = useState(autoDialogue);
  useEffect(() => { onAutoDialogueChange(autoAdvance); }, [autoAdvance, onAutoDialogueChange]);
  const [paused, setPaused] = useState(false), [journal, setJournal] = useState(false), [settings, setSettings] = useState(false);
  const [lesson, setLesson] = useState<Lesson>('shield'), [lessonMeter, setLessonMeter] = useState(0);
  const [status, setStatus] = useState<ArenaStatus>({ ready: false, error: null, fps: 0, triangles: 0 }), [rendererKey, setRendererKey] = useState(0);
  const [world, setWorld] = useState<WorldState>({ ...spawn, distance: 5, moving: false, arrived: false }), [guided, setGuided] = useState(0);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle'), [voiceTime, setVoiceTime] = useState(0), [reward, setReward] = useState(false);
  const [mix, setMix] = useState<AudioMix>({ voice: 1, music: .32, effects: .75 });
  const audio = useRef<ChapterAudio | null>(null), guideCounter = useRef(0), keys = useRef(new Set<string>());
  const duel = useRef(new SwordDuel(save.equipment)), tracker = useMemo(() => new BladeTracker(profile), [profile]);
  const [snapshot, setSnapshot] = useState<DuelSnapshot>({ ...duel.current.state });
  const motionTracking = tracking && (!['duel', 'lesson'].includes(stage) || [11, 12, 13, 14, 15, 16].every(i => points[i]?.visibility >= .5));
  const input = useRef<BladeInput>({ tracked: false, blade: { x: .7, y: .6 }, shield: false, lean: 0, sequence: 0, slash: null });
  const lessonRuntime = useRef({ held: 0, evaded: false, sequence: -1, completed: false, completeAt: 0 });
  const gesture = useRef({ held: 0, latched: false, leaned: false });
  const controls = useRef({ stage, paused, journal, settings, trainingOpen, guideOpen, tracking: motionTracking, ready: status.ready, sound, lesson, autoAdvance });
  controls.current = { stage, paused, journal, settings, trainingOpen, guideOpen, tracking: motionTracking, ready: status.ready, sound, lesson, autoAdvance };
  const advanceRef = useRef<() => void>(() => undefined), interactRef = useRef<() => void>(() => undefined), lessonDoneRef = useRef<() => void>(() => undefined);
  const arenaFrame = useRef<ArenaFrame>({ duel: snapshot, active: false, equipment: save.equipment });
  const script = conversations[conversation];
  const node = stage === 'dialogue' ? script.nodes.find(n => n.key === nodeKey) || script.nodes[0] : null;
  const memoryLine = stage === 'memory' && memoryBeat < 2 ? dialogueLine(1, memoryBeat + 1) : null;
  const activeLine: Pick<StoryNode, 'key' | 'text' | 'speaker' | 'voiceId'> | null = node || (memoryLine ? { key: memoryLine.id, text: memoryLine.text, speaker: memoryLine.speaker, voiceId: memoryLine.id } : null);
  const focus = stage === 'memory' ? 'memory' : stage === 'title' ? 'panorama' : stage === 'dialogue' ? node?.focus || script.focus : stage === 'shop' ? 'forge' : stage === 'complete' ? 'gate' : stage === 'lesson' ? 'alden' : 'mara';
  const worldMode = stage === 'memory' ? 'memory' : stage === 'title' ? 'title' : stage === 'explore' ? 'explore' : stage === 'duel' ? 'duel' : stage === 'lesson' ? 'lesson' : 'dialogue';
  const interrupted = paused || journal || settings || trainingOpen || guideOpen || document.hidden;
  arenaFrame.current = { duel: duel.current.state, active: stage === 'duel' && !interrupted && motionTracking && status.ready, equipment: save.equipment, world: {
    mode: worldMode, focus, quest: progress.quest, guided, paused: interrupted, hidden: trainingOpen, tracking, showWeapons: progress.quest !== 'alden', speaker: activeLine?.speaker,
  } };
  const onStatus = useCallback((value: ArenaStatus) => setStatus(value), []);
  const onWorldUpdate = useCallback((value: WorldState) => setWorld(value), []);
  const pointer = useCallback((x: number, y: number) => { if (preview && (stage === 'duel' || stage === 'lesson') && !paused && !journal && !settings && !guideOpen) onPreviewMove({ x, y }); }, [preview, stage, paused, journal, settings, guideOpen, onPreviewMove]);
  const updateSave = useCallback((update: (previous: ChapterSave) => ChapterSave) => {
    const next = update(saveRef.current); saveRef.current = next; setSave(next);
    try { playerStorage.setItem('moveroom.chapter-one.v1', JSON.stringify(next)); } catch { /* Retain session progress. */ }
  }, []);
  const updateProgress = useCallback((update: Partial<StoryProgress>) => {
    const next = { ...progressRef.current, ...update }; progressRef.current = next; setProgress(next);
    try { playerStorage.setItem('moveroom.story.v2', JSON.stringify(next)); } catch { /* Retain session progress. */ }
  }, []);
  const beginConversation = (id: ConversationId) => { audio.current?.stopVoice(); setConversation(id); setNodeKey(conversations[id].nodes[0].key); setSelectedChoice(0); setGuided(0); setStage('dialogue'); };
  const explore = (quest: Quest) => { updateProgress({ quest }); setGuided(0); setStage('explore'); document.querySelector<HTMLCanvasElement>('.first-person-canvas')?.focus(); };
  const beginLesson = (task: Lesson) => { tracker.reset(); lessonRuntime.current = { held: 0, evaded: false, sequence: -1, completed: false, completeAt: 0 }; setLessonMeter(0); setLesson(task); setStage('lesson'); };
  const finishConversation = (action: StoryAction) => {
    if (action === 'lesson-shield') beginLesson('shield');
    else if (action === 'lesson-cut') beginLesson('cut');
    else if (action === 'lesson-evade') beginLesson('evade');
    else if (action === 'quest-training') explore('training');
    else if (action === 'quest-mara') { updateProgress({ lessonDone: true }); explore('mara'); }
    else if (action === 'quest-forge') explore('forge');
    else if (action === 'quest-orders') explore('orders');
    else if (action === 'quest-gate') explore('gate');
    else if (action === 'briefing') setStage('briefing');
    else if (action === 'shop') { updateSave(previous => claimChapterReward(previous, 'travel')); setStage('shop'); }
    else if (action === 'complete') { updateProgress({ quest: 'done' }); updateSave(previous => ({ ...previous, completed: true })); setStage('complete'); }
  };
  advanceRef.current = () => {
    if (controls.current.paused || controls.current.journal || controls.current.settings || controls.current.guideOpen || controls.current.trainingOpen) return;
    if (stage === 'memory') { if (memoryBeat < 2) setMemoryBeat(v => v + 1); else { updateProgress({ memorySeen: true }); explore('alden'); } return; }
    if (!node || node.choices) return;
    const next = node.byMotive ? node.byMotive[saveRef.current.motive || 'truth'] : node.next;
    if (next) { setNodeKey(next); setSelectedChoice(0); } else finishConversation(script.end);
  };
  const choose = (choice: StoryChoice) => {
    if (paused || journal || settings || guideOpen) return;
    if (choice.motive) updateSave(previous => ({ ...previous, motive: choice.motive! }));
    if (choice.relationship) updateSave(previous => ({ ...previous, relationship: choice.relationship! }));
    void audio.current?.effect('ui'); setNodeKey(choice.next); setSelectedChoice(0);
  };
  const walk = () => { setGuided(++guideCounter.current); document.querySelector<HTMLCanvasElement>('.first-person-canvas')?.focus(); };
  const interact = () => {
    if (stage !== 'explore' || world.distance > 2.9 || interrupted) return;
    if (progress.quest === 'alden') beginConversation('arrival');
    else if (progress.quest === 'training') beginLesson('shield');
    else if (progress.quest === 'mara') beginConversation('mara');
    else if (progress.quest === 'forge') beginConversation('forge');
    else if (progress.quest === 'orders') beginConversation('orders');
    else if (progress.quest === 'gate') beginConversation('letter');
  };
  interactRef.current = () => world.distance <= 2.9 ? interact() : walk();
  lessonDoneRef.current = () => beginConversation(lesson === 'shield' ? 'guard-done' : lesson === 'cut' ? 'cut-done' : 'lesson-done');
  const prepareAudio = () => { audio.current?.setEnabled(sound); };
  const begin = (resume = false) => {
    prepareAudio(); setPaused(false);
    if (resume && progress.memorySeen) { setStage(progress.quest === 'done' ? 'complete' : 'explore'); return; }
    updateProgress(newStoryProgress()); setMemoryBeat(0); setStage('memory');
  };
  const startDuel = () => {
    if (!controllerReady) { onPair(); return; } if (!status.ready) return;
    audio.current?.stopVoice(); duel.current = new SwordDuel(saveRef.current.equipment, trainingStats(trainingSave)); duel.current.start(); tracker.reset();
    setSnapshot({ ...duel.current.state }); setPaused(false); setStage('duel');
    document.querySelector<HTMLCanvasElement>('.first-person-canvas')?.focus();
  };

  useEffect(() => { audio.current = new ChapterAudio(); return () => { audio.current?.close(); audio.current = null; }; }, []);
  useEffect(() => { audio.current?.setEnabled(sound); }, [sound]);
  useEffect(() => { audio.current?.setMix(mix); }, [mix]);
  useEffect(() => { audio.current?.setPaused(paused || journal || settings || trainingOpen || guideOpen); }, [paused, journal, settings, trainingOpen, guideOpen]);
  useEffect(() => {
    void audio.current?.setScene(stage === 'duel' || stage === 'briefing' ? 'trial' : stage === 'memory' || progress.quest === 'gate' || progress.quest === 'done' ? 'revelation' : 'courtyard', stage === 'memory' ? 'rain' : stage === 'shop' || focus === 'forge' ? 'forge' : 'wind');
  }, [stage, progress.quest, focus]);
  useEffect(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.first-person-canvas');
    if (canvas?.clientHeight) tracker.aspect = canvas.clientWidth / canvas.clientHeight;
    duel.current.aspect = tracker.aspect;
    input.current = tracker.update(points, frameTime ?? performance.now(), worldPoints);
  }, [points, worldPoints, frameTime, tracker]);
  useEffect(() => {
    let raf = 0, previous = performance.now(), uiAt = 0, stepAt = 0;
    const tick = (now: number) => {
      const dt = Math.min(.05, (now - previous) / 1000); previous = now;
      const c = controls.current, current = input.current, before = duel.current.state.event?.id;
      const lessonCut = current.pose ? current.weaponSlash : current.slash;
      const live = !c.paused && !c.journal && !c.settings && !c.trainingOpen && !c.guideOpen && !document.hidden && c.ready;
      if (live && c.stage === 'duel' && c.tracking) duel.current.step(dt, current, (keys.current.has('w') ? 1 : 0) - (keys.current.has('s') ? 1 : 0));
      else duel.current.suspend(current, c.paused || c.journal || c.settings || c.trainingOpen || c.guideOpen || document.hidden || !c.tracking);
      const s = duel.current.state;
      if (c.stage === 'lesson' && live && c.tracking) {
        s.elapsed += dt; s.shielding = current.pose?.guarding ?? current.shield;
        if (lessonCut && current.sequence !== lessonRuntime.current.sequence && s.elapsed - s.swingAt > .5) {
          s.swingAt = s.elapsed; s.swingDirection = lessonCut.to.x >= lessonCut.from.x ? 1 : -1;
        }
      }
      if (s.event && before !== s.event.id && c.sound) void audio.current?.effect(s.event.kind === 'block' || s.event.kind === 'parry' ? 'shield' : s.event.kind === 'hit' || s.event.kind === 'touch' ? 'impact' : s.event.kind === 'dodge' ? 'footstep' : 'swish');
      if (c.stage === 'lesson' && live && c.tracking && !lessonRuntime.current.completed) {
        const task = lessonRuntime.current;
        if (c.lesson === 'shield') { task.held = (current.pose?.guarding ?? current.shield) ? task.held + dt : 0; if (now - uiAt > 70) setLessonMeter(Math.min(1, task.held / .65)); task.completed = task.held >= .65; }
        else if (c.lesson === 'cut') { if (lessonCut && current.sequence !== task.sequence) { task.completed = true; setLessonMeter(1); } task.sequence = current.sequence; }
        else { if (Math.abs(current.lean) >= .65) task.evaded = true; if (now - uiAt > 70) setLessonMeter(task.evaded ? .65 : Math.abs(current.lean)); task.completed = task.evaded && Math.abs(current.lean) < .25; }
        if (task.completed) { task.completeAt = now + 700; setLessonMeter(1); void audio.current?.effect('ui'); }
      }
      if (c.stage === 'lesson' && live && c.tracking && lessonRuntime.current.completed && now >= lessonRuntime.current.completeAt) lessonDoneRef.current();
      if (live && c.tracking && ['explore', 'dialogue'].includes(c.stage)) {
        const g = gesture.current;
        if (!current.shield) { g.held = 0; g.latched = false; }
        else if (!g.latched) { g.held += dt; if (g.held >= 1.1) { g.latched = true; if (c.stage === 'explore') interactRef.current(); else window.dispatchEvent(new Event('ashen:confirm')); } }
        if (c.stage === 'dialogue') {
          if (Math.abs(current.lean) < .25) g.leaned = false;
          else if (Math.abs(current.lean) > .7 && !g.leaned) { g.leaned = true; window.dispatchEvent(new CustomEvent('ashen:choice', { detail: current.lean > 0 ? 1 : -1 })); }
        }
      }
      if (now - uiAt > 80) { uiAt = now; setSnapshot({ ...s }); }
      if (c.stage === 'explore' && live && now - stepAt > 460 && document.querySelector('[data-walking="true"]')) { stepAt = now; void audio.current?.effect('footstep'); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    if (stage !== 'duel' || !snapshot.finished) return;
    setReward(snapshot.won && !saveRef.current.firstWinClaimed);
    if (snapshot.won) { updateSave(previous => claimChapterReward(previous, 'win')); void audio.current?.effect('coin'); }
    keys.current.clear(); setStage('result');
  }, [snapshot.finished, snapshot.won, stage, updateSave]);
  useEffect(() => {
    const pause = () => { if (!controls.current.trainingOpen && !controls.current.guideOpen && controls.current.stage !== 'title') setPaused(v => !v); };
    const blur = () => { keys.current.clear(); tracker.reset(); if (!controls.current.trainingOpen && !controls.current.guideOpen && controls.current.stage !== 'title') setPaused(true); };
    const visibility = () => { if (document.hidden) blur(); };
    const down = (event: KeyboardEvent) => {
      const focused = document.activeElement as HTMLElement | null;
      if (focused && ['INPUT', 'SELECT', 'TEXTAREA'].includes(focused.tagName) && !['Escape', 'Backspace'].includes(event.key)) return;
      const key = event.key.toLowerCase(), c = controls.current;
      if (c.trainingOpen || c.guideOpen) return;
      if (key === 'escape' || key === 'backspace') { event.preventDefault(); event.stopImmediatePropagation(); if (settings) setSettings(false); else if (journal) setJournal(false); else if (c.stage === 'title') onBack(); else setPaused(v => !v); return; }
      if (c.stage === 'duel' && ['w', 's'].includes(key) && !c.paused && !c.journal && !c.settings) { event.preventDefault(); event.stopImmediatePropagation(); keys.current.add(key); }
      if (c.stage === 'explore' && (key === 'e' || key === 'enter') && focused?.tagName === 'CANVAS' && !c.paused && !c.journal && !c.settings) { event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat) interactRef.current(); }
      if (key === 'q' && !c.paused) { event.preventDefault(); event.stopImmediatePropagation(); setJournal(v => !v); }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener('moveroom:pause', pause); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    window.addEventListener('keydown', down, true); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('moveroom:pause', pause); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', up); };
  }, [tracker, settings, journal, onBack]);
  useEffect(() => {
    const confirm = () => { if (node?.choices) choose(node.choices[selectedChoice]); else advanceRef.current(); };
    const select = (event: Event) => { if (node?.choices) setSelectedChoice(v => (v + (event as CustomEvent<number>).detail + node.choices!.length) % node.choices!.length); };
    window.addEventListener('ashen:confirm', confirm); window.addEventListener('ashen:choice', select);
    return () => { window.removeEventListener('ashen:confirm', confirm); window.removeEventListener('ashen:choice', select); };
  }, [node, selectedChoice]);
  useEffect(() => {
    if (trainingOpen || guideOpen) return;
    const id = requestAnimationFrame(() => {
      const menu = document.querySelector<HTMLElement>('.adventure-modal[role="dialog"]');
      if (menu) (menu.querySelector<HTMLElement>('[data-autofocus]:not(:disabled)') || menu.querySelector<HTMLElement>('button:not(:disabled)'))?.focus({ preventScroll: true });
      else if (stage === 'explore' || stage === 'duel' || stage === 'lesson') document.querySelector<HTMLCanvasElement>('.first-person-canvas')?.focus({ preventScroll: true });
      else document.querySelector<HTMLElement>('.story-dialogue [data-autofocus]:not(:disabled), .adventure-panel [data-autofocus]:not(:disabled), .story-dialogue button:not(:disabled), .adventure-panel button:not(:disabled)')?.focus({ preventScroll: true });
    }); return () => cancelAnimationFrame(id);
  }, [stage, nodeKey, paused, journal, settings, trainingOpen, guideOpen, status.ready, status.error]);
  useEffect(() => { setRevealed(0); gesture.current.held = 0; }, [activeLine?.key]);
  useEffect(() => {
    const timer = setInterval(() => {
      setVoiceTime(audio.current?.getVoiceTime() || 0);
      if (controls.current.paused || controls.current.journal || controls.current.settings || controls.current.trainingOpen || controls.current.guideOpen) return;
      if (activeLine) setRevealed(v => Math.min(activeLine.text.length, v + 2));
    }, 35); return () => clearInterval(timer);
  }, [activeLine?.key]);
  useEffect(() => {
    audio.current?.stopVoice(); setVoiceState('idle');
    if (!activeLine) return;
    onInstruction(activeLine.text);
    if (sound && activeLine.voiceId) void audio.current?.speak(activeLine.voiceId, () => {
      if (controls.current.stage === 'memory' || controls.current.autoAdvance) advanceRef.current();
    }, setVoiceState);
    return () => audio.current?.stopVoice();
  }, [activeLine?.key, activeLine?.voiceId, sound, onInstruction]);
  useEffect(() => {
    if (interrupted || !activeLine || stage !== 'memory' && (!autoAdvance || node?.choices)) return;
    if (sound && activeLine.voiceId && !['unavailable', 'blocked'].includes(voiceState)) return;
    const timer = setTimeout(() => advanceRef.current(), Math.max(2700, activeLine.text.split(/\s+/).length * 420 + 1000));
    return () => clearTimeout(timer);
  }, [activeLine?.key, stage, autoAdvance, sound, voiceState, interrupted]);
  useEffect(() => {
    if (stage !== 'memory') return;
    if (memoryBeat === 0) void audio.current?.effect('horn');
    if (memoryBeat === 1) void audio.current?.effect('gate');
    if (memoryBeat === 2 && !interrupted) { const timer = setTimeout(() => advanceRef.current(), 3800); return () => clearTimeout(timer); }
  }, [stage, memoryBeat, interrupted]);
  useEffect(() => {
    if (stage !== 'lesson') return;
    const instruction = dialogueLine(4, lesson === 'shield' ? 1 : lesson === 'cut' ? 3 : 5);
    onInstruction(instruction.text); void audio.current?.speak(instruction.id, () => undefined, setVoiceState);
  }, [stage, lesson, sound, onInstruction]);
  useEffect(() => {
    if (!trainingOpen && stage === 'duel' && snapshot.phase === 'windup') {
      onInstruction(`Incoming ${snapshot.attackLane}.`);
      if (snapshot.exchange <= 3) { const cue = dialogueLine(5, snapshot.attackLane === 'high' ? 6 : snapshot.attackLane === 'left' ? 7 : 8); void audio.current?.speak(cue.id, () => undefined, setVoiceState); }
    }
  }, [stage, snapshot.exchange, snapshot.phase, trainingOpen, onInstruction]);
  useEffect(() => {
    if (!trainingOpen && stage === 'duel' && !motionTracking) { const cue = dialogueLine(5, 11); onInstruction(cue.text); void audio.current?.speak(cue.id, () => undefined, setVoiceState); }
  }, [stage, motionTracking, trainingOpen, onInstruction]);
  useEffect(() => {
    if (new URLSearchParams(location.search).get('qa') !== 'story') return;
    const timer = setInterval(() => {
      const root = document.querySelector('.adventure'), pose = document.querySelector('.explore-prompt>small')?.textContent;
      console.info('[EarnedValorQA]', JSON.stringify({ stage: root?.className, quest: root?.getAttribute('data-story-quest'), moving: root?.getAttribute('data-walking'), voice: root?.getAttribute('data-voice-state'), voiceTime: Number((audio.current?.getVoiceTime() || 0).toFixed(2)), distance: pose, health: [...document.querySelectorAll('[role="progressbar"]')].map(bar => ({ name: bar.getAttribute('aria-label'), value: bar.getAttribute('aria-valuenow') })), status: document.querySelector('.adventure-runtime')?.textContent, focus: (document.activeElement as HTMLElement)?.textContent?.slice(0, 80) }));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const combatOverlay = stage === 'duel' && (!motionTracking || !status.ready);
  const modal = paused || journal || settings || Boolean(status.error);
  const inRange = world.distance <= 2.9;
  const linePortrait = activeLine ? portraitFor(activeLine.speaker) : null;
  const eventAge = snapshot.event ? snapshot.elapsed - snapshot.event.at : 10;
  const flash = stage === 'duel' && eventAge < .28 ? snapshot.event?.kind : '';
  const quest = questText[progress.quest];
  const continueLine = () => { if (activeLine && revealed < activeLine.text.length) setRevealed(activeLine.text.length); else advanceRef.current(); };

  return <main className={`chapter-world adventure stage-${stage} ${['dialogue', 'memory', 'title'].includes(stage) ? 'cinematic' : ''}`} data-combat-active={stage === 'duel' && !interrupted && tracking && status.ready} data-motion-active={(stage === 'duel' || stage === 'lesson') && !interrupted} data-walking={stage === 'explore' && world.moving && !interrupted} data-voice-state={voiceState} data-voice-time={voiceTime.toFixed(2)} data-story-quest={progress.quest}>
    <FirstPersonArena resolution={resolution} key={rendererKey} frame={arenaFrame} onStatus={onStatus} onPointerMove={pointer} onWorldUpdate={onWorldUpdate}/>
    <div className="adventure-vignette" aria-hidden="true"/>
    {['dialogue', 'memory'].includes(stage) && <div className="cinema-bars" aria-hidden="true"/>}
    {stage !== 'title' && <header className="adventure-header"><button aria-label="Pause adventure" onClick={() => setPaused(true)}><Crest small/><span>EARNED VALOR</span></button><div><button aria-label="Open player guide" onClick={() => onGuide(stage === 'duel' || stage === 'lesson' ? 'combat' : 'story')}><CircleHelp size={18}/></button><button aria-label="Open clan war hall" onClick={onArena}><Flag size={18}/></button><button aria-label="Open training hall" onClick={openTraining}><Dumbbell size={18}/><span>Train</span></button><span className="chapter-coins"><Coins size={15}/>{save.coins}</span><button aria-label="Open journal" onClick={() => setJournal(true)}><BookOpen size={19}/></button><button aria-label="Audio settings" onClick={() => setSettings(true)}><Settings2 size={18}/></button><button aria-label={sound ? 'Turn sound off' : 'Turn sound on'} onClick={() => { audio.current?.setEnabled(!sound); onToggleSound(); }}>{sound ? <Volume2 size={19}/> : <VolumeX size={19}/>}</button><button aria-label="Pause game" onClick={() => setPaused(true)}><Pause size={18}/></button></div></header>}

    {stage === 'title' && <button className="adventure-guide-button chapter-button secondary" onClick={() => onGuide('setup')}><CircleHelp size={17}/> Player guide</button>}
    {stage === 'title' && <section className="adventure-title adventure-panel"><div className="title-emblem"><Crest/></div><span className="chapter-eyebrow">A FIRST-PERSON ADVENTURE</span><h1>Earned<br/><em>Valor</em></h1><p>A sword to learn. Five seals to earn.<br/>An order your teacher will not explain.</p><div className="title-actions">{progress.memorySeen && <button data-autofocus className="chapter-button" disabled={!status.ready} onClick={() => begin(true)}><Play size={17}/> {progress.quest === 'done' ? 'Return to your chapter' : `Continue · ${quest.target}`}</button>}<button data-autofocus={!progress.memorySeen || undefined} className={`chapter-button ${progress.memorySeen ? 'secondary' : ''}`} disabled={!status.ready} onClick={() => begin()}>{status.ready ? progress.memorySeen ? 'Begin the chapter again' : 'Begin story' : 'Opening the courtyard…'}<ArrowRight size={17}/></button><button className="chapter-text-button" onClick={() => { prepareAudio(); updateProgress({ quest: 'mara', memorySeen: true }); setStage('briefing'); }}>Go straight to sparring</button><button className="chapter-text-button" onClick={() => { prepareAudio(); openTraining(); }}><Dumbbell size={15}/> Enter training hall</button><button className="chapter-text-button" onClick={onArena}><Flag size={15}/> Clan war hall</button></div><div className="title-chapter"><span>CHAPTER I</span><strong>The First Oath</strong><small>Voiced dialogue · Courtyard exploration · Sword & shield</small></div><button className="title-back" onClick={onBack}><ArrowLeft size={14}/> Main menu</button></section>}

    {stage === 'memory' && <>
      <span className="memory-time">THE ASHEN GATE · YEARS BEFORE</span>
      {memoryBeat === 2 ? <div className="memory-title"><span>CHAPTER I</span><h1>The first<br/><em>oath.</em></h1></div> : activeLine && <div className="memory-subtitle"><span>{speakerName(activeLine.speaker)}</span><p>“{activeLine.text.slice(0, revealed)}”</p></div>}
      <button className="memory-skip" onClick={() => { audio.current?.stopVoice(); updateProgress({ memorySeen: true }); explore('alden'); }}>Skip opening <ChevronRight size={14}/></button>
    </>}

    {stage === 'explore' && <>
      <div className="adventure-compass"><span>W</span><i/><span>N</span><i/><span>E</span><div><Flag size={12}/>{quest.target}</div></div>
      <aside className="quest-objective"><span><Compass size={13}/> CHAPTER I</span><h2>{quest.title}</h2><p>{quest.detail}</p></aside>
      <div className="explore-reticle" aria-hidden="true"/>
      <div className="explore-prompt"><span>{quest.target}</span><small>{world.distance.toFixed(1)} m</small>{inRange ? <button className="chapter-button" onClick={interact}><span className="keycap">{preview ? 'E' : 'Select'}</span>{progress.quest === 'training' ? 'Begin your lesson' : progress.quest === 'gate' ? 'Read the letter' : `Speak to ${progress.quest === 'alden' ? 'Alden' : progress.quest === 'forge' ? 'Tomas' : 'Mara'}`}<ChevronRight size={16}/></button> : <button className="chapter-button secondary" onClick={world.moving && guided ? () => setGuided(0) : walk}><Footprints size={16}/>{world.moving && guided ? 'Stop walking' : `Walk to ${quest.target}`}</button>}<button className="chapter-text-button" onClick={() => document.querySelector<HTMLCanvasElement>('.first-person-canvas')?.focus()}>Explore with remote</button><p>{preview ? 'WASD to walk · Arrows to look · Drag to turn · E to interact' : 'Explore: D-pad to walk / turn · Select to interact · Back for menus. Raise your left hand for a guided walk.'}</p></div>
    </>}

    {stage === 'dialogue' && node && <section className={`story-dialogue ${node.key === 'read-letter' ? 'reading-letter' : ''}`} aria-label={script.title}>
      <div className="scene-heading"><span>CHAPTER I</span><h2>{script.title}</h2></div>
      {node.key === 'read-letter' && <article className="letter-prop"><Crest small/><span>TO ALDEN VALE’S NEW SQUIRE</span><p>If he teaches you to hold a shield,<br/>ask him who stood behind the gate.</p><p>Earn your five seals.<br/>I will be waiting at the Crown Tournament.</p><strong>Sir Lucan Veyr</strong><small>CHAMPION OF THE CROWN</small></article>}
      <div className="dialogue-deck">{linePortrait && <img className="speaker-portrait" src={`${art}characters/${linePortrait}.png`} alt=""/>}<div className="spoken-line"><div><span>{speakerName(node.speaker)}</span>{voiceState === 'playing' && <span className="voice-wave" aria-label="Voice playing"><i/><i/><i/><i/></span>}</div><p aria-label={node.text}>{node.text.slice(0, revealed)}<span className={revealed < node.text.length ? 'typing-cursor' : 'typing-cursor hidden'}>|</span></p></div>
      {node.choices ? <div className="dialogue-responses" aria-label="Choose your response">{node.choices.map((choice, i) => <button key={choice.text} data-autofocus={i === selectedChoice || undefined} className={i === selectedChoice ? 'selected' : ''} onFocus={() => setSelectedChoice(i)} onClick={() => choose(choice)}><span>0{i + 1}</span>{choice.text}<ChevronRight size={15}/></button>)}</div> : <button data-autofocus className="dialogue-next" onClick={continueLine}>{node.next || node.byMotive ? 'Continue' : script.end === 'briefing' ? 'Step into the lists' : script.end === 'shop' ? 'See the equipment' : script.end === 'complete' ? 'Leave at dawn' : 'Continue'}<ChevronRight size={17}/></button>}</div>
      <div className="dialogue-footer"><span>{node.choices ? 'D-PAD: CHOOSE · SELECT: CONFIRM' : 'SELECT TO CONTINUE'}{!preview && <small> · Or raise your left hand{node.choices ? ' and lean to choose' : ''}</small>}</span><button onClick={() => setAutoAdvance(v => !v)}>Auto dialogue: {autoAdvance ? 'on' : 'off'}</button></div>
    </section>}

    {stage === 'lesson' && <section className="lesson-card adventure-panel"><span className="chapter-eyebrow">ALDEN’S FIRST LESSON · {lesson === 'shield' ? 'I' : lesson === 'cut' ? 'II' : 'III'} / III</span>{lesson === 'shield' ? <Shield size={30}/> : lesson === 'cut' ? <Swords size={30}/> : <Footprints size={30}/>}<h1>{lesson === 'shield' ? 'The space behind a shield.' : lesson === 'cut' ? 'One deliberate cut.' : 'Leave the line.'}</h1><p>{lesson === 'shield' ? preview ? 'Hold Shift to raise your shield.' : 'Raise your left forearm to establish your guard.' : lesson === 'cut' ? preview ? 'Press J, or sweep the mouse across the view.' : 'Sweep your right hand deliberately across the view.' : preview ? 'Lean with A or D, then return to the centre.' : 'Lean comfortably to either side, then return to the centre.'}</p><div className="lesson-progress" role="progressbar" aria-label="Lesson progress" aria-valuenow={Math.round(lessonMeter * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${lessonMeter * 100}%` }}/></div>{!tracking && <p className="tracking-note">{controllerReady ? 'Bring your shoulders, hands and hips into view.' : 'Connect and calibrate your phone to practise.'}</p>}<button className="chapter-text-button" onClick={() => { audio.current?.stopVoice(); if (lesson === 'shield') beginConversation('guard-done'); else if (lesson === 'cut') beginConversation('cut-done'); else beginConversation('lesson-done'); }}>Continue without this practice</button></section>}

    {stage === 'briefing' && <section className="trial-briefing adventure-panel"><span className="chapter-eyebrow">MARA VENN · YOUR FIRST TRIAL</span><h1>Earn the opening.</h1><p>Both fighters have 100 health. Make Mara yield.<br/>Cover her attack line. Time your guard. Answer with a measured cut.</p><div><span><Swords size={18}/>{preview ? 'Mouse / J K L' : 'Right hand + forearm'}<b>BLADE</b></span><span><Shield size={18}/>{preview ? 'Shift + Z / X / C' : 'Left hand'}<b>SHIELD</b></span><span><Footprints size={18}/>{preview ? 'A / D' : 'Late lean'}<b>EVADE</b></span></div><p className="briefing-footwork">{preview ? 'Z left · X high · C right while guarding. J / K / L simulate cuts. W / S control distance. Hold V to crouch.' : 'Your hands place the sword and shield. Step closer or back for bounded footwork. Duck late under a high cut, or lean after she commits. Her attacks come high, left or right. Move your shield into that line, or evade after she commits.'}<br/>A late guard earns a riposte. Swing into a covered line and she will parry. Lower your shield to recover stamina.</p><button data-autofocus className="chapter-button" onClick={startDuel} disabled={!status.ready}>{controllerReady ? 'Begin the trial' : 'Connect your phone'}<ArrowRight size={17}/></button><button className="chapter-text-button" onClick={() => explore('mara')}>Return to the courtyard</button></section>}

    {stage === 'duel' && <>
      <CombatFeedback key={snapshot.event?.id} kind={snapshot.event?.kind} age={eventAge} text={snapshot.feedback}/>
      <div className="rival-hud"><span>ORDER OF THE RED HEARTH</span><h2>Mara Venn</h2><Health name="Mara" value={snapshot.rivalHealth}/><small>GUARD {snapshot.guardLane.toUpperCase()} · {Math.round(snapshot.rivalStamina * 100)}%</small></div>
      <div className="duel-reticle" aria-hidden="true"><i/><i/></div>
      <div className={`duel-telegraph phase-${snapshot.phase}`}><span>{snapshot.phase === 'windup' ? `INCOMING ${snapshot.attackLane.toUpperCase()}` : snapshot.phase === 'recover' ? 'COUNTER NOW' : snapshot.phase === 'strike' ? `COVER ${snapshot.attackLane.toUpperCase()}` : 'READ HER BLADE'}</span><div><i style={{ width: `${snapshot.phase === 'windup' ? snapshot.phaseTime / snapshot.phaseDuration * 100 : snapshot.phase === 'recover' ? (1 - snapshot.phaseTime / snapshot.phaseDuration) * 100 : 0}%` }}/></div></div>
      <div className="combat-lines" aria-label={`Attack line ${snapshot.attackLane}; shield position ${snapshot.shielding ? 'raised' : 'lowered'}`}><span className={['windup', 'strike'].includes(snapshot.phase) && snapshot.attackLane === 'high' ? 'incoming' : ''}>HIGH</span><span className={['windup', 'strike'].includes(snapshot.phase) && snapshot.attackLane === 'left' ? 'incoming' : ''}>LEFT</span><span className={['windup', 'strike'].includes(snapshot.phase) && snapshot.attackLane === 'right' ? 'incoming' : ''}>RIGHT</span><i className={snapshot.shielding ? 'raised' : ''} style={{left:`${snapshot.shieldPoint.x*100}%`,top:`${snapshot.shieldPoint.y*100}%`}}/><small>SHIELD POSITION</small></div>
      <div className="duel-caption"><span>SIR ALDEN VALE</span><p>{snapshot.feedback}</p></div>
      <div className="squire-hud"><div><Crest small/><span>ALDEN’S SQUIRE</span></div><Health name="You" value={snapshot.health}/><div className="stamina-label"><span>STAMINA</span><b>{Math.round(snapshot.stamina * 100)}</b></div><div className={`duel-stamina ${snapshot.stamina < .25 ? 'low' : ''}`}><i style={{ width: `${snapshot.stamina * 100}%` }}/></div><p>{snapshot.shielding ? 'Match your shield to her line' : 'Guard lowered · recovering'}</p><small className="body-stance">{snapshot.body.crouch > .4 ? 'CROUCHING' : 'UPRIGHT'} · {snapshot.body.forward > .15 ? 'FORWARD STANCE' : snapshot.body.forward < -.15 ? 'BACK STANCE' : 'CENTRED'}</small></div>
      <div className="duel-controls"><span><Swords size={14}/>{preview ? 'Mouse / J K L' : 'Right forearm'} <b>BLADE</b></span><span><Shield size={14}/>{preview ? 'Shift + Z X C' : 'Left hand'} <b>GUARD</b></span><span><Footprints size={14}/>{preview ? 'A / D · W / S' : 'Late lean'} <b>FOOTWORK</b></span><span className="duel-distance">{snapshot.distance.toFixed(1)} m · {snapshot.distance <= 2.35 ? 'IN REACH' : 'OUT OF REACH'}</span></div>
      {combatOverlay && <div className="adventure-modal-scrim"><section className="adventure-modal"><Pause size={30}/><h2>Hold.</h2><p>{status.ready ? 'Bring your shoulders, elbows, hands and hips into view. Both fighters are waiting.' : 'Your opponent is still arriving.'}</p><button className="chapter-button" onClick={onPair}><Smartphone size={16}/> Check camera connection</button></section></div>}
    </>}
    {flash && <div className={`duel-impact impact-${flash}`} aria-hidden="true"/>}

    {stage === 'result' && <section className="trial-result adventure-panel"><Crest/><span className="chapter-eyebrow">{snapshot.won ? reward ? 'YOUR FIRST VICTORY' : 'TRIAL WON' : 'A LESSON IN THE LISTS'}</span><h1>{snapshot.won ? 'Mara yields.' : 'Her trial. Your lesson.'}</h1><div className="duel-result-stats"><div><b>{snapshot.health}</b><span>HEALTH REMAINING</span></div><div><b>{snapshot.damageDealt}</b><span>DAMAGE DEALT</span></div><div><b>{snapshot.perfectBlocks} / {snapshot.blocks}</b><span>PERFECT / BLOCKS</span></div><div><b>{snapshot.dodges}</b><span>EVASIONS</span></div></div>{reward && <p className="reward-line"><Coins size={15}/> +20 coins · First trial won</p>}<div className="chapter-action-row"><button data-autofocus className="chapter-button" onClick={() => beginConversation(snapshot.won ? 'victory' : 'defeat')}>Speak to Mara <ChevronRight size={16}/></button><button className="chapter-button secondary" onClick={startDuel}><RotateCcw size={15}/> Rematch</button></div></section>}

    {stage === 'shop' && <section className="forge-shop adventure-panel"><span className="chapter-eyebrow">TOMAS’S COUNTER</span><h1>Steel for the road.</h1><p>Choose what you expect to need.<br/>Your starter kit will still take you to Ironbridge.</p><span className="shop-purse"><Coins size={16}/>{save.coins} coins · Travel purse received</span><div className="chapter-shop-grid">{([['steel', 'steel-sword', 'Balanced steel', 'Longer reach · 22 stamina per cut'], ['heater', 'heater-shield', 'Heater shield', 'Efficient blocks · heavier raised guard']] as const).map(([item, image, title, effect]) => {
      const owned = item === 'steel' ? save.equipment.sword === 'steel' : save.equipment.shield === 'heater';
      return <div className="chapter-shop-item" key={item}><img src={`${art}items/${image}.png`} alt={title}/><div><h3>{title}</h3><p>{effect}</p><button className="chapter-button secondary" disabled={owned || save.coins < 30} onClick={() => { updateSave(previous => buyChapterGear(previous, item)); void audio.current?.effect('coin'); const cue = dialogueLine(6, item === 'steel' ? 6 : 7); void audio.current?.speak(cue.id, () => undefined, setVoiceState); }}>{owned ? <><Check size={14}/> Equipped</> : <><Coins size={14}/> 30 · Equip</>}</button></div></div>;
    })}</div><button data-autofocus className="chapter-button" onClick={() => { audio.current?.stopVoice(); explore('orders'); }}>Meet Mara at the board <ArrowRight size={16}/></button></section>}

    {stage === 'complete' && <section className="chapter-ending adventure-panel"><Crest/><span className="chapter-eyebrow">CHAPTER I · COMPLETE</span><h1>At dawn,<br/><em>you leave.</em></h1><p>You came here for {save.motive === 'coin' ? 'a living' : save.motive === 'belonging' ? 'a place to belong' : 'the truth'}.<br/>Now you carry a question to Ironbridge.</p><div className="next-quest"><span>THE ROAD AHEAD</span><h3>The Master of the Bridge</h3><p>Earn Ilyra Dane’s seal.<br/>Learn what she witnessed at the Ashen Gate.</p></div><div className="chapter-action-row"><button data-autofocus className="chapter-button" onClick={() => { updateProgress({ quest: 'mara' }); setStage('briefing'); }}>Return to the lists <Swords size={16}/></button><button className="chapter-button secondary" onClick={onBack}>Leave the courtyard</button></div><p className="ending-note">The next chapter is still to come. Challenge another clan in the Orders hall.</p></section>}

    {stage !== 'title' && <div className="adventure-runtime"><span>{preview ? 'DESKTOP PREVIEW' : tracking ? 'MOVEMENT CONNECTED' : 'TV CONTROLS'} {status.fps > 0 && `· ${status.fps} FPS`}</span><span>{voiceState === 'blocked' ? 'Press the speaker button to enable voice audio' : voiceState === 'unavailable' ? 'Voice unavailable · subtitles remain on' : !sound ? 'SOUND OFF' : ''}</span></div>}
    {modal && <div className="adventure-modal-scrim"><section className={`adventure-modal ${journal ? 'journal-modal' : ''}`} role="dialog" aria-modal="true" aria-label={status.error ? 'Scene error' : settings ? 'Audio settings' : journal ? 'Chapter journal' : 'Paused adventure'}>
      <button className="modal-close" aria-label="Close menu" onClick={() => { setPaused(false); setSettings(false); setJournal(false); }}><X size={21}/></button>
      {status.error ? <><h2>The courtyard awaits.</h2><p>{status.error}</p><button data-autofocus className="chapter-button" onClick={() => { setStatus({ ready: false, error: null, fps: 0, triangles: 0 }); setRendererKey(k => k + 1); }}>Reload the scene</button></>
      : settings ? <><span className="chapter-eyebrow">SOUND & DIALOGUE</span><h2>Hear the world.</h2><button className="audio-master" onClick={() => { audio.current?.setEnabled(!sound); onToggleSound(); }}>{sound ? <Volume2 size={17}/> : <VolumeX size={17}/>} Sound {sound ? 'on' : 'off'}</button>{([['voice', 'Character voices'], ['music', 'Music'], ['effects', 'Effects & ambience']] as const).map(([channel, label]) => <label className="audio-slider" key={channel}><span>{label}<b>{Math.round(mix[channel] * 100)}%</b></span><input type="range" min="0" max="100" value={Math.round(mix[channel] * 100)} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); setMix(previous => ({ ...previous, [channel]: Math.max(0, Math.min(1, previous[channel] + (event.key === 'ArrowRight' ? .05 : -.05))) })); } }} onChange={event => setMix(previous => ({ ...previous, [channel]: Number(event.target.value) / 100 }))}/></label>)}<button className="dialogue-auto-setting" onClick={() => setAutoAdvance(v => !v)}>Advance dialogue automatically <span>{autoAdvance ? 'On' : 'Off'}</span></button><p className="audio-setting-note">Choices wait for your answer. Subtitles stay visible.</p><button data-autofocus className="chapter-button" onClick={() => setSettings(false)}>Return to your chapter <ChevronRight size={16}/></button></>
      : journal ? <><Crest/><span className="chapter-eyebrow">YOUR JOURNEY</span><h2>{quest.title}</h2><p>{quest.detail}</p><div className="journal-quest"><span>THE ROYAL SUMMONS</span><h3>Five seals. One crown.</h3><p>The king’s tournament will choose the protector of his heir. Your first road leads to Ilyra Dane at Ironbridge.</p></div><div className="journal-equipment"><span>YOUR EQUIPMENT</span><p><Swords size={16}/>{save.equipment.sword === 'steel' ? 'Balanced steel sword' : 'Iron sword'}</p><p><Shield size={16}/>{save.equipment.shield === 'heater' ? 'Heater shield' : 'Oak shield'}</p><p><Coins size={16}/>{save.coins} coins</p></div><p className="journal-motive">Your reason: {save.motive === 'coin' ? 'A living to earn.' : save.motive === 'belonging' ? 'An order to belong to.' : save.motive === 'truth' ? 'The truth behind a name.' : 'Still yours to choose.'}</p><button data-autofocus className="chapter-button" onClick={() => setJournal(false)}>Return <ChevronRight size={16}/></button></>
      : <><Crest/><span className="chapter-eyebrow">EARNED VALOR</span><h2>Take your time.</h2><p>Your story and the exchange will wait.</p><button data-autofocus className="chapter-button" onClick={() => { keys.current.clear(); tracker.reset(); setPaused(false); }}>Resume <Play size={16}/></button><button className="chapter-button secondary" onClick={openTraining}><Dumbbell size={16}/> Train with Alden</button><button className="chapter-button secondary" onClick={() => { setPaused(false); setJournal(true); }}><BookOpen size={16}/> Journal</button><button className="chapter-button secondary" onClick={() => onGuide('combat')}><CircleHelp size={16}/> Player guide</button><button className="chapter-button secondary" onClick={() => { setPaused(false); setSettings(true); }}><Settings2 size={16}/> Audio settings</button><button className="chapter-text-button" onClick={() => { audio.current?.stopVoice(); onBack(); }}>Return to main menu</button></>}
    </section></div>}
    {trainingOpen && <TrainingHall guideOpen={guideOpen} onGuide={() => onGuide('training')} points={points} frameTime={frameTime} aspect={imageAspect} preview={preview} sound={sound} save={trainingSave} onSave={saveTraining} onClose={() => { tracker.reset(); setTrainingOpen(false); if (stage === 'duel' || stage === 'lesson') setPaused(true); }} onPair={onTrainingPair} onInstruction={onInstruction} onExercise={onTrainingExercise} onToggleSound={onToggleSound}/>}
  </main>;
}
