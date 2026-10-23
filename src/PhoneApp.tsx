import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, Check, FlipHorizontal2, Hand, Link2, ScanLine, ShieldCheck, Smartphone, Square, Tv, Wifi, X } from 'lucide-react';
import Brand from './components/Brand';
import './components/progress.css';
import { RoomSocket } from './lib/socket';
import { usePhoneCamera } from './lib/usePhoneCamera';
import type { TrainingBlock } from '../shared/training';
import type { Activity, TrackingModel } from '../shared/protocol';

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
  const [instruction, setInstruction] = useState('Look at your TV to choose an experience.');
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [model, setModel] = useState<TrackingModel>('full');
  const [receipt, setReceipt] = useState<{ at: number; ms: number } | null>(null), [clock, setClock] = useState(0);
  const video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const socket = useRef<RoomSocket | null>(null), joinRequest = useRef(0);
  const activityRef = useRef<Activity>('home');
  const exerciseRef = useRef<TrainingBlock | null>(null);
  const camera = usePhoneCamera({ video, canvas, socket, activity: activityRef, exercise: exerciseRef, model, facing });
  const { running, loading, tracking, status, fps, aspect, trackingInfo, start, stop } = camera;
  const receiving = Boolean(connected && tvConnected && receipt && clock - receipt.at < 1000 && running);
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pairing]);
  useEffect(() => { const timer = setInterval(() => setClock(performance.now()), 250); return () => { clearInterval(timer); joinRequest.current++; }; }, []);
  useEffect(() => {
    if (!pairing) return;
    const connection = new RoomSocket('phone', pairing.code, pairing.phoneToken, message => {
      if (message.type === 'presence' || message.type === 'connected') setTVConnected(message.tvConnected);
      if (message.type === 'error') setError(message.message);
      if (message.type === 'pose-ack') setReceipt({ at: performance.now(), ms: Math.max(0, Math.round(performance.now() - message.t)) });
      if (message.type === 'command' && message.action === 'exercise') {
        const [exercise, variation] = message.value.split(':');
        exerciseRef.current = exercise === 'squat' && ['shallow', 'regular'].includes(variation) || exercise === 'pushup' && ['wall', 'knees', 'floor'].includes(variation) ? { exercise, variation, reps: 4, sets: 1 } as TrainingBlock : null;
      }
      if (message.type === 'command' && message.action === 'activity') exerciseRef.current = null;
      if (message.type === 'command' && message.action === 'instruction') setInstruction(message.value);
      if (message.type === 'command' && message.action === 'activity') activityRef.current = message.value as Activity;
      if (message.type === 'command' && message.action === 'activity') setInstruction(message.value === 'chapter' || message.value === 'arena' ? 'Your hands place the weapons. Step closer or back for footwork; lean or crouch after she commits. Keep hands and hips in view.' : message.value === 'training' ? 'Follow Alden’s exercise calibration and rep cues on your screen.' : message.value === 'calibrate' ? 'Follow the calibration instructions on your TV.' : 'Look at your TV to choose an experience.');
    }, state => { setConnected(state); if (!state) { setTVConnected(false); setReceipt(null); } });
    socket.current = connection;
    return () => { connection.close(); socket.current = null; };
  }, [pairing]);
  const join = async (event: React.FormEvent) => {
    event.preventDefault(); const request = ++joinRequest.current; setJoining(true); setError('');
    try {
      const response = await fetch('/api/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code.toUpperCase() }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      if (request !== joinRequest.current) return;
      setPairing(result); history.replaceState(null, '', `/phone#code=${result.code}&token=${result.phoneToken}`);
    } catch (e) { if (request === joinRequest.current) setError((e as Error).message); }
    finally { if (request === joinRequest.current) setJoining(false); }
  };
  const flip = () => { const next = facing === 'user' ? 'environment' : 'user'; stop(); setFacing(next); void start(next); };
  const disconnect = () => { joinRequest.current++; stop(); socket.current?.close(); setPairing(null); setConnected(false); setTVConnected(false); setReceipt(null); history.replaceState(null, '', '/phone'); };

  return <div className="phone-app"><header className="phone-header"><Brand compact/><span className="phone-controller-label"><Smartphone size={14}/> MOVEMENT CONTROLLER</span></header><main className="phone-main">
    {!pairing ? <><div className="phone-intro-icon"><Link2 size={30}/></div><span className="section-kicker">A LITTLE CONNECTION</span><h1>Your next controller<br/><em>is you.</em></h1><p>Enter the room code from your TV, or scan its pairing QR code.</p><form className="phone-join-form" onSubmit={join}><label htmlFor="room-code">TV ROOM CODE</label><input id="room-code" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="ABC234" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={6}/><button className="button button-primary" type="submit" disabled={code.length !== 6 || joining}>{joining ? 'Connecting…' : 'Connect to my TV'} <ArrowRight size={18}/></button></form><div className="phone-setup-note"><Tv size={21}/><p><strong>Start on your TV or computer.</strong><span>Open Earned Valor there to create a room. Keep this phone handy.</span></p></div></> : <><div className="phone-room-status"><span className={connected && tvConnected ? 'live-status' : ''}><i/>{connected && tvConnected ? 'Connected to your TV' : connected ? 'Waiting for your TV' : 'Connecting…'}</span><b>{pairing.code}</b></div><h1>Your movement.<br/><em>Your legend.</em></h1><p className="phone-camera-description">Prop your phone near the TV, facing you.<br/>Leave your hands and hips in view.</p><div className={`camera-preview ${running ? 'camera-running' : ''}`} style={{ aspectRatio: aspect }}><video ref={video} autoPlay playsInline muted style={{ transform: facing === 'user' ? 'scaleX(-1)' : 'none' }}/><canvas ref={canvas}/>{!running && !loading && <div className="camera-placeholder"><div><Camera size={36}/></div><strong>Your movement starts here.</strong><span>Turn on your camera when you’re ready.</span></div>}{loading && <div className="camera-placeholder"><div className="camera-spinner"/><strong>{status}</strong><span>The first setup takes a moment.</span></div>}{running && <><span className={`camera-tracking-pill ${tracking ? 'good' : ''}`}><i/>{tracking ? 'In view' : 'Find your frame'}</span><span className="camera-fps">{fps} fps</span></>}</div>
      <div className="phone-tracking-options"><label htmlFor="tracking-quality">MOVEMENT TRACKING</label><select id="tracking-quality" value={model} disabled={running || loading} onChange={e => setModel(e.target.value as TrackingModel)}><option value="full">Full pose · more detail</option><option value="lite">Fast pose · lower phone load</option></select><p>{running ? trackingInfo : 'Full pose uses 3D joints and adaptive smoothing. Choose Fast if this phone struggles to keep up.'}</p></div>
      <div className={`phone-guidance ${tracking ? 'in-view' : ''}`}>{tracking ? <Check size={19}/> : <ScanLine size={19}/>}<span>{running ? status : loading ? status : 'Ready when you are. Your camera is off.'}</span></div><div className="phone-camera-actions">{running ? <><button className="button button-secondary" onClick={stop}><Square size={15}/> Pause camera</button><button className="icon-button" aria-label="Switch front and rear cameras" onClick={flip}><FlipHorizontal2 size={21}/></button></> : <button className="button button-primary" disabled={!connected || loading} onClick={() => void start()}><Camera size={19}/>{loading ? 'Getting ready…' : camera.error ? 'Restart camera' : 'Start my camera'} <ArrowRight size={18}/></button>}</div>{loading && <button className="text-button phone-camera-cancel" onClick={stop}>Cancel camera startup</button>}<div className="phone-instruction"><div><Hand size={17}/><span>FROM YOUR TV</span></div><p>{instruction}</p></div><button className="text-button phone-disconnect" onClick={disconnect}><X size={14}/> Disconnect this phone</button></>}
    {pairing && <ol className="phone-readiness" aria-label="Controller readiness"><li data-ready={connected && tvConnected}>1 · Phone paired</li><li data-ready={running && tracking}>2 · Movement in view</li><li data-ready={receiving}>3 · TV receiving movement</li></ol>}
    {pairing && running && <p className="phone-delivery" role="status">{receiving ? `TV receipt confirmed · ${receipt!.ms} ms phone–TV–phone round trip` : 'Waiting for TV receipt. Check that its game screen is open.'}</p>}
    {(error || camera.error) && <div className="phone-error" role="alert">{camera.error || error}</div>}
    <div className="phone-privacy"><ShieldCheck size={17}/><p><strong>Your video stays here.</strong><span>Only movement landmarks are sent to the TV. Multiplayer shares game controls with the matched opponent. No audio is captured.</span></p></div><div className="phone-network-note"><Wifi size={13}/> Keep this page open while you play.</div>
  </main><footer className="phone-footer">TRAIN YOUR BODY. FORGE YOUR LEGEND.</footer></div>;
}
