export type AudioMix = { voice: number; music: number; effects: number };
export type VoiceState = 'idle' | 'loading' | 'playing' | 'paused' | 'blocked' | 'unavailable';
type Asset = { url: string; duration: number };
type Manifest = { voices: Record<string, Asset>; sounds: Record<string, Asset> };

// Finished audio files play on the TV itself. There is no speech API or model
// inference at runtime, and only one character can speak at a time.
export class ChapterAudio {
  private manifest: Promise<Manifest>;
  private enabled = false;
  private paused = false;
  private disposed = false;
  private epoch = 0;
  private voice: HTMLAudioElement | null = null;
  private voiceListener: ((state: VoiceState) => void) | null = null;
  private music: HTMLAudioElement | null = null;
  private ambience: HTMLAudioElement | null = null;
  private musicName = '';
  private ambienceName = '';
  private shots = new Set<HTMLAudioElement>();
  private mix: AudioMix = { voice: 1, music: .32, effects: .75 };
  private speaking = false;

  constructor() {
    this.manifest = fetch('/assets/medieval/audio/manifest.json').then(async response => {
      if (!response.ok) throw new Error('Chapter audio is unavailable.');
      return await response.json() as Manifest;
    });
    // Attach a rejection handler immediately; callers still receive the error.
    void this.manifest.catch(() => undefined);
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) { this.stopVoice(); this.music?.pause(); this.ambience?.pause(); for (const audio of this.shots) audio.pause(); }
    else if (!this.paused) { this.safePlay(this.music); this.safePlay(this.ambience); }
  }
  setMix(mix: AudioMix) {
    this.mix = mix;
    if (this.voice) this.voice.volume = mix.voice;
    if (this.ambience) this.ambience.volume = mix.effects * .19;
    for (const shot of this.shots) shot.volume = mix.effects * .65;
    this.duck();
  }
  setPaused(paused: boolean) {
    if (paused === this.paused) return;
    this.paused = paused;
    if (paused) {
      this.music?.pause(); this.ambience?.pause(); this.voice?.pause(); for (const audio of this.shots) audio.pause();
      if (this.voice) this.voiceListener?.('paused');
    } else if (this.enabled) {
      this.safePlay(this.music); this.safePlay(this.ambience);
      if (this.voice) this.safePlay(this.voice, () => this.voiceListener?.('playing'));
    }
  }
  private safePlay(audio: HTMLAudioElement | null, onStart?: () => void) {
    if (!audio || !this.enabled || this.paused || this.disposed) return;
    void audio.play().then(onStart).catch(() => { if (audio === this.voice) this.voiceListener?.('blocked'); });
  }
  private duck() { if (this.music) this.music.volume = this.mix.music * (this.speaking ? .13 : .4); }
  async setScene(musicName: string, ambienceName: string) {
    try {
      const manifest = await this.manifest;
      if (this.disposed) return;
      if (musicName !== this.musicName) {
        this.music?.pause(); this.musicName = musicName;
        this.music = new Audio(manifest.sounds[musicName]?.url);
        this.music.loop = true; this.duck(); this.safePlay(this.music);
      }
      if (ambienceName !== this.ambienceName) {
        this.ambience?.pause(); this.ambienceName = ambienceName;
        this.ambience = new Audio(manifest.sounds[ambienceName]?.url);
        this.ambience.loop = true; this.ambience.volume = this.mix.effects * .19; this.safePlay(this.ambience);
      }
    } catch { /* Subtitles and gameplay continue if the sound pack is missing. */ }
  }
  async speak(id: string, onEnd: () => void, onState: (state: VoiceState) => void) {
    this.stopVoice(); const epoch = this.epoch;
    this.voiceListener = onState;
    if (!this.enabled) { onState('idle'); return; }
    onState('loading');
    try {
      const asset = (await this.manifest).voices[id];
      if (!asset) throw new Error(`Missing voice ${id}`);
      if (epoch !== this.epoch || this.disposed || !this.enabled) return;
      const audio = new Audio(asset.url); this.voice = audio;
      audio.preload = 'auto'; audio.volume = this.mix.voice;
      this.speaking = true; this.duck();
      audio.onended = () => {
        if (epoch !== this.epoch) return;
        this.voice = null; this.speaking = false; this.duck(); onState('idle'); onEnd();
      };
      audio.onerror = () => { if (epoch === this.epoch) { this.speaking = false; this.duck(); onState('unavailable'); } };
      if (this.paused) { onState('paused'); return; }
      await audio.play();
      if (epoch === this.epoch) onState('playing');
    } catch (error) {
      if (epoch === this.epoch) {
        this.speaking = false; this.duck();
        onState(this.paused ? 'paused' : !this.enabled ? 'idle' : error instanceof DOMException && error.name === 'NotAllowedError' ? 'blocked' : 'unavailable');
      }
    }
  }
  stopVoice() {
    this.epoch++; this.voice?.pause();
    if (this.voice) { this.voice.onended = null; this.voice.onerror = null; this.voice.removeAttribute('src'); this.voice.load(); }
    this.voice = null; this.speaking = false; this.duck();
  }
  async effect(name: string) {
    if (!this.enabled || this.paused || this.disposed) return;
    try {
      const asset = (await this.manifest).sounds[name];
      if (!asset || !this.enabled || this.paused || this.disposed) return;
      const audio = new Audio(asset.url); audio.volume = this.mix.effects * .65; this.shots.add(audio);
      const clear = () => { this.shots.delete(audio); audio.onended = null; audio.onerror = null; };
      audio.onended = clear; audio.onerror = clear;
      await audio.play().catch(clear);
    } catch { /* Combat feedback also remains visible. */ }
  }
  getVoiceTime() { return this.voice?.currentTime || 0; }
  close() {
    this.disposed = true; this.stopVoice(); this.music?.pause(); this.ambience?.pause();
    for (const audio of this.shots) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    this.shots.clear(); this.music = null; this.ambience = null;
  }
}
