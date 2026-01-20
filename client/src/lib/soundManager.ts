export type SoundName = 
  | 'footstepA'
  | 'footstepB'
  | 'itemPickup'
  | 'stoneCarve'
  | 'dialogueAdvance'
  | 'buttonClick'
  | 'choiceSelect'
  | 'quizCorrect'
  | 'quizWrong'
  | 'celebration'
  | 'brawl'
  | 'ambientVillage'
  | 'rain'
  | 'thunder'
  | 'roofHammer';

interface SoundConfig {
  src: string;
  volume: number;
  loop: boolean;
}

const SOUND_CONFIGS: Record<SoundName, SoundConfig> = {
  footstepA: { src: '/sounds/footstep_a.mp3', volume: 0.3, loop: false },
  footstepB: { src: '/sounds/footstep_b.mp3', volume: 0.3, loop: false },
  itemPickup: { src: '/sounds/item-pickup.mp3', volume: 0.5, loop: false },
  stoneCarve: { src: '/sounds/stone-carve.mp3', volume: 0.4, loop: false },
  dialogueAdvance: { src: '/sounds/dialogue-advance.mp3', volume: 0.3, loop: false },
  buttonClick: { src: '/sounds/button-click.mp3', volume: 0.4, loop: false },
  choiceSelect: { src: '/sounds/choice-select.mp3', volume: 0.4, loop: false },
  quizCorrect: { src: '/sounds/quiz-correct.mp3', volume: 0.5, loop: false },
  quizWrong: { src: '/sounds/quiz-wrong.mp3', volume: 0.5, loop: false },
  celebration: { src: '/sounds/celebration.mp3', volume: 0.6, loop: false },
  brawl: { src: '/sounds/brawl.mp3', volume: 0.5, loop: false },
  ambientVillage: { src: '/sounds/ambient-village.mp3', volume: 0.2, loop: true },
  rain: { src: '/sounds/rain.mp3', volume: 0.4, loop: true },
  thunder: { src: '/sounds/thunder.mp3', volume: 0.6, loop: false },
  roofHammer: { src: '/sounds/roof-hammer.mp3', volume: 0.4, loop: false },
};

