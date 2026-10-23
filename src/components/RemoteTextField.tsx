import { useEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { moveFocus } from '../lib/remote';
import './remote-keyboard.css';

/** Select opens a D-pad keyboard; desktop users can still type into the field. */
export default function RemoteTextField({ label, value, onChange, onEditing, maxLength, placeholder, code = false, numeric = false }: {
  label: string; value: string; onChange: (value: string) => void; onEditing: (open: boolean) => void; maxLength: number; placeholder?: string; code?: boolean; numeric?: boolean;
}) {
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(''), [caps, setCaps] = useState(true);
  const field = useRef<HTMLInputElement>(null), keyboard = useRef<HTMLElement>(null);
  const normalize = (text: string) => (numeric ? text.replace(/\D/g, '') : code ? text.toUpperCase().replace(/[^A-Z0-9]/g, '') : text).slice(0, maxLength);
  const close = () => {
    // Restore the field before the next remote press, even for rapid presses.
    flushSync(() => { onEditing(false); setOpen(false); });
    field.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!open) return;
    const down = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
      else if (event.key.startsWith('Arrow')) { event.preventDefault(); event.stopImmediatePropagation(); moveFocus(event.key); }
      else if (event.key === 'Enter') { event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat) (document.activeElement as HTMLElement)?.click(); }
      else if (event.key === ' ') { event.preventDefault(); event.stopImmediatePropagation(); }
      else if (event.key === 'Backspace') { event.preventDefault(); event.stopImmediatePropagation(); setDraft(v => v.slice(0, -1)); }
      else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); event.stopImmediatePropagation(); setDraft(v => normalize(v + event.key)); }
    };
    window.addEventListener('keydown', down, true);
    return () => { window.removeEventListener('keydown', down, true); };
  }, [open, code, numeric, maxLength]);
  const letters = numeric ? '0123456789' : (caps || code ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : 'abcdefghijklmnopqrstuvwxyz') + '0123456789';
  return <><input ref={field} aria-label={label} value={value} maxLength={maxLength} placeholder={placeholder}
    onChange={event => onChange(normalize(event.target.value))}
    onKeyDown={event => {
      if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); if (!event.repeat) { setDraft(value); setCaps(true); onEditing(true); setOpen(true); } }
      else if (event.key.startsWith('Arrow')) { event.preventDefault(); event.stopPropagation(); moveFocus(event.key); }
    }}/>{open && createPortal(<div className="remote-keyboard-scrim"><section ref={keyboard} className="remote-keyboard" data-remote-keyboard role="dialog" aria-modal="true" aria-label={`Edit ${label.toLowerCase()}`}>
      <span className="menu-eyebrow">REMOTE TEXT ENTRY</span><h2>{label}</h2><output aria-live="polite">{draft || <span>Choose letters below</span>}</output><small>{draft.length} / {maxLength}</small>
      <div className="remote-key-grid">{[...letters].map((letter, i) => <button key={i} autoFocus={!value && i === 0} aria-label={`Type ${letter}`} onClick={() => setDraft(v => normalize(v + letter))}>{letter}</button>)}</div>
      <div className="remote-key-tools">{!code && <><button aria-pressed={caps} onClick={() => setCaps(v => !v)}>Aa</button><button onClick={() => setDraft(v => normalize(v + ' '))}>Space</button></>}<button onClick={() => setDraft(v => v.slice(0, -1))}>Delete</button><button autoFocus={Boolean(value)} onClick={() => setDraft('')}>Clear</button></div>
      <footer><p>D-pad: move · Select: type · Back: cancel</p><button onClick={close}>Cancel</button><button className="remote-key-done" onClick={() => { onChange(normalize(draft)); close(); }}>Done</button></footer>
    </section></div>, document.body)}</>;
}
