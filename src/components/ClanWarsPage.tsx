import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, CircleHelp, Copy, Flag, Pause, Play, Shield, Smartphone, Swords, Users, Volume2, VolumeX } from 'lucide-react';
import { BladeTracker, type BladeInput, type Point } from '../../shared/game';
import type { CalibrationProfile } from '../../shared/motion';
import type { Landmark } from '../../shared/protocol';
import type { ArenaCommand, ArenaState } from '../../shared/multiplayer';
import { SwordDuel } from '../../shared/duel';
import FirstPersonArena, { type ArenaFrame, type ArenaStatus } from './FirstPersonArena';
import { ChapterAudio } from '../lib/chapterAudio';
import './multiplayer.css';

type Props = { guideOpen: boolean; onGuide: () => void; points: Landmark[]; worldPoints: Landmark[]; frameTime?: number; profile: CalibrationProfile; tracking: boolean; preview: boolean; controllerReady: boolean; sound: boolean;
  state: ArenaState; error: string; connected: boolean; send: (command: ArenaCommand) => void; onPair: () => void; onBack: () => void; onPreviewMove: (point: Point) => void; onToggleSound: () => void };
const starter = { sword: 'iron', shield: 'oak' } as const;
export default function ClanWarsPage({ guideOpen, onGuide, points, worldPoints, frameTime, profile, tracking, preview, controllerReady, sound, state, error, connected, send, onPair, onBack, onPreviewMove, onToggleSound }: Props) {
  const [name, setName] = useState('Squire'), [clan, setClan] = useState('Ashen Guard'), [code, setCode] = useState(''), [size, setSize] = useState(1), [team, setTeam] = useState<0 | 1>(1);
  const [userPaused, setPaused] = useState(false), [copied, setCopied] = useState(false);
  const paused = userPaused || guideOpen;
  const [status, setStatus] = useState<ArenaStatus>({ ready: false, error: null, fps: 0, triangles: 0 });
  const tracker = useMemo(() => new BladeTracker(profile), [profile]), input = useRef<BladeInput | null>(null), sequence = useRef(Date.now()), keys = useRef(new Set<string>());
  const audio = useRef<ChapterAudio | null>(null), lastEvent = useRef(0);
  const stateRef = useRef(state), control = useRef({ paused, tracking, ready: status.ready, preview }); stateRef.current = state; control.current = { paused, tracking, ready: status.ready, preview };
  const frame = useRef<ArenaFrame>({ duel: new SwordDuel().state, active: false, equipment: starter });
  const war = state.war, match = state.match, me = war?.members.find(m => m.id === state.me);
  const inBattle = Boolean(match && war?.phase !== 'lobby');
  const onStatus = useCallback((value: ArenaStatus) => setStatus(value), []);
  useEffect(() => { send({ type: 'arena-command', action: 'sync' }); }, [send]);
  useEffect(() => { audio.current = new ChapterAudio(); return () => audio.current?.close(); }, []);
  useEffect(() => { audio.current?.setEnabled(sound); }, [sound]);
  useEffect(() => { void audio.current?.setScene(war?.phase === 'fighting' ? 'trial' : 'courtyard', 'wind'); }, [war?.phase]);
  useEffect(() => { if (match?.self.event && match.self.event.id !== lastEvent.current) { lastEvent.current = match.self.event.id; void audio.current?.effect(match.self.event.kind === 'block' || match.self.event.kind === 'parry' ? 'shield' : match.self.event.kind === 'hit' ? 'impact' : 'swish'); } }, [match?.self.event?.id]);
  useEffect(() => { if (stateRef.current.war?.phase === 'fighting' && !stateRef.current.match?.winner) send({ type: 'arena-command', action: 'pause', paused }); keys.current.clear(); }, [paused, inBattle, send]);
  useEffect(() => { tracker.aspect = 16 / 9; input.current = tracker.update(points, frameTime ?? performance.now(), worldPoints); }, [points, worldPoints, frameTime, tracker]);
  useEffect(() => {
    const interval = setInterval(() => {
      const current = stateRef.current, c = control.current, movement = input.current;
      if (!current.match || current.war?.phase !== 'fighting') return;
      const active = Boolean(c.tracking && c.ready && !c.paused && !document.hidden && movement?.pose);
      send({ type: 'arena-command', action: 'input', input: { seq: sequence.current++, tracked: active, tip: movement?.pose?.tip || { x: .5, y: .5 }, pose: active ? movement?.pose || null : null,
        lean: movement?.lean || 0, body: movement?.body || { tracked: false, crouch: 0, forward: 0 }, forward: (keys.current.has('w') ? 1 : 0) - (keys.current.has('s') ? 1 : 0) } });
    }, 50); return () => clearInterval(interval);
  }, [send]);
  const togglePause = useCallback(() => { if (stateRef.current.war?.phase === 'fighting') setPaused(p => { send({ type: 'arena-command', action: 'pause', paused: !p }); return !p; }); }, [send]);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (guideOpen || ['INPUT', 'SELECT'].includes((event.target as HTMLElement).tagName)) return;
      const key = event.key.toLowerCase();
      if (['escape', 'backspace'].includes(key)) { event.preventDefault(); event.stopImmediatePropagation(); if (stateRef.current.match && !stateRef.current.match.winner) togglePause(); else onBack(); }
      if (stateRef.current.war?.phase === 'fighting' && ['w', 's'].includes(key)) { event.preventDefault(); keys.current.add(key); }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    // Two visible windows can share one computer during a local demo. Losing
    // keyboard focus releases held keys without stopping the phone controller.
    const blur = () => keys.current.clear();
    const visibility = () => { if (document.hidden && stateRef.current.war?.phase === 'fighting') { keys.current.clear(); setPaused(true); send({ type: 'arena-command', action: 'pause', paused: true }); } };
    window.addEventListener('keydown', down, true); window.addEventListener('keyup', up); window.addEventListener('blur', blur); window.addEventListener('moveroom:pause', togglePause); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); window.removeEventListener('moveroom:pause', togglePause); document.removeEventListener('visibilitychange', visibility); };
  }, [send, togglePause, onBack, guideOpen]);
  useEffect(() => { if (guideOpen) return; const id = requestAnimationFrame(() => document.querySelector<HTMLElement>('.clan-wars [data-autofocus]')?.focus({ preventScroll: true })); return () => cancelAnimationFrame(id); }, [war?.code, war?.phase, guideOpen]);
  const leave = () => { send({ type: 'arena-command', action: 'leave' }); setPaused(false); keys.current.clear(); };
  if (match) {
    const base = new SwordDuel().state, self = match.self, peer = match.peer, sign = self.z > peer.z ? 1 : -1, cutAge = match.elapsed - peer.cutAt;
    const pose = !paused && tracking ? input.current?.pose || self.pose : self.pose;
    frame.current = { equipment: starter, active: match.phase === 'fighting' && !paused && tracking, opponent: { pose: peer.pose, body: peer.body, lean: peer.lean }, duel: {
      ...base, elapsed: match.elapsed, health: self.health, rivalHealth: peer.health, stamina: self.stamina, rivalStamina: peer.stamina, pose, body: self.body, lean: self.lean,
      blade: pose?.tip || base.blade, shielding: Boolean(pose?.guarding), playerZ: self.z * sign, rivalZ: peer.z * sign, distance: match.distance,
      phase: match.winner ? 'over' : cutAge < .55 ? 'strike' : 'guard', phaseTime: Math.min(.55, cutAge), phaseDuration: .55, attackLane: peer.lane,
      finished: Boolean(match.winner), won: match.winner === state.me, cuts: self.cuts, blocks: self.blocks, perfectBlocks: self.perfectBlocks, damageDealt: self.damageDealt, damageTaken: self.damageTaken,
      swingAt: self.cutAt, event: self.event ? { ...self.event, kind: self.event.kind === 'parry' ? 'block' : self.event.kind === 'hit' ? 'hit' : self.event.kind } : null,
    }, world: { mode: 'duel', focus: 'mara', quest: 'mara', guided: 0, paused: match.phase === 'held' || paused, showWeapons: true } };
  }
  const canStart = Boolean(war && war.leader === state.me && ([0, 1] as const).every(t => { const roster = war.members.filter(m => m.team === t); return roster.length === war.size && roster.every(m => m.ready && m.connected); }));
  return <main className={`clan-wars ${inBattle ? 'clan-battle' : ''} ${preview ? 'clan-preview' : ''}`} data-war-phase={war?.phase || 'menu'}>
    <header className="clan-header"><button className="chapter-text-button" onClick={() => { leave(); onBack(); }}><ArrowLeft size={16}/> Main menu</button><span><Flag size={19}/> THE ORDERS · CLAN WARS</span><button className="chapter-text-button" onClick={onGuide}><CircleHelp size={17}/> War guide</button><button className="chapter-text-button" onClick={onPair}><Smartphone size={16}/>{preview ? 'Preview controller' : controllerReady ? 'Phone controller' : 'Connect controller'}</button><button className="chapter-text-button" aria-label={sound ? 'Turn multiplayer sound off' : 'Turn multiplayer sound on'} onClick={onToggleSound}>{sound ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button></header>
    {error && <div className="clan-error" role="alert">{error}</div>}{!connected && <div className="clan-error">Reconnecting to the war server…</div>}
    {!war && <section className="clan-menu"><div className="clan-intro"><span className="chapter-eyebrow">PEOPLE ARE THE FIGHTERS</span><h1>Your clan.<br/><em>Your champions.</em></h1><p>Gather your order. Each member faces a real opponent in a sword-and-shield duel. Every pairing contributes to the clan’s war score.</p><div className="clan-rules"><span><Users size={18}/> 1–3 fighters per clan</span><span><Swords size={18}/> Human-controlled duels</span><span><Shield size={18}/> Shared starter gear</span></div><p className="clan-note">Each player needs their own TV/browser screen and Android phone, or a labelled desktop preview. Use the same game server. Guests and war results last for this server session. Game controls are shared with your paired opponent; camera video stays on your phone.</p></div><div className="clan-form"><label>YOUR FIGHTER NAME<input value={name} maxLength={20} onChange={e => setName(e.target.value)}/></label><label>YOUR CLAN NAME<input value={clan} maxLength={24} onChange={e => setClan(e.target.value)}/></label><fieldset><legend>Fighters per clan</legend>{[1, 2, 3].map(n => <button key={n} className={size === n ? 'selected' : ''} aria-pressed={size === n} onClick={() => setSize(n)}>{n} vs {n}</button>)}</fieldset><button data-autofocus className="chapter-button" disabled={!connected || name.trim().length < 2 || clan.trim().length < 2} onClick={() => send({ type: 'arena-command', action: 'create', name, clan, size })}>Create a clan war <Flag size={17}/></button><div className="clan-join"><label>WAR INVITE CODE<input value={code} maxLength={6} placeholder="ABC234" onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}/></label><div><button aria-pressed={team === 0} className={team === 0 ? 'selected' : ''} onClick={() => setTeam(0)}>Join host clan</button><button aria-pressed={team === 1} className={team === 1 ? 'selected' : ''} onClick={() => setTeam(1)}>Opposing clan</button></div><button className="chapter-button secondary" disabled={!connected || code.length !== 6 || name.trim().length < 2 || clan.trim().length < 2} onClick={() => send({ type: 'arena-command', action: 'join', code, name, clan, team })}>Join this war <Users size={17}/></button></div></div></section>}
    {war && !inBattle && <section className="clan-lobby"><span className="chapter-eyebrow">ASSEMBLE YOUR ROSTERS</span><h1>{war.clans[0]} <em>vs</em> {war.clans[1]}</h1><div className="war-invite"><span>WAR INVITE</span><b>{war.code}</b><button className="chapter-text-button" onClick={() => { void navigator.clipboard?.writeText(war.code).then(() => setCopied(true)); }}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? 'Copied' : 'Copy code'}</button></div><div className="clan-rosters">{([0, 1] as const).map(t => <div key={t}><h2>{war.clans[t]} <small>{war.members.filter(m => m.team === t).length}/{war.size}</small></h2>{Array.from({ length: war.size }, (_, i) => { const m = war.members.filter(m => m.team === t)[i]; return <div className="clan-roster-member" key={m?.id || i}><span>0{i + 1}</span><strong>{m?.name || 'Waiting for a fighter'}</strong><small>{m ? !m.connected ? 'Disconnected' : m.ready ? 'Ready' : 'Preparing' : 'Invite a teammate'}</small>{m?.id === state.me && <b>YOU</b>}</div>; })}</div>)}</div><div className="clan-lobby-actions"><button data-autofocus className="chapter-button" disabled={!controllerReady || !tracking} onClick={() => send({ type: 'arena-command', action: 'ready', ready: !me?.ready })}>{me?.ready ? 'Ready · undo' : 'I’m ready'}<Check size={17}/></button>{!controllerReady && <button className="chapter-button secondary" onClick={onPair}>Connect movement controller</button>}{war.leader === state.me && <button className="chapter-button" disabled={!canStart} onClick={() => send({ type: 'arena-command', action: 'start' })}>Start clan war <Swords size={17}/></button>}<button className="chapter-text-button" onClick={leave}>Leave war</button></div><p>Pairing 01 faces pairing 01, and so on. Both full rosters must be ready. Each won duel earns one clan point; a draw earns half a point each.</p></section>}
    {inBattle && match && war && <section className="clan-combat-wrap"><div className="clan-battle-world" data-match-phase={match.phase} data-motion-active={war.phase === 'fighting' && !paused}>
      <FirstPersonArena frame={frame} onStatus={onStatus} onPointerMove={(x, y) => { if (preview && !paused) onPreviewMove({ x, y }); }}/><div className="adventure-vignette"/>
      <div className="clan-combat-hud"><div className="clan-health"><span>{match.self.name} · YOU<b>{match.self.health}/100</b></span><div role="progressbar" aria-label="Your multiplayer health" aria-valuemin={0} aria-valuemax={100} aria-valuenow={match.self.health}><i style={{width:`${match.self.health}%`}}/></div><small>Stamina {Math.round(match.self.stamina * 100)}%</small></div><div className="clan-war-score"><span>{war.clans[0]} vs {war.clans[1]}</span><b>{war.score[0]} : {war.score[1]}</b><small>CLAN POINTS</small></div><div className="clan-health opponent"><span>{match.peer.name}<b>{match.peer.health}/100</b></span><div role="progressbar" aria-label="Opponent multiplayer health" aria-valuemin={0} aria-valuemax={100} aria-valuenow={match.peer.health}><i style={{width:`${match.peer.health}%`}}/></div><small>Human opponent · {match.distance.toFixed(1)} m</small></div></div>
      {match.phase === 'countdown' && <div className="clan-countdown">{Math.ceil(match.countdown)}<span>TAKE YOUR GUARD</span></div>}
      {match.phase === 'held' && !match.winner && <div className="clan-held"><Shield size={23}/><h2>{paused ? 'Your pairing is paused.' : 'Both fighters need a clear view.'}</h2><p>{match.feedback} A missing or paused fighter forfeits after 30 seconds.</p>{paused && <button data-autofocus className="chapter-button" onClick={togglePause}>Resume <Play size={17}/></button>}</div>}
      {match.winner && <div className="clan-result"><span className="chapter-eyebrow">{war.phase === 'complete' ? 'CLAN WAR COMPLETE' : 'YOUR PAIRING COMPLETE'}</span><h1>{match.winner === 'draw' ? 'Honours shared.' : match.winner === state.me ? 'You win your pairing.' : 'You yield.'}</h1><p>{war.phase === 'complete' ? war.winner === 'draw' ? 'The clans share the honours.' : `${war.clans[war.winner!]} wins the war.` : 'Your remaining clanmates are still fighting.'}</p><div>{match.self.damageDealt} damage · {match.self.blocks} blocks · {match.self.perfectBlocks} perfect guards</div>{war.phase === 'complete' && <button data-autofocus className="chapter-button" onClick={leave}>Return to war hall</button>}</div>}
      {!match.winner && <div className="clan-combat-bottom"><p>{match.feedback}</p><button className="chapter-text-button" onClick={togglePause}><Pause size={15}/> Pause pairing</button><button className="chapter-text-button" onClick={leave}>Yield & leave</button></div>}
    </div><p className="clan-controls">{preview ? 'Desktop preview · Camera off · J/K/L cut · Shift + Z/X/C guard · A/D lean · W/S footwork · V crouch' : 'Hands place your weapons · Step for footwork · Lean or crouch to move off the blade'} · Server resolves health and clan score{status.error ? ` · ${status.error}` : ''}</p></section>}
  </main>;
}