export class SoundManager {
  private sounds: Map<SoundName, HTMLAudioElement> = new Map();
  private muted: boolean = false;
  private masterVolume: number = 1.0;
  private initialized: boolean = false;
  private pendingPlays: Set<SoundName> = new Set();
  private fadeIntervals: Map<SoundName, NodeJS.Timeout> = new Map();
  private footstepToggle: boolean = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('villageLedger_soundSettings');
      if (stored) {
        const settings = JSON.parse(stored);
        this.muted = settings.muted ?? false;
        this.masterVolume = settings.masterVolume ?? 1.0;
      }
    } catch {
      // Use defaults
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('villageLedger_soundSettings', JSON.stringify({
        muted: this.muted,
        masterVolume: this.masterVolume,
      }));
    } catch {
      // Ignore storage errors
    }
  }

  public init(): void {
    if (this.initialized) return;
    
    for (const [name, config] of Object.entries(SOUND_CONFIGS)) {
      const audio = new Audio();
      audio.src = config.src;
      audio.loop = config.loop;
      audio.volume = config.volume * this.masterVolume;
      audio.preload = 'auto';
      
      audio.addEventListener('error', () => {
        console.warn(`Sound not found: ${config.src} - will use placeholder`);
      });
      
      this.sounds.set(name as SoundName, audio);
    }
    
    this.initialized = true;
    
    Array.from(this.pendingPlays).forEach(name => {
      this.play(name);
    });
    this.pendingPlays.clear();
  }

  public play(name: SoundName): void {
    if (this.muted) return;
    
    if (!this.initialized) {
      this.pendingPlays.add(name);
      return;
    }
    
    const audio = this.sounds.get(name);
    if (!audio) return;
    
    const config = SOUND_CONFIGS[name];
    
    if (!config.loop) {
      audio.currentTime = 0;
    }
    
    audio.volume = config.volume * this.masterVolume;
    audio.play().catch(() => {
      // Autoplay blocked - will work after user interaction
    });
  }

  public playFootstep(): void {
    const soundName = this.footstepToggle ? 'footstepB' : 'footstepA';
    this.footstepToggle = !this.footstepToggle;
    this.play(soundName);
  }

  public stop(name: SoundName): void {
    const audio = this.sounds.get(name);
    if (!audio) return;
    
    audio.pause();
    audio.currentTime = 0;
  }

  public pause(name: SoundName): void {
    const audio = this.sounds.get(name);
    if (!audio) return;
    
    audio.pause();
  }

  public resume(name: SoundName): void {
    if (this.muted) return;
    
    const audio = this.sounds.get(name);
    if (!audio) return;
    
    audio.play().catch(() => {});
  }

  private durationTimeouts: Map<SoundName, NodeJS.Timeout> = new Map();

  private clearDurationTimeout(name: SoundName): void {
    const existing = this.durationTimeouts.get(name);
    if (existing) {
      clearTimeout(existing);
      this.durationTimeouts.delete(name);
    }
  }

  public playForDuration(name: SoundName, durationMs: number): void {
    if (this.muted) return;
    
    this.clearDurationTimeout(name);
    this.play(name);
    
    const timeout = setTimeout(() => {
      this.stop(name);
      this.durationTimeouts.delete(name);
    }, durationMs);
    this.durationTimeouts.set(name, timeout);
  }

  public playLoop(name: SoundName): void {
    if (this.muted) return;
    
    if (!this.initialized) {
      this.pendingPlays.add(name);
      return;
    }
    
    const audio = this.sounds.get(name);
    if (!audio) return;
    
    audio.loop = true;
    audio.currentTime = 0;
    const config = SOUND_CONFIGS[name];
    audio.volume = config.volume * this.masterVolume;
    audio.play().catch(() => {});
  }

  public stopLoop(name: SoundName): void {
    const audio = this.sounds.get(name);
    if (!audio) return;
    
    audio.loop = false;
    audio.pause();
    audio.currentTime = 0;
  }

  private clearFadeInterval(name: SoundName): void {
    const existing = this.fadeIntervals.get(name);
    if (existing) {
      clearInterval(existing);
      this.fadeIntervals.delete(name);
    }
  }

  public fadeOut(name: SoundName, duration: number = 1000): void {
    const audio = this.sounds.get(name);
    if (!audio) return;
    
    this.clearFadeInterval(name);
    
    const startVolume = audio.volume;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = startVolume / steps;
    
    let step = 0;
    const interval = setInterval(() => {
      step++;
      audio.volume = Math.max(0, startVolume - (volumeStep * step));
      
      if (step >= steps) {
        this.clearFadeInterval(name);
        audio.pause();
        audio.currentTime = 0;
        const config = SOUND_CONFIGS[name];
        audio.volume = config.volume * this.masterVolume;
      }
    }, stepDuration);
    this.fadeIntervals.set(name, interval);
  }

  public fadeIn(name: SoundName, duration: number = 1000): void {
    if (this.muted) return;
    
    const audio = this.sounds.get(name);
    if (!audio) return;
    
    this.clearFadeInterval(name);
    
    const config = SOUND_CONFIGS[name];
    const targetVolume = config.volume * this.masterVolume;
    
    audio.volume = 0;
    audio.play().catch(() => {});
    
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = targetVolume / steps;
    
    let step = 0;
    const interval = setInterval(() => {
      step++;
      audio.volume = Math.min(targetVolume, volumeStep * step);
      
      if (step >= steps) {
        this.clearFadeInterval(name);
      }
    }, stepDuration);
    this.fadeIntervals.set(name, interval);
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.saveToStorage();
    
    if (muted) {
      this.sounds.forEach(audio => {
        audio.pause();
      });
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.saveToStorage();
    
    this.sounds.forEach((audio, name) => {
      const config = SOUND_CONFIGS[name];
      audio.volume = config.volume * this.masterVolume;
    });
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public isPlaying(name: SoundName): boolean {
    const audio = this.sounds.get(name);
    if (!audio) return false;
    return !audio.paused;
  }

  public stopAll(): void {
    this.sounds.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }
}

export const soundManager = new SoundManager();
