export type SoundName = 
  | 'footstepA'
  | 'footstepB'
  | 'itemPickup'
  | 'stoneCarve'
  | 'stoneLedger'
  | 'dialogueAdvance'
  | 'buttonClick'
  | 'choiceSelect'
  | 'quizCorrect'
  | 'quizWrong'
  | 'celebration'
  | 'brawl'
  | 'ambientVillage'
  | 'ambientNight'
  | 'rain'
  | 'thunder'
  | 'roofHammer'
  | 'backgroundMusicDay'
  | 'backgroundMusicDay2'
  | 'backgroundMusicNight'
  | 'crowdApplause'
  | 'fightCartoon'
  | 'fightCat'
  | 'fightCrash'
  | 'fightIntro'
  | 'fightMartialArts'
  | 'fightYell'
  | 'bush'
  | 'fishingCast'
  | 'fishingPlop'
  | 'crowdBoo'
  | 'failure';

interface SoundConfig {
  src: string;
  volume: number;
  loop: boolean;
  lowPassFreq?: number;
}

const SOUND_CONFIGS: Record<SoundName, SoundConfig> = {
  footstepA: { src: '/sounds/footstep_a.mp3', volume: 0.3, loop: false, lowPassFreq: 2500 },
  footstepB: { src: '/sounds/footstep_b.mp3', volume: 0.3, loop: false, lowPassFreq: 2500 },
  itemPickup: { src: '/sounds/item-pickup.mp3', volume: 0.5, loop: false },
  stoneCarve: { src: '/sounds/stone-carve.mp3', volume: 0.4, loop: false },
  stoneLedger: { src: '/sounds/stone-ledger.mp3', volume: 0.5, loop: false },
  dialogueAdvance: { src: '/sounds/dialogue-advance.mp3', volume: 0.3, loop: false },
  buttonClick: { src: '/sounds/button-click.mp3', volume: 0.4, loop: false },
  choiceSelect: { src: '/sounds/choice-select.mp3', volume: 0.4, loop: false },
  quizCorrect: { src: '/sounds/quiz-correct.mp3', volume: 0.5, loop: false },
  quizWrong: { src: '/sounds/quiz-wrong.mp3', volume: 0.5, loop: false },
  celebration: { src: '/sounds/celebration.mp3', volume: 0.6, loop: false },
  brawl: { src: '/sounds/brawl.mp3', volume: 0.5, loop: false },
  ambientVillage: { src: '/sounds/ambient-village.mp3', volume: 0.2, loop: true },
  ambientNight: { src: '/sounds/ambient-night.mp3', volume: 0.3, loop: true },
  rain: { src: '/sounds/rain.mp3', volume: 0.4, loop: true },
  thunder: { src: '/sounds/thunder.mp3', volume: 0.6, loop: false },
  roofHammer: { src: '/sounds/roof-hammer.mp3', volume: 0.4, loop: false },
  backgroundMusicDay: { src: '/sounds/backgroundmusic-day.mp3', volume: 0.25, loop: false },
  backgroundMusicDay2: { src: '/sounds/backgroundmusic-day-2.mp3', volume: 0.25, loop: false },
  backgroundMusicNight: { src: '/sounds/backgroundmusic-night.mp3', volume: 0.25, loop: true },
  crowdApplause: { src: '/sounds/crowd-applause.mp3', volume: 0.6, loop: false },
  fightCartoon: { src: '/sounds/fightcartoon.mp3', volume: 0.4, loop: false },
  fightCat: { src: '/sounds/fight-cat.mp3', volume: 0.4, loop: false },
  fightCrash: { src: '/sounds/fightcrash.mp3', volume: 0.4, loop: false },
  fightIntro: { src: '/sounds/fightintro.mp3', volume: 0.4, loop: false },
  fightMartialArts: { src: '/sounds/fightmartialarts.mp3', volume: 0.4, loop: false },
  fightYell: { src: '/sounds/fightyell.mp3', volume: 0.4, loop: false },
  bush: { src: '/sounds/bush.mp3', volume: 0.5, loop: false },
  fishingCast: { src: '/sounds/fishing-cast.mp3', volume: 0.5, loop: false },
  fishingPlop: { src: '/sounds/fishing-plop.mp3', volume: 0.5, loop: false },
  crowdBoo: { src: '/sounds/crowd-boo.mp3', volume: 0.5, loop: false },
  failure: { src: '/sounds/failure.mp3', volume: 0.5, loop: false },
};

