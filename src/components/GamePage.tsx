import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Hand, MoveHorizontal, Pause, Play, RotateCcw, Trophy, Zap, Smartphone, Swords } from 'lucide-react';
import { BladeTracker, OrbitGame, type BladeInput, type GameSnapshot, type Point } from '../../shared/game';
import type { CalibrationProfile } from '../../shared/motion';
import type { Landmark } from '../../shared/protocol';
import OrbitCanvas from './OrbitCanvas';
import { GameAudio } from '../lib/audio';

export default function GamePage({ points, profile, frameTime, tracking, preview, sound, onPreviewMove, onBack, onPair }: { points: Landmark[]; profile: CalibrationProfile; frameTime?: number; tracking: boolean; preview: boolean; sound: boolean; onPreviewMove: (point: Point) => void; onBack: () => void; onPair: () => void }) {
  const game = useRef(new OrbitGame()), audio = useRef<GameAudio | null>(null);
  const tracker = useMemo(() => new BladeTracker(profile), [profile]);
  const [snapshot, setSnapshot] = useState<GameSnapshot>({ ...game.current.state });
  const [started, setStarted] = useState(false), [paused, setPaused] = useState(false);
  const input = useRef<BladeInput>({ tracked: false, blade: { x: 0.5, y: 0.6 }, shield: false, lean: 0, sequence: 0, slash: null });
  useEffect(() => { input.current = tracker.update(points, frameTime ?? performance.now()); }, [points, frameTime, tracker]);
  const live = useRef(tracking); live.current = tracking;
  const enabled = useRef(sound); enabled.current = sound;
  const dimensions = useCallback((aspect: number) => { game.current.aspect = aspect; }, []);
  useEffect(() => { const id = requestAnimationFrame(() => { const cover = document.querySelector('.game-cover'); (cover?.querySelector<HTMLElement>('[data-autofocus]:not(:disabled)') || cover?.querySelector<HTMLElement>('button:not(:disabled)'))?.focus({ preventScroll: true }); }); return () => cancelAnimationFrame(id); }, [started, paused, snapshot.finished, tracking]);
  useEffect(() => { const handler = () => { if (started && !snapshot.finished) setPaused(p => !p); }; window.addEventListener('moveroom:pause', handler); return () => window.removeEventListener('moveroom:pause', handler); }, [started, snapshot.finished]);
  useEffect(() => () => { audio.current?.close(); }, []);
  useEffect(() => {
    let raf = 0, previous = performance.now(), lastUI = 0;
    const step = (now: number) => {
      const dt = (now - previous) / 1000; previous = now;
      const before = { sliced: game.current.state.sliced, blocked: game.current.state.blocked, hits: game.current.state.hits };
      if (started && !paused && live.current) game.current.step(dt, input.current); else game.current.suspend(input.current);
      if (enabled.current && audio.current) {
        const s = game.current.state;
        if (s.sliced > before.sliced) audio.current.play('slice'); else if (s.blocked > before.blocked) audio.current.play('block'); else if (s.hits > before.hits) audio.current.play('hit');
      }
      if (now - lastUI > 50 || game.current.state.finished) { lastUI = now; setSnapshot({ ...game.current.state }); }
      if (!game.current.state.finished) raf = requestAnimationFrame(step);
    }; raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [started, paused]);
  const start = () => { audio.current ??= new GameAudio(); audio.current.unlock(); setStarted(true); setPaused(false); };
  const restart = () => { const aspect = game.current.aspect; game.current = new OrbitGame(); game.current.aspect = aspect; tracker.reset(); setSnapshot({ ...game.current.state }); setStarted(false); setPaused(false); };
  const left = Math.ceil(snapshot.duration - snapshot.elapsed);
  return <section className="activity-layout game-layout">
    <div className="activity-heading"><button className="text-button" onClick={onBack}><ArrowLeft size={17}/> Playground</button><div className="activity-title"><span className="tag tag-lime">PLAY</span><h2>Orbit Arena</h2><span>Your hand. Your blade. Your little adventure.</span></div><button className="button button-small button-secondary" onClick={() => setPaused(p => !p)} disabled={!started || snapshot.finished}>{paused ? <Play size={17}/> : <Pause size={17}/>} {paused ? 'Resume' : 'Pause'}</button></div>
    <div className="game-content"><div className="game-board">
      <div className="game-hud"><div><span>SCORE</span><strong>{snapshot.score.toLocaleString()}</strong></div><div className="game-time"><span>TIME LEFT</span><strong>{left}<small>s</small></strong></div><div><span>STREAK</span><strong>{snapshot.combo}<small>×</small></strong></div></div>
      <OrbitCanvas state={snapshot} preview={preview} onPreviewMove={onPreviewMove} onAspect={dimensions}/>
      <div className="game-feedback">{started ? snapshot.feedback : 'Your right wrist controls the blade. Give it a little sweep.'}</div>
      {!started && <div className="game-cover"><div className="game-cover-icon"><Swords size={30}/></div><span className="section-kicker">A LITTLE MOTION. A LOT OF ACTION.</span><h2>Enter the arena.</h2><p>Sweep your right hand through lime drones.<br/>Raise your left hand to block orange bolts.</p><button data-autofocus className="button button-primary" onClick={start} disabled={!tracking}>Start 45-second round <ArrowRight size={18}/></button>{!tracking && <button className="text-button" onClick={onPair}><Smartphone size={17}/> Connect your movement controller</button>}</div>}
      {started && !snapshot.finished && (paused || !tracking) && <div className="game-cover"><Pause size={35}/><h2>{paused ? 'Take a breather.' : 'Looking for you.'}</h2><p>{paused ? 'Your adventure will be here.' : 'The game is paused. Bring your hands and hips into view.'}</p>{paused ? <button data-autofocus className="button button-primary" onClick={() => setPaused(false)} disabled={!tracking}>Keep moving <Play size={18}/></button> : <button className="button button-secondary" onClick={onPair}>Check phone connection</button>}</div>}
      {snapshot.finished && <div className="game-cover results-cover"><div className="game-cover-icon"><Trophy size={30}/></div><span className="section-kicker">THAT’S YOUR KIND OF PLAY</span><h2>{snapshot.score.toLocaleString()} <small>points</small></h2><div className="round-results"><span><b>{snapshot.sliced}</b> drones sliced</span><span><b>{snapshot.blocked + snapshot.dodged}</b> bolts stopped</span><span><b>{snapshot.bestCombo}×</b> best streak</span></div><button data-autofocus className="button button-primary" onClick={restart}>Another little adventure <RotateCcw size={18}/></button><button className="text-button" onClick={onBack}>Back to the playground</button></div>}
    </div><aside className="game-sidebar"><div className="sidebar-kicker">HOW YOU PLAY</div><div className="control-instruction"><div><Swords size={24}/></div><p><strong>Right hand. Energy blade.</strong><span>Sweep through lime drones. Holding still won’t slice.</span></p></div><div className="control-instruction"><div><Hand size={24}/></div><p><strong>Left hand. Shield up.</strong><span>Raise to your comfortable target to catch orange bolts.</span></p></div><div className="control-instruction"><div><MoveHorizontal size={24}/></div><p><strong>Lean for a little dodge</strong><span>A full calibrated lean also avoids a bolt.</span></p></div><div className="shield-meter"><div><span>SHIELD ENERGY</span><Zap size={15}/></div><div className="progress-track"><i style={{ width: snapshot.energy * 100 + '%' }}/></div><p>Lower your left hand to recharge.</p></div><div className="game-tip"><span>SMALL MOVES. BIG POSSIBILITIES.</span><p>Slice across the camera’s view. Keep your sword hand visible and move within your comfortable range.</p></div>{preview && <div className="keyboard-hint"><b>DESKTOP PREVIEW</b><span>Move mouse over arena or hold arrow keys to swing.<br/>Hold Shift: shield · Space: pause</span></div>}</aside></div>
  </section>;
}
