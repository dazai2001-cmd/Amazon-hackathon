export class GameAudio {
  private context: AudioContext | null = null;
  unlock() { try { this.context ??= new AudioContext(); void this.context.resume(); } catch { /* Visual feedback works without audio. */ } }
  play(kind: 'slice' | 'block' | 'hit') {
    const ctx = this.context; if (!ctx || ctx.state !== 'running') return;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain(), time = ctx.currentTime;
    oscillator.type = kind === 'slice' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(kind === 'slice' ? 750 : kind === 'block' ? 420 : 170, time);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'slice' ? 1100 : kind === 'block' ? 700 : 85, time + 0.13);
    gain.gain.setValueAtTime(0.0001, time); gain.gain.exponentialRampToValueAtTime(0.07, time + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(time); oscillator.stop(time + 0.17);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  close() { void this.context?.close(); }
}