const FIGHT_LAYER_SOUNDS: SoundName[] = [
  'fightCartoon', 'fightCat', 'fightCrash', 'fightIntro', 'fightMartialArts', 'fightYell'
];

interface ActiveSound {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  filterNode?: BiquadFilterNode;
}

export class SoundManager {
  private audioContext: AudioContext | null = null;
  private buffers: Map<SoundName, AudioBuffer> = new Map();
  private activeSources: Map<string, ActiveSound> = new Map();
  private masterGain: GainNode | null = null;
  private muted: boolean = false;
  private masterVolume: number = 1.0;
  private initialized: boolean = false;
  private pendingPlays: Set<SoundName> = new Set();
  private footstepToggle: boolean = false;
  private brawlSources: ActiveSound[] = [];
  private brawlTimeouts: ReturnType<typeof setTimeout>[] = [];
  private brawlActive: boolean = false;
  private daytimeMusicLoopCount: number = 0;
  private daytimeMusicActive: boolean = false;

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

  public async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
      
      // Load all audio buffers
      const loadPromises = Object.entries(SOUND_CONFIGS).map(async ([name, config]) => {
        try {
          const response = await fetch(config.src);
          if (!response.ok) {
            console.warn(`Sound not found: ${config.src}`);
            return;
          }
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
          this.buffers.set(name as SoundName, audioBuffer);
        } catch (error) {
          console.warn(`Failed to load sound: ${config.src}`, error);
        }
      });
      
      await Promise.all(loadPromises);
      this.initialized = true;
      
      // Play pending sounds
      this.pendingPlays.forEach(name => this.play(name));
      this.pendingPlays.clear();
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  private createSource(name: SoundName, loop: boolean = false, pitch: number = 1.0): ActiveSound | null {
    if (!this.audioContext || !this.masterGain) return null;
    
    const buffer = this.buffers.get(name);
    if (!buffer) return null;
    
    const config = SOUND_CONFIGS[name];
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = pitch;
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = config.volume;
    
    let filterNode: BiquadFilterNode | undefined;
    
    if (config.lowPassFreq) {
      filterNode = this.audioContext.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.value = config.lowPassFreq;
      filterNode.Q.value = 0.7;
      source.connect(filterNode);
      filterNode.connect(gainNode);
    } else {
      source.connect(gainNode);
    }
    gainNode.connect(this.masterGain);
    
    return { source, gainNode, filterNode };
  }

  public play(name: SoundName, pitch: number = 1.0): void {
    if (this.muted) return;
    
    if (!this.initialized) {
      this.pendingPlays.add(name);
      return;
    }
    
    const config = SOUND_CONFIGS[name];
    const activeSound = this.createSource(name, config.loop, pitch);
    if (!activeSound) return;
    
    const key = `${name}_${Date.now()}`;
    this.activeSources.set(key, activeSound);
    
    activeSound.source.onended = () => {
      this.activeSources.delete(key);
    };
    
    activeSound.source.start(0);
  }

  public playFootstep(): void {
    const pitch = this.footstepToggle ? 0.95 : 1.0;
    this.footstepToggle = !this.footstepToggle;
    this.play('footstepA', pitch);
  }

  public playLoop(name: SoundName): void {
    if (this.muted) return;
    
    if (!this.initialized) {
      this.pendingPlays.add(name);
      return;
    }
    
    // Stop existing loop of this sound
    this.stopLoop(name);
    
    const activeSound = this.createSource(name, true);
    if (!activeSound) return;
    
    this.activeSources.set(name, activeSound);
    activeSound.source.start(0);
  }

  public stopLoop(name: SoundName): void {
    const activeSound = this.activeSources.get(name);
    if (activeSound) {
      try {
        activeSound.source.stop();
      } catch {}
      this.activeSources.delete(name);
    }
  }

  public stop(name: SoundName): void {
    this.stopLoop(name);
  }

