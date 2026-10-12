import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, Check, FlipHorizontal2, Hand, Link2, ScanLine, ShieldCheck, Smartphone, Square, Tv, Wifi, X } from 'lucide-react';
import Brand from './components/Brand';
import { RoomSocket } from './lib/socket';
import { PoseCamera } from './lib/camera';
import { measureExercise, type TrainingBlock } from '../shared/training';
import { measureBody } from '../shared/motion';
import type { Activity, PoseFrame, TrackingModel } from '../shared/protocol';

type Pairing = { code: string; phoneToken: string };
const initialPair = () => {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const code = hash.get('code'), token = hash.get('token');
  return code && token ? { code, phoneToken: token } : null;
};

export default function PhoneApp() {
  const [pairing, setPairing] = useState<Pairing | null>(initialPair);
  const [code, setCode] = useState(''), [error, setError] = useState(''), [joining, setJoining] = useState(false);
  const [connected, setConnected] = useState(false), [tvConnected, setTVConnected] = useState(false);
  const [running, setRunning] = useState(false), [loading, setLoading] = useState(false), [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState('Ready when you are.'), [instruction, setInstruction] = useState('Look at your TV to choose an experience.');
  const [fps, setFps] = useState(0), [facing, setFacing] = useState<'user' | 'environment'>('user'), [aspect, setAspect] = useState(4 / 3);
  const [model, setModel] = useState<TrackingModel>('full'), [trackingInfo, setTrackingInfo] = useState('');
  const video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const socket = useRef<RoomSocket | null>(null), camera = useRef<PoseCamera | null>(null);
  const wake = useRef<WakeLockSentinel | null>(null), sequence = useRef(0), mounted = useRef(true);
  const activityRef = useRef<Activity>('home');
  const exerciseRef = useRef<TrainingBlock | null>(null);
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pairing]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; camera.current?.stop(); wake.current?.release(); };
  }, []);
  useEffect(() => {
    if (!pairing) return;
    const connection = new RoomSocket('phone', pairing.code, pairing.phoneToken, message => {
      if (message.type === 'presence' || message.type === 'connected') setTVConnected(message.tvConnected);
      if (message.type === 'error') setError(message.message);
      if (message.type === 'command' && message.action === 'exercise') {
        const [exercise, variation] = message.value.split(':');
        exerciseRef.current = exercise === 'squat' && ['shallow', 'regular'].includes(variation) || exercise === 'pushup' && ['wall', 'knees', 'floor'].includes(variation) ? { exercise, variation, reps: 4, sets: 1 } as TrainingBlock : null;
      }
      if (message.type === 'command' && message.action === 'activity') exerciseRef.current = null;
      if (message.type === 'command' && message.action === 'instruction') setInstruction(message.value);
      if (message.type === 'command' && message.action === 'activity') activityRef.current = message.value as Activity;
      if (message.type === 'command' && message.action === 'activity') setInstruction(message.value === 'chapter' || message.value === 'arena' ? 'Your hands place the weapons. Step closer or back for footwork; lean or crouch after she commits. Keep hands and hips in view.' : message.value === 'training' ? 'Follow Alden’s exercise calibration and rep cues on your screen.' : message.value === 'calibrate' ? 'Follow the calibration instructions on your TV.' : 'Look at your TV to choose an experience.');
    }, state => { setConnected(state); if (!state) setTVConnected(false); });
    socket.current = connection;
    return () => { connection.close(); socket.current = null; };
  }, [pairing]);
  const join = async (event: React.FormEvent) => {
    event.preventDefault(); setJoining(true); setError('');
    try {
      const response = await fetch('/api/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code.toUpperCase() }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setPairing(result); history.replaceState(null, '', `/phone#code=${result.code}&token=${result.phoneToken}`);
    } catch (e) { setError((e as Error).message); }
    finally { setJoining(false); }
  };
  const stop = () => {
    camera.current?.stop(); camera.current = null; wake.current?.release(); wake.current = null;
    socket.current?.send({ type: 'pose', seq: sequence.current++, t: performance.now(), landmarks: [], fps: 0 });
    setRunning(false); setLoading(false); setTracking(false); setStatus('Camera paused. Take your time.');
  };
  const start = async (direction = facing) => {
    if (loading) return;
    setError(''); setLoading(true);
    const tracker = new PoseCamera(video.current!, canvas.current!, (frame: PoseFrame) => {
      const packet = { ...frame, seq: sequence.current++ };
      socket.current?.send(packet);
      if (frame.tracking) setTrackingInfo(`${frame.tracking.model === 'full' ? 'Full pose' : 'Fast pose'} · ${frame.tracking.delegate} · ${frame.tracking.inferenceMs} ms inference`);
      if (mounted.current && exerciseRef.current) { const view = measureExercise(frame.landmarks, exerciseRef.current, frame.imageAspect); setTracking(Boolean(view.measurement)); setFps(frame.fps); setStatus(view.measurement ? 'Your exercise is in side view.' : view.cue === 'view' ? 'Move the phone to your side for this exercise.' : 'Keep the exercise joints fully in view.'); }
      else if (mounted.current) { const body = measureBody(frame.landmarks), elbows = !['chapter', 'arena'].includes(activityRef.current) || [13, 14].every(i => frame.landmarks[i]?.visibility >= .5); setTracking(Boolean(body && elbows)); setFps(frame.fps); setStatus(body ? elbows ? 'Your movement is in view.' : 'Bring both elbows into view for sword control.' : 'Step back until your hands and hips are in view.'); }
    }, message => { if (mounted.current) setStatus(message); }, model);
    camera.current = tracker;
    try {
      await tracker.start(direction);
      if (!mounted.current || camera.current !== tracker) return;
      setAspect(video.current!.videoWidth / video.current!.videoHeight || 4 / 3); setRunning(true);
      if ('wakeLock' in navigator) try { wake.current = await navigator.wakeLock.request('screen'); } catch { /* Tracking still works without wake lock. */ }
    } catch (e) {
      tracker.stop(); camera.current = null;
      const message = e instanceof DOMException && e.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in Chrome, then try again.' : e instanceof DOMException && e.name === 'NotFoundError' ? 'No camera was found on this device.' : (e as Error).message;
      if (mounted.current) { setError(message); setRunning(false); }
    } finally { if (mounted.current) setLoading(false); }
  };
  const flip = () => { const next = facing === 'user' ? 'environment' : 'user'; stop(); setFacing(next); void start(next); };
  const disconnect = () => { stop(); socket.current?.close(); setPairing(null); setConnected(false); setTVConnected(false); history.replaceState(null, '', '/phone'); };
  useEffect(() => {
    const hidden = () => { if (document.hidden) socket.current?.send({ type: 'pose', seq: sequence.current++, t: performance.now(), landmarks: [], fps: 0 }); };
    document.addEventListener('visibilitychange', hidden); return () => document.removeEventListener('visibilitychange', hidden);
  }, []);

  return <div className="phone-app"><header className="phone-header"><Brand compact/><span className="phone-controller-label"><Smartphone size={14}/> MOVEMENT CONTROLLER</span></header><main className="phone-main">
    {!pairing ? <><div className="phone-intro-icon"><Link2 size={30}/></div><span className="section-kicker">A LITTLE CONNECTION</span><h1>Your next controller<br/><em>is you.</em></h1><p>Enter the room code from your TV, or scan its pairing QR code.</p><form className="phone-join-form" onSubmit={join}><label htmlFor="room-code">TV ROOM CODE</label><input id="room-code" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="ABC234" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={6}/><button className="button button-primary" type="submit" disabled={code.length !== 6 || joining}>{joining ? 'Connecting…' : 'Connect to my TV'} <ArrowRight size={18}/></button></form><div className="phone-setup-note"><Tv size={21}/><p><strong>Start on your TV or computer.</strong><span>Open MoveRoom there to create a room. Keep this phone handy.</span></p></div></> : <><div className="phone-room-status"><span className={connected && tvConnected ? 'live-status' : ''}><i/>{connected && tvConnected ? 'Connected to your TV' : connected ? 'Waiting for your TV' : 'Connecting…'}</span><b>{pairing.code}</b></div><h1>Make a little<br/><em>room for play.</em></h1><p className="phone-camera-description">Prop your phone near the TV, facing you.<br/>Leave your hands and hips in view.</p><div className={`camera-preview ${running ? 'camera-running' : ''}`} style={{ aspectRatio: aspect }}><video ref={video} autoPlay playsInline muted style={{ transform: facing === 'user' ? 'scaleX(-1)' : 'none' }}/><canvas ref={canvas}/>{!running && !loading && <div className="camera-placeholder"><div><Camera size={36}/></div><strong>Your movement starts here.</strong><span>Turn on your camera when you’re ready.</span></div>}{loading && <div className="camera-placeholder"><div className="camera-spinner"/><strong>{status}</strong><span>The first setup takes a moment.</span></div>}{running && <><span className={`camera-tracking-pill ${tracking ? 'good' : ''}`}><i/>{tracking ? 'In view' : 'Find your frame'}</span><span className="camera-fps">{fps} fps</span></>}</div>
      <div className="phone-tracking-options"><label htmlFor="tracking-quality">MOVEMENT TRACKING</label><select id="tracking-quality" value={model} disabled={running || loading} onChange={e => setModel(e.target.value as TrackingModel)}><option value="full">Full pose · more detail</option><option value="lite">Fast pose · lower phone load</option></select><p>{running ? trackingInfo : 'Full pose uses 3D joints and adaptive smoothing. Choose Fast if this phone struggles to keep up.'}</p></div>
      <div className={`phone-guidance ${tracking ? 'in-view' : ''}`}>{tracking ? <Check size={19}/> : <ScanLine size={19}/>}<span>{running ? status : loading ? status : 'Ready when you are. Your camera is off.'}</span></div><div className="phone-camera-actions">{running ? <><button className="button button-secondary" onClick={stop}><Square size={15}/> Pause camera</button><button className="icon-button" aria-label="Switch front and rear cameras" onClick={flip}><FlipHorizontal2 size={21}/></button></> : <button className="button button-primary" disabled={!connected || loading} onClick={() => void start()}><Camera size={19}/>{loading ? 'Getting ready…' : 'Start my camera'} <ArrowRight size={18}/></button>}</div><div className="phone-instruction"><div><Hand size={17}/><span>FROM YOUR TV</span></div><p>{instruction}</p></div><button className="text-button phone-disconnect" onClick={disconnect}><X size={14}/> Disconnect this phone</button></>}
    {error && <div className="phone-error" role="alert">{error}</div>}
    <div className="phone-privacy"><ShieldCheck size={17}/><p><strong>Your video stays here.</strong><span>Only movement landmarks are sent to the TV. Multiplayer shares game controls with the matched opponent. No audio is captured.</span></p></div><div className="phone-network-note"><Wifi size={13}/> Keep this page open while you play.</div>
  </main><footer className="phone-footer">A LITTLE SPACE. A LOT OF PLAY.</footer></div>;
}
