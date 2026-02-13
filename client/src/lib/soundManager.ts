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
  | 'settle'
  | 'badgeReward'
  | 'stream'
  | 'moneySong'
  | 'silverScreenVillain1'
  | 'silverScreenVillain2'
  | 'silverScreenVillain3'
  | 'sixtesCinemaTrillsA'
  | 'balloonPop1'
  | 'balloonPop2'
  | 'balloonBop'
  | 'rubberBandStretch'
  | 'stretchRelease'
  | 'projectileWoosh1'
  | 'projectileWoosh2'
  | 'projectileWoosh3'
  | 'projectileWoosh4'
  | 'discoBallHit1'
  | 'discoBallHit2'
  | 'discoBallHit3'
  | 'npcHit'
  | 'basicHit1'
  | 'basicHit2'
  | 'partySong'
  | 'genreRemix'
  | 'reliefTrillSound'
  | 'recordScratch';

interface SoundConfig {
  src: string;
  volume: number;
  loop: boolean;
  lowPassFreq?: number;
}

const SOUND_CONFIGS: Partial<Record<SoundName, SoundConfig>> = {
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
  badgeReward: { src: '/sounds/badge-reward.mp3', volume: 0.6, loop: false },
  stream: { src: '/sounds/stream.aac', volume: 0.4, loop: true },
  moneySong: { src: '/sounds/money_song_1.mp3', volume: 0.5, loop: true },
  silverScreenVillain1: { src: '/sounds/silver-screen-villain-1.mp3', volume: 0.5, loop: false },
  silverScreenVillain2: { src: '/sounds/silver-screen-villain-2.mp3', volume: 0.5, loop: false },
  silverScreenVillain3: { src: '/sounds/silver-screen-villain-3.mp3', volume: 0.5, loop: false },
  sixtesCinemaTrillsA: { src: '/sounds/sixties-cinema-trills-1.mp3', volume: 0.5, loop: false },
  balloonPop1: { src: '/sounds/balloon-pop-1.mp3', volume: 0.6, loop: false },
  balloonPop2: { src: '/sounds/balloon-pop-2.mp3', volume: 0.6, loop: false },
  balloonBop: { src: '/sounds/balloon-bop.mp3', volume: 0.5, loop: false },
  rubberBandStretch: { src: '/sounds/rubber-band-stretch.mp3', volume: 0.5, loop: false },
  stretchRelease: { src: '/sounds/stretch-release.mp3', volume: 0.5, loop: false },
  projectileWoosh1: { src: '/sounds/projectile-woosh-1.mp3', volume: 0.4, loop: false },
  projectileWoosh2: { src: '/sounds/projectile-woosh-2.mp3', volume: 0.4, loop: false },
  projectileWoosh3: { src: '/sounds/projectile-woosh-3.mp3', volume: 0.4, loop: false },
  projectileWoosh4: { src: '/sounds/projectile-woosh-4.mp3', volume: 0.4, loop: false },
  discoBallHit1: { src: '/sounds/disco-ball-hit-1.mp3', volume: 0.5, loop: false },
  discoBallHit2: { src: '/sounds/disco-ball-hit-2.mp3', volume: 0.5, loop: false },
  discoBallHit3: { src: '/sounds/disco-ball-hit-3.mp3', volume: 0.5, loop: false },
  npcHit: { src: '/sounds/npc-hit.mp3', volume: 0.5, loop: false },
  basicHit1: { src: '/sounds/basic-hit-1.mp3', volume: 0.5, loop: false },
  basicHit2: { src: '/sounds/basic-hit-2.mp3', volume: 0.5, loop: false },
  partySong: { src: '/sounds/money-yell-open.mp3', volume: 0.5, loop: false },
  reliefTrillSound: { src: '/sounds/sixties-cinema-trills-1.mp3', volume: 0.5, loop: false },
  recordScratch: { src: '/sounds/record-scratch.mp3', volume: 0.5, loop: false },
};

const FIGHT_ALWAYS_SOUNDS: SoundName[] = [
  'fightCrash', 'fightMartialArts', 'fightCat'
];