  public playForDuration(name: SoundName, durationMs: number, pitch: number = 1.0): void {
    if (this.muted || !this.initialized) return;
    
    const activeSound = this.createSource(name, false, pitch);
    if (!activeSound) return;
    
    const key = `${name}_duration_${Date.now()}`;
    this.activeSources.set(key, activeSound);
    
    activeSound.source.start(0);
    
    setTimeout(() => {
      try {
        activeSound.source.stop();
      } catch {}
      this.activeSources.delete(key);
    }, durationMs);
  }

  public playBrawlWithLayers(durationMs: number): void {
    if (this.muted || !this.initialized) return;
    
    // Stop any existing brawl sounds and clear pending timeouts
    this.stopBrawl();
    this.brawlActive = true;
    
    // Play main brawl sound looping
    const mainBrawl = this.createSource('brawl', true);
    if (mainBrawl) {
      this.brawlSources.push(mainBrawl);
      mainBrawl.source.start(0);
    }
    
    // Pick 2-3 random fight layer sounds
    const shuffled = [...FIGHT_LAYER_SOUNDS].sort(() => Math.random() - 0.5);
    const layerCount = 2 + Math.floor(Math.random() * 2); // 2 or 3
    const selectedLayers = shuffled.slice(0, layerCount);
    
    // Play each layer with slight delay for variation
    selectedLayers.forEach((layerName, index) => {
      const timeoutId = setTimeout(() => {
        if (this.muted || !this.brawlActive) return;
        const layerSound = this.createSource(layerName, false);
        if (layerSound) {
          this.brawlSources.push(layerSound);
          layerSound.source.start(0);
        }
      }, index * 300); // Stagger by 300ms
      this.brawlTimeouts.push(timeoutId);
    });
    
    // Stop all brawl sounds after duration
    const stopTimeoutId = setTimeout(() => {
      this.stopBrawl();
    }, durationMs);
    this.brawlTimeouts.push(stopTimeoutId);
  }

  public stopBrawl(): void {
    // Clear all pending brawl timeouts
    this.brawlTimeouts.forEach(id => clearTimeout(id));
    this.brawlTimeouts = [];
    this.brawlActive = false;
    
    // Stop all active brawl sources
    this.brawlSources.forEach(sound => {
      try {
        sound.source.stop();
      } catch {}
    });
    this.brawlSources = [];
  }

  public startDaytimeMusic(): void {
    if (this.muted || !this.initialized) return;
    
    this.daytimeMusicActive = true;
    this.daytimeMusicLoopCount = 0;
    this.playNextDaytimeTrack();
  }

  private playNextDaytimeTrack(): void {
    if (!this.daytimeMusicActive || this.muted) return;
    
    // Alternate back-to-back: day → day2 → day → day2
    const isDay2Turn = this.daytimeMusicLoopCount % 2 === 1;
    const trackName: SoundName = isDay2Turn ? 'backgroundMusicDay2' : 'backgroundMusicDay';
    
    // Stop any existing daytime music
    const existingDay = this.activeSources.get('backgroundMusicDay');
    const existingDay2 = this.activeSources.get('backgroundMusicDay2');
    if (existingDay) {
      try { existingDay.source.stop(); } catch {}
      this.activeSources.delete('backgroundMusicDay');
    }
    if (existingDay2) {
      try { existingDay2.source.stop(); } catch {}
      this.activeSources.delete('backgroundMusicDay2');
    }
    
    const activeSound = this.createSource(trackName, false);
    if (!activeSound) {
      // If buffer not loaded yet, retry after delay
      setTimeout(() => this.playNextDaytimeTrack(), 500);
      return;
    }
    
    this.activeSources.set(trackName, activeSound);
    
    // Use both onended callback and backup timer for reliability
    const buffer = this.buffers.get(trackName);
    const duration = buffer ? buffer.duration * 1000 : 60000;
    
    let hasEnded = false;
    const handleTrackEnd = () => {
      if (hasEnded) return;
      hasEnded = true;
      this.activeSources.delete(trackName);
      if (this.daytimeMusicActive && !this.muted) {
        this.daytimeMusicLoopCount++;
        this.playNextDaytimeTrack();
      }
    };
    
    activeSound.source.onended = handleTrackEnd;
    
    // Backup timer in case onended doesn't fire
    setTimeout(() => {
      if (!hasEnded && this.daytimeMusicActive) {
        handleTrackEnd();
      }
    }, duration + 100);
    
    activeSound.source.start(0);
  }

