import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ArrowRight, Camera, Check, Keyboard, Smartphone, X, RefreshCw, ShieldCheck } from 'lucide-react';
import type { SessionInfo } from '../../shared/protocol';
import { useHandsFreeCountdown } from '../lib/useHandsFreeCountdown';
import './hands-free.css';

export default function PairDialog({ session, phoneConnected, tracking, calibrated, exercise, error, onClose, onContinue, onPreview, onRenew }: {
  calibrated: boolean; exercise: boolean;
  session: SessionInfo | null; phoneConnected: boolean; tracking: boolean; error: string;
  onClose: () => void; onContinue: () => void; onPreview: () => void; onRenew: () => void;
}) {
  const [qr, setQr] = useState('');
  const [seenRoom, setSeenRoom] = useState<string | null>(null), [hold, setHold] = useState(false);
  useEffect(() => {
    if (!phoneConnected) setSeenRoom(null);
    else if (tracking && session) setSeenRoom(session.code);
  }, [phoneConnected, tracking, session?.code]);
  const canContinue = Boolean(phoneConnected && session && (tracking || seenRoom === session.code));
  const countdown = useHandsFreeCountdown(Boolean(phoneConnected && tracking && session && !error && !hold), onContinue, 3, session?.code);
  useEffect(() => { let active = true; if (session) QRCode.toDataURL(session.phoneUrl, { width: 230, margin: 1, color: { dark: '#172014', light: '#f2f5e8' }, errorCorrectionLevel: 'M' }).then(image => { if (active) setQr(image); }); return () => { active = false; }; }, [session]);
  return <div className="modal-scrim" onClick={onClose}><section className="pair-dialog" role="dialog" aria-modal="true" aria-labelledby="pair-title" onClick={event => event.stopPropagation()}>
    <button className="icon-button modal-close" aria-label="Close pairing" onClick={onClose}><X size={22}/></button>
    <div className="eyebrow"><Smartphone size={16}/> MEET YOUR NEW CONTROLLER</div>
    <h2 id="pair-title">Connect. Calibrate.<br/><span>Begin your journey.</span></h2>
    <ol className="setup-journey" aria-label="Setup progress"><li data-ready={phoneConnected}>1 · Phone paired</li><li data-ready={tracking}>2 · Movement arriving</li><li data-ready={calibrated && !exercise}>3 · {exercise ? 'Exercise calibration next' : calibrated ? 'Range saved' : 'Calibrate next'}</li></ol>
    <div className="pair-layout"><div className="qr-card">{qr ? <img src={qr} alt="Scan this QR code to pair your phone"/> : <div className="qr-loading">Creating your room…</div>}<span>Scan with your Android camera</span></div>
      <div className="pair-steps"><div><b>01</b><p><strong>Connect your phone</strong><span>Scan the code and open the camera page.</span></p></div><div><b>02</b><p><strong>Make a little room</strong><span>Prop your phone near the TV, facing you.</span></p></div><div><b>03</b><p><strong>Find your frame</strong><span>Start the camera and bring your hands and hips into view.</span></p></div>
      <div className={`pair-readiness ${canContinue ? 'is-ready' : ''}`}>{canContinue ? <Check size={18}/> : <Camera size={18}/>}<span>{tracking ? 'You’re in view. Ready to move.' : canContinue ? 'Camera detected. Step back after clicking.' : phoneConnected ? 'Phone connected. Bring your hands and hips into view.' : 'Waiting for your phone'}</span></div></div>
    </div>
    {session && <div className="manual-pair"><span>Already on the phone page? Enter</span><strong>{session.code}</strong><button className="icon-button" aria-label="Generate a new pairing code" onClick={onRenew}><RefreshCw size={15}/></button></div>}
    {error && <p className="error-note" role="alert">{error}</p>}
    <div className={`hands-free-start ${countdown === null ? 'waiting' : ''}`} role="status"><span>{countdown !== null ? `Continuing in ${countdown}… Stay in view. No click needed.` : hold ? 'You can click Let’s move after the camera sees you, even if you step out of view.' : 'Stand in view for three seconds to continue automatically.'}</span><button className="text-button" onClick={() => setHold(v => !v)}>{hold ? 'Continue hands-free' : 'Keep setup open'}</button></div>
    <div className="pair-bottom"><span><ShieldCheck size={15}/> Video stays on your phone</span><button className="button button-primary" disabled={!canContinue} onClick={onContinue}>Let’s move <ArrowRight size={18}/></button></div>
    <button className="text-button preview-link" onClick={onPreview}><Keyboard size={16}/> Explore a desktop preview first</button>
    <div className="pair-transport"><strong>Wi-Fi QR pairing · No USB required</strong><br/>Keep the phone and game server on the same network. Open the HTTPS link from the QR code; this local demo may show a certificate warning. Camera permission is granted on your phone.<br/><strong>Optional USB demo:</strong> connect your phone and run <code>npm run phone:usb</code> on the computer, then enter the room code above on its localhost page. This avoids Wi-Fi certificate setup.</div>
  </section></div>;
}
