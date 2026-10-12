import { BookOpen, ChevronRight, Dumbbell, Flag, Keyboard, Settings2, Shield, Smartphone, Swords, Volume2, VolumeX } from 'lucide-react';
import { questText, type StoryProgress } from '../../shared/chapter';
import { trainingStats, type TrainingSave } from '../../shared/training';
import './main-menu.css';

type Props = { progress: StoryProgress; training: TrainingSave; preview: boolean; connected: boolean; tracking: boolean; sound: boolean;
  onStory: () => void; onTraining: () => void; onClans: () => void; onSetup: () => void; onSettings: () => void; onGuide: () => void; onToggleSound: () => void };
export default function MainMenu({ progress, training, preview, connected, tracking, sound, onStory, onTraining, onClans, onSetup, onSettings, onGuide, onToggleSound }: Props) {
  const stats = trainingStats(training);
  return <main className="ashen-main-menu" aria-label="The Ashen Gate main menu">
    <div className="menu-background" aria-hidden="true"/>
    <header className="menu-header"><span><Shield size={23}/> THE ASHEN GATE</span><div><button className={`menu-controller-status ${tracking && !preview ? 'connected' : ''}`} onClick={onSetup}>{preview ? <Keyboard size={16}/> : <Smartphone size={16}/>} {preview ? 'Desktop preview · Camera off' : tracking ? 'Movement connected' : connected ? 'Phone connected' : 'Connect your controller'}<ChevronRight size={14}/></button><button className="menu-sound" aria-label={sound ? 'Turn sound off' : 'Turn sound on'} onClick={onToggleSound}>{sound ? <Volume2 size={19}/> : <VolumeX size={19}/>}</button></div></header>
    <div className="menu-layout"><section className="menu-introduction"><span className="menu-eyebrow">A SQUIRE’S JOURNEY</span><svg className="menu-crest" viewBox="0 0 48 58" fill="none" aria-hidden="true"><path d="M5 5H43V31Q39 44 24 53Q9 44 5 31Z"/><path d="M24 15V40M24 30L15 22M24 26L34 17"/></svg><h1>The Ashen<br/><em>Gate</em></h1><p>A blade to master.<br/>An order to rebuild.<br/>A body that grows with the journey.</p><div className="menu-chapter"><span>CHAPTER I</span><strong>The gate that stayed shut</strong><small>Voiced story · Sword & shield · Live clan duels</small></div><div className="menu-squire"><span><Shield size={16}/> SQUIRE LEVEL <b>{stats.level}</b></span><span>{training.xp} TRAINING XP</span></div></section>
    <nav className="menu-options" aria-label="Game modes"><span className="menu-eyebrow">CHOOSE YOUR PATH</span>
      <button data-autofocus className="menu-mode menu-story" onClick={onStory}><span className="menu-mode-icon"><Swords size={26}/></span><span><strong>Story</strong><small>{progress.memorySeen ? `Continue · ${questText[progress.quest].title}` : 'Begin Chapter I · Meet Sir Alden'}</small></span><ChevronRight size={20}/></button>
      <button className="menu-mode" onClick={onTraining}><span className="menu-mode-icon"><Dumbbell size={25}/></span><span><strong>Training</strong><small>Alden’s routines · Form, reps & sets</small></span><ChevronRight size={20}/></button>
      <button className="menu-mode" onClick={onClans}><span className="menu-mode-icon"><Flag size={25}/></span><span><strong>Clan Wars</strong><small>Live multiplayer · Fight for your order</small></span><ChevronRight size={20}/></button>
      <div className="menu-utilities"><button onClick={onSetup}><Smartphone size={18}/><span>Controller Setup</span><ChevronRight size={15}/></button><button onClick={onSettings}><Settings2 size={18}/><span>Settings</span><ChevronRight size={15}/></button><button onClick={onGuide}><BookOpen size={18}/><span>Player Guide</span><ChevronRight size={15}/></button></div>
    </nav></div>
    <footer className="menu-footer"><span>YOUR BODY. YOUR BLADE. YOUR JOURNEY.</span><span>D-pad to browse · Select to choose</span><span><Shield size={12}/> Camera video stays on your phone</span></footer>
  </main>;
}