const FIGHT_RANDOM_SOUNDS: SoundName[] = [
  'fightIntro', 'fightYell'
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
  private genreRemixDuration: number = 0;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('villageLedger_soundSettings');
      if (stored) {
        const settings = JSON.parse(stored);
        // Always start unmuted - don't restore muted state from storage
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

  public prefetch(): void {
    Object.values(SOUND_CONFIGS).forEach(config => {
      fetch(config.src).catch(() => {});
    });
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
    if (!config) return null;
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
    if (!config) return;
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
    
    // Always play car crash, martial arts, and cat sounds
    FIGHT_ALWAYS_SOUNDS.forEach((soundName, index) => {
      const timeoutId = setTimeout(() => {
        if (this.muted || !this.brawlActive) return;
        const sound = this.createSource(soundName, false);
        if (sound) {
          this.brawlSources.push(sound);
          sound.source.start(0);
        }
      }, index * 200);
      this.brawlTimeouts.push(timeoutId);
    });
    
    // Pick 0-1 additional random fight sounds (never cartoon)
    if (Math.random() > 0.5) {
      const randomSound = FIGHT_RANDOM_SOUNDS[Math.floor(Math.random() * FIGHT_RANDOM_SOUNDS.length)];
      const timeoutId = setTimeout(() => {
        if (this.muted || !this.brawlActive) return;
        const sound = this.createSource(randomSound, false);
        if (sound) {
          this.brawlSources.push(sound);
          sound.source.start(0);
        }
      }, 600);
      this.brawlTimeouts.push(timeoutId);
    }
    
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

  public playFailureThenBoo(): void {
    if (this.muted) return;
    
    // Play failure sound first
    const failureAudio = new Audio('/sounds/failure.mp3');
    failureAudio.volume = this.masterVolume * 0.5;
    failureAudio.playbackRate = 1.0;
    failureAudio.play().catch(() => {});
    
    // Boo plays 2 seconds after failure sound starts
    setTimeout(() => {
      if (this.muted) return;
      const booAudio = new Audio('/sounds/crowd-boo.mp3');
      booAudio.volume = this.masterVolume * 0.5;
      booAudio.playbackRate = 1.0;
      booAudio.play().catch(() => {});
    }, 2000);
  }

  public getBufferDuration(name: SoundName): number {
    const buffer = this.buffers.get(name);
    return buffer ? buffer.duration * 1000 : 1000;
  }

  public async loadAndPlayGenre(url: string): Promise<void> {
    if (!this.audioContext || !this.masterGain) return;
    const existing = this.activeSources.get('genreRemix');
    if (existing) {
      try { existing.source.stop(); } catch {}
      this.activeSources.delete('genreRemix');
    }

    try {
      const response = await fetch(url);
      if (!response.ok) return;
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = false;

      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0.5;
      source.connect(gainNode);
      gainNode.connect(this.masterGain);

      const activeSound = { source, gainNode };
      this.activeSources.set('genreRemix', activeSound);

      source.onended = () => {
        this.activeSources.delete('genreRemix');
      };

      source.start(0);

      this.genreRemixDuration = audioBuffer.duration * 1000;
    } catch (error) {
      console.warn('[SoundManager] Failed to load genre remix:', url, error);
    }
  }

  public getGenreRemixDuration(): number {
    return this.genreRemixDuration || 240000;
  }

  private genreBufferCache: Map<string, AudioBuffer> = new Map();

  public async preloadGenre(url: string): Promise<void> {
    if (!this.audioContext || this.genreBufferCache.has(url)) return;
    try {
      const response = await fetch(url);
      if (!response.ok) return;
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.genreBufferCache.set(url, audioBuffer);
    } catch (error) {
      console.warn('[SoundManager] Failed to preload genre:', url, error);
    }
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
      if (!config) return;
      const currentTime = this.audioContext.currentTime;
      existing.gainNode.gain.linearRampToValueAtTime(config.volume, currentTime + duration / 1000);
      return;
    }
    
    const config = SOUND_CONFIGS[name];
    if (!config) return;
    const activeSound = this.createSource(name, config.loop);
    if (!activeSound) return;
    
    const currentTime = this.audioContext.currentTime;
    activeSound.gainNode.gain.setValueAtTime(0, currentTime);
    activeSound.gainNode.gain.linearRampToValueAtTime(config.volume, currentTime + duration / 1000);
    
    this.activeSources.set(name, activeSound);
    activeSound.source.start(0);
  }

  // Set the volume of a currently playing sound (0-1 scale relative to config volume)
  public setVolume(name: SoundName, volume: number): void {
    const activeSound = this.activeSources.get(name);
    if (!activeSound || !this.audioContext) return;
    const config = SOUND_CONFIGS[name];
    if (!config) return;
    const targetVolume = config.volume * Math.max(0, Math.min(1, volume));
    const currentTime = this.audioContext.currentTime;
    activeSound.gainNode.gain.setValueAtTime(activeSound.gainNode.gain.value, currentTime);
    activeSound.gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + 0.05);
  }

  // Check if a sound is currently playing
  public isPlaying(name: SoundName): boolean {
    return this.activeSources.has(name);
  }

  // Start rain with cross-fade looping to eliminate loop point seam
  public startRainCrossfade(fadeInDuration: number = 2000): void {
    if (this.muted || !this.initialized || !this.audioContext) return;
    if (this.rainActive) return; // Already playing
    
    this.rainActive = true;
    const config = SOUND_CONFIGS.rain!;
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

  public stopAll(): void {
    this.activeSources.forEach((sound, key) => {
      try {
        sound.source.stop();
      } catch {}
    });
    this.activeSources.clear();
    this.stopBrawl();
  }

  public resumeContext(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
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

  private voiceBlipOsc: OscillatorNode | null = null;
  private voiceBlipGain: GainNode | null = null;

  public playVoiceBlip(speaker: string, char: string): void {
    if (this.muted) return;
    if (!this.audioContext || !this.masterGain) return;
    if (char === ' ' || char === '\n' || char === '\t') return;

    const profiles: Record<string, { freq: number; type: OscillatorType; vol: number }> = {
      'YOU':            { freq: 320, type: 'square',   vol: 0.06 },
      'WOODCUTTER':     { freq: 180, type: 'sawtooth', vol: 0.05 },
      'STONE-WORKER':   { freq: 240, type: 'triangle', vol: 0.06 },
      'FISHERMAN':      { freq: 360, type: 'sine',     vol: 0.07 },
      'VILLAGE ELDER':  { freq: 200, type: 'triangle', vol: 0.06 },
      'STONE TABLET':   { freq: 440, type: 'sine',     vol: 0.04 },
    };
    const profile = profiles[speaker] || { freq: 280, type: 'square' as OscillatorType, vol: 0.05 };

    const jitter = (Math.random() - 0.5) * 40;
    const freq = profile.freq + jitter;

    try {
      if (this.voiceBlipOsc) {
        this.voiceBlipOsc.stop();
        this.voiceBlipOsc.disconnect();
        this.voiceBlipOsc = null;
      }

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = profile.type;
      osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
      gain.gain.setValueAtTime(profile.vol, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.10);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.audioContext.currentTime + 0.10);
      this.voiceBlipOsc = osc;
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
        if (this.voiceBlipOsc === osc) this.voiceBlipOsc = null;
      };
    } catch {}
  }
}

export const soundManager = new SoundManager();
