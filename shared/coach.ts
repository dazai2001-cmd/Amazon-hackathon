import { type Motion } from './motion';

export type CoachSnapshot = { phase: 'reach' | 'hold' | 'lower' | 'complete'; reps: number; goal: number; progress: number; cue: string; practice: boolean; steadyReps: number; lastHold: number; samples: number; asymmetricSamples: number; startedAt: number | null; completedAt: number | null };

export class ReachCoach {
  state: CoachSnapshot;
  private holdStart: number | null = null;
  private lowerStart: number | null = null;
  private previousTime: number | null = null;
  private streakAsymmetric = 0;
  constructor(public reachTarget = 0.8, goal = 5) {
    this.state = { phase: 'reach', reps: 0, goal, progress: 0, cue: 'Raise both hands to your comfortable target.', practice: false, steadyReps: 0, lastHold: 0, samples: 0, asymmetricSamples: 0, startedAt: null, completedAt: null };
  }
  update(motion: Motion, now: number) {
    const s = this.state;
    if (s.phase === 'complete') return s;
    if (!motion.tracked) { this.holdStart = null; this.lowerStart = null; this.previousTime = null; this.streakAsymmetric = 0; s.progress = 0; s.cue = 'Bring your shoulders, hands, and hips into view.'; if (s.phase === 'hold') s.phase = 'reach'; return s; }
    // Re-rendering the same camera packet must not add samples or holding time.
    if (this.previousTime !== null && now <= this.previousTime) return s;
    // A tracking gap must never count as time spent holding a pose.
    if (this.previousTime !== null && now - this.previousTime > 350) { this.holdStart = null; this.lowerStart = null; if (s.phase === 'hold') s.phase = 'reach'; }
    const dt = this.previousTime === null ? 0 : Math.min(now - this.previousTime, 150);
    this.previousTime = now;
    s.startedAt ??= now;
    s.samples++;
    const bothUp = Math.min(motion.leftReach, motion.rightReach) >= this.reachTarget;
    const uneven = motion.symmetry > 0.4;
    if (uneven) { s.asymmetricSamples++; this.streakAsymmetric += dt; } else this.streakAsymmetric = 0;
    if (this.streakAsymmetric > 1100 && s.phase !== 'lower') {
      s.practice = true; s.cue = 'Practice cue: let both hands arrive together.';
      this.holdStart = null; s.progress = 0; s.phase = 'reach'; return s;
    }
    if (s.phase === 'reach') {
      s.cue = s.practice ? 'Try again slowly, moving both hands together.' : 'Raise both hands to your comfortable target.';
      s.progress = 0;
      if (bothUp && !uneven) { s.phase = 'hold'; this.holdStart = now; }
    } else if (s.phase === 'hold') {
      if (!bothUp || uneven) { s.phase = 'reach'; this.holdStart = null; s.progress = 0; s.cue = 'Reset, then reach together.'; }
      else {
        this.holdStart ??= now;
        s.progress = Math.min(1, (now - this.holdStart) / 2000);
        s.cue = s.progress > 0.65 ? 'Almost there. Keep your own comfortable position.' : 'Hold your reach for two seconds.';
        if (s.progress >= 1) { s.lastHold = (now - this.holdStart) / 1000; s.phase = 'lower'; s.cue = 'Lower both hands to reset.'; this.lowerStart = null; }
      }
    } else if (s.phase === 'lower') {
      s.cue = 'Lower both hands to reset.';
      const bothDown = Math.max(motion.leftReach, motion.rightReach) < Math.min(0, this.reachTarget - 0.3);
      if (!bothDown) this.lowerStart = null;
      else {
        this.lowerStart ??= now;
        if (now - this.lowerStart >= 400) {
          s.reps++; s.steadyReps++; s.practice = false; s.progress = 0; this.holdStart = null;
          if (s.reps >= s.goal) { s.phase = 'complete'; s.completedAt = now; s.cue = 'Session complete. See how your movement changed.'; }
          else { s.phase = 'reach'; s.cue = 'That was a steady reach. Ready for the next one?'; }
        }
      }
    }
    return s;
  }
}
