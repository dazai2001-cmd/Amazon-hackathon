import { Shield, Swords, Footprints } from 'lucide-react';
import './combat-feedback.css';

export default function CombatFeedback({ kind, age, text }: { kind: string | undefined; age: number; text: string }) {
  if (!kind || kind === 'cut' || age < 0 || age > .8) return null;
  const guard = ['block', 'parry'].includes(kind), evade = kind === 'dodge';
  const label = kind === 'block' ? text.startsWith('Perfect') ? 'PERFECT GUARD' : 'BLOCKED' : kind === 'parry' ? text.includes('broke') ? 'GUARD BROKEN' : 'PARRIED' : evade ? 'EVADED' : kind === 'touch' ? 'HIT LANDED' : 'HIT';
  return <div className={`combat-feedback feedback-${kind}`} role="status">{guard ? <Shield size={22}/> : evade ? <Footprints size={22}/> : <Swords size={22}/>}<strong>{label}</strong></div>;
}
