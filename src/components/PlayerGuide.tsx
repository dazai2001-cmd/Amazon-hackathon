import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Dumbbell, Flag, Keyboard, Shield, Smartphone, Swords, X } from 'lucide-react';
import { guidePages, type GuideTopic } from '../lib/playerGuide';
import { focusScope, moveFocus } from '../lib/remote';
import './player-guide.css';

type Props = { topic: GuideTopic; preview: boolean; phoneConnected: boolean; tracking: boolean; calibrated: boolean; liveDuel: boolean; onClose: () => void; onPair: () => void };
const icons = [Smartphone, Swords, BookOpen, Dumbbell, Flag];
function GuideIllustration({ topic }: { topic: GuideTopic }) {
  if (topic === 'clans') return <div className="guide-war-art" aria-hidden="true"><div><Shield/><span>YOUR CLAN</span><i>01</i><i>02</i><i>03</i></div><b>VS<span>LIVE DUELS</span></b><div><Swords/><span>RIVAL CLAN</span><i>01</i><i>02</i><i>03</i></div><p>ONE DUEL. ONE CLAN POINT.</p></div>;
  if (topic === 'story') return <div className="guide-mentor-art" aria-hidden="true"><img src="/assets/medieval/characters/instructor.png" alt=""/><span>ALDEN → MARA → THE GATE</span></div>;
  return <svg className={`guide-motion-art guide-art-${topic}`} viewBox="0 0 360 280" fill="none" aria-hidden="true">
    <ellipse cx="187" cy="244" rx="104" ry="10" fill="#d7ba7b" opacity=".08"/>
    {topic === 'setup' && <><rect x="58" y="26" width="248" height="213" rx="10" stroke="#758a80" strokeDasharray="6 8"/><rect x="13" y="88" width="33" height="70" rx="6" stroke="#dbc089" strokeWidth="3"/><circle cx="29" cy="99" r="3" fill="#dbc089"/><path d="m48 123 27-19m-27 19 27 19" stroke="#dbc089"/><text x="180" y="267" textAnchor="middle">KEEP YOUR HANDS AND HIPS IN VIEW</text></>}
    {topic !== 'training' ? <g stroke="#d6dccc" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"><circle cx="181" cy="68" r="18"/><path d="m169 98-20 17-42-29m91 12 19 32 49-20m-95-10-4 64h39l-8-64m-31 64-19 68m58-68 22 68"/></g> : <g stroke="#d6dccc" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"><circle cx="188" cy="75" r="18"/><path d="m176 105-22 48 47 31-49 48m35-127 35 29 39 1"/><path d="m139 162 31 22-31 48" opacity=".3"/></g>}
    {topic === 'combat' && <><path d="m262 118 46-59m-57 52 21 15" stroke="#ddc58f" strokeWidth="6" strokeLinecap="round"/><path d="m100 70-26 9v36l26 15 26-15V79Z" fill="#697f68" stroke="#d6bf8a" strokeWidth="2"/><path d="m281 40 43 59" stroke="#d6bf8a" strokeDasharray="4 6"/><text x="82" y="166">LEFT: GUARD</text><text x="236" y="166">RIGHT: CUT</text><text x="180" y="266" textAnchor="middle">LEAN · CROUCH · STEP</text></>}
    {topic === 'training' && <><path d="M296 76v113m-7-10 7 10 7-10" stroke="#ddc58f" strokeWidth="3"/><text x="180" y="266" textAnchor="middle">START → LOWER → RETURN</text><path d="M30 96h22v46H30Z" stroke="#d6bf8a" strokeWidth="3"/><path d="m54 119 56 25" stroke="#758a80" strokeDasharray="4 5"/></>}
  </svg>;
}

export default function PlayerGuide({ topic, preview, phoneConnected, tracking, calibrated, liveDuel, onClose, onPair }: Props) {
  const [page, setPage] = useState(() => Math.max(0, guidePages.findIndex(p => p.topic === topic)));
  const close = useRef(onClose), previousFocus = useRef(document.activeElement as HTMLElement | null);
  close.current = onClose;
  const item = guidePages[page], Icon = icons[page];
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Backspace') { event.preventDefault(); event.stopImmediatePropagation(); close.current(); }
      else if (event.key.startsWith('Arrow')) { event.preventDefault(); event.stopImmediatePropagation(); moveFocus(event.key); }
      else if (event.key === 'Enter') { event.preventDefault(); event.stopImmediatePropagation(); (document.activeElement as HTMLButtonElement)?.click(); }
      else if (event.key === 'Tab') {
        const buttons = [...focusScope().querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      } else if (event.key === ' ' && (document.activeElement as HTMLElement)?.tagName !== 'BUTTON') event.preventDefault();
    };
    window.addEventListener('keydown', down, true);
    return () => { window.removeEventListener('keydown', down, true); requestAnimationFrame(() => { const prior = previousFocus.current; if (prior?.isConnected && !prior.closest('[aria-hidden="true"]')) prior.focus({ preventScroll: true }); }); };
  }, []);
  useEffect(() => {
    const id = requestAnimationFrame(() => document.querySelector<HTMLElement>('.player-guide [data-guide-next]')?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [page]);
  return <div className="player-guide-scrim"><section className="player-guide" role="dialog" aria-modal="true" aria-labelledby="guide-title" data-guide-topic={item.topic}>
    <header><span><BookOpen size={18}/> THE SQUIRE’S FIELD GUIDE</span><button aria-label="Close player guide" onClick={onClose}><X size={22}/></button></header>
    <nav aria-label="Tutorial chapters">{guidePages.map((p, i) => { const TabIcon = icons[i]; return <button key={p.topic} aria-current={i === page ? 'step' : undefined} onClick={() => setPage(i)}><TabIcon size={17}/><span>{p.label}</span></button>; })}</nav>
    {liveDuel && <p className="guide-duel-warning" role="status">Your pairing is paused. Return within 30 seconds to avoid forfeiting.</p>}
    <div className="guide-body"><aside><GuideIllustration topic={item.topic}/><div className="guide-checklist"><span>{preview ? <Keyboard size={16}/> : <Smartphone size={16}/>} {preview ? 'Desktop preview · Camera off' : 'YOUR CONTROLLER'}</span>{(preview ? [[true, 'Simulated movements'], [true, 'Exercise XP disabled']] : [[phoneConnected, phoneConnected ? 'Phone connected' : 'Phone: waiting to connect'], [tracking, tracking ? 'Body in view' : 'Body: waiting for camera view'], [calibrated, calibrated ? 'Movement calibrated' : 'Calibration: not set yet']]).map(([ok, label]) => <div key={String(label)}><i className={ok ? 'ready' : ''}>{ok && <Check size={11}/>}</i>{label}</div>)}</div></aside>
      <article aria-live="polite"><span className="guide-kicker">LESSON {String(page + 1).padStart(2, '0')} / 05 <Icon size={16}/></span><h1 id="guide-title">{item.title}</h1><p className="guide-summary">{item.summary}</p><ol>{item.steps.map(([title, detail], i) => <li key={title}><span>0{i + 1}</span><div><h2>{title}</h2><p>{detail}</p></div></li>)}</ol><p className="guide-note">{item.note}</p>
      {item.topic === 'combat' && preview && <div className="guide-keyboard"><Keyboard size={17}/><span><b>J / K / L</b> cut · <b>Shift + Z / X / C</b> guard<br/><b>A / D</b> lean · <b>V</b> crouch · <b>W / S</b> duel footwork</span></div>}
      {item.topic === 'training' && preview && <p className="guide-keyboard"><Keyboard size={17}/> Hold B to lower; release B to return. Follow the same calibration prompts.</p>}
      {item.topic === 'setup' && !phoneConnected && <button className="guide-action" onClick={onPair}><Smartphone size={16}/> Connect my Android phone <ArrowRight size={16}/></button>}
      </article></div>
    <footer><span>D-pad: browse · Select: choose · Back: close{liveDuel ? ' · Return within 30 seconds.' : ' · Your story and exercise counting wait here.'}</span><div><button className="guide-back" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ArrowLeft size={16}/> Previous</button><button data-guide-next className="guide-next" onClick={() => page === guidePages.length - 1 ? onClose() : setPage(p => p + 1)}>{page === guidePages.length - 1 ? 'Return to game' : 'Next lesson'}{page === guidePages.length - 1 ? <Check size={17}/> : <ArrowRight size={17}/>}</button></div></footer>
  </section></div>;
}
