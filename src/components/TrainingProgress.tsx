import { CalendarDays, Shield, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { trainingProgress, trainingStats, type TrainingSave } from '../../shared/training';
import './progress.css';

export default function TrainingProgress({ save, name, onClose }: { save: TrainingSave; name: string; onClose: () => void }) {
  const previousFocus = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => {
    document.querySelector<HTMLElement>('.training-progress-dialog [data-autofocus]')?.focus({ preventScroll: true });
    return () => { requestAnimationFrame(() => { const previous = previousFocus.current; if (previous?.isConnected && !previous.closest('[inert]')) previous.focus(); }); };
  }, []);
  const now = new Date(), day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const progress = trainingProgress(save, day), stats = trainingStats(save);
  return <div className="menu-panel-scrim"><section className="menu-panel training-progress-dialog" role="dialog" aria-modal="true" aria-labelledby="progress-title">
    <button data-autofocus className="menu-panel-close" aria-label="Close training progress" onClick={onClose}><X/></button>
    <span className="menu-eyebrow">YOUR PRACTICE BECOMES YOUR STORY</span><h2 id="progress-title">{name}’s progress</h2>
    <div className="progress-rank"><Shield/><strong>{progress.rank}</strong><span>Level {stats.level} · {save.xp} XP</span></div>
    <div className="weekly-oath"><h3><CalendarDays size={18}/> This week’s oath <span>{Math.min(progress.days, progress.goal)} / {progress.goal} days</span></h3><progress aria-label="Weekly training days" value={Math.min(progress.days, progress.goal)} max={progress.goal}/><p>{progress.days >= progress.goal ? 'Your weekly oath is complete. Keep practising at your own pace.' : 'Complete a camera circuit on three separate days this week.'}</p></div>
    <div className="progress-benefits"><p><strong>Story damage +{progress.damagePercent}%</strong><span>Your Strength increases each clean hit.</span></p><p><strong>Stamina recovery +{progress.recoveryPercent}%</strong><span>Your Endurance helps you recover between exchanges.</span></p></div>
    <p>{progress.nextRank ? `${progress.xpToRank} XP to ${progress.nextRank}. ` : 'Your order’s highest rank is earned. '}{progress.xpToNext ? `${progress.xpToNext} XP to your next level.` : 'Maximum training level reached.'} Complete a camera circuit for 60 XP, once per day. Clan duels use equal starter stats.</p>
    <h3>Recent camera training</h3>{progress.recent.length ? <ul className="training-history">{progress.recent.map(log => <li key={log.id}><time>{log.day}</time><strong>{log.reps} reps · {log.sets} sets</strong><span>{log.rewarded ? '+60 XP' : 'Practice'}</span></li>)}</ul> : <p>Finish your first camera circuit to begin your record. Preview practice earns no XP.</p>}
    <button className="menu-panel-primary" onClick={onClose}>Continue the journey</button>
  </section></div>;
}
