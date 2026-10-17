import { DEFAULT_SETTINGS, type UserSettings } from '../app/SettingsStore';
import { EFFECT_FILES, type SoundCue } from './cues';

/** Owns browser audio only. Audio failures never affect game loading or rules. */
export class GameAudio {
  private context: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private effectGain: GainNode | null = null;
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly voices = new Set<AudioBufferSourceNode>();
  private music: AudioBufferSourceNode | null = null;
  private musicOffset = 0;
  private musicStartedAt = 0;
  private settings: UserSettings = DEFAULT_SETTINGS;
  private paused = false;
  private destroyed = false;
  private readonly requests = new AbortController();

  constructor(private readonly shell: HTMLElement) {
    shell.addEventListener('pointerdown', this.onGesture, true);
    shell.addEventListener('keydown', this.onGesture, true);
    shell.addEventListener('click', this.onClick, true);
  }

  configure(settings: UserSettings, paused: boolean): void {
    this.settings = settings;
    this.paused = paused;
    if (paused || !settings.soundEnabled) this.stopEffects();
    if (!paused && this.context?.state === 'suspended') void this.context.resume().catch(() => {});
    this.syncMusic();
  }

  play(cue: SoundCue): void {
    const buffer = this.buffers.get(cue);
    if (this.destroyed || this.paused || !this.settings.soundEnabled || !buffer
      || !this.context || this.context.state !== 'running' || !this.effectGain) return;
    // Bound overlap during fast UI interaction; never accumulate an unbounded sound queue.
    if (this.voices.size >= 6) {
      const oldest = this.voices.values().next().value;
      if (oldest) { this.voices.delete(oldest); oldest.stop(); }
    }
    const voice = this.context.createBufferSource();
    voice.buffer = buffer;
    voice.connect(this.effectGain);
    this.voices.add(voice);
    voice.onended = () => { this.voices.delete(voice); voice.disconnect(); };
    voice.start();
  }

  destroy(): void {
    this.destroyed = true;
    this.shell.removeEventListener('pointerdown', this.onGesture, true);
    this.shell.removeEventListener('keydown', this.onGesture, true);
    this.shell.removeEventListener('click', this.onClick, true);
    this.requests.abort();
    this.stopEffects();
    this.stopMusic();
    this.buffers.clear();
    if (this.context) void this.context.close().catch(() => {});
  }

  private readonly onGesture = (event: Event): void => {
    if (event instanceof KeyboardEvent && (event.repeat || event.ctrlKey || event.metaKey || event.altKey)) return;
    if (this.destroyed) return;
    if (!this.context) {
      try {
        this.context = new AudioContext();
        this.musicGain = this.context.createGain();
        this.musicGain.gain.value = 0.16;
        this.musicGain.connect(this.context.destination);
        this.effectGain = this.context.createGain();
        this.effectGain.gain.value = 0.45;
        this.effectGain.connect(this.context.destination);
        // Resume directly inside the gesture for mobile autoplay policies.
        void this.context.resume().catch(() => {});
        void this.load('music', 'music.mp3');
        for (const [cue, file] of Object.entries(EFFECT_FILES)) void this.load(cue, file);
      } catch { return; }
    } else {
      void this.context.resume().then(() => this.syncMusic()).catch(() => {});
    }
  };

  private readonly onClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button');
    if (button && !button.disabled && !button.dataset.touch) this.play('click');
  };

  private async load(key: string, file: string): Promise<void> {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}audio/${file}`, { signal: this.requests.signal });
      if (!response.ok || !this.context) return;
      const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
      if (this.destroyed) return;
      this.buffers.set(key, buffer);
      if (key === 'music') this.syncMusic();
    } catch { /* Missing assets or unsupported audio must not interrupt gameplay. */ }
  }

  private syncMusic(): void {
    if (this.destroyed || this.paused || !this.settings.musicEnabled) { this.stopMusic(); return; }
    const buffer = this.buffers.get('music');
    if (this.music || !this.context || !this.musicGain || !buffer) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.musicGain);
    this.musicStartedAt = this.context.currentTime;
    source.start(0, this.musicOffset % buffer.duration);
    this.music = source;
  }

  private stopMusic(): void {
    if (!this.music || !this.context) return;
    const duration = this.music.buffer?.duration ?? 1;
    this.musicOffset = (this.musicOffset + this.context.currentTime - this.musicStartedAt) % duration;
    this.music.stop();
    this.music.disconnect();
    this.music = null;
  }

  private stopEffects(): void {
    for (const voice of this.voices) { voice.stop(); voice.disconnect(); }
    this.voices.clear();
  }
}
