import { useState } from 'react';
import { Check, Plus, UserRound, X } from 'lucide-react';
import { playerStorage } from '../lib/playerStorage';
import RemoteTextField from './RemoteTextField';
import './progress.css';

export default function PlayerProfiles({ onClose, onSelect }: { onClose: () => void; onSelect: () => void }) {
  const [name, setName] = useState(''), [error, setError] = useState(''), [editing, setEditing] = useState(false);
  const roster = playerStorage.roster();
  return <div className="menu-panel-scrim"><section className="menu-panel player-profiles" role="dialog" aria-modal="true" aria-labelledby="players-title" inert={editing}>
    <button className="menu-panel-close" aria-label="Close player profiles" onClick={onClose}><X/></button>
    <span className="menu-eyebrow">A PLACE FOR EVERY SQUIRE</span><h2 id="players-title">Your squires</h2><p>Each squire keeps their own story, gear, camera range and training progress on this device.</p>
    <div className="player-list">{roster.players.map(player => <button data-autofocus={player.id === roster.active || undefined} key={player.id} aria-pressed={player.id === roster.active} onClick={() => { playerStorage.select(player.id); onSelect(); }}><UserRound/><strong>{player.name}</strong>{player.id === roster.active && <Check/>}</button>)}</div>
    {roster.players.length < 6 && <div className="player-create"><label>NEW SQUIRE<RemoteTextField label="New squire name" value={name} maxLength={20} onChange={setName} onEditing={setEditing}/></label><button className="menu-panel-primary" disabled={name.trim().length < 2} onClick={() => { try { playerStorage.add(name); onSelect(); } catch (error) { setError((error as Error).message); } }}><Plus size={18}/> Create squire</button></div>}
    {error && <p role="alert">{error}</p>}
  </section></div>;
}
