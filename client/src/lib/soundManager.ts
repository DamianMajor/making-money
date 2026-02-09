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
  | 'failure'
  | 'settle';

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
  rain: { src: '/sounds/rain.mp3', volume: 0.4, loop: false },
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
  settle: { src: '/sounds/settle.mp3', volume: 0.5, loop: false },
};

const FIGHT_LAYER_SOUNDS: SoundName[] = [
  'fightCat', 'fightCrash', 'fightIntro', 'fightYell'
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
  private pendingLoops: Set<SoundName> = new Set();
  private pendingDaytimeMusic: boolean = false;
  private initializing: boolean = false;
  // Cross-fade rain loop system
  private rainSources: ActiveSound[] = [];
  private rainCrossfadeInterval: ReturnType<typeof setInterval> | null = null;
  private rainActive: boolean = false;

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
    if (this.initialized || this.initializing) return;
    this.initializing = true;
    
    console.log('[SoundManager] init() called, muted:', this.muted, 'volume:', this.masterVolume);
    
    try {
      this.audioContext = new AudioContext();
      console.log('[SoundManager] AudioContext state:', this.audioContext.state);
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('[SoundManager] AudioContext resumed, state:', this.audioContext.state);
      }
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
      
      // Load all audio buffers
      let loadedCount = 0;
      let failedCount = 0;
      const loadPromises = Object.entries(SOUND_CONFIGS).map(async ([name, config]) => {
        try {
          const response = await fetch(config.src);
          if (!response.ok) {
            console.warn(`[SoundManager] Sound not found: ${config.src} (${response.status})`);
            failedCount++;
            return;
          }
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
          this.buffers.set(name as SoundName, audioBuffer);
          loadedCount++;
        } catch (error) {
          console.warn(`[SoundManager] Failed to load sound: ${config.src}`, error);
          failedCount++;
        }
      });
      
      await Promise.all(loadPromises);
      this.initialized = true;
      this.initializing = false;
      
      console.log(`[SoundManager] Initialized: ${loadedCount} loaded, ${failedCount} failed`);
      console.log('[SoundManager] Pending plays:', Array.from(this.pendingPlays), 'Pending loops:', Array.from(this.pendingLoops), 'Pending daytime:', this.pendingDaytimeMusic);
      
      // Play pending sounds
      this.pendingPlays.forEach(name => this.play(name));
      this.pendingPlays.clear();
      
      // Play pending loops
      this.pendingLoops.forEach(name => this.playLoop(name));
      this.pendingLoops.clear();
      
      // Start pending daytime music
      if (this.pendingDaytimeMusic) {
        this.pendingDaytimeMusic = false;
        this.startDaytimeMusic();
      }
    } catch (error) {
      console.error('[SoundManager] Failed to initialize audio context:', error);
      this.initializing = false;
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

    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
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
      this.pendingLoops.add(name);
      return;
    }

    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
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
    
    // Always play fightMartialArts as first layer
    const martialArtsSound = this.createSource('fightMartialArts', false);
    if (martialArtsSound) {
      this.brawlSources.push(martialArtsSound);
      martialArtsSound.source.start(0);
    }
    
    // Pick 1-2 additional random fight layer sounds
    const shuffled = [...FIGHT_LAYER_SOUNDS].sort(() => Math.random() - 0.5);
    const layerCount = 1 + Math.floor(Math.random() * 2); // 1 or 2
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
    if (this.muted) return;
    
    if (!this.initialized) {
      this.pendingDaytimeMusic = true;
      return;
    }
    
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
    
    // Play bush sound for max 1.5 seconds with 0.3s fade out at end, then item pickup after 1 second delay
    this.playForDurationWithFade('bush', 1500, 300);
    
    // Item pickup starts after 1 second delay
    setTimeout(() => {
      if (!this.muted) {
        this.play('itemPickup', 1.0);
      }
    }, 1000);
  }
  
  // Play sound for a duration with fade out at the end
  public playForDurationWithFade(name: SoundName, durationMs: number, fadeMs: number, pitch: number = 1.0): void {
    if (this.muted || !this.initialized) return;
    
    const activeSound = this.createSource(name, false, pitch);
    if (!activeSound) return;
    
    const key = `${name}_fade_${Date.now()}`;
    this.activeSources.set(key, activeSound);
    
    activeSound.source.start(0);
    
    // Start fade out before the end
    const fadeStartTime = durationMs - fadeMs;
    setTimeout(() => {
      if (!this.muted && activeSound.gainNode) {
        const currentTime = this.audioContext!.currentTime;
        activeSound.gainNode.gain.setValueAtTime(activeSound.gainNode.gain.value, currentTime);
        activeSound.gainNode.gain.linearRampToValueAtTime(0, currentTime + fadeMs / 1000);
      }
    }, fadeStartTime);
    
    // Stop the sound after duration
    setTimeout(() => {
      try {
        activeSound.source.stop();
      } catch {}
      this.activeSources.delete(key);
    }, durationMs);
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
    
    // If sound is already playing, don't restart it (prevents double-triggering)
    const existing = this.activeSources.get(name);
    if (existing) {
      // Just ensure volume is at target level
      const config = SOUND_CONFIGS[name];
      const currentTime = this.audioContext.currentTime;
      existing.gainNode.gain.linearRampToValueAtTime(config.volume, currentTime + duration / 1000);
      return;
    }
    
    const config = SOUND_CONFIGS[name];
    const activeSound = this.createSource(name, config.loop);
    if (!activeSound) return;
    
    const currentTime = this.audioContext.currentTime;
    activeSound.gainNode.gain.setValueAtTime(0, currentTime);
    activeSound.gainNode.gain.linearRampToValueAtTime(config.volume, currentTime + duration / 1000);
    
    this.activeSources.set(name, activeSound);
    activeSound.source.start(0);
  }

  // Start rain with cross-fade looping to eliminate loop point seam
  public startRainCrossfade(fadeInDuration: number = 2000): void {
    if (this.muted || !this.initialized || !this.audioContext) return;
    if (this.rainActive) return; // Already playing
    
    this.rainActive = true;
    const config = SOUND_CONFIGS.rain;
    const buffer = this.buffers.get('rain');
    if (!buffer) return;
    
    // Calculate loop duration (slightly less than buffer duration for overlap)
    const loopDuration = (buffer.duration - 1) * 1000; // 1 second overlap
    const crossfadeDuration = 1500; // 1.5 second crossfade
    
    // Start first rain source with fade in
    const startNewRainSource = () => {
      if (!this.rainActive || !this.audioContext) return;
      
      const activeSound = this.createSource('rain', false); // Non-looping
      if (!activeSound) return;
      
      const currentTime = this.audioContext.currentTime;
      activeSound.gainNode.gain.setValueAtTime(0, currentTime);
      activeSound.gainNode.gain.linearRampToValueAtTime(config.volume, currentTime + crossfadeDuration / 1000);
      
      this.rainSources.push(activeSound);
      activeSound.source.start(0);
      
      // Schedule fade out before end
      setTimeout(() => {
        if (!this.rainActive || !this.audioContext) return;
        const fadeOutTime = this.audioContext.currentTime;
        activeSound.gainNode.gain.setValueAtTime(activeSound.gainNode.gain.value, fadeOutTime);
        activeSound.gainNode.gain.linearRampToValueAtTime(0, fadeOutTime + crossfadeDuration / 1000);
      }, loopDuration - crossfadeDuration);
      
      // Clean up after fade out
      setTimeout(() => {
        try { activeSound.source.stop(); } catch {}
        const idx = this.rainSources.indexOf(activeSound);
        if (idx !== -1) this.rainSources.splice(idx, 1);
      }, loopDuration + 100);
    };
    
    // Initial fade in
    const firstSound = this.createSource('rain', false);
    if (firstSound) {
      const currentTime = this.audioContext.currentTime;
      firstSound.gainNode.gain.setValueAtTime(0, currentTime);
      firstSound.gainNode.gain.linearRampToValueAtTime(config.volume, currentTime + fadeInDuration / 1000);
      this.rainSources.push(firstSound);
      firstSound.source.start(0);
      
      // Schedule fade out before end
      setTimeout(() => {
        if (!this.rainActive || !this.audioContext) return;
        const fadeOutTime = this.audioContext.currentTime;
        firstSound.gainNode.gain.setValueAtTime(firstSound.gainNode.gain.value, fadeOutTime);
        firstSound.gainNode.gain.linearRampToValueAtTime(0, fadeOutTime + crossfadeDuration / 1000);
      }, loopDuration - crossfadeDuration);
      
      setTimeout(() => {
        try { firstSound.source.stop(); } catch {}
        const idx = this.rainSources.indexOf(firstSound);
        if (idx !== -1) this.rainSources.splice(idx, 1);
      }, loopDuration + 100);
    }
    
    // Start interval to overlap new sources
    this.rainCrossfadeInterval = setInterval(() => {
      if (this.rainActive) {
        startNewRainSource();
      }
    }, loopDuration - crossfadeDuration);
  }

  // Stop rain with fade out
  public stopRainCrossfade(fadeOutDuration: number = 6000): void {
    this.rainActive = false;
    
    if (this.rainCrossfadeInterval) {
      clearInterval(this.rainCrossfadeInterval);
      this.rainCrossfadeInterval = null;
    }
    
    // Fade out all active rain sources
    if (this.audioContext) {
      const currentTime = this.audioContext.currentTime;
      this.rainSources.forEach(source => {
        source.gainNode.gain.setValueAtTime(source.gainNode.gain.value, currentTime);
        source.gainNode.gain.linearRampToValueAtTime(0, currentTime + fadeOutDuration / 1000);
      });
    }
    
    // Clean up after fade out
    setTimeout(() => {
      this.rainSources.forEach(source => {
        try { source.source.stop(); } catch {}
      });
      this.rainSources = [];
    }, fadeOutDuration + 100);
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