  public stopDaytimeMusic(): void {
    this.daytimeMusicActive = false;
    this.stopLoop('backgroundMusicDay');
    this.stopLoop('backgroundMusicDay2');
  }

  public playFishingSequence(): void {
    if (this.muted || !this.initialized) return;
    
    this.play('fishingCast');
    
    const castBuffer = this.buffers.get('fishingCast');
    const delay = castBuffer ? castBuffer.duration * 1000 : 500;
    
    setTimeout(() => {
      if (!this.muted) {
        this.play('fishingPlop');
      }
    }, delay);
  }

  public playBushSequence(): void {
    if (this.muted || !this.initialized) return;
    
    // Play bush sound for max 1.5 seconds, then item pickup after 1 second delay
    this.playForDuration('bush', 1500);
    
    // Item pickup starts after 1 second delay
    setTimeout(() => {
      if (!this.muted) {
        this.play('itemPickup', 1.0);
      }
    }, 1000);
  }

  public playBooThenFailure(): void {
    if (this.muted) return;
    
    // Use HTML5 Audio elements to guarantee no pitch shifting
    const booAudio = new Audio('/sounds/crowd-boo.mp3');
    booAudio.volume = this.masterVolume * 0.5;
    booAudio.playbackRate = 1.0;
    booAudio.play().catch(() => {});
    
    let failurePlayed = false;
    
    const playFailure = () => {
      if (failurePlayed || this.muted) return;
      failurePlayed = true;
      const failureAudio = new Audio('/sounds/failure.mp3');
      failureAudio.volume = this.masterVolume * 0.5;
      failureAudio.playbackRate = 1.0;
      failureAudio.play().catch(() => {});
    };
    
    // Get duration and play failure with overlap
    booAudio.addEventListener('loadedmetadata', () => {
      const booDuration = booAudio.duration * 1000;
      const delay = Math.max(0, booDuration - 1000); // Overlap by 1 second
      setTimeout(playFailure, delay);
    });
    
    // Fallback if metadata doesn't load quickly
    setTimeout(playFailure, 1500);
  }

  public getBufferDuration(name: SoundName): number {
    const buffer = this.buffers.get(name);
    return buffer ? buffer.duration * 1000 : 1000;
  }

  public fadeOut(name: SoundName, duration: number = 1000): void {
    const activeSound = this.activeSources.get(name);
    if (!activeSound || !this.audioContext) return;
    
    const currentTime = this.audioContext.currentTime;
    activeSound.gainNode.gain.setValueAtTime(activeSound.gainNode.gain.value, currentTime);
    activeSound.gainNode.gain.linearRampToValueAtTime(0, currentTime + duration / 1000);
    
    setTimeout(() => {
      try {
        activeSound.source.stop();
      } catch {}
      this.activeSources.delete(name);
    }, duration);
  }

  public fadeIn(name: SoundName, duration: number = 1000): void {
    if (this.muted || !this.initialized || !this.audioContext) return;
    
    // Stop existing loop of this sound
    this.stopLoop(name);
    
    const config = SOUND_CONFIGS[name];
    const activeSound = this.createSource(name, config.loop);
    if (!activeSound) return;
    
    const currentTime = this.audioContext.currentTime;
    activeSound.gainNode.gain.setValueAtTime(0, currentTime);
    activeSound.gainNode.gain.linearRampToValueAtTime(config.volume, currentTime + duration / 1000);
    
    this.activeSources.set(name, activeSound);
    activeSound.source.start(0);
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.saveToStorage();
    
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this.masterVolume;
    }
    
    if (muted) {
      this.stopBrawl();
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
    
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.value = this.masterVolume;
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public isPlaying(name: SoundName): boolean {
    return this.activeSources.has(name);
  }

  public stopAll(): void {
    this.activeSources.forEach((sound, key) => {
      try {
        sound.source.stop();
      } catch {}
    });
    this.activeSources.clear();
    this.stopBrawl();
  }

  public resume(name: SoundName): void {
    // For Web Audio API, we need to restart the sound
    // This is mainly used for looping sounds
    if (!this.muted && this.initialized) {
      this.playLoop(name);
    }
  }

  public pause(name: SoundName): void {
    this.stop(name);
  }
}

export const soundManager = new SoundManager();
