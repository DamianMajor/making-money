// Village Ledger Educational Game Engine
// Touch-only side-scroller optimized for iPad/Tablet

import { soundManager } from './soundManager';

// Game State Types
interface Vector2 {
  x: number;
  y: number;
}

interface Character {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  outlineColor: string;
  visible: boolean;
  bobOffset: number;
  bobDirection: number;
  targetX?: number; // For NPC movement toward town center
  originalX?: number; // Store original position for reset
  renderOffsetX?: number; // Visual offset for soft collision display
}

interface DialogueLine {
  speaker: string;
  text: string;
  onComplete?: () => void;
}

interface LedgerEntry {
  name: string;
  debt: string;
}

interface GameState {
  // CREDIT-FIRST FLOW:
  // Loop 1: intro -> need_wood -> got_wood_need_stone -> got_stone_need_fish -> (collect berries) -> got_fish_ready_settle -> settlement -> confrontation -> brawl -> fail
  // Loop 2: Same but with choice to record debts on Stone Tablet -> success path (partial recording = partial conflict)
  phase: 'intro' | 'need_wood' | 'got_wood_need_stone' | 'got_stone_need_fish' | 'got_fish_ready_settle' | 'settlement' | 'confrontation' | 'brawl' | 'fail' | 'loop2_intro' | 'loop2_need_wood' | 'loop2_escorting_woodcutter' | 'loop2_got_wood' | 'loop2_escorting_stoneworker' | 'loop2_got_stone' | 'loop2_got_fish' | 'loop2_got_berries' | 'loop2_verify_at_tablet' | 'loop2_return' | 'complete_success' | 'quiz' | 'complete';
  loop: 1 | 2;
  // Track escort state - NPC following player to tablet (Loop 2 only)
  escortingNPC: 'woodcutter' | 'stoneworker' | null;
  inventory: {
    stone: number;
    fish: number;
    wood: number;
    berries: number;
    slingshot: number;
  };
  // Badges earned by player
  badges: string[];
  // Show badge popup
  showBadgePopup: boolean;
  pendingBadge: { name: string; description: string } | null;
  // Inventory hint for first trade
  showInventoryHint: boolean;
  inventoryHintShown: boolean; // Track if hint has been shown to avoid repeating
  pendingChoiceAfterHint: boolean; // Show choice after hint is dismissed
  // Trade selection state
  showTradeSelection: boolean;
  tradeSelectionCallback: ((item: string | null) => void) | null;
  // Track roof repair state
  roofRepaired: boolean;
  // Track if player ever obtained wood/stone (separate from current inventory)
  obtainedWood: boolean;
  obtainedStone: boolean;
  // Track which debts are recorded on the Stone Tablet (Loop 2 only)
  woodcutterDebtRecorded: boolean;
  stoneWorkerDebtRecorded: boolean;
  // Track if carving sound has been played (to prevent double-trigger)
  woodcutterCarvingSoundPlayed: boolean;
  stoneWorkerCarvingSoundPlayed: boolean;
  // Block player movement during carving sequence
  playerBlockedForCarving: boolean;
  // Track if receive sounds have been played (to prevent triple-trigger)
  woodReceiveSoundPlayed: boolean;
  stoneReceiveSoundPlayed: boolean;
  // Loop 1 settlement disputes - track who has been confronted
  woodcutterDisputed: boolean;
  stoneworkerDisputed: boolean;
  // Loop 2 direct settlement tracking
  woodcutterSettled: boolean;
  stoneWorkerSettled: boolean;
  // Pending dispute flags - show choice after dialogue
  pendingWoodcutterDispute: boolean;
  pendingStoneWorkerDispute: boolean;
  // Elder has verified debts at tablet - NPCs accept payment without dispute
  elderVerified: boolean;
  // Elder is walking toward player to celebrate after both debts settled
  elderWalkingToCelebrate: boolean;
  // Track if player gave in to inflated demands (leads to failure path)
  gaveInToWoodcutter: boolean;
  gaveInToStoneWorker: boolean;
  // Extra berry spawns after giving in - allows getting 1 more fish but not enough for both
  extraBerryAvailable: boolean;
  // Extra fish available from Fisherman after giving in to Stone-worker (Loop 2 only)
  extraFishAvailable: boolean;
  // Resources depleted after paying first inflated demand - no more extra resources available
  resourcesDepleted: boolean;
  // Track if fishing sound was played when approaching fisherman
  fishingSoundPlayed: boolean;
  // Track when items have been introduced (for inventory display)
  woodIntroduced: boolean;
  fishIntroduced: boolean;
  stoneIntroduced: boolean;
  berriesIntroduced: boolean;
  slingshotIntroduced: boolean;
  ledgerEntries: LedgerEntry[];
  dialogueQueue: DialogueLine[];
  currentDialogue: DialogueLine | null;
  dialogueComplete: boolean;
  showInteractButton: boolean;
  nearbyNPC: Character | null;
  nearbyLocation: 'home' | 'stoneTablet' | null; // Track if player is near home or Stone Tablet
  elderEntranceProgress: number;
  playerMood: 'neutral' | 'happy' | 'angry';
  moodTimer: number; // Timer to auto-reset mood to neutral
  showHUD: boolean;
  quizAnswers: (number | number[])[]; // Can be single-select (number) or multi-select (number[])
  showQuiz: boolean;
  showSuccess: boolean;
  showQuizReview: boolean; // Post-quiz review of all answers
  showFail: boolean;
  showBrawl: boolean;
  brawlTimer: number;
  showCelebration: boolean; // Dance animation when debts settled
  celebrationTimer: number;
  showNightTransition: boolean; // Nighttime transition before quiz
  nightTransitionTimer: number;
  showThunderstorm: boolean; // Thunderstorm after roof fix
  thunderstormTimer: number;
  showCloudsAnimation: boolean; // Dark clouds rolling in before storm
  cloudsAnimationTimer: number;
  showRainfall: boolean; // Rainfall animation after clouds
  rainfallTimer: number;
  playerEnteredHut: boolean; // Player has entered the hut
  playerFading: boolean; // Player is fading into hut
  playerAlpha: number; // Player alpha for fade effect (0-1)
  showStoneTabletPopup: boolean; // Popup view of Stone Tablet
  showChoice: boolean;
  choiceOptions: { text: string; action: () => void }[];
}

// Game Engine Class
export class VillageLedgerGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private lastTime: number = 0;

  // World dimensions - expanded for full narrative
  private worldWidth: number = 3800;
  private groundHeight: number = 60;

  // Logical dimensions (CSS pixels, not device pixels)
  private logicalWidth: number = 0;
  private logicalHeight: number = 0;

  // Camera
  private cameraX: number = 0;
  private cameraTargetX: number = 0;
  private cameraSmoothing: number = 0.08;

  // Touch state
  private touchActive: boolean = false;
  private touchX: number = 0;
  private moveDirection: number = 0;
  private touchStartTime: number = 0;
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private holdThreshold: number = 150; // ms before treating as hold movement

  // Player
  private player: Character;
  private playerSpeed: number = 200; // Slower for better tablet control

  // NPCs
  private npcs: Character[];
  private stoneWorker: Character;
  private fisherman: Character;
  private villageElder: Character;
  private woodcutter: Character;
  private berryBush: Character;

  // Location markers - NEW LAYOUT
  // X: 100 (Home) -> 700 (Woodcutter) -> 1600 (Elder/Village Center) -> 2000 (Berry Bush) -> 2500 (Stone-worker) -> 3200 (Fisherman)
  private playerHomeX: number = 100;
  private villageCenterX: number = 1600;

  // Game state
  private state: GameState;

  // UI dimensions (calculated on resize)
  private dialogueBoxHeight: number = 0;
  private hudWidth: number = 260;
  private hudHeight: number = 185;
  private interactButtonSize: number = 90; // 10% smaller than original 100

  // Animation timers
  private bobTimer: number = 0;
  private talkingTimer: number = 0; // Timer for talking bounce animation
  private dialogueCharIndex: number = 0;
  private dialogueTimer: number = 0;
  private continueArrowBlink: number = 0;
  private inventoryPopup: { text: string; timer: number; y: number } | null = null;
  private hudGlow: number = 0;
  private interactButtonOpacity: number = 0;
  private faceImages: Record<string, HTMLImageElement> = {};
  private moodTimer: number = 0;
  
  // Atmospheric effects
  private atmosphereTimer: number = 0;
  private dustParticles: Array<{
    x: number;
    y: number;
    size: number;
    speed: number;
    drift: number;
    alpha: number;
    phase: number;
  }> = [];
  private midDustParticles: Array<{
    x: number;
    y: number;
    size: number;
    speed: number;
    drift: number;
    alpha: number;
    phase: number;
  }> = [];
  private backDustParticles: Array<{
    x: number;
    y: number;
    size: number;
    speed: number;
    drift: number;
    alpha: number;
    phase: number;
  }> = [];
  
  // Parallax background layers
  private parallaxLayers: {
    sky: HTMLImageElement;
    backmid: HTMLImageElement;
    treesThin: HTMLImageElement;
    treesThick: HTMLImageElement;
    pathShrubs: HTMLImageElement;
    tree1: HTMLImageElement;
    tree2: HTMLImageElement;
    tree3: HTMLImageElement;
  } = {
    sky: new Image(),
    backmid: new Image(),
    treesThin: new Image(),
    treesThick: new Image(),
    pathShrubs: new Image(),
    tree1: new Image(),
    tree2: new Image(),
    tree3: new Image()
  };
  private parallaxLoaded: boolean = false;
  
  // Sound mute button
  private muteButtonArea: { x: number; y: number; w: number; h: number } | null = null;
  
  // Inventory UI
  private inventoryButtonArea: { x: number; y: number; w: number; h: number } | null = null;
  private inventoryDetailPopupArea: { x: number; y: number; w: number; h: number } | null = null;
  private showInventoryDetailPopup: boolean = false;
  
  // Sound timing
  private lastFootstepTime: number = 0;
  private footstepInterval: number = 300;
  private booFailureTriggered: boolean = false;
  private stormTriggered: boolean = false;
  private rainSoundStarted: boolean = false;
  private celebrationEndTime: number = 0;
  
  // Auto-walk feature: player walks to clicked target and interacts
  private autoWalkTarget: { x: number; type: 'npc' | 'home' | 'berryBush' | 'stoneTablet' | 'location'; id?: string } | null = null;

  // Font constants (retro monospace for dialogue/HUD)
  private readonly retroFont: string = '"Press Start 2P", monospace';
  private readonly uiFont: string = '"Open Sans", sans-serif';

  // Callbacks
  private onStateChange?: (state: GameState) => void;

  constructor(canvas: HTMLCanvasElement, onStateChange?: (state: GameState) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
    this.onStateChange = onStateChange;

    // JibJab face assets storage
    this.faceImages = {};
    ['neutral', 'happy', 'angry'].forEach(mood => {
      const img = new Image();
      img.src = `/assets/${mood}.PNG`;
      this.faceImages[mood] = img;
    });

    // Load parallax background layers
    this.parallaxLayers.sky.src = '/sky.png';
    this.parallaxLayers.backmid.src = '/backmid.png';
    this.parallaxLayers.treesThin.src = '/trees-thin.png';
    this.parallaxLayers.treesThick.src = '/trees-thick.png';
    this.parallaxLayers.pathShrubs.src = '/path-shrubs.png';
    this.parallaxLayers.tree1.src = '/tree1.png';
    this.parallaxLayers.tree2.src = '/tree2.png';
    this.parallaxLayers.tree3.src = '/tree3.png';
    
    // Track when all layers are loaded (or failed - proceed anyway)
    let loadedCount = 0;
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= 8) {
        this.parallaxLoaded = true;
        // Initialize dust particles once layers are loaded
        this.initializeDustParticles();
      }
    };
    // Count both successful loads and errors to prevent blocking
    const images = [
      this.parallaxLayers.sky,
      this.parallaxLayers.backmid,
      this.parallaxLayers.treesThin,
      this.parallaxLayers.treesThick,
      this.parallaxLayers.pathShrubs,
      this.parallaxLayers.tree1,
      this.parallaxLayers.tree2,
      this.parallaxLayers.tree3
    ];
    images.forEach(img => {
      img.onload = checkAllLoaded;
      img.onerror = checkAllLoaded; // Count errors too so we don't get stuck
    });

    // Initialize player at home (far left)
    this.player = {
      id: 'player',
      name: 'PLAYER',
      x: 100, // Player Home position
      y: 0,
      width: 50,
      height: 70,
      color: '#3B82F6',
      outlineColor: '#FFFFFF',
      visible: true,
      bobOffset: 0,
      bobDirection: 1
    };

    // Initialize NPCs - NEW WORLD LAYOUT
    // X: 100 (Home) -> 700 (Woodcutter) -> 1600 (Elder) -> 2000 (Berry Bush) -> 2500 (Stone-worker) -> 3200 (Fisherman)
    
    this.woodcutter = {
      id: 'woodcutter',
      name: 'WOODCUTTER',
      x: 700,
      y: 0,
      width: 55,
      height: 75,
      color: '#8B4513', // Brown for wood theme
      outlineColor: '#5D2E0C',
      visible: true,
      bobOffset: 0,
      bobDirection: 1,
      originalX: 700
    };

    this.villageElder = {
      id: 'villageElder',
      name: 'VILLAGE ELDER',
      x: 1480, // Near Stone Tablet - original position
      y: 0,
      width: 60,
      height: 85,
      color: '#F8FAFC',
      outlineColor: '#64748B',
      visible: true,
      bobOffset: 0,
      bobDirection: 1
    };

    this.berryBush = {
      id: 'berryBush',
      name: 'BERRY BUSH',
      x: 2550, // Swapped with Stone Worker
      y: 0,
      width: 70,
      height: 50,
      color: '#22C55E', // Green bush
      outlineColor: '#DC2626', // Red berries
      visible: true,
      bobOffset: 0,
      bobDirection: 1
    };

    this.stoneWorker = {
      id: 'stoneWorker',
      name: 'STONE-WORKER',
      x: 2150, // Swapped with Berry Bush
      y: 0,
      width: 50,
      height: 70,
      color: '#6B7280', // Gray for stone
      outlineColor: '#374151',
      visible: true,
      bobOffset: 0,
      bobDirection: 1,
      originalX: 2150
    };

    this.fisherman = {
      id: 'fisherman',
      name: 'FISHERMAN',
      x: 3175,
      y: 0,
      width: 50,
      height: 70,
      color: '#F97316',
      outlineColor: '#C2410C',
      visible: true,
      bobOffset: 0,
      bobDirection: 1,
      originalX: 3175
    };

    this.npcs = [this.woodcutter, this.villageElder, this.berryBush, this.stoneWorker, this.fisherman];

    // Initialize game state
    this.state = {
      phase: 'intro',
      loop: 1,
      inventory: { stone: 0, fish: 0, wood: 0, berries: 0, slingshot: 1 },
      badges: [],
      showBadgePopup: false,
      pendingBadge: null,
      showInventoryHint: false,
      inventoryHintShown: false,
      pendingChoiceAfterHint: false,
      showTradeSelection: false,
      tradeSelectionCallback: null,
      roofRepaired: false,
      obtainedWood: false,
      obtainedStone: false,
      escortingNPC: null,
      woodcutterDebtRecorded: false,
      stoneWorkerDebtRecorded: false,
      woodcutterCarvingSoundPlayed: false,
      stoneWorkerCarvingSoundPlayed: false,
      playerBlockedForCarving: false,
      woodReceiveSoundPlayed: false,
      stoneReceiveSoundPlayed: false,
      woodcutterDisputed: false,
      stoneworkerDisputed: false,
      woodcutterSettled: false,
      stoneWorkerSettled: false,
      pendingWoodcutterDispute: false,
      pendingStoneWorkerDispute: false,
      elderVerified: false,
      elderWalkingToCelebrate: false,
      gaveInToWoodcutter: false,
      gaveInToStoneWorker: false,
      extraBerryAvailable: false,
      extraFishAvailable: false,
      resourcesDepleted: false,
      fishingSoundPlayed: false,
      woodIntroduced: false,
      fishIntroduced: false,
      stoneIntroduced: false,
      berriesIntroduced: false,
      slingshotIntroduced: true,
      ledgerEntries: [],
      dialogueQueue: [],
      currentDialogue: null,
      dialogueComplete: false,
      showInteractButton: false,
      nearbyNPC: null,
      nearbyLocation: null,
      elderEntranceProgress: 0,
      playerMood: 'neutral',
      moodTimer: 0,
      showHUD: false,
      quizAnswers: [],
      showQuiz: false,
      showSuccess: false,
      showQuizReview: false,
      showFail: false,
      showBrawl: false,
      brawlTimer: 0,
      showCelebration: false,
      celebrationTimer: 0,
      showNightTransition: false,
      nightTransitionTimer: 0,
      showThunderstorm: false,
      thunderstormTimer: 0,
      showCloudsAnimation: false,
      cloudsAnimationTimer: 0,
      showRainfall: false,
      rainfallTimer: 0,
      playerEnteredHut: false,
      playerFading: false,
      playerAlpha: 1,
      showStoneTabletPopup: false,
      showChoice: false,
      choiceOptions: []
    };

    // Trigger intro dialogue immediately
    setTimeout(() => this.triggerIntro(), 500);

    // Setup event listeners
    this.setupEventListeners();
    this.resize();
  }

  private triggerIntro(): void {
    if (this.state.loop === 1) {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "A storm is coming! I need Wood from the Woodcutter to fix my roof before nightfall.",
          onComplete: () => {
            this.state.phase = 'need_wood';
          }
        }
      ]);
    } else {
      // Loop 2 intro - player has knowledge
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "Wait... this feels familiar. The storm is coming again. This time, I should find a way to record my debts!",
          onComplete: () => {
            this.state.phase = 'loop2_need_wood';
          }
        }
      ]);
    }
  }

  private setupEventListeners(): void {
    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

    // Mouse events (for testing on desktop)
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Resize handler
    window.addEventListener('resize', this.resize.bind(this));
    
    // Keyboard handler for debug shortcuts
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Press 'Q' to instantly show quiz for debugging
    if (e.key === 'q' || e.key === 'Q') {
      console.log('DEBUG: Q pressed - showing quiz');
      this.state.showQuiz = true;
      this.state.phase = 'quiz';
      this.player.visible = true;
      this.state.playerAlpha = 1;
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    soundManager.init();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.processTouchStart(touch.clientX, touch.clientY);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.processTouchMove(touch.clientX);
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    this.processTouchEnd();
  }

  private handleMouseDown(e: MouseEvent): void {
    soundManager.init();
    this.processTouchStart(e.clientX, e.clientY);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.touchActive) {
      this.processTouchMove(e.clientX);
    }
  }

  private handleMouseUp(): void {
    this.processTouchEnd();
  }

  private processTouchEnd(): void {
    const holdDuration = performance.now() - this.touchStartTime;
    
    // If it was a quick tap (< holdThreshold), walk to that exact point
    if (holdDuration < this.holdThreshold && this.touchActive) {
      // Convert screen X to world X position
      const worldX = this.touchStartX + this.cameraX;
      // Clamp to world bounds
      const clampedWorldX = Math.max(this.player.width / 2, Math.min(this.worldWidth - this.player.width / 2, worldX));
      this.autoWalkTarget = { x: clampedWorldX, type: 'location' };
    }
    
    this.touchActive = false;
    this.moveDirection = 0;
  }

  private processTouchStart(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    // Use CSS pixel coordinates (context is scaled for DPR automatically)
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Handle Stone Tablet popup - click anywhere to close
    if (this.state.showStoneTabletPopup) {
      this.state.showStoneTabletPopup = false;
      return;
    }
    
    // Handle inventory popup - close only if clicking outside it
    if (this.showInventoryDetailPopup && this.inventoryDetailPopupArea) {
      const popup = this.inventoryDetailPopupArea;
      if (x < popup.x || x > popup.x + popup.w || y < popup.y || y > popup.y + popup.h) {
        this.showInventoryDetailPopup = false;
        return;
      }
      // Click inside popup - just consume the click
      return;
    }
    
    // Skip HUD checks when quiz is showing - quiz needs full screen interaction
    if (!this.state.showQuiz && !this.state.showQuizReview) {
      // Check if clicking on mute button
      if (this.muteButtonArea) {
        const btn = this.muteButtonArea;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          soundManager.toggleMute();
          soundManager.play('buttonClick');
          return;
        }
      }
      
      // Check if clicking on inventory HUD to open popup (also dismisses hint)
      if (this.inventoryButtonArea) {
        const btn = this.inventoryButtonArea;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          this.showInventoryDetailPopup = true;
          // Also dismiss inventory hint if showing
          if (this.state.showInventoryHint) {
            this.state.showInventoryHint = false;
            // Show pending choice after hint is dismissed
            if (this.state.pendingChoiceAfterHint) {
              this.state.pendingChoiceAfterHint = false;
              this.showWoodcutterTradeChoice();
            }
          }
          soundManager.play('buttonClick');
          return;
        }
      }
      
      // Check if clicking on Stone Tablet HUD to open popup
      if (this.state.showHUD) {
        const hudX = this.logicalWidth - this.hudWidth - 24;
        const hudY = 24;
        if (x >= hudX && x <= hudX + this.hudWidth && y >= hudY && y <= hudY + this.hudHeight) {
          this.state.showStoneTabletPopup = true;
          // Play stone ledger sound reduced by 1 second (getBufferDuration returns ms)
          const ledgerDuration = Math.max(500, soundManager.getBufferDuration('stoneLedger') - 1000);
          soundManager.playForDuration('stoneLedger', ledgerDuration);
          return;
        }
      }
    }
    
    // Block all other actions while inventory hint is showing in loop 1
    // Player must tap inventory to continue
    if (this.state.showInventoryHint && this.state.loop === 1) {
      return;
    }
    
    // Handle fail screen touches
    if (this.state.showFail) {
      this.handleFailTouch(x, y);
      return;
    }

    // Handle badge popup touches
    if (this.state.showBadgePopup) {
      this.handleBadgePopupTouch(x, y);
      return;
    }

    // Handle trade selection popup touches
    if (this.state.showTradeSelection) {
      this.handleTradeSelectionTouch(x, y);
      return;
    }

    // Handle choice dialogue touches
    if (this.state.showChoice) {
      this.handleChoiceTouch(x, y);
      return;
    }

    // Handle brawl animation - just wait
    if (this.state.showBrawl) {
      return;
    }
    
    // Handle quiz touches (check before night transition block since quiz shows over night scene)
    if (this.state.showQuiz) {
      this.handleQuizTouch(x, y);
      return;
    }

    // Handle quiz review touches (check before night transition block)
    if (this.state.showQuizReview) {
      this.handleQuizReviewTouch(x, y);
      return;
    }

    // Block input during night transition (cutscene) - but allow quiz/quiz review above
    if (this.state.showNightTransition) {
      return;
    }

    // Handle success screen touches
    if (this.state.showSuccess) {
      this.handleSuccessTouch(x, y);
      return;
    }

    // DIALOGUE TAKES PRIORITY over interact button to prevent blocking phase transitions
    if (this.state.currentDialogue) {
      if (this.state.dialogueComplete) {
        this.advanceDialogue();
      } else {
        // Skip to full text
        this.dialogueCharIndex = this.state.currentDialogue.text.length;
        this.state.dialogueComplete = true;
      }
      return;
    }
    
    // Block player walking/interactions while carving (but allow dialogue above)
    if (this.state.playerBlockedForCarving) {
      return;
    }

    // Check if touching interact button (only when no dialogue active)
    if (this.state.showInteractButton && this.interactButtonOpacity > 0.5) {
      if (this.isInteractButtonTouched(x, y)) {
        this.handleInteraction();
        return;
      }
    }
    // Check if tapping directly on an NPC, home, or berry bush
    // Set auto-walk target - player will walk there and interact on arrival
    const tappedTarget = this.getTappedInteractable(x, y);
    const interactionRange = 25; // Small range for natural proximity-based interactions
    
    if (tappedTarget) {
      if (tappedTarget === 'home') {
        const inRange = Math.abs(this.player.x - this.playerHomeX) < interactionRange;
        if (inRange) {
          this.handleHomeInteraction();
          this.autoWalkTarget = null;
          return;
        } else {
          // Set auto-walk target to home, clear manual movement
          this.autoWalkTarget = { x: this.playerHomeX, type: 'home' };
          this.moveDirection = 0;
          this.touchActive = false;
          return;
        }
      } else if (tappedTarget === 'stoneTablet') {
        const inRange = Math.abs(this.player.x - this.villageCenterX) < interactionRange;
        if (inRange) {
          // Open the Stone Tablet popup view (same as clicking the HUD)
          this.state.showStoneTabletPopup = true;
          // Play stone ledger sound reduced by 1 second (getBufferDuration returns ms)
          const ledgerDuration = Math.max(500, soundManager.getBufferDuration('stoneLedger') - 1000);
          soundManager.playForDuration('stoneLedger', ledgerDuration);
          // Also trigger any game-related Stone Tablet interaction
          this.handleStoneTabletInteraction();
          this.autoWalkTarget = null;
          return;
        } else {
          // Set auto-walk target to Stone Tablet, clear manual movement
          this.autoWalkTarget = { x: this.villageCenterX, type: 'stoneTablet' };
          this.moveDirection = 0;
          this.touchActive = false;
          return;
        }
      } else {
        // Check if player is within range of the NPC
        const inRange = Math.abs(this.player.x - tappedTarget.x) < interactionRange;
        if (inRange) {
          this.triggerNPCInteraction(tappedTarget.id);
          this.autoWalkTarget = null;
          return;
        } else {
          // Set auto-walk target to NPC, clear manual movement
          if (tappedTarget.id === 'berryBush') {
            this.autoWalkTarget = { x: tappedTarget.x, type: 'berryBush', id: tappedTarget.id };
          } else {
            this.autoWalkTarget = { x: tappedTarget.x, type: 'npc', id: tappedTarget.id };
          }
          this.moveDirection = 0;
          this.touchActive = false;
          return;
        }
      }
    }

    // Start tracking for hold vs tap detection
    // On touch start, begin hold movement immediately
    // On touch end, if it was a quick tap, walk to that point instead
    this.touchStartTime = performance.now();
    this.touchStartX = x;
    this.touchStartY = y;
    this.touchActive = true;
    this.touchX = x;
    this.autoWalkTarget = null; // Cancel any existing auto-walk
    this.updateMoveDirection(x);
  }
  
  // Helper to trigger NPC interaction by id
  private triggerNPCInteraction(npcId: string): void {
    if (npcId === 'woodcutter') {
      this.handleWoodcutterInteraction();
    } else if (npcId === 'villageElder') {
      this.handleElderInteraction();
    } else if (npcId === 'berryBush') {
      this.handleBerryBushInteraction();
    } else if (npcId === 'stoneWorker') {
      this.handleStoneWorkerInteraction();
    } else if (npcId === 'fisherman') {
      this.handleFishermanInteraction();
    }
  }

  private processTouchMove(clientX: number): void {
    if (!this.touchActive) return;
    const rect = this.canvas.getBoundingClientRect();
    // Use CSS pixel coordinates
    const x = clientX - rect.left;
    this.touchX = x;
    this.updateMoveDirection(x);
  }

  private updateMoveDirection(x: number): void {
    const halfWidth = this.logicalWidth / 2;
    this.moveDirection = x < halfWidth ? -1 : 1;
  }

  private isInteractButtonTouched(x: number, y: number): boolean {
    const size = this.interactButtonSize;
    const btnX = this.logicalWidth - size - 32;
    // Center vertically on the ground horizon line (between ground and dialogue box)
    const groundY = this.logicalHeight - this.groundHeight - this.dialogueBoxHeight;
    const dialogueTop = this.logicalHeight - this.dialogueBoxHeight;
    const btnY = groundY + (dialogueTop - groundY - size) / 2;
    // Precise touch area - no extra padding beyond button bounds
    const padding = 5;
    return x >= btnX - padding && x <= btnX + size + padding && 
           y >= btnY - padding && y <= btnY + size + padding;
  }
  
  // Check if player tapped directly on an NPC, home hut, stone tablet, or berry bush
  // Prioritizes the NPC closest to the player when multiple hitboxes overlap
  private getTappedInteractable(x: number, y: number): Character | 'home' | 'stoneTablet' | null {
    const groundY = this.logicalHeight - this.groundHeight - this.dialogueBoxHeight;
    
    // Check if tapping on home hut (at playerHomeX = 100)
    const homeScreenX = this.playerHomeX - this.cameraX;
    const homeHitbox = { x: homeScreenX - 50, y: groundY - 120, width: 100, height: 120 };
    if (x >= homeHitbox.x && x <= homeHitbox.x + homeHitbox.width &&
        y >= homeHitbox.y && y <= homeHitbox.y + homeHitbox.height) {
      return 'home';
    }
    
    // Collect all NPCs whose hitbox contains the tap point FIRST (priority over Stone Tablet)
    const tappedNPCs: { npc: Character; distanceToTap: number }[] = [];
    
    for (const npc of this.npcs) {
      if (!npc.visible) continue;
      const npcScreenX = npc.x - this.cameraX;
      // Use same Y calculation as drawCharacter (npc.y is set to groundY - height in resize)
      const npcScreenY = npc.y + (npc.bobOffset || 0);
      // Generous hitbox for tap targeting
      const hitbox = {
        x: npcScreenX - npc.width / 2 - 20,
        y: npcScreenY - 20,
        width: npc.width + 40,
        height: npc.height + 40
      };
      if (x >= hitbox.x && x <= hitbox.x + hitbox.width &&
          y >= hitbox.y && y <= hitbox.y + hitbox.height) {
        // Calculate distance from tap point to NPC center (prioritize NPC you're tapping on)
        const npcCenterX = npcScreenX;
        const npcCenterY = npcScreenY + npc.height / 2;
        const distanceToTap = Math.sqrt(Math.pow(x - npcCenterX, 2) + Math.pow(y - npcCenterY, 2));
        tappedNPCs.push({ npc, distanceToTap });
      }
    }
    
    // Return the NPC closest to the tap point (the one you're actually clicking on)
    if (tappedNPCs.length > 0) {
      tappedNPCs.sort((a, b) => a.distanceToTap - b.distanceToTap);
      return tappedNPCs[0].npc;
    }
    
    // Check if tapping on Stone Tablet (at villageCenterX = 1600) - AFTER NPCs
    const tabletScreenX = this.villageCenterX - this.cameraX;
    const tabletHitbox = { x: tabletScreenX - 40, y: groundY - 100, width: 80, height: 100 };
    if (x >= tabletHitbox.x && x <= tabletHitbox.x + tabletHitbox.width &&
        y >= tabletHitbox.y && y <= tabletHitbox.y + tabletHitbox.height) {
      return 'stoneTablet';
    }
    
    return null;
  }

  private handleInteraction(): void {
    // Handle NPC interactions first
    if (this.state.nearbyNPC) {
      const npc = this.state.nearbyNPC;

      if (npc.id === 'woodcutter') {
        this.handleWoodcutterInteraction();
      } else if (npc.id === 'villageElder') {
        this.handleElderInteraction();
      } else if (npc.id === 'berryBush') {
        this.handleBerryBushInteraction();
      } else if (npc.id === 'stoneWorker') {
        this.handleStoneWorkerInteraction();
      } else if (npc.id === 'fisherman') {
        this.handleFishermanInteraction();
      }
    }
    // Handle location interactions
    else if (this.state.nearbyLocation === 'home') {
      this.handleHomeInteraction();
    }
    else if (this.state.nearbyLocation === 'stoneTablet') {
      this.handleStoneTabletInteraction();
    }

    this.notifyStateChange();
  }

  // ============ HOME / HUT INTERACTION ============
  private handleHomeInteraction(): void {
    const hasWood = this.state.inventory.wood >= 1;
    
    // Check if debts are already settled (Loop 2 success path)
    const debtsSettled = this.state.phase === 'loop2_return' || 
                         this.state.phase === 'complete_success' || 
                         this.state.phase === 'complete';
    
    // LOOP 2 SUCCESS: Debts settled, time to return home
    // Player must interact with hut to fix roof and enter - allow interaction even during clouds animation
    if (debtsSettled && this.state.loop === 2 && !this.state.showQuiz && !this.state.showNightTransition && !this.state.showSuccess && !this.state.playerEnteredHut) {
      
      // If roof needs fixing, fix it first, then trigger storm sequence
      if (!this.state.roofRepaired && hasWood) {
        this.queueDialogue([
          {
            speaker: 'YOU',
            text: "Just in time! Let me fix my roof before the storm hits!",
            onComplete: () => {
              // Block player movement after roof repair until entering hut
              this.state.playerBlockedForCarving = true;
              
              // Play hammer sound shortened by 2 seconds
              const hammerDuration = Math.max(1000, soundManager.getBufferDuration('roofHammer') - 2000);
              soundManager.playForDuration('roofHammer', hammerDuration);
              this.state.roofRepaired = true;
              this.state.inventory.wood = 0;
              this.showInventoryPopup('ROOF FIXED! (-1 WOOD)');
              this.setMood('happy');
              
              // After roof fix: play 3 footsteps, then player enters hut
              setTimeout(() => {
                soundManager.play('footstepA', 1.0);
                setTimeout(() => {
                  soundManager.play('footstepA', 0.95);
                  setTimeout(() => {
                    soundManager.play('footstepA', 1.0);
                    // Player enters hut after footsteps
                    setTimeout(() => {
                      this.triggerEnterHutSequence();
                    }, 300);
                  }, 250);
                }, 250);
              }, 500);
            }
          }
        ]);
        return;
      }
      
      // Roof already fixed - player enters directly
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "Safe inside! The storm can come now.",
          onComplete: () => {
            // Block player movement until entering hut
            this.state.playerBlockedForCarving = true;
            
            // Play 3 footsteps, then player enters hut
            setTimeout(() => {
              soundManager.play('footstepA', 1.0);
              setTimeout(() => {
                soundManager.play('footstepA', 0.95);
                setTimeout(() => {
                  soundManager.play('footstepA', 1.0);
                  // Player enters hut after footsteps
                  setTimeout(() => {
                    this.triggerEnterHutSequence();
                  }, 300);
                }, 250);
              }, 250);
            }, 300);
          }
        }
      ]);
      return;
    }
    
    // Regular home interaction (not loop2_return)
    
    // Roof already repaired
    if (this.state.roofRepaired) {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "My roof is fixed now. It will hold through the storm!"
        }
      ]);
      return;
    }
    
    // No wood yet - can't repair
    if (!hasWood) {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "I need to get Wood from the Woodcutter to fix this hole in my roof."
        }
      ]);
      return;
    }
    
    // Has wood - can repair!
    this.queueDialogue([
      {
        speaker: 'YOU',
        text: "I'll use this wood to fix the hole in my roof!",
        onComplete: () => {
          // Play hammer sound shortened by 2 seconds
          const hammerDuration = Math.max(1000, soundManager.getBufferDuration('roofHammer') - 2000);
          soundManager.playForDuration('roofHammer', hammerDuration);
          this.state.roofRepaired = true;
          this.state.inventory.wood = 0;
          this.showInventoryPopup('ROOF FIXED! (-1 WOOD)');
          this.setMood('happy');
        }
      }
    ]);
    
    // Check if player still has outstanding debts (Loop 1 or Loop 2 not yet settled)
    const hasOutstandingDebts = this.state.ledgerEntries.some(e => e.debt.includes('OWED'));
    const isLoop1 = this.state.loop === 1;
    const needsToSettleDebts = isLoop1 || hasOutstandingDebts;
    
    // Prompt to settle debts if roof is now fixed but debts outstanding
    // Only show reminder if no dialogue is currently active to avoid interrupting
    if (needsToSettleDebts) {
      setTimeout(() => {
        if (!this.state.currentDialogue) {
          this.queueDialogue([
            {
              speaker: 'YOU',
              text: "Roof is fixed! But I still need to settle my debts with the villagers. I should head to the Village Center."
            }
          ]);
        }
      }, 2000);
    }
  }
  
  // Trigger the enter hut sequence - player fades into hut, then rain starts
  private triggerEnterHutSequence(): void {
    // Prevent multiple calls - only trigger once per game
    if (this.rainSoundStarted || this.state.playerFading) {
      return;
    }
    
    // Start player fade animation
    this.state.playerFading = true;
    // Player alpha will decrease in update() until 0, then visible=false and playerEnteredHut=true
    
    // Wait 2.5 seconds before starting rain (after roof hammer sound completes)
    setTimeout(() => {
      try {
        // Start rainfall (5 seconds overlay on scene)
        this.state.showRainfall = true;
        this.state.rainfallTimer = 0;
        if (!this.rainSoundStarted) {
          this.rainSoundStarted = true;
          soundManager.fadeIn('rain', 2000); // 2 second fade in, plays once
          soundManager.play('thunder'); // Thunder plays directly when rain begins
        }
        
        // Sequence: rainfall 16s → night transition 6s → quiz (3s delay)
        setTimeout(() => {
          try {
            // Start night transition with fade (rain continues and fades)
            this.state.showNightTransition = true;
            this.state.nightTransitionTimer = 0;
            soundManager.fadeIn('ambientNight', 1000);
            soundManager.fadeIn('backgroundMusicNight', 2000);
            
            setTimeout(() => {
              try {
                this.state.showRainfall = false; // Turn off rain
                soundManager.fadeOut('rain', 6000); // 6 second fade out
                // Keep night scene visible for 1 extra second, then show quiz with night background
                setTimeout(() => {
                  this.state.showQuiz = true;
                  this.state.phase = 'quiz';
                  // Keep showNightTransition true so night scene stays in background
                  // Restore player visibility for quiz
                  this.player.visible = true;
                  this.state.playerEnteredHut = false;
                  this.state.playerAlpha = 1; // Reset alpha
                }, 4000); // 4 seconds delay (1 more than before)
              } catch (e) {
                console.error('Error in quiz transition:', e);
              }
            }, 7000); // 7 second fade to night (1s longer for peaceful nighttime)
          } catch (e) {
            console.error('Error in rainfall transition:', e);
          }
        }, 6000); // 6 second rainfall (halved again)
      } catch (e) {
        console.error('Error starting rain:', e);
      }
    }, 2500); // Wait 2.5 seconds after entering hut before rain starts
  }

  // Trigger the return home sequence with clouds animation (unused - kept for reference)
  private triggerReturnHomeSequence(): void {
    // Start player fade animation
    this.state.playerFading = true;
    // Player alpha will decrease in update() until 0, then visible=false and playerEnteredHut=true
    
    // Start dark clouds animation (2.5 seconds)
    this.state.showCloudsAnimation = true;
    this.state.cloudsAnimationTimer = 0;
    soundManager.fadeOut('backgroundMusicDay', 1000);
    soundManager.fadeOut('ambientVillage', 1000);
    soundManager.play('thunder');
    
    // Sequence: clouds 2.5s → rainfall 17s → night transition 6s → quiz (3s delay)
    setTimeout(() => {
      try {
        this.state.showCloudsAnimation = false;
        // Start rainfall animation
        this.state.showRainfall = true;
        this.state.rainfallTimer = 0;
        if (!this.rainSoundStarted) {
          this.rainSoundStarted = true;
          soundManager.fadeIn('rain', 500); // Plays once
          soundManager.fadeIn('ambientNight', 500); // Start ambient night sounds with storm
        }
        
        setTimeout(() => {
          try {
            // Keep rainfall visible during night transition for smooth blend
            // Start night transition with fade (rain continues)
            this.state.showNightTransition = true;
            this.state.nightTransitionTimer = 0;
            soundManager.fadeIn('ambientVillage', 2000);
            soundManager.fadeIn('backgroundMusicNight', 2000);
            
            setTimeout(() => {
              try {
                this.state.showRainfall = false; // Now turn off rain
                soundManager.fadeOut('rain', 6000); // 6 second fade out
                soundManager.fadeOut('ambientNight', 1000); // Fade out ambient night
                this.state.showNightTransition = false;
                // Delay quiz appearance by 3 seconds
                setTimeout(() => {
                  this.state.showQuiz = true;
                  this.state.phase = 'quiz';
                  // Restore player visibility for quiz
                  this.player.visible = true;
                  this.state.playerEnteredHut = false;
                  this.state.playerAlpha = 1; // Reset alpha
                }, 3000);
              } catch (e) {
                console.error('Error in quiz transition:', e);
              }
            }, 6000); // 6 second fade to night
          } catch (e) {
            console.error('Error in rainfall transition:', e);
          }
        }, 17000); // 17 second rainfall (extended by 11 seconds)
      } catch (e) {
        console.error('Error in clouds transition:', e);
      }
    }, 2500); // 2.5 second clouds animation
  }

  // ============ STONE TABLET INTERACTION ============
  // Trustless verification - player can check the tablet directly without Elder
  private handleStoneTabletInteraction(): void {
    const phase = this.state.phase;
    
    // Loop 1: Show the tablet with elder wisdom about record-keeping
    if (this.state.loop !== 2) {
      // Show the Stone Tablet HUD briefly
      this.state.showHUD = true;
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "The Stone Tablet has words of wisdom from the Village Elder carved into it."
        },
        {
          speaker: 'VILLAGE ELDER',
          text: "This tablet holds great power, young one. A promise remembered by one is easily forgotten by another."
        },
        {
          speaker: 'VILLAGE ELDER',
          text: "When debts are carved in stone, no one can deny what was agreed. Trust becomes something you can verify, not just believe."
        }
      ]);
      return;
    }
    
    // Check if any debts are recorded
    const hasRecordedDebts = this.state.ledgerEntries.length > 0;
    
    if (!hasRecordedDebts) {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "The Stone Tablet is empty. No debts have been recorded here."
        }
      ]);
      return;
    }
    
    // Display all recorded debts
    const woodcutterEntry = this.state.ledgerEntries.find(e => e.name === 'Woodcutter' || e.debt.includes('WOODCUTTER'));
    const stoneWorkerEntry = this.state.ledgerEntries.find(e => e.name === 'Stone-worker' || e.debt.includes('STONE-WORKER'));
    
    // Build dialogue showing recorded debts
    const dialogueLines: DialogueLine[] = [
      {
        speaker: 'YOU',
        text: "Let me check the Stone Tablet..."
      }
    ];
    
    if (woodcutterEntry) {
      const isSettled = woodcutterEntry.debt.includes('SETTLED');
      dialogueLines.push({
        speaker: 'STONE TABLET',
        text: `Woodcutter: 1 Stone + 1 Fish ${isSettled ? '(SETTLED)' : '(OWED)'}`
      });
    }
    
    if (stoneWorkerEntry) {
      const isSettled = stoneWorkerEntry.debt.includes('SETTLED');
      dialogueLines.push({
        speaker: 'STONE TABLET',
        text: `Stone-worker: 2 Fish ${isSettled ? '(SETTLED)' : '(OWED)'}`
      });
    }
    
    dialogueLines.push({
      speaker: 'YOU',
      text: "The truth is carved in stone for all to see!"
    });
    
    // If in verification phase and both debts recorded, allow settlement
    if (phase === 'loop2_verify_at_tablet' || phase === 'loop2_got_fish') {
      if (this.state.woodcutterDebtRecorded && this.state.stoneWorkerDebtRecorded) {
        // Mark as verified - NPCs will accept payment
        this.state.elderVerified = true;
        dialogueLines.push({
          speaker: 'YOU',
          text: "The Tablet proves the true amounts. Now I can pay what I actually owe!"
        });
      }
    }
    
    this.queueDialogue(dialogueLines);
  }

  // ============ LOOP 1 & 2: WOODCUTTER ============
  // ESCORT FLOW: NPC accompanies player to tablet, records debt, THEN gives item
  private handleWoodcutterInteraction(): void {
    const phase = this.state.phase;
    
    // LOOP 1: Double coincidence of wants dialogue - verbal promise
    if (phase === 'need_wood') {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "Hello! A storm is coming and I need wood to fix my roof. Can you help me?"
        },
        {
          speaker: 'WOODCUTTER',
          text: "Sure, I can give you some wood. But I don't give things away for free! Do you have something to trade?",
          onComplete: () => {
            // Show inventory hint on first trade interaction - BEFORE yes/no choice
            if (!this.state.inventoryHintShown) {
              this.state.showInventoryHint = true;
              this.state.inventoryHintShown = true;
              // Hint stays visible until player taps inventory - choice appears after
              this.state.pendingChoiceAfterHint = true;
            } else {
              // Show Yes/No choice immediately if hint already shown
              this.showWoodcutterTradeChoice();
            }
          }
        }
      ]);
    }
    // LOOP 2: Double coincidence of wants with choice to record
    else if (phase === 'loop2_need_wood') {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "Hello! A storm is coming and I need wood to fix my roof. Can you help me?"
        },
        {
          speaker: 'WOODCUTTER',
          text: "Sure, I can give you some wood. But I don't give things away for free! Do you have something to trade?",
          onComplete: () => {
            // Show Yes/No choice
            this.state.showChoice = true;
            this.state.choiceOptions = [
              {
                text: "Yes, I do!",
                action: () => {
                  this.state.showChoice = false;
                  // Show trade selection popup
                  this.showTradeSelection((selectedItem) => {
                    if (selectedItem === null || selectedItem === 'cancel') {
                      this.continueWoodcutterTradeDialogueLoop2(null);
                    } else {
                      this.continueWoodcutterTradeDialogueLoop2(selectedItem);
                    }
                  });
                }
              },
              {
                text: "No, I don't",
                action: () => {
                  this.state.showChoice = false;
                  this.continueWoodcutterTradeDialogueLoop2(null);
                }
              }
            ];
          }
        }
      ]);
    }
    // Loop 2: Arrived at tablet during escort
    else if (phase === 'loop2_escorting_woodcutter') {
      // Prevent re-triggering dialogue if carving already started
      if (this.state.woodcutterCarvingSoundPlayed || this.state.currentDialogue) {
        return;
      }
      
      const playerAtCenter = Math.abs(this.player.x - this.villageCenterX) < 200;
      const woodcutterAtCenter = Math.abs(this.woodcutter.x - this.villageCenterX) < 200;
      
      if (playerAtCenter && woodcutterAtCenter) {
        const recorded = this.state.woodcutterDebtRecorded;
        
        if (recorded) {
          // Carving sequence: NPC is stopped at tablet, play carving sound, record debt, THEN deliver item
          this.queueDialogue([
            {
              speaker: 'WOODCUTTER',
              text: "Let me carve this agreement into the Stone Tablet...",
              onComplete: () => {
                // Block player movement during carving
                this.state.playerBlockedForCarving = true;
                
                // Only play carving sound once per carve (prevent double-trigger)
                if (!this.state.woodcutterCarvingSoundPlayed) {
                  this.state.woodcutterCarvingSoundPlayed = true;
                  soundManager.playForDuration('stoneCarve', 2500);
                  
                  // Award Ledger badge 1 second after carving starts (if second entry)
                  const alreadyRecorded = this.state.ledgerEntries.some(e => e.debt.includes('WOODCUTTER'));
                  if (!alreadyRecorded && this.state.ledgerEntries.length >= 1) {
                    setTimeout(() => {
                      this.awardBadge(
                        'Ledger Master',
                        'You recorded your second debt on the Stone Tablet! A shared ledger is a permanent record that everyone can verify - no more disputes about who owes what. Money is a system for humans to keep track of debt.'
                      );
                    }, 1000);
                  }
                }
                // After carving sound, record debt and deliver item
                setTimeout(() => {
                  // Only add entry if not already recorded (prevent duplicates)
                  const alreadyRecorded = this.state.ledgerEntries.some(e => e.debt.includes('WOODCUTTER'));
                  if (!alreadyRecorded) {
                    this.state.ledgerEntries.push({ name: 'PLAYER', debt: '1 STONE + 1 FISH | OWED TO WOODCUTTER' });
                  }
                  this.state.showHUD = true;
                  this.hudGlow = 1;
                  // Now deliver the wood and move to final position
                  this.queueDialogue([
                    {
                      speaker: 'WOODCUTTER',
                      text: "The debt is now recorded! Here's your Wood.",
                      onComplete: () => {
                        // Unblock player movement after receiving item
                        this.state.playerBlockedForCarving = false;
                        this.state.inventory.wood = 1;
                        this.state.obtainedWood = true;
                        this.state.woodIntroduced = true;
                        this.state.stoneIntroduced = true;
                        this.state.fishIntroduced = true;
                        // Only play receive sound once (prevent triple-trigger)
                        if (!this.state.woodReceiveSoundPlayed) {
                          this.state.woodReceiveSoundPlayed = true;
                          this.showInventoryPopup('+1 WOOD');
                        }
                        this.setMood('happy');
                        this.state.phase = 'loop2_got_wood';
                        this.state.escortingNPC = null;
                        this.woodcutter.targetX = this.villageCenterX + 80;
                      }
                    }
                  ]);
                }, 2500); // Wait for carving sound to finish
              }
            }
          ]);
        } else {
          // Verbal promise path - deliver item immediately
          this.queueDialogue([
            {
              speaker: 'WOODCUTTER',
              text: "We're at the center. Here's your Wood. Remember, you owe me a Sharp Stone and 1 Fish!",
              onComplete: () => {
                this.state.inventory.wood = 1;
                this.state.obtainedWood = true;
                this.state.woodIntroduced = true;
                this.state.stoneIntroduced = true;
                this.state.fishIntroduced = true;
                // Only play receive sound once (prevent triple-trigger)
                if (!this.state.woodReceiveSoundPlayed) {
                  this.state.woodReceiveSoundPlayed = true;
                  this.showInventoryPopup('+1 WOOD');
                }
                this.setMood('happy');
                this.state.phase = 'loop2_got_wood';
                this.state.escortingNPC = null;
                this.woodcutter.targetX = this.villageCenterX + 80;
              }
            }
          ]);
        }
      } else {
        this.queueDialogue([
          {
            speaker: 'WOODCUTTER',
            text: "Let's keep walking to the Stone Tablet at the Village Center!"
          }
        ]);
      }
    }
    // Player has wood but hasn't returned with stone+fish yet 
    else if (phase === 'got_wood_need_stone' || phase === 'loop2_got_wood') {
      this.queueDialogue([
        {
          speaker: 'WOODCUTTER',
          text: "Remember, you owe me a Sharp Stone and 1 Fish! Visit the Stone-worker to the east."
        }
      ]);
    }
    // Player has stone but still needs fish
    else if (phase === 'got_stone_need_fish' || phase === 'loop2_got_stone') {
      this.queueDialogue([
        {
          speaker: 'WOODCUTTER',
          text: "You have my Stone! Now get my 1 Fish from the Fisherman, then meet me at the Town Center!"
        }
      ]);
    }
    // Player has everything, ready to settle (Loop 1)
    else if (phase === 'got_fish_ready_settle') {
      this.queueDialogue([
        {
          speaker: 'WOODCUTTER',
          text: "You have everything! Meet me at the Town Center to settle your debt!"
        }
      ]);
    }
    // LOOP 1 SETTLEMENT: Player tries to settle - Woodcutter claims inflated debt
    else if (phase === 'settlement' && !this.state.woodcutterDisputed) {
      // Woodcutter steps to position (right of Elder to avoid overlap)
      this.woodcutter.targetX = this.villageCenterX + 80;
      this.queueDialogue([
        {
          speaker: 'WOODCUTTER',
          text: "Finally! Give me my Sharp Stone and the 3 Fish you promised!",
          onComplete: () => {
            this.setMood('angry');
          }
        },
        {
          speaker: 'YOU',
          text: "3 Fish?! I only promised you 1 Fish along with the stone!"
        },
        {
          speaker: 'WOODCUTTER',
          text: "You're lying! I remember clearly - you said 3 Fish!",
          onComplete: () => {
            this.state.woodcutterDisputed = true;
          }
        }
      ]);
    }
    // After Woodcutter dispute
    else if (phase === 'settlement' && this.state.woodcutterDisputed) {
      this.queueDialogue([
        {
          speaker: 'WOODCUTTER',
          text: "I know what you promised! 3 Fish, not 1! Talk to the Stone-worker too!"
        }
      ]);
    }
    // Loop 2: Direct settlement attempt - NPC always disputes first
    else if (phase === 'loop2_got_fish' || phase === 'loop2_verify_at_tablet') {
      const hasFishForWoodcutter = this.state.inventory.fish >= 1;
      
      if (!hasFishForWoodcutter) {
        // Check if resources are depleted - player can't get more fish, trigger brawl
        if (this.state.resourcesDepleted || this.state.gaveInToStoneWorker) {
          this.queueDialogue([
            {
              speaker: 'YOU',
              text: "I... I can't get any more fish. The Fisherman is all out..."
            },
            {
              speaker: 'WOODCUTTER',
              text: "You paid the Stone-worker and left me with nothing?! This is outrageous!",
              onComplete: () => {
                // Trigger brawl
                this.woodcutter.targetX = this.player.x - 30;
                this.stoneWorker.targetX = this.player.x + 30;
                this.villageElder.targetX = this.villageCenterX + 200;
                this.state.showBrawl = true;
                this.state.brawlTimer = 0;
                soundManager.stopDaytimeMusic();
                soundManager.playBrawlWithLayers(4000);
              }
            }
          ]);
          return;
        }
        this.queueDialogue([
          {
            speaker: 'WOODCUTTER',
            text: "You still owe me Fish! Trade berries with the Fisherman first."
          }
        ]);
        return;
      }
      
      // If already settled, check if player should go home
      if (this.state.woodcutterSettled) {
        if (this.state.stoneWorkerSettled) {
          // Both debts settled - remind to go home
          this.queueDialogue([
            {
              speaker: 'WOODCUTTER',
              text: "All debts are settled! You should hurry home and fix your roof before the storm!"
            }
          ]);
        } else {
          this.queueDialogue([
            {
              speaker: 'WOODCUTTER',
              text: "We're all settled! Thanks for being honest."
            }
          ]);
        }
        return;
      }
      
      // If player agreed to give in to inflated demand, handle that payment
      if (this.state.gaveInToWoodcutter) {
        const needsFish = 3;
        if (this.state.inventory.fish >= needsFish) {
          this.state.inventory.fish -= needsFish;
          // CRITICAL: Resources are now depleted after paying inflated demand
          // This makes it impossible to gather more resources for Stone-worker's inflated demand
          this.state.resourcesDepleted = true;
          this.state.extraBerryAvailable = false;
          this.state.extraFishAvailable = false;
          this.setMood('happy');
          this.queueDialogue([
            {
              speaker: 'WOODCUTTER',
              text: "That's all 3 Fish! Debt settled.",
              onComplete: () => {
                soundManager.play('settle');
                this.state.woodcutterSettled = true;
                // Update ledger to SETTLED immediately
                if (this.state.woodcutterDebtRecorded) {
                  this.state.ledgerEntries = this.state.ledgerEntries.map(e => 
                    e.debt.includes('WOODCUTTER') ? { ...e, debt: e.debt.replace('OWED', 'SETTLED').replace('VERIFIED', 'SETTLED') } : e
                  );
                  this.hudGlow = 1;
                }
                if (this.state.stoneWorkerSettled) {
                  this.checkAllDebtsSettled();
                }
              }
            }
          ]);
        } else {
          // Player can't pay - trigger confession and brawl
          this.queueDialogue([
            {
              speaker: 'YOU',
              text: "I... I don't have enough fish. I gave in to the Stone-worker's demands..."
            },
            {
              speaker: 'WOODCUTTER',
              text: "WHAT?! You paid the Stone-worker but not me?! This is outrageous!",
              onComplete: () => {
                // Trigger brawl
                this.woodcutter.targetX = this.player.x - 30;
                this.stoneWorker.targetX = this.player.x + 30;
                this.villageElder.targetX = this.villageCenterX + 200;
                this.state.showBrawl = true;
                this.state.brawlTimer = 0;
                soundManager.stopDaytimeMusic();
                soundManager.playBrawlWithLayers(4000);
              }
            }
          ]);
        }
        return;
      }
      
      // If Elder verified (directly or via tablet), NPC accepts payment without dispute
      if (this.state.elderVerified) {
        // Check if player has both stone and fish for payment
        const hasStone = this.state.inventory.stone >= 1;
        const hasFish = this.state.inventory.fish >= 1;
        
        if (!hasStone || !hasFish) {
          this.queueDialogue([
            {
              speaker: 'WOODCUTTER',
              text: `You still need to bring me ${!hasStone ? '1 Stone' : ''}${!hasStone && !hasFish ? ' and ' : ''}${!hasFish ? '1 Fish' : ''} as recorded on the Tablet.`
            }
          ]);
          return;
        }
        
        // Accept the fair amount - take both stone and fish
        this.state.inventory.stone -= 1;
        this.state.inventory.fish -= 1;
        this.setMood('happy');
        const verificationText = this.state.woodcutterDebtRecorded 
          ? "The Tablet shows the true record - 1 Stone + 1 Fish. Thank you!"
          : "The Elder confirmed the true amount - 1 Stone + 1 Fish. Thank you!";
        this.queueDialogue([
          {
            speaker: 'WOODCUTTER',
            text: verificationText,
            onComplete: () => {
              soundManager.play('settle');
              if (this.state.woodcutterDebtRecorded) {
                this.state.ledgerEntries = this.state.ledgerEntries.map(e => 
                  e.name === 'Woodcutter' ? { ...e, debt: e.debt.replace('OWED', 'SETTLED') } : e
                );
              }
              this.hudGlow = 1;
              this.state.woodcutterSettled = true;
              this.checkAllDebtsSettled();
            }
          }
        ]);
        return;
      }
      
      // NPC disputes - triggers verification need
      this.setMood('angry');
      this.queueDialogue([
        {
          speaker: 'WOODCUTTER',
          text: "1 Fish?! I remember you promised me 3 Fish for that wood! Are you trying to cheat me?!"
        }
      ]);
      
      // Show choice after dispute dialogue ends
      this.state.pendingWoodcutterDispute = true;
    }
    // Loop 2 SUCCESS: Debts settled via ledger
    else if (phase === 'loop2_return') {
      this.setMood('happy');
      this.queueDialogue([
        {
          speaker: 'WOODCUTTER',
          text: "The Stone Tablet shows all debts are settled. Thank you for your honesty!",
          onComplete: () => {
            this.state.phase = 'complete_success';
          }
        }
      ]);
    } 
    else {
      this.queueDialogue([
        {
          speaker: 'WOODCUTTER',
          text: "Hello traveler! I can help you with wood if you need it."
        }
      ]);
    }
  }

  // Show the yes/no trade choice for woodcutter (Loop 1)
  private showWoodcutterTradeChoice(): void {
    this.state.showChoice = true;
    this.state.choiceOptions = [
      {
        text: "Yes, I do!",
        action: () => {
          this.state.showChoice = false;
          // Show trade selection popup
          this.showTradeSelection((selectedItem) => {
            if (selectedItem === null || selectedItem === 'cancel') {
              // Player changed their mind
              this.continueWoodcutterTradeDialogue(null);
            } else {
              this.continueWoodcutterTradeDialogue(selectedItem);
            }
          });
        }
      },
      {
        text: "No, I don't",
        action: () => {
          this.state.showChoice = false;
          this.continueWoodcutterTradeDialogue(null);
        }
      }
    ];
  }

  // Loop 1: Continue woodcutter dialogue after trade offer
  private continueWoodcutterTradeDialogue(offeredItem: string | null): void {
    if (offeredItem === null) {
      // Player said no or cancelled
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "Actually, I don't have anything you'd want..."
        },
        {
          speaker: 'WOODCUTTER',
          text: "That's the problem! I want fish, but you don't have fish. You want what I have, but I don't want what you have. This problem is called the 'Double Coincidence of Wants'."
        },
        {
          speaker: 'WOODCUTTER',
          text: "Tell you what - I'll give you the wood, but you'll owe me a debt. Bring me a Sharp Stone and 1 Fish later, and we'll call it even. I'll meet you at the Village Center.",
          onComplete: () => {
            this.state.inventory.wood = 1;
            this.state.obtainedWood = true;
            this.state.woodIntroduced = true;
            this.state.stoneIntroduced = true;
            this.state.fishIntroduced = true;
            this.showInventoryPopup('+1 WOOD');
            this.setMood('happy');
            this.state.phase = 'got_wood_need_stone';
            this.woodcutter.targetX = this.villageCenterX + 80;
          }
        }
      ]);
    } else if (offeredItem === 'slingshot') {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "How about my slingshot? It's a useful tool!"
        },
        {
          speaker: 'WOODCUTTER',
          text: "A slingshot? No thanks, I can't eat a slingshot! I need fish to feed my family."
        },
        {
          speaker: 'WOODCUTTER',
          text: "That's the problem! I have something you want, but you don't have something I want. This is called the 'Double Coincidence of Wants'."
        },
        {
          speaker: 'WOODCUTTER',
          text: "Tell you what - I'll give you the wood, but you'll owe me a debt. Bring me a Sharp Stone and 1 Fish later, and we'll call it even. I'll meet you at the Village Center.",
          onComplete: () => {
            this.state.inventory.wood = 1;
            this.state.obtainedWood = true;
            this.state.woodIntroduced = true;
            this.state.stoneIntroduced = true;
            this.state.fishIntroduced = true;
            this.showInventoryPopup('+1 WOOD');
            this.setMood('happy');
            this.state.phase = 'got_wood_need_stone';
            this.woodcutter.targetX = this.villageCenterX + 80;
          }
        }
      ]);
    } else if (offeredItem === 'berries') {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "I have some berries! Would you take those?"
        },
        {
          speaker: 'WOODCUTTER',
          text: "Berries are nice, but they won't fill my belly! I need fish to feed my family."
        },
        {
          speaker: 'WOODCUTTER',
          text: "That's the problem! You have berries, but I don't want berries. I want fish, but you don't have fish. This is called the 'Double Coincidence of Wants'."
        },
        {
          speaker: 'WOODCUTTER',
          text: "Tell you what - I'll give you the wood, but you'll owe me a debt. Bring me a Sharp Stone and 1 Fish later, and we'll call it even. I'll meet you at the Village Center.",
          onComplete: () => {
            this.state.inventory.wood = 1;
            this.state.obtainedWood = true;
            this.state.woodIntroduced = true;
            this.state.stoneIntroduced = true;
            this.state.fishIntroduced = true;
            this.showInventoryPopup('+1 WOOD');
            this.setMood('happy');
            this.state.phase = 'got_wood_need_stone';
            this.woodcutter.targetX = this.villageCenterX + 80;
          }
        }
      ]);
    } else {
      // Some other item (shouldn't happen at this stage)
      this.continueWoodcutterTradeDialogue(null);
    }
  }

  // Loop 2: Shorter woodcutter dialogue - references past experience
  private continueWoodcutterTradeDialogueLoop2(offeredItem: string | null): void {
    const rejectAndOfferCredit = (itemName: string) => {
      let rejectText = '';
      if (itemName === 'slingshot') {
        rejectText = "A slingshot? Sorry, I still need fish!";
      } else if (itemName === 'berries') {
        rejectText = "Berries again? I need fish!";
      } else {
        rejectText = "That won't work. I need fish.";
      }

      this.queueDialogue([
        {
          speaker: 'WOODCUTTER',
          text: rejectText
        },
        {
          speaker: 'WOODCUTTER',
          text: "Ah, the old 'Double Coincidence of Wants'! Last time we just relied on memory... that didn't end well. A shared Ledger might work better!",
          onComplete: () => {
            this.showRecordOrRememberChoice();
          }
        }
      ]);
    };

    if (offeredItem === null) {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "I still don't have fish..."
        },
        {
          speaker: 'WOODCUTTER',
          text: "Ah, that 'Double Coincidence of Wants' problem again! Last time we each kept our own mental Ledger... and we know how that ended.",
          onComplete: () => {
            this.showRecordOrRememberChoice();
          }
        }
      ]);
    } else if (offeredItem === 'slingshot') {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "How about my slingshot?"
        }
      ]);
      setTimeout(() => rejectAndOfferCredit('slingshot'), 100);
    } else if (offeredItem === 'berries') {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "Berries?"
        }
      ]);
      setTimeout(() => rejectAndOfferCredit('berries'), 100);
    } else {
      this.continueWoodcutterTradeDialogueLoop2(null);
    }
  }

  // Show choice between recording or just remembering the deal
  private showRecordOrRememberChoice(): void {
    this.state.showChoice = true;
    this.state.choiceOptions = [
      {
        text: "Just remember it",
        action: () => {
          this.state.showChoice = false;
          this.queueDialogue([
            {
              speaker: 'WOODCUTTER',
              text: "Very well, let's walk to the Village Center together. I'll give you the wood there.",
              onComplete: () => {
                this.state.phase = 'loop2_escorting_woodcutter';
                this.state.escortingNPC = 'woodcutter';
              }
            }
          ]);
        }
      },
      {
        text: "Record it",
        action: () => {
          this.state.showChoice = false;
          this.queueDialogue([
            {
              speaker: 'WOODCUTTER',
              text: "A wise choice! Let's walk to the Stone Tablet together and carve our agreement.",
              onComplete: () => {
                this.state.phase = 'loop2_escorting_woodcutter';
                this.state.escortingNPC = 'woodcutter';
                this.state.woodcutterDebtRecorded = true;
              }
            }
          ]);
        }
      }
    ];
  }

  // ============ LOOP 1 & 2: STONE-WORKER ============
  // ESCORT FLOW: NPC accompanies player to tablet, records debt, THEN gives item
  private handleStoneWorkerInteraction(): void {
    const phase = this.state.phase;
    
    // LOOP 1: Double coincidence of wants - player offers to trade
    if (phase === 'got_wood_need_stone') {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "Hello! I need a sharp stone for my roof repair. Do you have one?"
        },
        {
          speaker: 'STONE-WORKER',
          text: "Sure, I can make you a sharp stone. But I don't give things away for free! Do you have something to trade?",
          onComplete: () => {
            // Show Yes/No choice
            this.state.showChoice = true;
            this.state.choiceOptions = [
              {
                text: "Yes, I do!",
                action: () => {
                  this.state.showChoice = false;
                  this.showTradeSelection((selectedItem) => {
                    if (selectedItem === null || selectedItem === 'cancel') {
                      this.continueStoneWorkerTradeDialogue(null);
                    } else {
                      this.continueStoneWorkerTradeDialogue(selectedItem);
                    }
                  });
                }
              },
              {
                text: "No, I don't",
                action: () => {
                  this.state.showChoice = false;
                  this.continueStoneWorkerTradeDialogue(null);
                }
              }
            ];
          }
        }
      ]);
    }
    // LOOP 2: Double coincidence of wants with choice to record
    else if (phase === 'loop2_got_wood') {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "Hello! I need a sharp stone for my roof repair. Do you have one?"
        },
        {
          speaker: 'STONE-WORKER',
          text: "Sure, I can make you a sharp stone. But I don't give things away for free! Do you have something to trade?",
          onComplete: () => {
            // Show Yes/No choice
            this.state.showChoice = true;
            this.state.choiceOptions = [
              {
                text: "Yes, I do!",
                action: () => {
                  this.state.showChoice = false;
                  this.showTradeSelection((selectedItem) => {
                    if (selectedItem === null || selectedItem === 'cancel') {
                      this.continueStoneWorkerTradeDialogueLoop2(null);
                    } else {
                      this.continueStoneWorkerTradeDialogueLoop2(selectedItem);
                    }
                  });
                }
              },
              {
                text: "No, I don't",
                action: () => {
                  this.state.showChoice = false;
                  this.continueStoneWorkerTradeDialogueLoop2(null);
                }
              }
            ];
          }
        }
      ]);
    }
    // Loop 2: Arrived at tablet during escort
    else if (phase === 'loop2_escorting_stoneworker') {
      // Prevent re-triggering dialogue if carving already started
      if (this.state.stoneWorkerCarvingSoundPlayed || this.state.currentDialogue) {
        return;
      }
      
      const playerAtCenter = Math.abs(this.player.x - this.villageCenterX) < 200;
      const stoneWorkerAtCenter = Math.abs(this.stoneWorker.x - this.villageCenterX) < 200;
      
      if (playerAtCenter && stoneWorkerAtCenter) {
        const recorded = this.state.stoneWorkerDebtRecorded;
        
        if (recorded) {
          // Carving sequence: NPC is stopped at tablet, play carving sound, record debt, THEN deliver item
          this.queueDialogue([
            {
              speaker: 'STONE-WORKER',
              text: "Let me carve this agreement into the Stone Tablet...",
              onComplete: () => {
                // Block player movement during carving
                this.state.playerBlockedForCarving = true;
                
                // Only play carving sound once per carve (prevent double-trigger)
                if (!this.state.stoneWorkerCarvingSoundPlayed) {
                  this.state.stoneWorkerCarvingSoundPlayed = true;
                  soundManager.playForDuration('stoneCarve', 2500);
                  
                  // Award Ledger badge 1 second after carving starts (if second entry)
                  const alreadyRecorded = this.state.ledgerEntries.some(e => e.debt.includes('STONE-WORKER'));
                  if (!alreadyRecorded && this.state.ledgerEntries.length >= 1) {
                    setTimeout(() => {
                      this.awardBadge(
                        'Ledger Master',
                        'You recorded your second debt on the Stone Tablet! A shared ledger is a permanent record that everyone can verify - no more disputes about who owes what. Money is a system for humans to keep track of debt.'
                      );
                    }, 1000);
                  }
                }
                // After carving sound, record debt and deliver item
                setTimeout(() => {
                  // Only add entry if not already recorded (prevent duplicates)
                  const alreadyRecorded = this.state.ledgerEntries.some(e => e.debt.includes('STONE-WORKER'));
                  if (!alreadyRecorded) {
                    this.state.ledgerEntries.push({ name: 'PLAYER', debt: '2 FISH | OWED TO STONE-WORKER' });
                  }
                  this.hudGlow = 1;
                  // Now deliver the stone and move to final position
                  this.queueDialogue([
                    {
                      speaker: 'STONE-WORKER',
                      text: "The debt is now recorded! Here's your Sharp Stone.",
                      onComplete: () => {
                        // Unblock player movement after receiving item
                        this.state.playerBlockedForCarving = false;
                        this.state.inventory.stone = 1;
                        this.state.obtainedStone = true;
                        this.state.stoneIntroduced = true;
                        this.state.fishIntroduced = true;
                        // Only play receive sound once (prevent triple-trigger)
                        if (!this.state.stoneReceiveSoundPlayed) {
                          this.state.stoneReceiveSoundPlayed = true;
                          this.showInventoryPopup('+1 SHARP STONE');
                        }
                        this.setMood('happy');
                        this.state.phase = 'loop2_got_stone';
                        this.state.escortingNPC = null;
                        this.stoneWorker.targetX = this.villageCenterX - 100;
                      }
                    }
                  ]);
                }, 2500); // Wait for carving sound to finish
              }
            }
          ]);
        } else {
          // Verbal promise path - deliver item immediately
          this.queueDialogue([
            {
              speaker: 'STONE-WORKER',
              text: "We're at the center. Here's your Sharp Stone. Remember, you owe me 2 Fish!",
              onComplete: () => {
                this.state.inventory.stone = 1;
                this.state.obtainedStone = true;
                this.state.stoneIntroduced = true;
                this.state.fishIntroduced = true;
                // Only play receive sound once (prevent triple-trigger)
                if (!this.state.stoneReceiveSoundPlayed) {
                  this.state.stoneReceiveSoundPlayed = true;
                  this.showInventoryPopup('+1 SHARP STONE');
                }
                this.setMood('happy');
                this.state.phase = 'loop2_got_stone';
                this.state.escortingNPC = null;
                this.stoneWorker.targetX = this.villageCenterX - 100;
              }
            }
          ]);
        }
      } else {
        this.queueDialogue([
          {
            speaker: 'STONE-WORKER',
            text: "Let's keep walking to the Stone Tablet at the Village Center!"
          }
        ]);
      }
    }
    else if (phase === 'got_stone_need_fish' || phase === 'loop2_got_stone') {
      this.queueDialogue([
        {
          speaker: 'STONE-WORKER',
          text: "You still owe me 2 Fish! Trade berries with the Fisherman to get them."
        }
      ]);
    }
    // Player has fish, ready to settle
    else if (phase === 'got_fish_ready_settle') {
      // Check if Stone-worker is at village center - if so, trigger settlement phase
      const atVillageCenter = Math.abs(this.stoneWorker.x - this.villageCenterX) < 300;
      if (atVillageCenter) {
        // Transition to settlement and trigger confrontation
        this.state.phase = 'settlement';
        this.handleStoneWorkerInteraction(); // Re-trigger with new phase
        return;
      }
      this.queueDialogue([
        {
          speaker: 'STONE-WORKER',
          text: "You have the Fish! Head to the Town Center to settle your debt!"
        }
      ]);
    }
    // LOOP 1 SETTLEMENT: Player tries to settle - Stone-worker claims inflated debt
    else if (phase === 'settlement' && !this.state.stoneworkerDisputed) {
      // Stone-worker steps to the right to confront player
      this.stoneWorker.targetX = this.villageCenterX - 100;
      this.queueDialogue([
        {
          speaker: 'STONE-WORKER',
          text: "And where are my 4 Fish?! You promised me 4 Fish for that stone!",
          onComplete: () => {
            this.setMood('angry');
          }
        },
        {
          speaker: 'YOU',
          text: "4 Fish?! I said 2 Fish! You're making that up!"
        },
        {
          speaker: 'STONE-WORKER',
          text: "I never make things up! You owe me 4 Fish!",
          onComplete: () => {
            this.state.stoneworkerDisputed = true;
          }
        }
      ]);
    }
    // After Stone-worker dispute
    else if (phase === 'settlement' && this.state.stoneworkerDisputed) {
      this.queueDialogue([
        {
          speaker: 'STONE-WORKER',
          text: "You owe me 4 Fish! Maybe the Elder can sort this out!"
        }
      ]);
    }
    // Loop 2: Direct settlement attempt - NPC always disputes first
    else if (phase === 'loop2_got_fish' || phase === 'loop2_verify_at_tablet') {
      // If already settled, check if player should go home
      if (this.state.stoneWorkerSettled) {
        if (this.state.woodcutterSettled) {
          // Both debts settled - remind to go home
          this.queueDialogue([
            {
              speaker: 'STONE-WORKER',
              text: "All debts are settled! You should hurry home and fix your roof before the storm!"
            }
          ]);
        } else {
          this.queueDialogue([
            {
              speaker: 'STONE-WORKER',
              text: "We're all settled! Thanks for being honest."
            }
          ]);
        }
        return;
      }
      
      // If player agreed to give in to inflated demand, handle that payment
      if (this.state.gaveInToStoneWorker) {
        const needsFish = 4;
        if (this.state.inventory.fish >= needsFish) {
          this.state.inventory.fish -= needsFish;
          // CRITICAL: Resources are now depleted after paying inflated demand
          // This makes it impossible to gather more resources for Woodcutter's inflated demand
          this.state.resourcesDepleted = true;
          this.state.extraBerryAvailable = false;
          this.state.extraFishAvailable = false;
          this.setMood('happy');
          this.queueDialogue([
            {
              speaker: 'STONE-WORKER',
              text: "That's all 4 Fish! Debt settled.",
              onComplete: () => {
                soundManager.play('settle');
                this.state.stoneWorkerSettled = true;
                // Update ledger to SETTLED immediately
                if (this.state.stoneWorkerDebtRecorded) {
                  this.state.ledgerEntries = this.state.ledgerEntries.map(e => 
                    e.debt.includes('STONE-WORKER') ? { ...e, debt: e.debt.replace('OWED', 'SETTLED').replace('VERIFIED', 'SETTLED') } : e
                  );
                  this.hudGlow = 1;
                }
                if (this.state.woodcutterSettled) {
                  this.checkAllDebtsSettled();
                }
              }
            }
          ]);
        } else {
          // Player can't pay - trigger confession and brawl
          this.queueDialogue([
            {
              speaker: 'YOU',
              text: "I... I don't have enough fish. I gave in to the Woodcutter's demands..."
            },
            {
              speaker: 'STONE-WORKER',
              text: "WHAT?! You paid the Woodcutter but not me?! This is outrageous!",
              onComplete: () => {
                // Trigger brawl
                this.woodcutter.targetX = this.player.x - 30;
                this.stoneWorker.targetX = this.player.x + 30;
                this.villageElder.targetX = this.villageCenterX + 200;
                this.state.showBrawl = true;
                this.state.brawlTimer = 0;
                soundManager.stopDaytimeMusic();
                soundManager.playBrawlWithLayers(4000);
              }
            }
          ]);
        }
        return;
      }
      
      const hasFishForStoneworker = this.state.inventory.fish >= 2;
      
      if (!hasFishForStoneworker) {
        // Check if resources are depleted - player can't get more fish, trigger brawl
        if (this.state.resourcesDepleted || this.state.gaveInToWoodcutter) {
          this.queueDialogue([
            {
              speaker: 'YOU',
              text: "I... I can't get any more fish. The Fisherman is all out..."
            },
            {
              speaker: 'STONE-WORKER',
              text: "You paid the Woodcutter and left me with nothing?! This is outrageous!",
              onComplete: () => {
                // Trigger brawl
                this.woodcutter.targetX = this.player.x - 30;
                this.stoneWorker.targetX = this.player.x + 30;
                this.villageElder.targetX = this.villageCenterX + 200;
                this.state.showBrawl = true;
                this.state.brawlTimer = 0;
                soundManager.stopDaytimeMusic();
                soundManager.playBrawlWithLayers(4000);
              }
            }
          ]);
          return;
        }
        this.queueDialogue([
          {
            speaker: 'STONE-WORKER',
            text: "You still owe me 2 Fish! Get more fish from the Fisherman."
          }
        ]);
        return;
      }
      
      // If Elder verified (directly or via tablet), NPC accepts payment without dispute
      if (this.state.elderVerified) {
        this.state.inventory.fish -= 2;
        this.setMood('happy');
        const verificationText = this.state.stoneWorkerDebtRecorded 
          ? "The Tablet shows the true record - 2 Fish it is. Thank you!"
          : "The Elder confirmed the true amount - 2 Fish it is. Thank you!";
        this.queueDialogue([
          {
            speaker: 'STONE-WORKER',
            text: verificationText,
            onComplete: () => {
              soundManager.play('settle');
              if (this.state.stoneWorkerDebtRecorded) {
                this.state.ledgerEntries = this.state.ledgerEntries.map(e => 
                  e.name === 'Stone-worker' ? { ...e, debt: e.debt.replace('OWED', 'SETTLED') } : e
                );
              }
              this.hudGlow = 1;
              this.state.stoneWorkerSettled = true;
              this.checkAllDebtsSettled();
            }
          }
        ]);
        return;
      }
      
      // NPC disputes - triggers verification need
      this.setMood('angry');
      this.queueDialogue([
        {
          speaker: 'STONE-WORKER',
          text: "2 Fish?! I remember you promised me 4 Fish for that stone! Are you trying to cheat me?!"
        }
      ]);
      
      // Show choice after dispute dialogue ends
      this.state.pendingStoneWorkerDispute = true;
    }
    else {
      this.queueDialogue([
        {
          speaker: 'STONE-WORKER',
          text: "Hello! I craft stones for tools. Come back if you need one."
        }
      ]);
    }
  }

  // Loop 1: Continue stone worker dialogue after trade offer - awards badge
  private continueStoneWorkerTradeDialogue(offeredItem: string | null): void {
    const finishGetStone = () => {
      this.state.inventory.stone = 1;
      this.state.obtainedStone = true;
      this.state.stoneIntroduced = true;
      this.state.fishIntroduced = true;
      this.showInventoryPopup('+1 SHARP STONE');
      this.setMood('happy');
      this.state.phase = 'got_stone_need_fish';
      this.stoneWorker.targetX = this.villageCenterX - 100;
    };

    // Award badge after DCW line, then show credit offer
    const awardBadgeThenCreditOffer = () => {
      if (this.state.loop === 1 && !this.state.badges.includes('Double Coincidence of Wants')) {
        this.awardBadge(
          'Double Coincidence of Wants',
          'You discovered that trading directly is hard! For a trade to work, each person must want exactly what the other has at the same time. This is called the "Double Coincidence of Wants" - a problem that money was invented to solve!',
          () => {
            // After badge is dismissed, show credit offer dialogue
            this.queueDialogue([
              {
                speaker: 'STONE-WORKER',
                text: "Tell you what - I'll give you the stone, but you'll owe me a debt. Bring me 2 Fish later. I'll meet you at the Village Center.",
                onComplete: finishGetStone
              }
            ]);
          }
        );
      } else {
        // No badge needed, go straight to credit offer
        this.queueDialogue([
          {
            speaker: 'STONE-WORKER',
            text: "Tell you what - I'll give you the stone, but you'll owe me a debt. Bring me 2 Fish later. I'll meet you at the Village Center.",
            onComplete: finishGetStone
          }
        ]);
      }
    };

    if (offeredItem === null) {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "Actually, I don't have anything you'd want..."
        },
        {
          speaker: 'STONE-WORKER',
          text: "Same problem as always! You don't have what I want, and I don't need what you have. This 'Double Coincidence of Wants' is quite troublesome!",
          onComplete: awardBadgeThenCreditOffer
        }
      ]);
    } else if (offeredItem === 'slingshot') {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "How about my slingshot?"
        },
        {
          speaker: 'STONE-WORKER',
          text: "A slingshot? I already have tools! I need fish to feed my family."
        },
        {
          speaker: 'STONE-WORKER',
          text: "Same problem as before! We can't trade because I don't want what you have. This 'Double Coincidence of Wants' keeps getting in the way!",
          onComplete: awardBadgeThenCreditOffer
        }
      ]);
    } else if (offeredItem === 'berries') {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "Would you take some berries?"
        },
        {
          speaker: 'STONE-WORKER',
          text: "Berries? I need something more filling. I want fish!"
        },
        {
          speaker: 'STONE-WORKER',
          text: "Same problem as before! We can't trade because I don't want what you have. This 'Double Coincidence of Wants' keeps getting in the way!",
          onComplete: awardBadgeThenCreditOffer
        }
      ]);
    } else if (offeredItem === 'wood') {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "I have some wood! Would you trade for that?"
        },
        {
          speaker: 'STONE-WORKER',
          text: "Wood? I work with stone, not wood! I need fish for my family."
        },
        {
          speaker: 'STONE-WORKER',
          text: "Same problem as before! We can't trade because I don't want what you have. This 'Double Coincidence of Wants' keeps getting in the way!",
          onComplete: awardBadgeThenCreditOffer
        }
      ]);
    } else {
      this.continueStoneWorkerTradeDialogue(null);
    }
  }

  // Loop 2: Continue stone worker dialogue after trade offer (with record choice) - awards badge
  private continueStoneWorkerTradeDialogueLoop2(offeredItem: string | null): void {
    const showChoiceButtons = () => {
      this.state.showChoice = true;
    };
    
    const showRecordChoice = () => {
      // In loop 2, we don't award the badge (already earned in loop 1)
      // Just show choice buttons immediately
      showChoiceButtons();
      this.state.choiceOptions = [
        {
          text: "Just remember it",
          action: () => {
            this.state.showChoice = false;
            this.queueDialogue([
              {
                speaker: 'STONE-WORKER',
                text: "Very well, let's walk to the Village Center. I'll give you the stone there.",
                onComplete: () => {
                  this.state.phase = 'loop2_escorting_stoneworker';
                  this.state.escortingNPC = 'stoneworker';
                }
              }
            ]);
          }
        },
        {
          text: "Record it",
          action: () => {
            this.state.showChoice = false;
            this.queueDialogue([
              {
                speaker: 'STONE-WORKER',
                text: "A wise choice! Let's walk to the Stone Tablet together and carve our agreement.",
                onComplete: () => {
                  this.state.phase = 'loop2_escorting_stoneworker';
                  this.state.escortingNPC = 'stoneworker';
                  this.state.stoneWorkerDebtRecorded = true;
                }
              }
            ]);
          }
        }
      ];
    };

    if (offeredItem === null) {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "I still don't have fish..."
        },
        {
          speaker: 'STONE-WORKER',
          text: "The 'Double Coincidence of Wants' strikes again! But this time, let's use a shared Ledger instead of trusting memory.",
          onComplete: showRecordChoice
        }
      ]);
    } else if (offeredItem === 'slingshot') {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "My slingshot?"
        },
        {
          speaker: 'STONE-WORKER',
          text: "I need fish, not tools! Same problem as before - but maybe a shared record will help this time.",
          onComplete: showRecordChoice
        }
      ]);
    } else if (offeredItem === 'berries') {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "How about berries?"
        },
        {
          speaker: 'STONE-WORKER',
          text: "Fish is what I need! You know the drill - let's record this properly.",
          onComplete: showRecordChoice
        }
      ]);
    } else if (offeredItem === 'wood') {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "Would you take wood?"
        },
        {
          speaker: 'STONE-WORKER',
          text: "I work with stone! Fish is what my family needs. Let's just record it this time.",
          onComplete: showRecordChoice
        }
      ]);
    } else {
      this.continueStoneWorkerTradeDialogueLoop2(null);
    }
  }

  // ============ LOOP 1 & 2: FISHERMAN ============
  // Fisherman only trades berries for fish AFTER player has initiated debts (obtained wood AND stone)
  private handleFishermanInteraction(): void {
    const phase = this.state.phase;
    
    // Check if resources are depleted (after paying first inflated demand)
    if (this.state.resourcesDepleted) {
      this.queueDialogue([
        {
          speaker: 'FISHERMAN',
          text: "Sorry, I'm all out of fish! I've got nothing left to trade."
        }
      ]);
      return;
    }
    
    // Check if player has items
    const hasBerries = this.state.inventory.berries >= 3;
    const alreadyHasFish = this.state.inventory.fish >= 3;
    // Use obtainedWood/obtainedStone flags instead of current inventory
    // This allows fish trade even if wood was used to fix the roof
    const debtsInitiated = this.state.obtainedWood && this.state.obtainedStone;
    
    // Loop 2: Extra fish available after giving in to Stone-worker - CHECK THIS FIRST
    if (this.state.extraFishAvailable && this.state.inventory.berries >= 1) {
      this.state.inventory.berries -= 1;
      this.state.inventory.fish += 1;
      this.state.extraFishAvailable = false; // Only one extra fish
      this.showInventoryPopup('+1 FISH (-1 BERRY)');
      this.setMood('happy');
      this.queueDialogue([
        {
          speaker: 'FISHERMAN',
          text: "I only have 1 Fish left to trade. Here, 1 Berry for 1 Fish. That's all I have!"
        }
      ]);
    }
    // Player already has fish (and no extra fish needed)
    else if (alreadyHasFish) {
      this.queueDialogue([
        {
          speaker: 'FISHERMAN',
          text: "I don't have any more fish at the moment."
        }
      ]);
    }
    // Debts not yet initiated - Fisherman hasn't caught anything yet
    else if (!debtsInitiated) {
      this.queueDialogue([
        {
          speaker: 'FISHERMAN',
          text: "I'd love to trade berries for fish! But I'm still fishing... haven't caught anything yet!"
        }
      ]);
    }
    // Debts initiated AND has berries - offer trade choices
    else if (this.state.inventory.berries >= 1) {
      const berryCount = this.state.inventory.berries;
      this.queueDialogue([
        {
          speaker: 'FISHERMAN',
          text: "I would love some berries! Do you have any? I'll trade 1 fish for each berry you bring me.",
          onComplete: () => {
            // Build choice options based on how many berries the player has
            const choices: { text: string; action: () => void }[] = [];
            
            if (berryCount >= 1) {
              choices.push({
                text: "1 Fish",
                action: () => {
                  this.state.showChoice = false;
                  this.state.inventory.berries -= 1;
                  this.state.inventory.fish += 1;
                  this.state.fishIntroduced = true;
                  this.showInventoryPopup('+1 FISH (-1 BERRY)');
                  this.setMood('happy');
                  this.queueDialogue([{ speaker: 'FISHERMAN', text: "Here's 1 Fish for you!" }]);
                  this.updatePhaseAfterFishTrade(phase);
                }
              });
            }
            if (berryCount >= 2) {
              choices.push({
                text: "2 Fish",
                action: () => {
                  this.state.showChoice = false;
                  this.state.inventory.berries -= 2;
                  this.state.inventory.fish += 2;
                  this.state.fishIntroduced = true;
                  this.showInventoryPopup('+2 FISH (-2 BERRIES)');
                  this.setMood('happy');
                  this.queueDialogue([{ speaker: 'FISHERMAN', text: "Here's 2 Fish for you!" }]);
                  this.updatePhaseAfterFishTrade(phase);
                }
              });
            }
            if (berryCount >= 3) {
              choices.push({
                text: "3 Fish",
                action: () => {
                  this.state.showChoice = false;
                  this.state.inventory.berries -= 3;
                  this.state.inventory.fish += 3;
                  this.state.fishIntroduced = true;
                  this.showInventoryPopup('+3 FISH (-3 BERRIES)');
                  this.setMood('happy');
                  this.queueDialogue([{ speaker: 'FISHERMAN', text: "Here's 3 Fish for you! A fine trade!" }]);
                  this.updatePhaseAfterFishTrade(phase);
                }
              });
            }
            
            this.state.showChoice = true;
            this.state.choiceOptions = choices;
          }
        }
      ]);
    }
    // Extra fish was set but no berries to trade
    else if (this.state.extraFishAvailable && this.state.inventory.berries < 1) {
      this.queueDialogue([
        {
          speaker: 'FISHERMAN',
          text: "I have 1 extra Fish, but you need at least 1 Berry to trade! Check the berry bush."
        }
      ]);
    }
    // Debts initiated but no berries - hint to get some
    else {
      this.state.berriesIntroduced = true; // Berries mentioned
      this.queueDialogue([
        {
          speaker: 'FISHERMAN',
          text: "I would love some berries! Do you have any? Find them at the berry bush to the west!"
        }
      ]);
    }
  }
  
  // Helper to update phase after fish trade
  private updatePhaseAfterFishTrade(phase: string): void {
    if (phase === 'got_stone_need_fish') {
      this.state.phase = 'got_fish_ready_settle';
    } else if (phase === 'loop2_got_stone') {
      this.state.phase = 'loop2_got_fish';
    }
  }

  // ============ BERRY BUSH INTERACTION ============
  // CREDIT-FIRST: Always interactable - allows player to pick up to 3 berries at any time
  // Extra berry spawns after giving in to inflated demand
  private handleBerryBushInteraction(): void {
    // Check if bush is empty FIRST before playing sounds
    const bushIsEmpty = this.state.resourcesDepleted || 
                        (this.state.inventory.berries >= 3 && !this.state.extraBerryAvailable);
    
    // Play bush rustling only (no item pickup) when bush is empty
    if (bushIsEmpty) {
      soundManager.playForDurationWithFade('bush', 1500, 300);
    } else {
      // Play full bush sequence with item pickup sound when picking berries
      soundManager.playBushSequence();
    }
    
    // Check if resources are depleted (after paying first inflated demand)
    if (this.state.resourcesDepleted) {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "The bush is completely empty now... there are no more berries to pick."
        }
      ]);
      return;
    }
    
    // Check if extra berry is available (after giving in to inflated demand)
    if (this.state.extraBerryAvailable) {
      this.state.inventory.berries++;
      this.state.extraBerryAvailable = false; // Only one extra berry
      this.showInventoryPopup(`+1 EXTRA BERRY!`, true); // Skip sound - playBushSequence handles it
      this.setMood('happy');
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "I found one more berry! Maybe I can trade this for another fish..."
        }
      ]);
      return;
    }
    
    // Berry bush is now always available (no gating)
    if (this.state.inventory.berries < 3) {
      this.state.inventory.berries++;
      this.state.berriesIntroduced = true; // Berries now shown in inventory
      this.showInventoryPopup(`+1 BERRY (${this.state.inventory.berries}/3)`, true); // Skip sound - playBushSequence handles it
      this.setMood('happy');
      
      if (this.state.inventory.berries >= 3) {
        this.queueDialogue([
          {
            speaker: 'YOU',
            text: "I have 3 berries now! I can trade these with the Fisherman for fish."
          }
        ]);
      }
    } else {
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "There are no more berries on this bush."
        }
      ]);
    }
  }

  private handleElderInteraction(): void {
    const phase = this.state.phase;
    
    // Loop 1: Generic hint about the tablet (credit-first phases)
    if (this.state.loop === 1 && (phase === 'need_wood' || phase === 'got_wood_need_stone' || phase === 'got_stone_need_fish' || phase === 'got_fish_ready_settle')) {
      this.queueDialogue([
        {
          speaker: 'VILLAGE ELDER',
          text: "I write my ideas on this Stone Tablet so I never forget. It is the only truth in this village."
        }
      ]);
    }
    // LOOP 1 SETTLEMENT: Elder tries to mediate after both disputes
    else if (phase === 'settlement') {
      if (this.state.woodcutterDisputed && this.state.stoneworkerDisputed) {
        // Both have disputed - Elder tries to help but can't
        this.queueDialogue([
          {
            speaker: 'VILLAGE ELDER',
            text: "What is all this shouting about? Let me try to help..."
          },
          {
            speaker: 'WOODCUTTER',
            text: "This person owes me 3 Fish! Not 1!"
          },
          {
            speaker: 'STONE-WORKER',
            text: "And they owe ME 4 Fish! Not 2!"
          },
          {
            speaker: 'VILLAGE ELDER',
            text: "Calm down, all of you! Let me check the Stone Tablet for the truth..."
          },
          {
            speaker: 'VILLAGE ELDER',
            text: "But... there is nothing written here. No record of these debts.",
            onComplete: () => {
              this.setMood('angry');
            }
          },
          {
            speaker: 'WOODCUTTER',
            text: "Enough talk! You're trying to cheat us all!",
            onComplete: () => {
              // Trigger the brawl - NPCs run to player, Elder steps aside
              this.woodcutter.targetX = this.player.x - 30;
              this.stoneWorker.targetX = this.player.x + 30;
              this.villageElder.targetX = this.villageCenterX + 200; // Elder steps away
              this.state.phase = 'confrontation';
              this.state.showBrawl = true;
              this.state.brawlTimer = 0;
              soundManager.stopDaytimeMusic();
                soundManager.playBrawlWithLayers(4000);
            }
          }
        ]);
      } else if (!this.state.woodcutterDisputed) {
        this.queueDialogue([
          {
            speaker: 'VILLAGE ELDER',
            text: "It seems there is a dispute brewing. Speak with the Woodcutter first."
          }
        ]);
      } else if (!this.state.stoneworkerDisputed) {
        this.queueDialogue([
          {
            speaker: 'VILLAGE ELDER',
            text: "The Woodcutter seems upset. You should also speak with the Stone-worker."
          }
        ]);
      }
    }
    // Loop 2: More helpful hint (before player has recorded debts)
    else if (this.state.loop === 2 && (phase === 'loop2_need_wood' || phase === 'loop2_got_wood')) {
      this.queueDialogue([
        {
          speaker: 'VILLAGE ELDER',
          text: "Wise one, you've learned from the past. Use the Stone Tablet to record your debts as you make them!"
        }
      ]);
    }
    // Loop 2: Player returns with fish ready to settle via ledger
    else if (phase === 'loop2_got_fish') {
      const bothRecorded = this.state.woodcutterDebtRecorded && this.state.stoneWorkerDebtRecorded;
      const noneRecorded = !this.state.woodcutterDebtRecorded && !this.state.stoneWorkerDebtRecorded;
      
      if (bothRecorded) {
        // ALL RECORDED - Elder confirms, but player must still deliver items
        this.setMood('happy');
        
        // Check if player has already delivered to both NPCs
        if (this.state.woodcutterSettled && this.state.stoneWorkerSettled) {
          // Already delivered - trigger celebration!
          this.queueDialogue([
            {
              speaker: 'VILLAGE ELDER',
              text: "All debts are paid and recorded. Peace is restored to our village!",
              onComplete: () => {
                this.state.phase = 'loop2_return';
                this.state.showCelebration = true;
                this.state.celebrationTimer = 0;
                soundManager.play('celebration');
              }
            }
          ]);
        } else {
          // Elder verifies debts - player must deliver to NPCs
          // Mark as Elder-verified so NPCs accept without dispute
          this.state.elderVerified = true;
          this.queueDialogue([
            {
              speaker: 'VILLAGE ELDER',
              text: "Let me check the Stone Tablet... All debts are recorded clearly here.",
              onComplete: () => {
                // Show enlarged tablet view
                this.state.showStoneTabletPopup = true;
                soundManager.play('stoneLedger');
              }
            },
            {
              speaker: 'VILLAGE ELDER',
              text: "Woodcutter: 1 Fish. Stone-worker: 2 Fish. The truth is carved in stone!",
              onComplete: () => {
                // Close tablet popup when moving to next line
                this.state.showStoneTabletPopup = false;
              }
            },
            {
              speaker: 'VILLAGE ELDER',
              text: "Now go and deliver what you owe. The Stone Tablet has spoken!"
            }
          ]);
        }
      } else if (noneRecorded) {
        // NONE RECORDED - Full confrontation like Loop 1
        this.triggerConfrontation();
      } else {
        // PARTIAL RECORDING - Settle recorded debts, dispute unrecorded ones
        this.triggerPartialSettlement();
      }
    }
    // Loop 2: Verification at tablet - NPC and player came to verify disputed debt
    else if (phase === 'loop2_verify_at_tablet') {
      const woodcutterRecorded = this.state.woodcutterDebtRecorded;
      const stoneworkerRecorded = this.state.stoneWorkerDebtRecorded;
      
      // Build dialogue array based on recorded debts
      const dialogueLines: DialogueLine[] = [
        {
          speaker: 'VILLAGE ELDER',
          text: "So, there is a dispute about what was promised? Let me check the Stone Tablet..."
        }
      ];
      
      // Check each unrecorded debt and trigger appropriate response
      if (!woodcutterRecorded && !stoneworkerRecorded) {
        // Neither debt was recorded - brawl ensues
        dialogueLines.push(
          {
            speaker: 'VILLAGE ELDER',
            text: "I see nothing recorded here... Without a written record, there is no way to know the truth."
          },
          {
            speaker: 'WOODCUTTER',
            text: "You see? They're trying to cheat us! I remember clearly - 3 Fish!",
            onComplete: () => {
              this.setMood('angry');
            }
          },
          {
            speaker: 'STONE-WORKER',
            text: "And I remember 4 Fish! This is outrageous!",
            onComplete: () => {
              // Trigger brawl
              this.woodcutter.targetX = this.player.x - 30;
              this.stoneWorker.targetX = this.player.x + 30;
              this.villageElder.targetX = this.villageCenterX + 200;
              this.state.phase = 'confrontation';
              this.state.showBrawl = true;
              this.state.brawlTimer = 0;
              soundManager.stopDaytimeMusic();
                soundManager.playBrawlWithLayers(4000);
            }
          }
        );
        this.queueDialogue(dialogueLines);
      } else if (woodcutterRecorded && !stoneworkerRecorded) {
        // Only woodcutter debt recorded
        dialogueLines.push(
          {
            speaker: 'VILLAGE ELDER',
            text: "The Woodcutter's debt is recorded: 1 Fish. But I see nothing for the Stone-worker..."
          },
          {
            speaker: 'STONE-WORKER',
            text: "There's no record?! But I clearly remember 4 Fish!",
            onComplete: () => {
              this.setMood('angry');
            }
          },
          {
            speaker: 'VILLAGE ELDER',
            text: "Without a record, we cannot know the truth...",
            onComplete: () => {
              this.stoneWorker.targetX = this.player.x + 30;
              this.villageElder.targetX = this.villageCenterX + 200;
              this.state.phase = 'confrontation';
              this.state.showBrawl = true;
              this.state.brawlTimer = 0;
              soundManager.stopDaytimeMusic();
                soundManager.playBrawlWithLayers(4000);
            }
          }
        );
        this.queueDialogue(dialogueLines);
      } else if (!woodcutterRecorded && stoneworkerRecorded) {
        // Only stoneworker debt recorded
        dialogueLines.push(
          {
            speaker: 'VILLAGE ELDER',
            text: "The Stone-worker's debt is recorded: 2 Fish. But I see nothing for the Woodcutter..."
          },
          {
            speaker: 'WOODCUTTER',
            text: "There's no record?! But I clearly remember 3 Fish!",
            onComplete: () => {
              this.setMood('angry');
            }
          },
          {
            speaker: 'VILLAGE ELDER',
            text: "Without a record, we cannot know the truth...",
            onComplete: () => {
              this.woodcutter.targetX = this.player.x - 30;
              this.villageElder.targetX = this.villageCenterX + 200;
              this.state.phase = 'confrontation';
              this.state.showBrawl = true;
              this.state.brawlTimer = 0;
              soundManager.stopDaytimeMusic();
                soundManager.playBrawlWithLayers(4000);
            }
          }
        );
        this.queueDialogue(dialogueLines);
      } else {
        // Both recorded - trustless verification succeeds!
        this.setMood('happy');
        dialogueLines.push(
          {
            speaker: 'VILLAGE ELDER',
            text: "Let me see... The Woodcutter: 1 Fish. The Stone-worker: 2 Fish. All debts are recorded clearly!"
          },
          {
            speaker: 'WOODCUTTER',
            text: "The Stone proves the truth... I was mistaken.",
            onComplete: () => {
              this.state.ledgerEntries = this.state.ledgerEntries.map(e => 
                e.name === 'Woodcutter' ? { ...e, debt: e.debt.replace('OWED', 'VERIFIED') } : e
              );
              this.hudGlow = 1;
            }
          },
          {
            speaker: 'STONE-WORKER',
            text: "The Tablet does not lie. I accept the truth.",
            onComplete: () => {
              this.state.ledgerEntries = this.state.ledgerEntries.map(e => 
                e.name === 'Stone-worker' ? { ...e, debt: e.debt.replace('OWED', 'VERIFIED') } : e
              );
              this.hudGlow = 1;
              this.state.phase = 'loop2_got_fish'; // Return to normal settlement phase
            }
          }
        );
        this.queueDialogue(dialogueLines);
      }
    }
    else {
      this.queueDialogue([
        {
          speaker: 'VILLAGE ELDER',
          text: "The Stone Tablet preserves the truth for all to see."
        }
      ]);
    }
  }

  private queueDialogue(lines: DialogueLine[]): void {
    this.state.dialogueQueue = lines;
    // Don't play sound when starting new dialogue - only on user click to advance
    this.advanceDialogue(false);
  }

  private showWoodcutterDisputeChoice(): void {
    const debtRecorded = this.state.woodcutterDebtRecorded;
    this.state.showChoice = true;
    this.state.choiceOptions = [
      {
        text: "Let's check the Stone Tablet together!",
        action: () => {
          this.state.showChoice = false;
          this.queueDialogue([
            {
              speaker: 'WOODCUTTER',
              text: "Fine! The Tablet will prove I'm right! Let's go!"
            },
            {
              speaker: 'WOODCUTTER',
              text: "...Wait. The Ledger says 1 Stone and 1 Fish. I was wrong... I apologize.",
              onComplete: () => {
                this.state.phase = 'loop2_verify_at_tablet';
                this.woodcutter.targetX = this.villageCenterX + 80;
              }
            }
          ]);
        }
      },
      {
        text: "Fine, I'll give you 3 Fish...",
        action: () => {
          this.state.showChoice = false;
          
          // Check if already gave in to Stone-worker - can only afford one inflated demand
          if (this.state.gaveInToStoneWorker && this.state.inventory.fish < 3) {
            // Not enough fish after giving in to Stone-worker - triggers failure
            this.queueDialogue([
              {
                speaker: 'YOU',
                text: "I... I don't have enough fish left..."
              },
              {
                speaker: 'WOODCUTTER',
                text: "WHAT?! You paid the Stone-worker but not me?! This is outrageous!"
              }
            ]);
            // Trigger brawl after dialogue
            setTimeout(() => {
              try {
                this.state.showBrawl = true;
                this.state.brawlTimer = 0;
                soundManager.stopDaytimeMusic();
                soundManager.playBrawlWithLayers(4000);
              } catch (e) {
                console.error('Error triggering brawl:', e);
              }
            }, 2000);
            return;
          }
          
          if (this.state.inventory.fish >= 3) {
            this.state.inventory.fish -= 3;
            this.state.gaveInToWoodcutter = true;
            this.state.woodcutterSettled = true; // Mark settled IMMEDIATELY to prevent re-trigger
            // Resources are now depleted - no extra berry or fish available
            // This makes it impossible to pay Stone-worker's inflated demand later
            this.state.resourcesDepleted = true;
            this.state.extraBerryAvailable = false;
            this.state.extraFishAvailable = false;
            this.queueDialogue([
              {
                speaker: 'WOODCUTTER',
                text: "That's more like it!",
                onComplete: () => {
                  // Check if all debts are settled
                  if (this.state.stoneWorkerSettled) {
                    this.checkAllDebtsSettled();
                  }
                }
              }
            ]);
          } else {
            // Not enough fish - check if resources are depleted (after paying Stone-worker first)
            if (this.state.resourcesDepleted || this.state.gaveInToStoneWorker) {
              // Can't get more resources - trigger brawl
              this.queueDialogue([
                {
                  speaker: 'YOU',
                  text: "I... I don't have enough fish. I already gave everything to the Stone-worker..."
                },
                {
                  speaker: 'WOODCUTTER',
                  text: "WHAT?! You paid the Stone-worker but not me?! This is outrageous!",
                  onComplete: () => {
                    // Trigger brawl
                    this.woodcutter.targetX = this.player.x - 30;
                    this.stoneWorker.targetX = this.player.x + 30;
                    this.villageElder.targetX = this.villageCenterX + 200;
                    this.state.showBrawl = true;
                    this.state.brawlTimer = 0;
                    soundManager.stopDaytimeMusic();
                soundManager.playBrawlWithLayers(4000);
                  }
                }
              ]);
            } else {
              // Resources not depleted - enable extra berry and fish trade
              this.state.extraBerryAvailable = true; // Extra berry spawns at bush
              this.state.extraFishAvailable = true; // Fisherman has 1 more fish
              this.queueDialogue([
                {
                  speaker: 'YOU',
                  text: "I don't have 3 Fish right now..."
                },
                {
                  speaker: 'WOODCUTTER',
                  text: "Then go pick more berries and trade them! The Berry Bush is to the west. The Fisherman has 1 Fish left. I'll be waiting!"
                }
              ]);
            }
          }
        }
      }
    ];
  }

  private showStoneWorkerDisputeChoice(): void {
    const debtRecorded = this.state.stoneWorkerDebtRecorded;
    this.state.showChoice = true;
    this.state.choiceOptions = [
      {
        text: "Let's check the Stone Tablet together!",
        action: () => {
          this.state.showChoice = false;
          this.queueDialogue([
            {
              speaker: 'STONE-WORKER',
              text: "Fine! The Tablet will prove I'm right! Let's go!"
            },
            {
              speaker: 'STONE-WORKER',
              text: "...Wait. The Ledger says 1 Wood and 2 Fish. I was wrong... I apologize.",
              onComplete: () => {
                this.state.phase = 'loop2_verify_at_tablet';
                this.stoneWorker.targetX = this.villageCenterX - 100;
              }
            }
          ]);
        }
      },
      {
        text: "Fine, I'll give you 4 Fish...",
        action: () => {
          this.state.showChoice = false;
          
          // Mark that player agreed to give in (even if they don't have enough fish yet)
          this.state.gaveInToStoneWorker = true;
          
          // Check if already gave in to Woodcutter - can only afford one inflated demand
          if (this.state.gaveInToWoodcutter && this.state.inventory.fish < 4) {
            // Not enough fish after giving in to Woodcutter - triggers failure
            this.queueDialogue([
              {
                speaker: 'YOU',
                text: "I... I don't have enough fish left..."
              },
              {
                speaker: 'STONE-WORKER',
                text: "WHAT?! You paid the Woodcutter but not me?! This is outrageous!"
              }
            ]);
            // Trigger brawl after dialogue
            setTimeout(() => {
              try {
                this.state.showBrawl = true;
                this.state.brawlTimer = 0;
                soundManager.stopDaytimeMusic();
                soundManager.playBrawlWithLayers(4000);
              } catch (e) {
                console.error('Error triggering brawl:', e);
              }
            }, 2000);
            return;
          }
          
          if (this.state.inventory.fish >= 4) {
            this.state.inventory.fish -= 4;
            this.state.gaveInToStoneWorker = true;
            this.state.stoneWorkerSettled = true; // Mark settled IMMEDIATELY to prevent re-trigger
            // Resources are now depleted - no extra berry or fish available
            // This makes it impossible to pay the Woodcutter's inflated demand later
            this.state.resourcesDepleted = true;
            this.state.extraBerryAvailable = false;
            this.state.extraFishAvailable = false;
            this.queueDialogue([
              {
                speaker: 'STONE-WORKER',
                text: "That's more like it!",
                onComplete: () => {
                  // Check if all debts are settled
                  if (this.state.woodcutterSettled) {
                    this.checkAllDebtsSettled();
                  }
                }
              }
            ]);
          } else {
            // Not enough fish - check if resources are depleted (after paying Woodcutter first)
            if (this.state.resourcesDepleted || this.state.gaveInToWoodcutter) {
              // Can't get more resources - trigger brawl
              this.queueDialogue([
                {
                  speaker: 'YOU',
                  text: "I... I don't have enough fish. I already gave everything to the Woodcutter..."
                },
                {
                  speaker: 'STONE-WORKER',
                  text: "WHAT?! You paid the Woodcutter but not me?! This is outrageous!",
                  onComplete: () => {
                    // Trigger brawl
                    this.woodcutter.targetX = this.player.x - 30;
                    this.stoneWorker.targetX = this.player.x + 30;
                    this.villageElder.targetX = this.villageCenterX + 200;
                    this.state.showBrawl = true;
                    this.state.brawlTimer = 0;
                    soundManager.stopDaytimeMusic();
                soundManager.playBrawlWithLayers(4000);
                  }
                }
              ]);
            } else {
              // Resources not depleted - enable extra berry and fish trade
              this.state.extraBerryAvailable = true; // Extra berry spawns at bush
              this.state.extraFishAvailable = true; // Fisherman has 1 more fish to trade
              this.queueDialogue([
                {
                  speaker: 'YOU',
                  text: "I don't have 4 Fish right now..."
                },
                {
                  speaker: 'STONE-WORKER',
                  text: "Then go pick more berries and trade them! The Berry Bush is to the west. The Fisherman has 1 Fish left. I'll be waiting!"
                }
              ]);
            }
          }
        }
      }
    ];
  }

  private advanceDialogue(playSound: boolean = true): void {
    // Block dialogue advancement if inventory hint is showing in loop 1
    if (this.state.showInventoryHint && this.state.loop === 1) {
      return;
    }
    
    // Only play sound on user-initiated advances, not when starting new dialogue
    if (playSound) {
      soundManager.play('dialogueAdvance');
    }
    if (this.state.currentDialogue?.onComplete) {
      try {
        this.state.currentDialogue.onComplete();
      } catch (e) {
        console.error('Error in dialogue onComplete callback:', e, 'Speaker:', this.state.currentDialogue?.speaker, 'Text:', this.state.currentDialogue?.text?.substring(0, 50));
      }
    }

    if (this.state.dialogueQueue.length > 0) {
      this.state.currentDialogue = this.state.dialogueQueue.shift()!;
      this.dialogueCharIndex = 0;
      this.state.dialogueComplete = false;
      this.dialogueTimer = 0;
    } else {
      this.state.currentDialogue = null;
      this.state.dialogueComplete = false;
      
      // Check for pending disputes that need choice display
      if (this.state.pendingWoodcutterDispute) {
        this.state.pendingWoodcutterDispute = false;
        this.showWoodcutterDisputeChoice();
      } else if (this.state.pendingStoneWorkerDispute) {
        this.state.pendingStoneWorkerDispute = false;
        this.showStoneWorkerDisputeChoice();
      } else {
        this.setMood('neutral');
      }
    }

    this.notifyStateChange();
  }

  private showInventoryPopup(text: string, skipSound: boolean = false): void {
    if (!skipSound) {
      soundManager.play('itemPickup');
    }
    this.inventoryPopup = {
      text,
      timer: 2,
      y: 0
    };
  }

  // Enforce minimum spacing between NPCs to prevent overlap during village center gatherings
  // Soft collision: NPCs slow down when near each other and avoid Stone Tablet center
  private enforceNPCSpacing(): void {
    const minVisualSpacing = 80; // Minimum pixels for visual overlap prevention (rendering offset only)
    const tabletExclusionRadius = 50; // Keep NPCs away from tablet center for clicking
    const npcs = [this.woodcutter, this.stoneWorker, this.fisherman, this.villageElder];
    
    // Reset render offsets each tick to prevent accumulation drift
    npcs.forEach(npc => {
      npc.renderOffsetX = 0;
    });
    
    // Sort by x position
    const sortedNPCs = [...npcs].sort((a, b) => a.x - b.x);
    
    // Calculate render offsets to prevent visual overlap
    for (let i = 0; i < sortedNPCs.length - 1; i++) {
      const npc1 = sortedNPCs[i];
      const npc2 = sortedNPCs[i + 1];
      const distance = Math.abs(npc2.x - npc1.x);
      
      if (distance < minVisualSpacing) {
        // Apply small render offset to spread them visually
        const offsetNeeded = (minVisualSpacing - distance) / 2;
        npc1.renderOffsetX = -offsetNeeded;
        npc2.renderOffsetX = offsetNeeded;
      } else {
        // Reset offsets when not overlapping
        npc1.renderOffsetX = Math.max(0, (npc1.renderOffsetX || 0) * 0.9);
        npc2.renderOffsetX = Math.max(0, (npc2.renderOffsetX || 0) * 0.9);
      }
    }
    
    // Keep NPCs away from Stone Tablet center so it remains clickable
    // Use renderOffsetX only - don't change actual positions to avoid pushing
    npcs.forEach(npc => {
      const distToTablet = npc.x - this.villageCenterX;
      if (Math.abs(distToTablet) < tabletExclusionRadius) {
        // Apply render offset to move NPC visually away from tablet (without changing x)
        if (distToTablet < 0) {
          npc.renderOffsetX = (npc.renderOffsetX || 0) - 3; // Offset left
        } else {
          npc.renderOffsetX = (npc.renderOffsetX || 0) + 3; // Offset right
        }
      }
    });
  }

  public resize(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      // Set canvas to CSS pixel dimensions (no DPR scaling)
      // This ensures 768px images display at 1:1 without upscaling blur
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      
      // Set CSS size to maintain visual dimensions
      this.canvas.style.width = `${rect.width}px`;
      this.canvas.style.height = `${rect.height}px`;
      
      // Reset transform to identity (no scaling)
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Logical dimensions equal canvas dimensions (no DPR)
    this.logicalWidth = this.canvas.width;
    this.logicalHeight = this.canvas.height;

    // Update UI dimensions based on logical canvas size
    this.dialogueBoxHeight = this.logicalHeight * 0.2 + 50;
    this.hudWidth = Math.min(260, this.logicalWidth * 0.25);
    this.hudHeight = Math.min(185, this.logicalHeight * 0.25);
    this.interactButtonSize = Math.min(90, this.logicalWidth * 0.11); // 10% smaller

    // Calculate ground Y position
    const groundY = this.logicalHeight - this.groundHeight - this.dialogueBoxHeight;
    this.player.y = groundY - this.player.height;

    // All NPCs are now at ground level (including Elder who is always visible)
    this.npcs.forEach(npc => {
      npc.y = groundY - npc.height;
    });
  }

  public start(): void {
    this.lastTime = performance.now();
    this.gameLoop();
    soundManager.playLoop('ambientVillage');
    soundManager.startDaytimeMusic();
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    soundManager.stopAll();
  }

  private gameLoop(): void {
    try {
      const currentTime = performance.now();
      const deltaTime = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;

      this.update(deltaTime);
      this.render();
    } catch (e) {
      console.error('Game loop error:', e);
    }
    this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  private update(dt: number): void {
    // Update bob animation
    this.bobTimer += dt * 8;
    this.talkingTimer += dt * 18; // Faster timer for talking bounce (~3 cycles/sec)
    this.atmosphereTimer += dt; // For atmospheric haze and dust animation
    
    // Update player fade animation
    if (this.state.playerFading) {
      this.state.playerAlpha -= dt * 2; // Fade over ~0.5 seconds
      if (this.state.playerAlpha <= 0) {
        this.state.playerAlpha = 0;
        this.state.playerFading = false;
        this.player.visible = false;
        this.state.playerEnteredHut = true;
        this.state.playerBlockedForCarving = false; // Release movement block after entering hut
      }
    }

    // Auto-walk feature: player walks to clicked target and interacts on arrival
    if (this.autoWalkTarget && !this.state.currentDialogue) {
      const targetX = this.autoWalkTarget.x;
      const dx = targetX - this.player.x;
      const interactionRange = 25; // Small range for proximity-based interactions
      
      if (Math.abs(dx) <= interactionRange) {
        // Arrived at target - trigger interaction and clear movement state
        const targetType = this.autoWalkTarget.type;
        const targetId = this.autoWalkTarget.id;
        this.autoWalkTarget = null;
        this.moveDirection = 0; // Prevent drift after arrival
        
        if (targetType === 'home') {
          this.handleHomeInteraction();
        } else if (targetType === 'stoneTablet') {
          this.handleStoneTabletInteraction();
        } else if (targetType === 'location') {
          // Just arrived at location, no interaction needed
        } else if (targetId) {
          this.triggerNPCInteraction(targetId);
        }
      } else {
        // Walk toward target
        this.player.x += Math.sign(dx) * this.playerSpeed * dt;
        this.player.x = Math.max(this.player.width / 2, Math.min(this.worldWidth - this.player.width / 2, this.player.x));
        this.player.bobOffset = Math.sin(this.bobTimer) * 3;
        
        // Play footstep sounds (throttled)
        const now = performance.now();
        if (now - this.lastFootstepTime > this.footstepInterval) {
          soundManager.playFootstep();
          this.lastFootstepTime = now;
        }
      }
    }
    // Regular player movement (manual touch controls)
    else if (this.moveDirection !== 0 && !this.state.currentDialogue) {
      this.player.x += this.moveDirection * this.playerSpeed * dt;
      this.player.x = Math.max(this.player.width / 2, Math.min(this.worldWidth - this.player.width / 2, this.player.x));

      // Update player bob
      this.player.bobOffset = Math.sin(this.bobTimer) * 3;
      
      // Play footstep sounds (throttled)
      const now = performance.now();
      if (now - this.lastFootstepTime > this.footstepInterval) {
        soundManager.playFootstep();
        this.lastFootstepTime = now;
      }
    } else {
      // Subtle idle animation
      this.player.bobOffset = Math.sin(this.bobTimer * 0.5) * 1;
    }
    
    // Check if player is approaching fisherman - play fishing cast + plop sounds once (tripled distance)
    const nearFisherman = this.player.x > 2850 && this.player.x < 3300;
    if (nearFisherman && !this.state.fishingSoundPlayed) {
      this.state.fishingSoundPlayed = true;
      soundManager.playFishingSequence();
    }

    // Update NPC bobs and movement toward targets
    const npcSpeed = 80; // NPCs walk slower than player
    this.npcs.forEach((npc, i) => {
      // LOOP 2 ESCORT BEHAVIOR: NPC follows player during Loop 2 escort phases
      const isEscortingWoodcutter = this.state.phase === 'loop2_escorting_woodcutter' && npc.id === 'woodcutter';
      const isEscortingStoneworker = this.state.phase === 'loop2_escorting_stoneworker' && npc.id === 'stoneWorker';
      
      let isWalking = false; // Track if NPC is currently walking
      
      if (isEscortingWoodcutter || isEscortingStoneworker) {
        // Simple escort: NPC always moves toward the Stone Tablet (directly in front of it for carving)
        // Both NPCs stop at the Stone Tablet position during escort, not offset to sides
        const npcTargetX = this.villageCenterX; // Stone Tablet is at villageCenterX
        const diff = npcTargetX - npc.x;
        
        if (Math.abs(diff) > 5) {
          // Move toward center at a speed that matches player
          const escortSpeed = 180; // Faster than player to ensure arrival
          npc.x += Math.sign(diff) * escortSpeed * dt;
          isWalking = true;
        } else {
          // Arrived during escort - reset bobOffset
          npc.bobOffset = 0;
        }
      }
      // Move NPC toward target if set (non-escort movement)
      else if (npc.targetX !== undefined) {
        const diff = npc.targetX - npc.x;
        if (Math.abs(diff) > 5) {
          npc.x += Math.sign(diff) * npcSpeed * dt;
          isWalking = true;
        } else {
          // Arrived at target - clear it and reset bobOffset
          npc.x = npc.targetX;
          npc.targetX = undefined;
          npc.bobOffset = 0; // Stop bouncing immediately
          
          // Check if Elder arrived to celebrate
          if (npc === this.villageElder && this.state.elderWalkingToCelebrate) {
            this.triggerElderCelebration();
          }
        }
      }
      
      // Apply appropriate bob animation based on movement state
      if (isWalking) {
        // Fast walking bob when actively moving
        npc.bobOffset = Math.sin(this.bobTimer * 2 + i) * 3;
      } else if (npc.targetX === undefined) {
        // Slow idle bob only when not moving
        npc.bobOffset = Math.sin(this.bobTimer * 0.5 + i * 1.5) * 1.5;
      }
    });
    
    // Apply NPC spacing buffer - prevent NPCs from overlapping each other
    this.enforceNPCSpacing();

    // Update camera
    this.cameraTargetX = this.player.x - this.logicalWidth / 2;
    this.cameraTargetX = Math.max(0, Math.min(this.worldWidth - this.logicalWidth, this.cameraTargetX));
    this.cameraX += (this.cameraTargetX - this.cameraX) * this.cameraSmoothing;

    // Check NPC and location proximity
    this.state.nearbyNPC = null;
    this.state.nearbyLocation = null;
    this.state.showInteractButton = false;

    // Check if near home
    const distToHome = Math.abs(this.player.x - this.playerHomeX);
    if (distToHome <= 120) {
      this.state.nearbyLocation = 'home';
      this.state.showInteractButton = true;
    }
    
    // Check if near Stone Tablet (village center)
    const distToTablet = Math.abs(this.player.x - this.villageCenterX);
    if (distToTablet <= 50) {
      this.state.nearbyLocation = 'stoneTablet';
      this.state.showInteractButton = true;
    }

    // Check NPCs (prioritize NPC over location)
    for (const npc of this.npcs) {
      if (!npc.visible) continue;
      const dist = Math.abs(this.player.x - npc.x);
      if (dist <= 25) { // Small range for proximity-based interactions
        this.state.nearbyNPC = npc;
        this.state.showInteractButton = true;
        break;
      }
    }

    // Update dialogue typing
    if (this.state.currentDialogue && !this.state.dialogueComplete) {
      this.dialogueTimer += dt;
      if (this.dialogueTimer > 0.03) {
        this.dialogueTimer = 0;
        this.dialogueCharIndex++;
        if (this.dialogueCharIndex >= this.state.currentDialogue.text.length) {
          this.state.dialogueComplete = true;
        }
      }
    }

    // Update continue arrow blink
    this.continueArrowBlink += dt * 3;

    // Update inventory popup
    if (this.inventoryPopup) {
      this.inventoryPopup.timer -= dt;
      this.inventoryPopup.y += dt * 40;
      if (this.inventoryPopup.timer <= 0) {
        this.inventoryPopup = null;
      }
    }

    // Update HUD glow
    if (this.hudGlow > 0) {
      this.hudGlow = Math.max(0, this.hudGlow - dt * 0.5);
    }

    // Update interact button opacity with 200ms fade
    const fadeSpeed = 5; // 1/0.2 = 5 per second for 200ms
    if (this.state.showInteractButton && !this.state.currentDialogue) {
      this.interactButtonOpacity = Math.min(1, this.interactButtonOpacity + dt * fadeSpeed);
    } else {
      this.interactButtonOpacity = Math.max(0, this.interactButtonOpacity - dt * fadeSpeed);
    }

    // LOOP 2 ESCORT ARRIVAL TRIGGER
    // Auto-trigger dialogue when player arrives at village center during Loop 2 escort phases
    const escortPhases = ['loop2_escorting_woodcutter', 'loop2_escorting_stoneworker'];
    if (escortPhases.includes(this.state.phase) && !this.state.currentDialogue) {
      const playerAtCenter = Math.abs(this.player.x - this.villageCenterX) < 150;
      
      if (this.state.phase === 'loop2_escorting_woodcutter') {
        const woodcutterAtCenter = Math.abs(this.woodcutter.x - this.villageCenterX) < 150;
        if (playerAtCenter && woodcutterAtCenter) {
          this.handleWoodcutterInteraction();
        }
      } else if (this.state.phase === 'loop2_escorting_stoneworker') {
        const stoneWorkerAtCenter = Math.abs(this.stoneWorker.x - this.villageCenterX) < 150;
        if (playerAtCenter && stoneWorkerAtCenter) {
          this.handleStoneWorkerInteraction();
        }
      }
    }
    
    // LOOP 1: Auto-transition to settlement phase when player arrives at Village Center with items
    // The actual confrontation is triggered by interacting with NPCs in settlement phase
    if (this.state.loop === 1 && this.state.phase === 'got_fish_ready_settle') {
      const nearVillageCenter = Math.abs(this.player.x - this.villageCenterX) < 200;
      const hasRequirements = this.state.inventory.stone >= 1 && this.state.inventory.fish >= 3;
      if (nearVillageCenter && hasRequirements && !this.state.currentDialogue) {
        this.state.phase = 'settlement';
        // Move NPCs to village center area for the confrontation (woodcutter right to avoid Elder overlap)
        this.woodcutter.targetX = this.villageCenterX + 80;
        this.stoneWorker.targetX = this.villageCenterX - 100;
      }
    }
    
    // Move NPCs during settlement phase
    if (this.state.phase === 'settlement') {
      // Woodcutter moves toward target
      if (this.woodcutter.targetX !== null && this.woodcutter.targetX !== undefined) {
        const dx = this.woodcutter.targetX - this.woodcutter.x;
        if (Math.abs(dx) > 5) {
          this.woodcutter.x += Math.sign(dx) * 80 * dt;
        }
      }
      // Stone-worker moves toward target
      if (this.stoneWorker.targetX !== null && this.stoneWorker.targetX !== undefined) {
        const dx = this.stoneWorker.targetX - this.stoneWorker.x;
        if (Math.abs(dx) > 5) {
          this.stoneWorker.x += Math.sign(dx) * 80 * dt;
        }
      }
    }
    
    // LOOP 2: Verbal promise path auto-trigger brawl (unchanged behavior for Loop 2)
    const isLoop2VerbalPath = this.state.loop === 2 && this.state.phase === 'loop2_got_fish' && 
                              !this.state.woodcutterDebtRecorded && !this.state.stoneWorkerDebtRecorded;
    const hasRequirements = this.state.inventory.stone >= 1 && this.state.inventory.fish >= 3;
    const nearVillageCenter = Math.abs(this.player.x - this.villageCenterX) < 200;
    const canTrigger = !this.state.showBrawl && 
                       !this.state.currentDialogue && 
                       this.state.phase !== 'confrontation' && 
                       this.state.phase !== 'brawl' && 
                       this.state.phase !== 'fail';
    
    if (isLoop2VerbalPath && hasRequirements && nearVillageCenter && canTrigger) {
      this.triggerConfrontation();
    }

    // Check if player completed Loop 2 successfully - trigger thunderstorm then night transition
    // Skip if rain sequence already started or player is fading into hut
    if (this.state.phase === 'complete_success' && this.player.x <= this.playerHomeX + 50 && 
        !this.state.showThunderstorm && !this.state.showNightTransition && 
        !this.rainSoundStarted && !this.state.playerFading) {
      // Auto-fix roof if not already repaired
      if (!this.state.roofRepaired) {
        this.state.roofRepaired = true;
      }
      // Keep happy mood active for the rest of loop 2
      this.setMood('happy');
      this.state.moodTimer = 999; // Large value to keep happy mood
      // Start thunderstorm animation (before night transition)
      this.state.showThunderstorm = true;
      this.state.thunderstormTimer = 0;
      // Show thunderstorm dialogue
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "Just in time! The storm is here... but my roof is fixed!"
        }
      ]);
    }

    // Update brawl animation timer and NPC movement during brawl
    if (this.state.showBrawl) {
      this.state.brawlTimer += dt;
      // Move NPCs quickly toward their targets during brawl
      const brawlSpeed = 300 * dt;
      if (this.woodcutter.targetX !== undefined) {
        const dx = this.woodcutter.targetX - this.woodcutter.x;
        if (Math.abs(dx) > 5) {
          this.woodcutter.x += Math.sign(dx) * brawlSpeed;
        }
      }
      if (this.stoneWorker.targetX !== undefined) {
        const dx = this.stoneWorker.targetX - this.stoneWorker.x;
        if (Math.abs(dx) > 5) {
          this.stoneWorker.x += Math.sign(dx) * brawlSpeed;
        }
      }
      // Elder steps away more slowly
      if (this.villageElder.targetX !== undefined) {
        const dx = this.villageElder.targetX - this.villageElder.x;
        if (Math.abs(dx) > 5) {
          this.villageElder.x += Math.sign(dx) * brawlSpeed * 0.5;
        }
      }
      // Trigger boo sound overlapping with fight end (at 2s to overlap ending by 2 seconds)
      // Use exact timing check to prevent multiple triggers
      if (this.state.brawlTimer > 2 && this.state.brawlTimer <= 2.05 && !this.booFailureTriggered) {
        this.booFailureTriggered = true;
        soundManager.playBooThenFailure();
      }
      // End brawl at 4 seconds, show fail screen
      if (this.state.brawlTimer > 4 && this.state.brawlTimer <= 4.1) {
        this.state.showBrawl = false;
        this.state.showFail = true;
        this.state.phase = 'fail';
      }
    }
    
    // Update celebration animation timer - reduced applause duration (minus 8 seconds, earlier fade)
    if (this.state.showCelebration) {
      this.state.celebrationTimer += dt;
      const fullApplauseDuration = soundManager.getBufferDuration('crowdApplause') / 1000;
      const applauseDuration = Math.max(2, fullApplauseDuration - 8); // Reduce by 8 seconds, min 2s
      const distToHome = Math.abs(this.player.x - this.playerHomeX);
      
      // End celebration when: reduced applause time OR player within 250 pixels of home
      if (this.state.celebrationTimer > applauseDuration || distToHome <= 250) {
        this.state.showCelebration = false;
        this.celebrationEndTime = Date.now();
        // Fade out both celebration and applause sounds (5 seconds for smoother fade)
        soundManager.fadeOut('crowdApplause', 5000);
        soundManager.fadeOut('celebration', 5000);
      }
    }
    
    // Trigger storm 3 seconds after celebration ends OR when player within 400 pixels of home
    if (this.state.phase === 'loop2_return' && !this.state.showCelebration && !this.stormTriggered && 
        !this.state.showCloudsAnimation && !this.state.showRainfall && !this.state.showQuiz) {
      const distToHome = Math.abs(this.player.x - this.playerHomeX);
      const timeSinceCelebrationEnd = this.celebrationEndTime > 0 ? (Date.now() - this.celebrationEndTime) / 1000 : 0;
      
      if (distToHome <= 400 || timeSinceCelebrationEnd >= 3) {
        this.stormTriggered = true;
        this.triggerStormClouds();
      }
    }
    
    // Update thunderstorm animation timer
    if (this.state.showThunderstorm) {
      this.state.thunderstormTimer += dt;
      // Thunderstorm lasts 3.5 seconds, then transition to night
      if (this.state.thunderstormTimer > 3.5) {
        this.state.showThunderstorm = false;
        // Start night transition after thunderstorm
        this.state.showNightTransition = true;
        this.state.nightTransitionTimer = 0;
      }
    }
    
    // Update mood timer - auto-return to neutral after 2 seconds
    if (this.state.playerMood !== 'neutral' && this.state.moodTimer > 0) {
      this.state.moodTimer -= dt;
      if (this.state.moodTimer <= 0) {
        this.state.playerMood = 'neutral';
        this.state.moodTimer = 0;
      }
    }
    
    
    // Update night transition animation timer
    // Note: Night transition is now controlled by setTimeout in triggerEnterHutSequence
    // to allow night scene to persist in background during quiz
    if (this.state.showNightTransition) {
      this.state.nightTransitionTimer += dt;
      // Don't auto-show quiz here - let setTimeout chain handle it
      // This allows night scene to stay visible during quiz
    }
  }

  private triggerConfrontation(): void {
    this.state.phase = 'confrontation';
    this.setMood('angry');
    
    // CREDIT-FIRST CONFRONTATION: Woodcutter and Stone-worker dispute the debts
    // Woodcutter was owed: 1 Sharp Stone + 1 Fish
    // Stone-worker was owed: 2 Fish
    this.queueDialogue([
      {
        speaker: 'WOODCUTTER',
        text: "Finally! Give me my Sharp Stone and the 3 Fish you promised!"
      },
      {
        speaker: 'YOU',
        text: "3 Fish?! I only promised you 1 Fish along with the stone!"
      },
      {
        speaker: 'STONE-WORKER',
        text: "Wait, I was promised 4 Fish for my stone! Hand them over!"
      },
      {
        speaker: 'YOU',
        text: "That's not right either! It was only 2 Fish! You're all lying!"
      },
      {
        speaker: 'WOODCUTTER',
        text: "Enough! You're trying to cheat us all!",
        onComplete: () => {
          // Position NPCs for brawl - Elder at Stone Tablet edge, others spaced out
          // Stone Tablet is at x=1600, Elder overlaps its edge
          this.villageElder.x = this.villageCenterX - 30; // Elder at tablet's left edge
          this.villageElder.targetX = undefined; // Stop moving
          // Woodcutter to the left of Elder
          this.woodcutter.targetX = this.villageCenterX - 130;
          // Stone-worker to the right of tablet
          this.stoneWorker.targetX = this.villageCenterX - 100;
          
          this.state.phase = 'brawl';
          this.state.showBrawl = true;
          this.state.brawlTimer = 0;
          soundManager.stopDaytimeMusic();
                soundManager.playBrawlWithLayers(4000);
        }
      }
    ]);
  }

  // PARTIAL SETTLEMENT: Some debts recorded, others not
  // Only unrecorded debts cause conflict
  private triggerPartialSettlement(): void {
    this.state.phase = 'confrontation';
    
    const dialogueLines: DialogueLine[] = [];
    
    // First, Elder settles recorded debts peacefully
    dialogueLines.push({
      speaker: 'VILLAGE ELDER',
      text: "Let me check the Stone Tablet... I see some debts recorded here."
    });
    
    // Settle recorded debts
    if (this.state.woodcutterDebtRecorded) {
      dialogueLines.push({
        speaker: 'VILLAGE ELDER',
        text: "The Woodcutter's debt is recorded: 1 Stone + 1 Fish. This is settled fairly.",
        onComplete: () => {
          this.state.ledgerEntries = this.state.ledgerEntries.map(e => 
            e.debt.includes('WOODCUTTER') ? { ...e, debt: e.debt.replace('OWED', 'SETTLED') } : e
          );
          this.hudGlow = 1;
        }
      });
      dialogueLines.push({
        speaker: 'WOODCUTTER',
        text: "The Stone Tablet speaks true. Thank you for your honesty!"
      });
    }
    
    if (this.state.stoneWorkerDebtRecorded) {
      dialogueLines.push({
        speaker: 'VILLAGE ELDER',
        text: "The Stone-worker's debt is recorded: 2 Fish. This is settled fairly.",
        onComplete: () => {
          this.state.ledgerEntries = this.state.ledgerEntries.map(e => 
            e.debt.includes('STONE-WORKER') ? { ...e, debt: e.debt.replace('OWED', 'SETTLED') } : e
          );
          this.hudGlow = 1;
        }
      });
      dialogueLines.push({
        speaker: 'STONE-WORKER',
        text: "The Stone Tablet speaks true. Thank you for your honesty!"
      });
    }
    
    // Now the unrecorded debts cause dispute
    dialogueLines.push({
      speaker: 'VILLAGE ELDER',
      text: "But wait... there are debts not recorded on the tablet!"
    });
    
    if (!this.state.woodcutterDebtRecorded) {
      this.setMood('angry');
      dialogueLines.push({
        speaker: 'WOODCUTTER',
        text: "You owe me 3 Fish and a Stone! I clearly remember!"
      });
      dialogueLines.push({
        speaker: 'YOU',
        text: "That's not true! I only promised 1 Fish!"
      });
    }
    
    if (!this.state.stoneWorkerDebtRecorded) {
      this.setMood('angry');
      dialogueLines.push({
        speaker: 'STONE-WORKER',
        text: "You owe me 4 Fish! I remember the deal clearly!"
      });
      dialogueLines.push({
        speaker: 'YOU',
        text: "No! It was only 2 Fish! You're lying!"
      });
    }
    
    // Brawl triggered by unrecorded debts
    dialogueLines.push({
      speaker: 'VILLAGE ELDER',
      text: "Without a record, there is no way to know the truth...",
      onComplete: () => {
        // Trigger the brawl - NPCs run to player, Elder steps aside
        this.woodcutter.targetX = this.player.x - 30;
        this.stoneWorker.targetX = this.player.x + 30;
        this.villageElder.targetX = this.villageCenterX + 200; // Elder steps away
        this.state.phase = 'brawl';
        this.state.showBrawl = true;
        this.state.brawlTimer = 0;
        soundManager.stopDaytimeMusic();
                soundManager.playBrawlWithLayers(4000);
      }
    });
    
    this.queueDialogue(dialogueLines);
  }

  // Check if all debts have been settled directly with NPCs
  private checkAllDebtsSettled(): void {
    if (this.state.woodcutterSettled && this.state.stoneWorkerSettled) {
      // Both NPCs have been paid directly - Elder walks toward player to congratulate
      this.villageElder.targetX = this.player.x + 50; // Elder walks toward player
      this.state.elderWalkingToCelebrate = true; // Flag to trigger dialogue on arrival
      this.setMood('happy');
      
      // Update any VERIFIED or OWED entries to SETTLED
      this.state.ledgerEntries = this.state.ledgerEntries.map(e => ({
        ...e,
        debt: e.debt.replace('OWED', 'SETTLED').replace('VERIFIED', 'SETTLED')
      }));
      this.hudGlow = 1;
    }
  }
  
  // Triggered when Elder arrives at player after both debts are settled
  private triggerElderCelebration(): void {
    this.state.elderWalkingToCelebrate = false;
    
    this.queueDialogue([
      {
        speaker: 'YOU',
        text: "I've paid everyone what I owe! My debts are settled!"
      },
      {
        speaker: 'VILLAGE ELDER',
        text: "All debts are paid and recorded on the Stone Tablet. Peace is restored to our village!",
        onComplete: () => {
          this.state.showCelebration = true;
          this.state.celebrationTimer = 0;
          this.state.phase = 'loop2_return';
          this.stormTriggered = false; // Reset storm trigger
          this.celebrationEndTime = 0;
          soundManager.play('celebration');
          // Play applause with reduced duration (full duration minus 8 seconds, earlier stop)
          const fullDuration = soundManager.getBufferDuration('crowdApplause');
          soundManager.playForDuration('crowdApplause', Math.max(2000, fullDuration - 8000));
        }
      }
    ]);
  }
  
  // Storm clouds appear - player must interact with hut to fix roof and enter
  private triggerStormClouds(): void {
    // Start clouds animation and thunder
    this.state.showCloudsAnimation = true;
    this.state.cloudsAnimationTimer = 0;
    soundManager.fadeOut('backgroundMusicDay', 1000);
    soundManager.fadeOut('backgroundMusicDay2', 1000);
    soundManager.stopDaytimeMusic();
    soundManager.fadeOut('ambientVillage', 1000);
    soundManager.play('thunder');
    // "A STORM IS APPROACHING..." text is drawn in drawCloudsAnimation
    // Player must now interact with hut to proceed
  }
  
  // Storm approaching after celebration - player goes home, fixes roof, enters hut, then rain (legacy)
  private triggerStormApproaching(): void {
    this.queueDialogue([
      {
        speaker: 'YOU',
        text: "The storm is approaching! I need to fix my roof and get inside!",
        onComplete: () => {
          // Start clouds animation immediately
          this.state.showCloudsAnimation = true;
          this.state.cloudsAnimationTimer = 0;
          soundManager.fadeOut('backgroundMusicDay', 1000);
          soundManager.fadeOut('backgroundMusicDay2', 1000);
          soundManager.stopDaytimeMusic();
          soundManager.fadeOut('ambientVillage', 1000);
          soundManager.play('thunder');
          
          // After 2.5 seconds clouds, player fixes roof and enters hut
          setTimeout(() => {
            try {
              this.state.showCloudsAnimation = false;
              // Auto-fix roof if player has wood
              if (this.state.inventory.wood >= 1 && !this.state.roofRepaired) {
                // Play hammer sound shortened by 2 seconds
                const hammerDuration = Math.max(1000, soundManager.getBufferDuration('roofHammer') - 2000);
                soundManager.playForDuration('roofHammer', hammerDuration);
                this.state.roofRepaired = true;
                this.state.inventory.wood = 0;
                this.showInventoryPopup('ROOF FIXED!');
              }
              
              // Player fades into hut
              this.state.playerFading = true;
              // Player alpha will decrease in update() until 0, then visible=false and playerEnteredHut=true
              
              // Start rainfall
              this.state.showRainfall = true;
              this.state.rainfallTimer = 0;
              if (!this.rainSoundStarted) {
                this.rainSoundStarted = true;
                soundManager.fadeIn('rain', 500);
                soundManager.fadeIn('ambientNight', 500);
              }
              
              // Rain for 17 seconds, then night transition
              setTimeout(() => {
                try {
                  this.state.showNightTransition = true;
                  this.state.nightTransitionTimer = 0;
                  soundManager.fadeIn('backgroundMusicNight', 2000);
                  
                  // After 6 second night transition, delay quiz by 3 more seconds
                  setTimeout(() => {
                    try {
                      this.state.showRainfall = false;
                      soundManager.fadeOut('rain', 6000); // 6 second fade out
                      this.state.showNightTransition = false;
                      // Delay quiz appearance by 3 seconds
                      setTimeout(() => {
                        this.state.showQuiz = true;
                        this.state.phase = 'quiz';
                        this.player.visible = true;
                        this.state.playerEnteredHut = false;
                        this.state.playerAlpha = 1; // Reset alpha
                      }, 3000);
                    } catch (e) {
                      console.error('Error in quiz transition:', e);
                    }
                  }, 6000);
                } catch (e) {
                  console.error('Error in night transition:', e);
                }
              }, 17000); // 17 seconds of rain (extended by 11 seconds)
            } catch (e) {
              console.error('Error in storm sequence:', e);
            }
          }, 2500); // 2.5 seconds clouds
        }
      }
    ]);
  }

  private render(): void {
    const ctx = this.ctx;
    // Use logical dimensions for all rendering (CSS pixels, not device pixels)
    const w = this.logicalWidth;
    const h = this.logicalHeight;

    // Clear canvas (use full device pixel size for complete clear)
    ctx.clearRect(0, 0, w, h);

    // Show loading screen while parallax images are loading
    if (!this.parallaxLoaded) {
      this.drawLoadingScreen(ctx, w, h);
      return;
    }

    // Draw sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, h - this.dialogueBoxHeight);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(0.4, '#B4D7E8');
    skyGradient.addColorStop(1, '#FFECD2');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, w, h - this.dialogueBoxHeight);

    // Draw parallax background elements
    this.drawBackground(ctx);

    // Ground Y position for character placement
    const groundY = h - this.groundHeight - this.dialogueBoxHeight;
    // Note: Brown procedural ground removed - using parallax grass layer instead

    // Draw location markers FIRST (behind characters) - Stone Tablet and Home
    this.drawLocationMarkers(ctx, groundY);

    // Special z-order handling: player passes BEHIND fisherman near fishing hole
    // Check if player is in fisherman's area (between fisherman position and pond)
    const playerNearFisherman = this.player.x > 3100 && this.player.x < 3250;
    
    // Draw NPCs (in front of location markers)
    // But fisherman is drawn AFTER player if player is in fisherman's area
    this.npcs.forEach(npc => {
      if (npc.visible && npc.id !== 'fisherman') {
        this.drawCharacter(ctx, npc);
      }
    });
    
    // If player is near fisherman, draw player BEFORE fisherman
    if (playerNearFisherman) {
      this.drawCharacter(ctx, this.player);
      // Draw fisherman (in front of player)
      if (this.fisherman.visible) {
        this.drawCharacter(ctx, this.fisherman);
      }
    } else {
      // Draw fisherman
      if (this.fisherman.visible) {
        this.drawCharacter(ctx, this.fisherman);
      }
      // Draw player (in front of NPCs and markers) with alpha for fade effect
      if (this.state.playerAlpha < 1) {
        ctx.save();
        ctx.globalAlpha = this.state.playerAlpha;
        this.drawCharacter(ctx, this.player);
        ctx.restore();
      } else {
        this.drawCharacter(ctx, this.player);
      }
    }

    // Draw fishing pole in front of fisherman
    this.drawFishingPole(ctx, groundY);

    // Draw destination marker (subtle visual feedback for tap-to-walk)
    if (this.autoWalkTarget && this.autoWalkTarget.type === 'location') {
      this.drawDestinationMarker(ctx, groundY);
    }

    // Draw inventory popup
    if (this.inventoryPopup) {
      this.drawInventoryPopup(ctx);
    }
    
    // Draw foreground trees (in front of game elements, but BEHIND UI)
    if (this.parallaxLoaded) {
      const foregroundOffset = this.cameraX * 2.5;
      ctx.imageSmoothingEnabled = false;
      this.drawForegroundTrees(ctx, foregroundOffset, h);
      ctx.imageSmoothingEnabled = true;
      
      // Draw atmospheric haze overlay (in front of everything except UI)
      this.drawAtmosphericHaze(ctx, w, h);
    }

    // Draw inventory HUD at top of screen (on top of trees)
    this.drawInventoryHUD(ctx);
    
    // Draw inventory hint if active (popup with arrow pointing to inventory)
    if (this.state.showInventoryHint) {
      this.drawInventoryHint(ctx);
    }
    
    // Draw UI elements
    if (this.state.showHUD) {
      this.drawStoneTabletHUD(ctx);
    }
    this.drawDialogueBox(ctx);
    this.drawInteractButton(ctx);

    // Draw choice dialogue if active
    if (this.state.showChoice) {
      this.drawChoiceDialogue(ctx);
    }

    // Draw trade selection popup if active
    if (this.state.showTradeSelection) {
      this.drawTradeSelectionPopup(ctx);
    }

    // Draw badge popup if active
    if (this.state.showBadgePopup) {
      this.drawBadgePopup(ctx);
    }

    // Draw brawl animation if active
    if (this.state.showBrawl) {
      this.drawBrawlAnimation(ctx);
    }
    
    // Draw celebration animation if active
    if (this.state.showCelebration) {
      this.drawCelebrationAnimation(ctx);
    }
    
    // Draw thunderstorm animation if active
    if (this.state.showThunderstorm) {
      this.drawThunderstorm(ctx);
    }
    
    // Draw dark clouds animation if active
    if (this.state.showCloudsAnimation) {
      this.drawCloudsAnimation(ctx);
    }
    
    // Draw rainfall animation if active (but not during night transition which handles its own rain)
    if (this.state.showRainfall && !this.state.showNightTransition) {
      this.drawRainfallAnimation(ctx);
    }
    
    // Draw night transition animation if active (includes fading rain)
    if (this.state.showNightTransition) {
      this.drawNightTransition(ctx);
    }

    // Draw fail screen
    if (this.state.showFail) {
      this.drawFailScreen(ctx);
    }

    // Draw Stone Tablet popup if active (on top of everything except quiz)
    if (this.state.showStoneTabletPopup) {
      this.drawStoneTabletPopup(ctx);
    }
    
    // Draw quiz overlay if active
    if (this.state.showQuiz) {
      if (this.showQuizFeedback) {
        this.drawQuizFeedback(ctx);
      } else {
        this.drawQuizOverlay(ctx);
      }
    }

    // Draw quiz review screen
    if (this.state.showQuizReview) {
      this.drawQuizReview(ctx);
    }

    // Draw success screen if complete
    if (this.state.showSuccess) {
      this.drawSuccessScreen(ctx);
    }
  }

  private drawChoiceDialogue(ctx: CanvasRenderingContext2D): void {
    const w = this.logicalWidth;
    const h = this.logicalHeight;

    // Detect if this is a settlement dispute (first option mentions "Tablet")
    const firstOptionText = this.state.choiceOptions[0]?.text || '';
    const isSettlementPhase = firstOptionText.toLowerCase().includes('tablet');
    
    // Horizontal choice buttons positioned inside the dialogue box area
    const numChoices = this.state.choiceOptions.length;
    const dialogueY = h - this.dialogueBoxHeight;
    const padding = 15;
    const btnSpacing = 10;
    const btnH = 45;
    
    // Calculate button layout - measure text to ensure proper width
    // Start with normal font size, reduce if needed
    let fontSize = 14;
    const minFontSize = 10;
    let btnW: number;
    let maxTextWidth: number;
    
    // Find optimal font size and button width
    while (fontSize >= minFontSize) {
      ctx.font = `bold ${fontSize}px ${this.retroFont}`;
      
      // Measure all button texts to find the widest
      maxTextWidth = 0;
      this.state.choiceOptions.forEach(option => {
        const textWidth = ctx.measureText(option.text).width;
        if (textWidth > maxTextWidth) maxTextWidth = textWidth;
      });
      
      // Button width = text width + padding (30px on each side)
      const idealBtnW = maxTextWidth + 60;
      const totalAvailableWidth = w - (padding * 2) - ((numChoices - 1) * btnSpacing);
      const maxBtnW = totalAvailableWidth / numChoices;
      btnW = Math.min(idealBtnW, maxBtnW);
      
      // Check if text fits with padding
      if (maxTextWidth + 20 <= btnW) {
        break; // Text fits, use this font size
      }
      fontSize -= 1;
    }
    
    const totalButtonsWidth = (btnW! * numChoices) + ((numChoices - 1) * btnSpacing);
    const startX = (w - totalButtonsWidth) / 2;
    const btnY = dialogueY + (this.dialogueBoxHeight - btnH) / 2;

    // Draw choice buttons horizontally
    this.choiceButtonAreas = [];
    this.state.choiceOptions.forEach((option, i) => {
      const btnX = startX + i * (btnW! + btnSpacing);

      // Color logic:
      // Settlement phase: first option (consult tablet) = GREEN (smart), second (give in) = RED (risky)
      // Procurement phase: all options same color (neutral choice)
      let btnColor: string;
      if (isSettlementPhase) {
        btnColor = i === 0 ? '#22C55E' : '#DC2626'; // Green for tablet, Red for give-in
      } else {
        // For fish trading choices, use a neutral tan color
        btnColor = '#8B6914'; // Warm tan/gold
      }
      
      // Button background with border
      ctx.fillStyle = btnColor;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW!, btnH, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw button text centered with calculated font size
      ctx.font = `bold ${fontSize}px ${this.retroFont}`;
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Draw text - it should fit since we measured and adjusted font
      ctx.fillText(option.text, btnX + btnW! / 2, btnY + btnH / 2);

      this.choiceButtonAreas.push({ x: btnX, y: btnY, w: btnW!, h: btnH, index: i });
    });
    
    ctx.textBaseline = 'alphabetic';
  }

  private choiceButtonAreas: { x: number; y: number; w: number; h: number; index: number }[] = [];
  private tradeSelectionButtonAreas: { x: number; y: number; w: number; h: number; item: string }[] = [];
  private badgePopupButtonArea: { x: number; y: number; w: number; h: number } | null = null;

  private drawTradeSelectionPopup(ctx: CanvasRenderingContext2D): void {
    const w = this.logicalWidth;
    const h = this.logicalHeight;
    
    // Collect available items (count > 0)
    const availableItems: { name: string; count: number; color: string }[] = [];
    if (this.state.inventory.slingshot > 0) {
      availableItems.push({ name: 'Slingshot', count: this.state.inventory.slingshot, color: '#D97706' });
    }
    if (this.state.inventory.berries > 0) {
      availableItems.push({ name: 'Berries', count: this.state.inventory.berries, color: '#DC2626' });
    }
    if (this.state.inventory.wood > 0) {
      availableItems.push({ name: 'Wood', count: this.state.inventory.wood, color: '#8B4513' });
    }
    if (this.state.inventory.stone > 0) {
      availableItems.push({ name: 'Stone', count: this.state.inventory.stone, color: '#6B7280' });
    }
    if (this.state.inventory.fish > 0) {
      availableItems.push({ name: 'Fish', count: this.state.inventory.fish, color: '#3B82F6' });
    }
    
    // Popup dimensions
    const popupWidth = 320;
    const itemBtnHeight = 50;
    const padding = 16;
    const headerHeight = 50;
    const popupHeight = headerHeight + availableItems.length * (itemBtnHeight + 8) + padding * 2 + 50;
    const popupX = (w - popupWidth) / 2;
    const popupY = (h - popupHeight) / 2;
    
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, h);
    
    // Popup background
    ctx.fillStyle = '#3D2B1F';
    ctx.beginPath();
    ctx.roundRect(popupX, popupY, popupWidth, popupHeight, 12);
    ctx.fill();
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Header
    ctx.font = `bold 18px ${this.uiFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F5DEB3';
    ctx.fillText('What would you like to offer?', popupX + popupWidth / 2, popupY + 30);
    
    // Draw item buttons
    this.tradeSelectionButtonAreas = [];
    let itemY = popupY + headerHeight;
    
    availableItems.forEach((item) => {
      const btnX = popupX + padding;
      const btnW = popupWidth - padding * 2;
      
      // Button background
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(btnX, itemY, btnW, itemBtnHeight, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Item icon (circle)
      const iconRadius = 16;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(btnX + padding + iconRadius, itemY + itemBtnHeight / 2, iconRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Item name and count
      ctx.font = `bold 16px ${this.uiFont}`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.fillText(`${item.name} (${item.count})`, btnX + padding + iconRadius * 2 + 12, itemY + itemBtnHeight / 2 + 6);
      
      this.tradeSelectionButtonAreas.push({ x: btnX, y: itemY, w: btnW, h: itemBtnHeight, item: item.name.toLowerCase() });
      itemY += itemBtnHeight + 8;
    });
    
    // Cancel button
    const cancelBtnY = itemY + 8;
    const cancelBtnW = popupWidth - padding * 2;
    const cancelBtnX = popupX + padding;
    
    ctx.fillStyle = '#6B7280';
    ctx.beginPath();
    ctx.roundRect(cancelBtnX, cancelBtnY, cancelBtnW, 40, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.font = `bold 14px ${this.uiFont}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('Never mind', cancelBtnX + cancelBtnW / 2, cancelBtnY + 25);
    
    this.tradeSelectionButtonAreas.push({ x: cancelBtnX, y: cancelBtnY, w: cancelBtnW, h: 40, item: 'cancel' });
  }

  private drawBadgePopup(ctx: CanvasRenderingContext2D): void {
    if (!this.state.pendingBadge) return;
    
    const w = this.logicalWidth;
    const h = this.logicalHeight;
    
    // Popup dimensions - increased height for text and button spacing
    const popupWidth = 420;
    const popupHeight = 360;
    const popupX = (w - popupWidth) / 2;
    const popupY = (h - popupHeight) / 2;
    
    // Dark overlay with celebration effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, w, h);
    
    // Add sparkle particles
    const now = Date.now() / 1000;
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2 + now;
      const dist = 180 + Math.sin(now * 3 + i) * 30;
      const sparkleX = w / 2 + Math.cos(angle) * dist;
      const sparkleY = h / 2 + Math.sin(angle) * dist * 0.5;
      const size = 3 + Math.sin(now * 5 + i * 0.5) * 2;
      
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(sparkleX, sparkleY, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Popup background with gradient effect
    const gradient = ctx.createLinearGradient(popupX, popupY, popupX, popupY + popupHeight);
    gradient.addColorStop(0, '#4A3728');
    gradient.addColorStop(1, '#2D1B0E');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(popupX, popupY, popupWidth, popupHeight, 16);
    ctx.fill();
    
    // Golden border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // "Badge Earned!" header
    ctx.font = `bold 24px ${this.uiFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('Badge Earned!', popupX + popupWidth / 2, popupY + 40);
    
    // Badge icon (star/medal shape)
    const badgeX = popupX + popupWidth / 2;
    const badgeY = popupY + 90;
    const badgeSize = 40;
    
    // Draw star shape
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
      const x = badgeX + Math.cos(angle) * badgeSize;
      const y = badgeY + Math.sin(angle) * badgeSize;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Badge name
    ctx.font = `bold 18px ${this.uiFont}`;
    ctx.fillStyle = '#F5DEB3';
    ctx.fillText(this.state.pendingBadge.name, popupX + popupWidth / 2, popupY + 150);
    
    // Badge description (word wrap)
    ctx.font = `14px ${this.uiFont}`;
    ctx.fillStyle = '#C4A77D';
    const desc = this.state.pendingBadge.description;
    const maxWidth = popupWidth - 40;
    const words = desc.split(' ');
    let line = '';
    let lineY = popupY + 180;
    
    words.forEach((word) => {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth) {
        ctx.fillText(line.trim(), popupX + popupWidth / 2, lineY);
        line = word + ' ';
        lineY += 20;
      } else {
        line = testLine;
      }
    });
    if (line.trim()) {
      ctx.fillText(line.trim(), popupX + popupWidth / 2, lineY);
    }
    
    // Continue button
    const btnWidth = 120;
    const btnHeight = 40;
    const btnX = popupX + (popupWidth - btnWidth) / 2;
    const btnY = popupY + popupHeight - 55;
    
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.font = `bold 16px ${this.uiFont}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Continue', btnX + btnWidth / 2, btnY + 26);
    
    this.badgePopupButtonArea = { x: btnX, y: btnY, w: btnWidth, h: btnHeight };
  }

  private drawBrawlAnimation(ctx: CanvasRenderingContext2D): void {
    const w = this.logicalWidth;
    const h = this.logicalHeight;
    // Center brawl on player's screen position (covers player + Woodcutter + Stoneworker, not Elder)
    const playerScreenX = this.player.x - this.cameraX;
    const centerX = Math.max(150, Math.min(w - 150, playerScreenX));
    // Position brawl on the ground (above dialogue box, at character level)
    const groundY = h - this.groundHeight - this.dialogueBoxHeight;
    const centerY = groundY - 60; // Just above ground level

    // Animate the dust cloud size - covers player + 2 NPCs (not Elder)
    const t = this.state.brawlTimer;
    const cloudSize = 180 + Math.sin(t * 10) * 30;
    const rotation = t * 3;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    // Main dust cloud (Looney Tunes style)
    ctx.fillStyle = '#D4C4A8';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = cloudSize + Math.sin(t * 15 + i) * 15;
      const x = Math.cos(angle) * r * 0.8;
      const y = Math.sin(angle) * r * 0.6;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Animated limbs popping out
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    
    // Arm 1
    const arm1Angle = Math.sin(t * 8) * 0.5;
    ctx.save();
    ctx.rotate(arm1Angle);
    ctx.beginPath();
    ctx.moveTo(cloudSize * 0.6, 0);
    ctx.lineTo(cloudSize * 1.2, 0);
    ctx.stroke();
    ctx.restore();

    // Arm 2
    ctx.save();
    ctx.rotate(Math.PI + Math.sin(t * 9 + 1) * 0.5);
    ctx.beginPath();
    ctx.moveTo(cloudSize * 0.6, 0);
    ctx.lineTo(cloudSize * 1.1, 0);
    ctx.stroke();
    ctx.restore();

    // Leg 1
    ctx.save();
    ctx.rotate(Math.PI * 0.5 + Math.sin(t * 7) * 0.4);
    ctx.beginPath();
    ctx.moveTo(cloudSize * 0.5, 0);
    ctx.lineTo(cloudSize * 1.0, 0);
    ctx.stroke();
    ctx.restore();

    // Leg 2
    ctx.save();
    ctx.rotate(Math.PI * 1.5 + Math.sin(t * 11 + 2) * 0.4);
    ctx.beginPath();
    ctx.moveTo(cloudSize * 0.5, 0);
    ctx.lineTo(cloudSize * 1.0, 0);
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    // Comic effects - stars and action words
    ctx.font = `16px ${this.retroFont}`;
    ctx.fillStyle = '#DC2626';
    ctx.textAlign = 'center';
    const effects = ['POW!', 'BAM!', 'CRASH!'];
    const effectIndex = Math.floor(t * 3) % 3;
    ctx.fillText(effects[effectIndex], centerX + Math.sin(t * 5) * 50, centerY - 100);
  }

  private drawCelebrationAnimation(ctx: CanvasRenderingContext2D): void {
    const w = this.logicalWidth;
    const h = this.logicalHeight;
    const groundY = h - this.groundHeight - this.dialogueBoxHeight;
    const t = this.state.celebrationTimer;
    
    // Calculate fade out - start fading 5 seconds before end (longer fade)
    const applauseDuration = soundManager.getBufferDuration('crowdApplause') / 1000;
    const fadeStartTime = Math.max(0, applauseDuration - 5);
    const distToHome = Math.abs(this.player.x - this.playerHomeX);
    
    // Also start fading when approaching home (within 400 pixels, full fade at 250)
    let fadeAlpha = 1.0;
    if (distToHome <= 400) {
      fadeAlpha = Math.max(0, (distToHome - 250) / 150);
    }
    if (t > fadeStartTime) {
      const timeFade = 1 - ((t - fadeStartTime) / 1.5);
      fadeAlpha = Math.min(fadeAlpha, timeFade);
    }
    fadeAlpha = Math.max(0, Math.min(1, fadeAlpha));
    
    // Draw confetti particles with fade - diagonal falling pattern
    const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#9B59B6', '#2ECC71'];
    ctx.save();
    ctx.globalAlpha = fadeAlpha;
    for (let i = 0; i < 30; i++) {
      const seed = i * 137.5;
      // Diagonal movement: X moves right as Y moves down
      const baseX = seed * 7.3;
      const baseY = seed * 3.7;
      const fallSpeed = 120 + (i % 5) * 30; // Varied fall speeds
      const driftSpeed = 80 + (i % 3) * 20; // Horizontal drift for diagonal effect
      const x = (baseX + t * driftSpeed) % w;
      const y = ((baseY + t * fallSpeed) % (groundY - 100)) + 50;
      const size = 4 + (i % 3) * 2;
      const colorIndex = i % confettiColors.length;
      const rotation = t * (5 + i % 3);
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = confettiColors[colorIndex];
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    }
    ctx.restore();
    
    // Draw dancing NPCs indicator - bouncing motion for NPCs at village center
    // Get the screen positions for NPCs at center
    const woodcutterScreenX = this.woodcutter.x - this.cameraX;
    const stoneWorkerScreenX = this.stoneWorker.x - this.cameraX;
    const elderScreenX = this.villageElder.x - this.cameraX;
    
    // Draw musical notes above dancing characters
    ctx.font = '20px Arial';
    ctx.fillStyle = '#FFD700';
    const noteY = groundY - 120;
    
    // Animate notes
    const bounce = Math.sin(t * 10) * 10;
    
    if (Math.abs(this.woodcutter.x - this.villageCenterX) < 100) {
      ctx.fillText('♪', woodcutterScreenX + Math.sin(t * 8) * 15, noteY + bounce);
    }
    if (Math.abs(this.stoneWorker.x - this.villageCenterX) < 100) {
      ctx.fillText('♫', stoneWorkerScreenX + Math.sin(t * 9 + 1) * 15, noteY - bounce);
    }
    ctx.fillText('♪', elderScreenX + Math.sin(t * 7 + 2) * 15, noteY + bounce * 0.5);
    
    // Center "CELEBRATION!" text
    ctx.font = `24px ${this.retroFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#22C55E';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    // Center vertically in the playable area (above ground and dialogue box)
    const playableHeight = groundY;
    const celebY = (playableHeight / 2) + Math.sin(t * 5) * 10;
    // Only show "DEBTS SETTLED!" text for first 4 seconds
    if (t <= 4) {
      ctx.strokeText('DEBTS SETTLED!', w / 2, celebY);
      ctx.fillText('DEBTS SETTLED!', w / 2, celebY);
    }
  }
  
  private drawThunderstorm(ctx: CanvasRenderingContext2D): void {
    const w = this.logicalWidth;
    const h = this.logicalHeight;
    const t = this.state.thunderstormTimer;
    
    // Dark storm overlay that builds up (reduced darkness)
    const stormProgress = Math.min(1, t / 1.5);
    const stormAlpha = stormProgress * 0.35;
    ctx.fillStyle = `rgba(30, 30, 50, ${stormAlpha})`;
    ctx.fillRect(0, 0, w, h);
    
    // Lightning flashes at intervals
    const flashTime = t % 0.8;
    if (flashTime < 0.1) {
      const flashIntensity = (0.1 - flashTime) / 0.1;
      ctx.fillStyle = `rgba(255, 255, 220, ${flashIntensity * 0.6})`;
      ctx.fillRect(0, 0, w, h);
    }
    
    // Draw rain
    ctx.strokeStyle = 'rgba(150, 180, 220, 0.6)';
    ctx.lineWidth = 1;
    const rainSpeed = 800;
    const rainCount = 100;
    for (let i = 0; i < rainCount; i++) {
      const rainX = (i * 37 + t * rainSpeed * 0.3) % (w + 100) - 50;
      const rainY = (i * 53 + t * rainSpeed) % (h + 50) - 25;
      ctx.beginPath();
      ctx.moveTo(rainX, rainY);
      ctx.lineTo(rainX - 3, rainY + 15);
      ctx.stroke();
    }
    
    // "STORM!" text with lightning effect
    if (t > 0.5) {
      const textAlpha = Math.min(1, (t - 0.5) / 0.5);
      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.font = `bold ${Math.min(48, w / 15)}px ${this.retroFont}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      const stormY = 80 + Math.sin(t * 8) * 5;
      ctx.strokeText('THE STORM!', w / 2, stormY);
      ctx.fillText('THE STORM!', w / 2, stormY);
      ctx.restore();
    }
  }
  
  private drawCloudsAnimation(ctx: CanvasRenderingContext2D): void {
    const w = this.logicalWidth;
    const h = this.logicalHeight;
    
    // Update timer
    this.state.cloudsAnimationTimer += 1/60;
    const t = this.state.cloudsAnimationTimer;
    
    // Calculate cloud positions rolling in from left and right
    const progress = Math.min(1, t / 2.5); // 0 to 1 over 2.5 seconds
    const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out
    
    // Darken the sky gradually (reduced darkness)
    const darkenAlpha = easeProgress * 0.4;
    ctx.fillStyle = `rgba(30, 30, 50, ${darkenAlpha})`;
    ctx.fillRect(0, 0, w, h);
    
    // Draw large dark clouds rolling in from left
    const leftCloudX = -w * 0.4 + (w * 0.6) * easeProgress;
    this.drawCloud(ctx, leftCloudX, h * 0.15, 200, 0.8 * easeProgress, '#3a3a50');
    this.drawCloud(ctx, leftCloudX - 100, h * 0.25, 180, 0.7 * easeProgress, '#404055');
    this.drawCloud(ctx, leftCloudX + 50, h * 0.1, 150, 0.6 * easeProgress, '#454560');
    
    // Draw large dark clouds rolling in from right
    const rightCloudX = w + w * 0.4 - (w * 0.6) * easeProgress;
    this.drawCloud(ctx, rightCloudX, h * 0.12, 220, 0.8 * easeProgress, '#3a3a50');
    this.drawCloud(ctx, rightCloudX + 100, h * 0.22, 170, 0.7 * easeProgress, '#404055');
    this.drawCloud(ctx, rightCloudX - 80, h * 0.08, 160, 0.6 * easeProgress, '#454560');
    
    // Draw center cloud that slowly fades in from center top
    const centerCloudAlpha = Math.min(1, t / 3.0) * 0.85; // Fade in slowly over 3 seconds
    this.drawCloud(ctx, w * 0.5, h * 0.18, 250, centerCloudAlpha, '#2a2a40');
    this.drawCloud(ctx, w * 0.4, h * 0.14, 180, centerCloudAlpha * 0.8, '#353550');
    this.drawCloud(ctx, w * 0.6, h * 0.16, 190, centerCloudAlpha * 0.8, '#353550');
    
    // Text overlay at the end - fades in then fades out
    // Skip text entirely once roof fix starts (roofRepaired becomes true)
    if (!this.state.roofRepaired && progress > 0.7) {
      const textAppearTime = 1.75;
      const textDuration = 5;
      const textFadeOutTime = 1;
      
      let textAlpha = (progress - 0.7) / 0.3; // Fade in
      
      // Calculate fade out (after 5 seconds of visibility)
      const timeSinceAppear = t - textAppearTime;
      if (timeSinceAppear > textDuration) {
        const fadeOutProgress = (timeSinceAppear - textDuration) / textFadeOutTime;
        textAlpha = Math.max(0, 1 - fadeOutProgress);
      }
      
      if (textAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = textAlpha;
        ctx.font = `bold 24px ${this.retroFont}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText('A storm approaches...', w / 2, h / 2);
        ctx.fillText('A storm approaches...', w / 2, h / 2);
        ctx.restore();
      }
    }
  }
  
  private drawRainfallAnimation(ctx: CanvasRenderingContext2D): void {
    const w = this.logicalWidth;
    const h = this.logicalHeight;
    
    // Update timer
    this.state.rainfallTimer += 1/60;
    const t = this.state.rainfallTimer;
    
    // Dark stormy sky background (reduced darkness)
    ctx.fillStyle = 'rgba(20, 20, 35, 0.65)';
    ctx.fillRect(0, 0, w, h);
    
    // Draw persistent clouds at top
    this.drawCloud(ctx, w * 0.2, h * 0.12, 220, 0.9, '#2a2a40');
    this.drawCloud(ctx, w * 0.5, h * 0.15, 280, 0.95, '#252538');
    this.drawCloud(ctx, w * 0.8, h * 0.1, 200, 0.85, '#2a2a40');
    this.drawCloud(ctx, w * 0.35, h * 0.08, 180, 0.8, '#303048');
    this.drawCloud(ctx, w * 0.65, h * 0.12, 190, 0.8, '#303048');
    
    // Rain drops animation
    ctx.strokeStyle = 'rgba(180, 200, 255, 0.4)';
    ctx.lineWidth = 1.5;
    
    const rainDensity = 150; // Number of rain drops
    for (let i = 0; i < rainDensity; i++) {
      // Seeded random positions that animate
      const seed = i * 1234.5678;
      const x = ((seed % w) + t * 80 * ((i % 3) + 1)) % w;
      const baseY = ((seed * 7) % h);
      const y = (baseY + t * 400 * (0.8 + (i % 5) * 0.1)) % (h + 50);
      
      // Rain drop as a short line
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y + 15);
      ctx.stroke();
    }
    
    // Occasional lightning flash
    if (Math.sin(t * 3) > 0.98) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(0, 0, w, h);
    }
    
    // Show "A storm approaches" text with fade - but hide once roof fix starts
    // Once roofRepaired is true, fade out the text quickly
    if (!this.state.roofRepaired) {
      const textVisibleTime = t + 0.75; // Time since text first appeared
      const textDuration = 5; // Total visibility before fade
      const textFadeOutTime = 1; // Fade out duration
      
      if (textVisibleTime < textDuration + textFadeOutTime) {
        let textAlpha = 1;
        if (textVisibleTime > textDuration) {
          textAlpha = Math.max(0, 1 - (textVisibleTime - textDuration) / textFadeOutTime);
        }
        
        if (textAlpha > 0) {
          ctx.save();
          ctx.globalAlpha = textAlpha;
          ctx.font = `bold 24px ${this.retroFont}`;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 3;
          ctx.strokeText('A storm approaches...', w / 2, h / 2);
          ctx.fillText('A storm approaches...', w / 2, h / 2);
          ctx.restore();
        }
      }
    }
  }
  
  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number, color: string): void {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    
    // Draw cloud as overlapping circles
    const r = size / 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - r * 0.8, y + r * 0.3, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + r * 0.8, y + r * 0.3, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - r * 0.4, y - r * 0.3, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + r * 0.4, y - r * 0.3, r * 0.75, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  private drawNightTransition(ctx: CanvasRenderingContext2D): void {
    const w = this.logicalWidth;
    const h = this.logicalHeight;
    const t = this.state.nightTransitionTimer;
    
    // Continue rain effect during night transition (fading out more slowly)
    if (this.state.showRainfall) {
      const rainFade = Math.max(0, 1 - t / 4); // Fade rain over first 4 seconds
      
      // Rain drops animation (continuing from rainfall)
      ctx.strokeStyle = `rgba(180, 200, 255, ${0.4 * rainFade})`;
      ctx.lineWidth = 1.5;
      
      const rainDensity = Math.floor(150 * rainFade);
      const rainT = this.state.rainfallTimer + t;
      for (let i = 0; i < rainDensity; i++) {
        const seed = i * 1234.5678;
        const x = ((seed % w) + rainT * 80 * ((i % 3) + 1)) % w;
        const baseY = ((seed * 7) % h);
        const y = (baseY + rainT * 400 * (0.8 + (i % 5) * 0.1)) % (h + 50);
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 2, y + 15);
        ctx.stroke();
      }
    }
    
    // Fade from storm to night over 4 seconds (smooth gradual transition)
    const fadeProgress = Math.min(1, t / 4);
    // Use easing function for smoother fade: start slow, accelerate, then slow down
    const easedProgress = fadeProgress < 0.5 
      ? 2 * fadeProgress * fadeProgress 
      : 1 - Math.pow(-2 * fadeProgress + 2, 2) / 2;
    const nightAlpha = 0.3 + easedProgress * 0.6; // Start at 30%, smoothly fade to 90%
    
    // Draw dark overlay that increases as rain fades
    ctx.fillStyle = `rgba(10, 20, 50, ${nightAlpha})`;
    ctx.fillRect(0, 0, w, h);
    
    // Draw moon (fades in)
    if (fadeProgress > 0.3) {
      const moonAlpha = Math.min(1, (fadeProgress - 0.3) / 0.7);
      const moonX = w * 0.8;
      const moonY = 80;
      const moonRadius = 40;
      
      ctx.save();
      ctx.globalAlpha = moonAlpha;
      
      // Moon glow
      const moonGlow = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.5, moonX, moonY, moonRadius * 2);
      moonGlow.addColorStop(0, 'rgba(255, 255, 200, 0.5)');
      moonGlow.addColorStop(1, 'rgba(255, 255, 200, 0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Moon body
      ctx.fillStyle = '#FFFACD';
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Moon craters
      ctx.fillStyle = 'rgba(200, 190, 150, 0.3)';
      ctx.beginPath();
      ctx.arc(moonX - 10, moonY - 5, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(moonX + 15, moonY + 10, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
    
    // Draw stars (fade in after moon)
    if (fadeProgress > 0.5) {
      const starAlpha = Math.min(1, (fadeProgress - 0.5) / 0.5);
      ctx.save();
      ctx.globalAlpha = starAlpha;
      
      // Twinkling stars
      for (let i = 0; i < 30; i++) {
        const starX = (i * 73.7) % (w * 0.9) + w * 0.05;
        const starY = (i * 41.3) % (h * 0.4) + 20;
        const twinkle = Math.sin(t * 5 + i * 0.5) * 0.3 + 0.7;
        const starSize = (1 + (i % 3)) * twinkle;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
    
    // Draw "THE END OF A GOOD DAY" text after transition (fade out 3s earlier - at t=4 instead of t=7)
    if (t > 2 && t < 5) {
      // Fade in from t=2 to t=3, then fade out from t=4 to t=5
      let textAlpha = 1;
      if (t < 3) {
        textAlpha = (t - 2); // Fade in
      } else if (t > 4) {
        textAlpha = 1 - (t - 4); // Fade out
      }
      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.font = `20px ${this.retroFont}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText('A PEACEFUL NIGHT...', w / 2, h / 2 - 20);
      ctx.fillText('A PEACEFUL NIGHT...', w / 2, h / 2 - 20);
      ctx.font = `14px ${this.retroFont}`;
      ctx.strokeText('Your roof is repaired. Your debts are recorded.', w / 2, h / 2 + 20);
      ctx.fillText('Your roof is repaired. Your debts are recorded.', w / 2, h / 2 + 20);
      ctx.restore();
    }
  }

  private drawFailScreen(ctx: CanvasRenderingContext2D): void {
    const w = this.logicalWidth;
    const h = this.logicalHeight;

    // Dark overlay
    ctx.fillStyle = 'rgba(139, 0, 0, 0.9)';
    ctx.fillRect(0, 0, w, h);

    // Fail card
    const cardW = Math.min(550, w - 60);
    const cardH = 380;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;

    ctx.fillStyle = '#2D1810';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Title
    ctx.font = `20px ${this.retroFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#DC2626';
    ctx.fillText('VILLAGE IN CHAOS!', w / 2, cardY + 50);

    // Message
    ctx.font = `10px ${this.retroFont}`;
    ctx.fillStyle = '#F5F5F5';
    const lines = [
      "Memory cannot be trusted.",
      "Without a written record,",
      "everyone remembered the deals",
      "differently.",
      "",
      "Try again, but this time,",
      "find a way to RECORD your debts!"
    ];
    lines.forEach((line, i) => {
      ctx.fillText(line, w / 2, cardY + 100 + i * 28);
    });

    // Try Again button
    const btnW = 220;
    const btnH = 50;
    const btnX = (w - btnW) / 2;
    const btnY = cardY + cardH - 80;

    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();

    ctx.font = `12px ${this.retroFont}`;
    ctx.fillStyle = '#FFF';
    ctx.fillText('TRY AGAIN', w / 2, btnY + btnH / 2 + 4);

    this.failRetryButton = { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  private failRetryButton: { x: number; y: number; w: number; h: number } | null = null;

  private handleFailTouch(x: number, y: number): void {
    if (this.failRetryButton) {
      const btn = this.failRetryButton;
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        this.startLoop2();
      }
    }
  }

  private handleChoiceTouch(x: number, y: number): void {
    for (const btn of this.choiceButtonAreas) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        soundManager.play('choiceSelect');
        const option = this.state.choiceOptions[btn.index];
        if (option && option.action) {
          option.action();
        }
        break;
      }
    }
  }

  private handleTradeSelectionTouch(x: number, y: number): void {
    for (const btn of this.tradeSelectionButtonAreas) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        soundManager.play('choiceSelect');
        this.state.showTradeSelection = false;
        if (this.state.tradeSelectionCallback) {
          if (btn.item === 'cancel') {
            this.state.tradeSelectionCallback(null);
          } else {
            this.state.tradeSelectionCallback(btn.item);
          }
          this.state.tradeSelectionCallback = null;
        }
        break;
      }
    }
  }

  private handleBadgePopupTouch(x: number, y: number): void {
    if (this.badgePopupButtonArea) {
      const btn = this.badgePopupButtonArea;
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        soundManager.play('choiceSelect');
        // Add badge to earned badges
        if (this.state.pendingBadge) {
          this.state.badges.push(this.state.pendingBadge.name);
        }
        this.state.showBadgePopup = false;
        this.state.pendingBadge = null;
        
        // Run callback after badge is dismissed
        if (this.badgeDismissCallback) {
          const callback = this.badgeDismissCallback;
          this.badgeDismissCallback = null;
          callback();
        }
      }
    }
  }

  private showTradeSelection(callback: (item: string | null) => void): void {
    this.state.showTradeSelection = true;
    this.state.tradeSelectionCallback = callback;
  }

  // Callback to run after badge popup is dismissed
  private badgeDismissCallback: (() => void) | null = null;
  
  private awardBadge(name: string, description: string, onDismiss?: () => void): void {
    // Don't award duplicates
    if (!this.state.badges.includes(name)) {
      this.state.pendingBadge = { name, description };
      this.state.showBadgePopup = true;
      this.badgeDismissCallback = onDismiss || null;
      soundManager.play('quizCorrect');
    } else if (onDismiss) {
      // Badge already earned, call callback immediately
      onDismiss();
    }
  }

  private drawLocationMarkers(ctx: CanvasRenderingContext2D, groundY: number): void {
    // Player Home marker (at x=100) - 20% larger
    const homeScreenX = this.playerHomeX - this.cameraX;
    const hutScale = 1.2; // 20% larger
    if (homeScreenX > -100 && homeScreenX < this.logicalWidth + 100) {
      // Draw a simple house shape (scaled 20% larger)
      const hutWidth = 60 * hutScale;
      const hutHeight = 60 * hutScale;
      ctx.fillStyle = '#4A3728';
      ctx.fillRect(homeScreenX - hutWidth/2, groundY - hutHeight, hutWidth, hutHeight);
      
      // Draw roof (scaled 20% larger)
      ctx.fillStyle = '#6B4423';
      ctx.beginPath();
      ctx.moveTo(homeScreenX - 40 * hutScale, groundY - hutHeight);
      ctx.lineTo(homeScreenX, groundY - 100 * hutScale);
      ctx.lineTo(homeScreenX + 40 * hutScale, groundY - hutHeight);
      ctx.fill();
      
      // Draw hole in roof if not repaired (keep hole size the same!)
      const holeY = groundY - (75 * hutScale); // Position scaled but hole size same
      if (!this.state.roofRepaired) {
        // Hole in the roof (dark opening) - SAME SIZE as before
        ctx.fillStyle = '#1a0f08';
        ctx.beginPath();
        ctx.ellipse(homeScreenX + 12 * hutScale, holeY, 15, 10, -0.3, 0, Math.PI * 2);
        ctx.fill();
        // Jagged edges for the hole
        ctx.strokeStyle = '#4A3020';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(homeScreenX + 12 * hutScale, holeY, 16, 11, -0.3, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Patch on the roof (lighter wood color) - SAME SIZE as before
        ctx.fillStyle = '#8B6B4F';
        ctx.beginPath();
        ctx.ellipse(homeScreenX + 12 * hutScale, holeY, 15, 10, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5D4E37';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Door (scaled 20% larger)
      ctx.fillStyle = '#2D1F14';
      ctx.fillRect(homeScreenX - 12 * hutScale, groundY - 42 * hutScale, 24 * hutScale, 42 * hutScale);
      // Label
      ctx.font = `10px ${this.retroFont}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFF';
      ctx.fillText('HOME', homeScreenX, groundY - 110);
    }

    // Village Center / Elder's Rock marker (at x=1500)
    const centerScreenX = this.villageCenterX - this.cameraX;
    if (centerScreenX > -100 && centerScreenX < this.logicalWidth + 100) {
      // Draw a large blank rock
      ctx.fillStyle = '#8B8B8B';
      ctx.beginPath();
      ctx.moveTo(centerScreenX - 50, groundY);
      ctx.lineTo(centerScreenX - 60, groundY - 80);
      ctx.lineTo(centerScreenX - 30, groundY - 120);
      ctx.lineTo(centerScreenX + 30, groundY - 110);
      ctx.lineTo(centerScreenX + 55, groundY - 70);
      ctx.lineTo(centerScreenX + 45, groundY);
      ctx.fill();
      // Rock texture lines
      ctx.strokeStyle = '#6B6B6B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerScreenX - 40, groundY - 60);
      ctx.lineTo(centerScreenX + 20, groundY - 55);
      ctx.moveTo(centerScreenX - 20, groundY - 90);
      ctx.lineTo(centerScreenX + 30, groundY - 85);
      ctx.stroke();
    }
    
    // Fishing Hole / Pond at Fisherman's location (x=3200)
    // Shifted left by 60px and down by 25px so pond sits below ground horizon
    const fishingHoleX = 3200;
    const pondScreenX = fishingHoleX - this.cameraX - 60; // Shift left
    const pondYOffset = 25; // Shift down
    if (pondScreenX > -150 && pondScreenX < this.logicalWidth + 150) {
      // Draw pond/water
      ctx.fillStyle = '#4A90B8';
      ctx.beginPath();
      ctx.ellipse(pondScreenX - 40, groundY + 5 + pondYOffset, 70, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Pond edge/bank
      ctx.strokeStyle = '#5D4E37';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(pondScreenX - 40, groundY + 5 + pondYOffset, 72, 22, 0, 0, Math.PI * 2);
      ctx.stroke();
      
      // Water ripples
      ctx.strokeStyle = '#6BB5D8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(pondScreenX - 50, groundY + pondYOffset, 20, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(pondScreenX - 25, groundY + 8 + pondYOffset, 15, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      
      // Float/bobber
      ctx.fillStyle = '#FF4444';
      ctx.beginPath();
      ctx.arc(pondScreenX - 45, groundY - 5 + pondYOffset, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw fishing pole in front of fisherman (called after NPCs are drawn)
  private drawFishingPole(ctx: CanvasRenderingContext2D, groundY: number): void {
    const fishingHoleX = 3200;
    const pondScreenX = fishingHoleX - this.cameraX - 60; // Same offset as pond
    const pondYOffset = 25;
    const poleOffsetX = -10; // Adjusted pole position (moved right 40 from -50)
    
    if (pondScreenX > -150 && pondScreenX < this.logicalWidth + 150) {
      // Fishing pole (held by Fisherman, angled over pond)
      ctx.strokeStyle = '#8B6914';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pondScreenX + 30 + poleOffsetX, groundY - 50 + pondYOffset); // Held at character level
      ctx.lineTo(pondScreenX - 30 + poleOffsetX, groundY - 80 + pondYOffset); // Tip extends over water
      ctx.stroke();
      
      // Fishing line
      ctx.strokeStyle = '#AAA';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pondScreenX - 30 + poleOffsetX, groundY - 80 + pondYOffset); // From pole tip
      ctx.lineTo(pondScreenX - 35 + poleOffsetX, groundY - 5 + pondYOffset);  // Down to water
      ctx.stroke();
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const w = this.logicalWidth;
    const h = this.logicalHeight;
    
    // Disable image smoothing for crisp pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;
    
    // Use parallax layers if loaded, otherwise fallback to solid color
    if (this.parallaxLoaded) {
      // Calculate parallax offsets - layers from back to front
      // Sky (0.05x) -> Thin trees (0.12x) -> Thick trees (0.22x) -> Fog (0.45x) -> Frontmid+Shrubs (1.0x)
      const skyOffset = this.cameraX * 0.05;         // Furthest back, slowest
      const treesThinOffset = this.cameraX * 0.12;   // Distant, but faster than sky
      const treesThickOffset = this.cameraX * 0.22;  // Closer, faster than thin trees
      const fogOffset = this.cameraX * 0.45;         // Midground fog layer
      const frontmidOffset = this.cameraX * 1.0;
      
      // Background layer - slow parallax, starts at top of screen
      // Dynamically scale so the full image is viewable by far right of world
      const skyWidth = this.parallaxLayers.sky.naturalWidth;
      const skyHeight = this.parallaxLayers.sky.naturalHeight;
      // Use the same parallax factor as skyOffset (0.1)
      const skyParallax = 0.1;
      const maxCameraX = Math.max(0, this.worldWidth - w);
      const maxSkyOffset = maxCameraX * skyParallax;
      // Scale so right edge of sky meets right edge of screen at max camera
      const targetWidth = Math.max(w, w + maxSkyOffset);
      const skyScale = targetWidth / skyWidth;
      const skyScaledWidth = skyWidth * skyScale;
      // Position sky at top of play area
      const skyYOffset = -70;
      const skyScreenX = -this.cameraX * skyParallax;
      ctx.drawImage(this.parallaxLayers.sky, 0, 0, skyWidth, skyHeight,
        skyScreenX, skyYOffset, skyScaledWidth, skyHeight);
      
      // Draw back-layer dust particles (between sky and thin trees)
      this.drawBackDustParticles(ctx, w, h);
      
      // Thin trees layer - between background and midground (further back)
      const thinNaturalWidth = this.parallaxLayers.treesThin.naturalWidth;
      const thinNaturalHeight = this.parallaxLayers.treesThin.naturalHeight;
      const thinScaledWidth = thinNaturalWidth * 0.56;
      const thinYOffset = h - this.dialogueBoxHeight - thinNaturalHeight;
      const thinScreenX = -treesThinOffset + 50;
      ctx.filter = 'blur(1px)';
      ctx.drawImage(this.parallaxLayers.treesThin, 0, 0, thinNaturalWidth, thinNaturalHeight,
        thinScreenX, thinYOffset, thinScaledWidth, thinNaturalHeight);
      ctx.filter = 'none';
      this.drawLayerHaze(ctx, w, h, 0.75);
      
      // Draw mid-layer dust particles (between thin and thick trees)
      this.drawMidDustParticles(ctx, w, h);
      
      // Thick trees layer - between thin trees and midground (closer)
      const thickNaturalWidth = this.parallaxLayers.treesThick.naturalWidth;
      const thickNaturalHeight = this.parallaxLayers.treesThick.naturalHeight;
      const thickScaledWidth = thickNaturalWidth * 0.56;
      const thickYOffset = h - this.dialogueBoxHeight - thickNaturalHeight;
      const thickScreenX = -treesThickOffset + 50;
      ctx.filter = 'blur(0.75px)';
      ctx.drawImage(this.parallaxLayers.treesThick, 0, 0, thickNaturalWidth, thickNaturalHeight,
        thickScreenX, thickYOffset, thickScaledWidth, thickNaturalHeight);
      ctx.filter = 'none';
      this.drawLayerHaze(ctx, w, h, 0.65);
      
      // Draw low ground fog/mist layer (midground transition element)
      this.drawGroundFog(ctx, w, h, fogOffset);
      
      // Draw foreground dust particles (between thick trees and shrubs - behind shrubs/footpath/sprites)
      this.drawForegroundDustParticles(ctx, w, h);
      
      // Combined path and shrubs layer - single image for efficiency
      const pathShrubsWidth = this.parallaxLayers.pathShrubs.naturalWidth;
      const pathShrubsHeight = this.parallaxLayers.pathShrubs.naturalHeight;
      // Stretch path to world width to ensure full coverage
      const pathDrawWidth = this.worldWidth;
      // Position at bottom of game area (just above dialogue box)
      const pathShrubsYOffset = h - this.dialogueBoxHeight - pathShrubsHeight + 55;
      const pathShrubsScreenX = -frontmidOffset;
      ctx.drawImage(this.parallaxLayers.pathShrubs, 0, 0, pathShrubsWidth, pathShrubsHeight,
        pathShrubsScreenX, pathShrubsYOffset, pathDrawWidth, pathShrubsHeight);
      
      // Apply subtle haze to path/shrubs layer
      this.drawLayerHaze(ctx, w, h, 0.2);
      
      // Note: Atmospheric effects (haze, dust) are drawn in render() AFTER all game elements
      // Note: Foreground trees are drawn separately in render() AFTER all game elements
    } else {
      // Fallback solid background while loading
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, w, h);
    }
    
    // Re-enable image smoothing for other elements
    ctx.imageSmoothingEnabled = true;
  }
  
  private drawLayerHaze(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number): void {
    // Draw golden haze overlay for individual layers
    // Intensity: 0.0 (none) to 1.0 (full) - further layers get more haze
    const t = this.atmosphereTimer;
    
    ctx.save();
    
    // Animated wisp offset for gentle motion
    const wispX = Math.sin(t * 0.12) * 20;
    const wispY = Math.cos(t * 0.08) * 8;
    
    // Create golden radial gradient with animation
    const gradient = ctx.createRadialGradient(
      w * 0.5 + wispX, h * 0.35 + wispY, 0,
      w * 0.5 + wispX, h * 0.35 + wispY, w * 0.9
    );
    
    const baseAlpha = 0.06 * intensity;
    const pulseAlpha = baseAlpha + Math.sin(t * 0.15) * 0.01 * intensity;
    
    gradient.addColorStop(0, `rgba(218, 165, 32, ${pulseAlpha * 1.3})`); // Goldenrod center
    gradient.addColorStop(0.5, `rgba(205, 133, 63, ${pulseAlpha})`); // Peru mid
    gradient.addColorStop(1, 'rgba(139, 90, 43, 0)'); // Fade out
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h - this.dialogueBoxHeight);
    
    ctx.restore();
  }
  
  private drawGroundFog(ctx: CanvasRenderingContext2D, w: number, h: number, fogOffset: number): void {
    const t = this.atmosphereTimer;
    const groundY = h - this.groundHeight - this.dialogueBoxHeight;
    
    ctx.save();
    
    // Fog band sits at ground level, creates transition between trees and path
    const fogHeight = 180; // Height of the fog band
    const fogTop = groundY - fogHeight + 40; // Start slightly above ground
    
    // Create multiple fog wisps at different positions for natural look (denser fog)
    const fogWisps = [
      { xBase: 0, width: w * 1.5, intensity: 0.35, speed: 0.08, phaseOffset: 0 },
      { xBase: w * 0.3, width: w * 1.2, intensity: 0.30, speed: 0.05, phaseOffset: 1.5 },
      { xBase: w * 0.6, width: w * 1.3, intensity: 0.25, speed: 0.06, phaseOffset: 3.0 },
      { xBase: w * 0.1, width: w * 1.4, intensity: 0.20, speed: 0.04, phaseOffset: 4.5 },
    ];
    
    for (const wisp of fogWisps) {
      // Animate horizontal drift with parallax
      const driftX = Math.sin(t * wisp.speed + wisp.phaseOffset) * 30;
      const wispX = wisp.xBase - fogOffset * 0.5 + driftX;
      
      // Vertical breathing animation
      const breathe = Math.sin(t * 0.04 + wisp.phaseOffset) * 5;
      
      // Muted earthy fog colors
      const alpha = wisp.intensity * (0.8 + Math.sin(t * 0.03 + wisp.phaseOffset) * 0.2);
      
      // Create a temporary canvas for the wisp with soft horizontal edges
      const wispCanvas = document.createElement('canvas');
      wispCanvas.width = wisp.width;
      wispCanvas.height = fogHeight;
      const wispCtx = wispCanvas.getContext('2d')!;
      
      // Draw vertical gradient for fog wisp (denser at bottom, fading up)
      const vertGradient = wispCtx.createLinearGradient(0, 0, 0, fogHeight);
      vertGradient.addColorStop(0, `rgba(180, 160, 140, 0)`); // Transparent at top
      vertGradient.addColorStop(0.3, `rgba(160, 145, 125, ${alpha * 0.4})`); // Building
      vertGradient.addColorStop(0.6, `rgba(140, 130, 115, ${alpha * 0.7})`); // Denser
      vertGradient.addColorStop(1, `rgba(120, 110, 100, ${alpha})`); // Densest at bottom
      
      wispCtx.fillStyle = vertGradient;
      wispCtx.fillRect(0, 0, wisp.width, fogHeight);
      
      // Apply horizontal fade mask using destination-in composite
      wispCtx.globalCompositeOperation = 'destination-in';
      const fadeWidth = wisp.width * 0.2; // 20% fade on each edge
      const horizGradient = wispCtx.createLinearGradient(0, 0, wisp.width, 0);
      horizGradient.addColorStop(0, 'rgba(0,0,0,0)'); // Transparent left edge
      horizGradient.addColorStop(fadeWidth / wisp.width, 'rgba(0,0,0,1)'); // Fade in
      horizGradient.addColorStop(1 - fadeWidth / wisp.width, 'rgba(0,0,0,1)'); // Solid middle
      horizGradient.addColorStop(1, 'rgba(0,0,0,0)'); // Transparent right edge
      wispCtx.fillStyle = horizGradient;
      wispCtx.fillRect(0, 0, wisp.width, fogHeight);
      
      // Draw the wisp canvas to main canvas
      ctx.drawImage(wispCanvas, wispX, fogTop + breathe);
    }
    
    ctx.restore();
  }
  
  private initializeDustParticles(): void {
    // Create 130 foreground floating dust particles
    this.dustParticles = [];
    const viewHeight = this.logicalHeight - this.dialogueBoxHeight;
    for (let i = 0; i < 130; i++) {
      this.dustParticles.push({
        x: Math.random() * this.worldWidth,
        y: Math.random() * viewHeight, // Full viewing area above dialogue box
        size: 1.0 + Math.random() * 2.0, // 1.0-3.0
        speed: 5 + Math.random() * 15, // Slow horizontal drift
        drift: Math.random() * Math.PI * 2, // Phase for vertical wobble
        alpha: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2
      });
    }
    
    // Create 170 mid-layer dust particles between thin and thick trees
    this.midDustParticles = [];
    for (let i = 0; i < 170; i++) {
      this.midDustParticles.push({
        x: Math.random() * this.worldWidth,
        y: Math.random() * viewHeight,
        size: 0.8 + Math.random() * 1.2, // 0.8-2.0
        speed: 3 + Math.random() * 10,
        drift: Math.random() * Math.PI * 2,
        alpha: 0.35 + Math.random() * 0.35, // More visible (0.35-0.7)
        phase: Math.random() * Math.PI * 2
      });
    }
    
    // Create 200 back-layer dust particles between sky and thin trees
    this.backDustParticles = [];
    for (let i = 0; i < 200; i++) {
      this.backDustParticles.push({
        x: Math.random() * this.worldWidth,
        y: Math.random() * viewHeight,
        size: 0.4 + Math.random() * 0.9, // 0.4-1.3
        speed: 2 + Math.random() * 6,
        drift: Math.random() * Math.PI * 2,
        alpha: 0.4 + Math.random() * 0.35, // Middle ground (0.4-0.75)
        phase: Math.random() * Math.PI * 2
      });
    }
  }
  
  private drawBackDustParticles(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.atmosphereTimer;
    // Calculate shrubs cutoff - don't draw particles on the footpath (below shrubs level)
    const maxY = h - this.dialogueBoxHeight; // Temporarily allow all particles above dialogue
    
    // Back-layer dust particles between sky and thin trees (slowest)
    ctx.save();
    for (const particle of this.backDustParticles) {
      const worldX = particle.x + t * particle.speed;
      const wrappedX = ((worldX % this.worldWidth) + this.worldWidth) % this.worldWidth;
      
      // Parallax at 0.12x (slower than thin trees 0.15)
      const screenX = wrappedX - this.cameraX * 0.12;
      
      if (screenX >= -10 && screenX <= w + 10) {
        const wobbleY = Math.sin(t * 0.4 + particle.drift) * 4;
        const screenY = particle.y + wobbleY;
        
        // Skip if on footpath
        if (screenY > maxY) continue;
        
        const twinkle = 0.7 + Math.sin(t * 1.5 + particle.phase) * 0.3;
        const finalAlpha = particle.alpha * twinkle;
        
        ctx.beginPath();
        ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 223, 150, ${finalAlpha})`;
        ctx.fill();
      }
    }
    ctx.restore();
  }
  
  private drawMidDustParticles(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.atmosphereTimer;
    // Calculate shrubs cutoff - don't draw particles on the footpath (below shrubs level)
    const maxY = h - this.dialogueBoxHeight; // Temporarily allow all particles above dialogue
    
    // Mid-layer dust particles between thin and thick trees
    ctx.save();
    for (const particle of this.midDustParticles) {
      const worldX = particle.x + t * particle.speed;
      const wrappedX = ((worldX % this.worldWidth) + this.worldWidth) % this.worldWidth;
      
      // Parallax at 0.3x (faster, between thick trees and foreground)
      const screenX = wrappedX - this.cameraX * 0.3;
      
      if (screenX >= -10 && screenX <= w + 10) {
        const wobbleY = Math.sin(t * 0.5 + particle.drift) * 6;
        const screenY = particle.y + wobbleY;
        
        // Skip if on footpath
        if (screenY > maxY) continue;
        
        const twinkle = 0.7 + Math.sin(t * 2 + particle.phase) * 0.3;
        const finalAlpha = particle.alpha * twinkle;
        
        ctx.beginPath();
        ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 223, 150, ${finalAlpha})`;
        ctx.fill();
        
        // Subtle glow for larger particles
        if (particle.size > 1) {
          ctx.beginPath();
          ctx.arc(screenX, screenY, particle.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 200, 100, ${finalAlpha * 0.15})`;
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }
  
  private drawForegroundDustParticles(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.atmosphereTimer;
    const maxY = h - this.dialogueBoxHeight + 40; // Particles can overlap top 40px of walking path
    
    // Foreground dust particles - drawn between thick trees and shrubs
    ctx.save();
    for (const particle of this.dustParticles) {
      const worldX = particle.x + t * particle.speed;
      const wrappedX = ((worldX % this.worldWidth) + this.worldWidth) % this.worldWidth;
      
      // Parallax at 0.4x (between thick trees 0.25 and shrubs 1.0)
      const screenX = wrappedX - this.cameraX * 0.4;
      
      if (screenX >= -10 && screenX <= w + 10) {
        const wobbleY = Math.sin(t * 0.5 + particle.drift) * 8;
        const screenY = particle.y + wobbleY;
        
        if (screenY > maxY) continue;
        
        const twinkle = 0.7 + Math.sin(t * 2 + particle.phase) * 0.3;
        const finalAlpha = particle.alpha * twinkle;
        
        ctx.beginPath();
        ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 223, 150, ${finalAlpha})`;
        ctx.fill();
        
        if (particle.size > 1.5) {
          ctx.beginPath();
          ctx.arc(screenX, screenY, particle.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 200, 100, ${finalAlpha * 0.2})`;
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }
  
  private drawAtmosphericHaze(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.atmosphereTimer;
    
    // Golden haze overlay with subtle movement (in front of everything except UI)
    ctx.save();
    
    // Create multiple wispy haze layers with slow drift
    for (let layer = 0; layer < 3; layer++) {
      const layerOffset = layer * 0.7;
      const wispX = Math.sin(t * 0.15 + layerOffset) * 30;
      const wispY = Math.cos(t * 0.1 + layerOffset * 0.5) * 10;
      
      const gradient = ctx.createRadialGradient(
        w * 0.5 + wispX + layer * 100, h * 0.3 + wispY, 0,
        w * 0.5 + wispX + layer * 100, h * 0.3 + wispY, w * 0.8
      );
      
      const alpha = 0.04 + Math.sin(t * 0.2 + layer) * 0.01;
      gradient.addColorStop(0, `rgba(218, 165, 32, ${alpha * 1.5})`);
      gradient.addColorStop(0.4, `rgba(205, 133, 63, ${alpha})`);
      gradient.addColorStop(1, 'rgba(139, 90, 43, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h - this.dialogueBoxHeight);
    }
    
    // Horizontal wispy bands that drift slowly
    for (let band = 0; band < 4; band++) {
      const bandY = 80 + band * 70 + Math.sin(t * 0.08 + band * 1.2) * 15;
      const bandAlpha = 0.03 + Math.sin(t * 0.15 + band * 0.8) * 0.01;
      
      const bandGradient = ctx.createLinearGradient(0, bandY - 40, 0, bandY + 40);
      bandGradient.addColorStop(0, 'rgba(218, 165, 32, 0)');
      bandGradient.addColorStop(0.5, `rgba(218, 165, 32, ${bandAlpha})`);
      bandGradient.addColorStop(1, 'rgba(218, 165, 32, 0)');
      
      ctx.fillStyle = bandGradient;
      ctx.fillRect(0, bandY - 40, w, 80);
    }
    
    ctx.restore();
  }
  
  private drawLoadingScreen(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Dark brown background matching game aesthetic
    ctx.fillStyle = '#3D2817';
    ctx.fillRect(0, 0, w, h);
    
    // Title
    ctx.fillStyle = '#D4A574';
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VILLAGE LEDGER', w / 2, h / 2 - 40);
    
    // Loading text with animated dots
    const dots = '.'.repeat(Math.floor(Date.now() / 400) % 4);
    ctx.font = '20px "Courier New", monospace';
    ctx.fillStyle = '#A88B5A';
    ctx.fillText('Loading' + dots, w / 2, h / 2 + 20);
    
    ctx.textAlign = 'left';
  }

  private drawForegroundTrees(ctx: CanvasRenderingContext2D, offset: number, canvasHeight: number): void {
    // Foreground trees removed per user request
  }
  
  private drawParallaxLayer(
    ctx: CanvasRenderingContext2D, 
    img: HTMLImageElement, 
    offset: number,
    imgWidth: number,
    imgHeight: number,
    yOffset: number,
    screenWidth: number
  ): void {
    // Calculate starting X position with wrapping for seamless scrolling
    const startX = -(offset % imgWidth);
    
    // Draw at native 1:1 resolution
    for (let x = startX; x < screenWidth; x += imgWidth) {
      ctx.drawImage(img, x, yOffset);
    }
    
    // Handle left edge if needed
    if (startX > 0) {
      ctx.drawImage(img, startX - imgWidth, yOffset);
    }
  }
  
  private drawParallaxLayerScaled(
    ctx: CanvasRenderingContext2D, 
    img: HTMLImageElement, 
    offset: number,
    imgWidth: number,
    imgHeight: number,
    yOffset: number,
    screenWidth: number,
    scaleX: number
  ): void {
    // Calculate scaled dimensions
    const scaledWidth = img.naturalWidth * scaleX;
    
    // Calculate starting X position with wrapping for seamless scrolling
    const startX = -(offset % scaledWidth);
    
    // Draw scaled horizontally
    for (let x = startX; x < screenWidth; x += scaledWidth) {
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, x, yOffset, scaledWidth, imgHeight);
    }
    
    // Handle left edge if needed
    if (startX > 0) {
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, startX - scaledWidth, yOffset, scaledWidth, imgHeight);
    }
  }

private drawCharacter(ctx: CanvasRenderingContext2D, char: Character): void {
  // Apply render offset for soft collision visual separation (NPCs only)
  const renderOffset = char.renderOffsetX || 0;
  const screenX = char.x - this.cameraX + renderOffset;
  
  // Calculate talking bounce if this character is currently speaking AND text is still typing
  // Don't bounce if NPC is carving into the ledger
  let talkingBounce = 0;
  const isCarving = (char.name.toUpperCase() === 'WOODCUTTER' && this.state.woodcutterCarvingSoundPlayed && !this.state.ledgerEntries.some(e => e.debt.includes('WOODCUTTER'))) ||
                    (char.name.toUpperCase() === 'STONE-WORKER' && this.state.stoneWorkerCarvingSoundPlayed && !this.state.ledgerEntries.some(e => e.debt.includes('STONE-WORKER')));
  if (this.state.currentDialogue && !isCarving) {
    const speaker = this.state.currentDialogue.speaker.toUpperCase();
    const charName = char.name.toUpperCase();
    // Match speaker to character (handle YOU -> player, others by name)
    const isSpeaking = (speaker === 'YOU' && char.id === 'player') ||
                       (speaker === charName) ||
                       (speaker === 'STONE-WORKER' && charName === 'STONE-WORKER') ||
                       (speaker === 'VILLAGE ELDER' && charName === 'VILLAGE ELDER');
    // Only bounce while text is being typed (not after fully displayed)
    const isStillTyping = this.dialogueCharIndex < this.state.currentDialogue.text.length;
    if (isSpeaking && isStillTyping) {
      talkingBounce = Math.sin(this.talkingTimer) * 2.5; // Subtle 2.5px bounce
    }
  }
  
  const screenY = char.y + char.bobOffset + talkingBounce;

  // 1. Draw original shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(screenX, char.y + char.height + 5, char.width * 0.4, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const x = screenX - char.width / 2;
  const y = screenY;

  // 2. Draw character body (Keep original blue/green/orange colors)
  ctx.fillStyle = char.color;
  ctx.strokeStyle = char.outlineColor;
  ctx.lineWidth = 3;
  const radius = 6;
  ctx.beginPath();
  ctx.roundRect(x, y, char.width, char.height, radius);
  ctx.fill();
  ctx.stroke();

  // 3. BRAIN SURGERY: Draw the JibJab face ONLY for the player
  if (char.id === 'player') {
    const faceImg = this.faceImages[this.state.playerMood];
    // Check if image is loaded before drawing
    if (faceImg && faceImg.complete) {
      // Positioned slightly higher to look like a head on the body
      ctx.drawImage(faceImg, x, y - 5, char.width, char.width);
    }
  } else {
    // Original face indicator for NPCs
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x + 10, y + 12, 8, 8);
    ctx.fillRect(x + char.width - 18, y + 12, 8, 8);

    // Original name label for NPCs
    ctx.font = `7px ${this.retroFont}`;
    ctx.textAlign = 'center';
    const labelWidth = ctx.measureText(char.name).width + 16;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(screenX - labelWidth / 2, screenY - 24, labelWidth, 18);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(char.name, screenX, screenY - 10);
  }
}

  private drawInventoryPopup(ctx: CanvasRenderingContext2D): void {
    if (!this.inventoryPopup) return;

    const screenX = this.player.x - this.cameraX;
    const screenY = this.player.y - 40 - this.inventoryPopup.y;

    const alpha = Math.min(1, this.inventoryPopup.timer);

    ctx.font = `12px ${this.retroFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
    ctx.fillText(this.inventoryPopup.text, screenX, screenY);
  }

  private drawDestinationMarker(ctx: CanvasRenderingContext2D, groundY: number): void {
    if (!this.autoWalkTarget) return;
    
    const screenX = this.autoWalkTarget.x - this.cameraX;
    const markerY = groundY - 5;
    
    // Pulsing animation
    const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;
    
    // Draw subtle circle marker
    ctx.beginPath();
    ctx.arc(screenX, markerY, 8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 215, 0, ${pulse * 0.4})`; // Golden, semi-transparent
    ctx.fill();
    
    // Draw ring around circle
    ctx.beginPath();
    ctx.arc(screenX, markerY, 10, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 215, 0, ${pulse * 0.6})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw small footprint icon (simple dots)
    ctx.fillStyle = `rgba(139, 115, 85, ${pulse * 0.8})`;
    ctx.beginPath();
    ctx.ellipse(screenX - 3, markerY - 2, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(screenX + 3, markerY + 2, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawStoneTabletHUD(ctx: CanvasRenderingContext2D): void {
    const x = this.logicalWidth - this.hudWidth - 24;
    const y = 24;
    const w = this.hudWidth;
    const h = this.hudHeight;

    // Glow effect
    if (this.hudGlow > 0) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 30 * this.hudGlow;
    }

    // Stone texture background
    const stoneGradient = ctx.createLinearGradient(x, y, x + w, y + h);
    stoneGradient.addColorStop(0, '#D4C4A8');
    stoneGradient.addColorStop(0.5, '#C9B896');
    stoneGradient.addColorStop(1, '#B8A888');
    ctx.fillStyle = stoneGradient;

    // Draw beveled edge
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();

    // Inner shadow for depth
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Title - using bold sans-serif per guidelines
    ctx.font = `bold 14px ${this.uiFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5D4837';
    ctx.fillText('STONE TABLET', x + w / 2, y + 26);

    // Divider
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 38);
    ctx.lineTo(x + w - 16, y + 38);
    ctx.stroke();

    // In Loop 1, show elder wisdom instead of NAME/DEBT columns
    const isLoop1 = this.state.loop === 1;
    
    if (isLoop1) {
      // Display elder wisdom about trustless verification
      ctx.font = `italic 11px ${this.uiFont}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#5D4837';
      
      // Word-wrap the wisdom text
      const wisdomLines = [
        '"A promise remembered',
        'only by one is easily',
        'forgotten by another."',
        '',
        '"When debts are carved',
        'in stone, no one can',
        'deny what was agreed."'
      ];
      
      wisdomLines.forEach((line, i) => {
        ctx.fillText(line, x + w / 2, y + 55 + i * 18);
      });
    } else {
      // Loop 2+: Show NAME/DEBT columns
      // Column headers - bold sans-serif at 14px per guidelines
      ctx.font = `bold 14px ${this.uiFont}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#6B5344';
      ctx.fillText('NAME', x + 20, y + 60);
      ctx.fillText('DEBT', x + w * 0.55, y + 60);

      // Column divider
      ctx.beginPath();
      ctx.moveTo(x + w * 0.5, y + 44);
      ctx.lineTo(x + w * 0.5, y + h - 16);
      ctx.stroke();

      // Ledger entries - 12px sans-serif per guidelines
      // Add safe zone margins and text truncation
      ctx.font = `12px ${this.uiFont}`;
      const nameMaxWidth = w * 0.45 - 30; // Safe zone for name column
      const debtMaxWidth = w * 0.45 - 20; // Safe zone for debt column
      
      this.state.ledgerEntries.forEach((entry, i) => {
        const entryY = y + 86 + i * 32;
        ctx.fillStyle = '#5D4837';
        ctx.textAlign = 'left';
        
        // Truncate name if too long
        let displayName = entry.name;
        while (ctx.measureText(displayName).width > nameMaxWidth && displayName.length > 3) {
          displayName = displayName.slice(0, -4) + '...';
        }
        ctx.fillText(displayName, x + 20, entryY);
        
        // Truncate debt if too long
        let displayDebt = entry.debt;
        while (ctx.measureText(displayDebt).width > debtMaxWidth && displayDebt.length > 3) {
          displayDebt = displayDebt.slice(0, -4) + '...';
        }
        ctx.fillText(displayDebt, x + w * 0.55, entryY);
      });

      // Empty state message
      if (this.state.ledgerEntries.length === 0) {
        ctx.font = `italic 12px ${this.uiFont}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#8B7355';
        ctx.fillText('(Empty)', x + w / 2, y + 100);
      }
    }
  }

  // Large popup view of Stone Tablet - shown when clicking the HUD or in-world tablet
  private drawStoneTabletPopup(ctx: CanvasRenderingContext2D): void {
    const w = this.logicalWidth;
    const h = this.logicalHeight;
    
    // Check if dialogue is active - if so, leave room for dialogue box
    const hasActiveDialogue = this.state.currentDialogue !== null;
    const dialogueReserve = hasActiveDialogue ? this.dialogueBoxHeight + 20 : 0;
    
    // Lighter overlay when dialogue is showing so player can still see dialogue
    ctx.fillStyle = hasActiveDialogue ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, w, h - dialogueReserve);
    
    // Popup dimensions - smaller when dialogue is active to leave room for dialogue box
    const isLoop2OrLater = this.state.loop >= 2;
    const baseWidth = isLoop2OrLater ? 780 : 620;
    const baseHeight = hasActiveDialogue ? 350 : 550; // Taller to fit Elder's quotes with spacing
    const popupWidth = Math.min(baseWidth, w - 40);
    const popupHeight = Math.min(baseHeight, h - dialogueReserve - 60);
    const popupX = (w - popupWidth) / 2;
    // Position popup higher when dialogue is active
    const availableHeight = h - dialogueReserve;
    const popupY = hasActiveDialogue 
      ? Math.max(20, (availableHeight - popupHeight) / 2)
      : (h - popupHeight) / 2;
    
    // Stone texture background
    const stoneGradient = ctx.createLinearGradient(popupX, popupY, popupX + popupWidth, popupY + popupHeight);
    stoneGradient.addColorStop(0, '#D4C4A8');
    stoneGradient.addColorStop(0.5, '#C9B896');
    stoneGradient.addColorStop(1, '#B8A888');
    ctx.fillStyle = stoneGradient;
    ctx.beginPath();
    ctx.roundRect(popupX, popupY, popupWidth, popupHeight, 12);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 6;
    ctx.stroke();
    
    // Title
    ctx.font = `bold 24px ${this.uiFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5D4837';
    ctx.fillText('STONE TABLET', popupX + popupWidth / 2, popupY + 50);
    
    // Divider
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(popupX + 30, popupY + 70);
    ctx.lineTo(popupX + popupWidth - 30, popupY + 70);
    ctx.stroke();
    
    const isLoop1 = this.state.loop === 1;
    
    if (isLoop1) {
      // Display elder wisdom about trustless verification - larger text to match HUD proportions
      ctx.font = `italic 20px ${this.uiFont}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#5D4837';
      
      const wisdomLines = [
        '"A promise remembered',
        'by one is easily',
        'forgotten by another."',
        '',
        '"When debts are carved',
        'in stone, no one can',
        'deny what was agreed."'
      ];
      
      wisdomLines.forEach((line, i) => {
        ctx.fillText(line, popupX + popupWidth / 2, popupY + 110 + i * 34);
      });
      
      // Tap to close instruction - below the wisdom quotes
      ctx.font = `12px ${this.uiFont}`;
      ctx.fillStyle = '#8B7355';
      ctx.fillText('Tap anywhere to close', popupX + popupWidth / 2, popupY + popupHeight - 25);
    } else {
      // Loop 2+: Show NAME/DEBT columns - 25/75 split for short names and long debt text
      ctx.font = `bold 18px ${this.uiFont}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#6B5344';
      ctx.fillText('NAME', popupX + 30, popupY + 110);
      ctx.fillText('DEBT', popupX + popupWidth * 0.22, popupY + 110);
      
      // Column divider - positioned at 18% to give debt column most of the space
      ctx.beginPath();
      ctx.moveTo(popupX + popupWidth * 0.18, popupY + 85);
      ctx.lineTo(popupX + popupWidth * 0.18, popupY + popupHeight - 60);
      ctx.stroke();
      
      // Ledger entries - name column is narrow, debt column gets most space
      ctx.font = `16px ${this.uiFont}`;
      ctx.fillStyle = '#5D4837';
      
      this.state.ledgerEntries.forEach((entry, i) => {
        const entryY = popupY + 145 + i * 30;
        ctx.fillText(entry.name, popupX + 30, entryY);
        // Debt text with slightly smaller font to ensure it fits
        ctx.font = `15px ${this.uiFont}`;
        ctx.fillText(entry.debt, popupX + popupWidth * 0.22, entryY);
        ctx.font = `16px ${this.uiFont}`;
      });
      
      // Empty state message
      if (this.state.ledgerEntries.length === 0) {
        ctx.font = `italic 16px ${this.uiFont}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#8B7355';
        ctx.fillText('(No debts recorded)', popupX + popupWidth / 2, popupY + 180);
      }
    }
    
    // Tap to close instruction - only for Loop 2+ (Loop 1 draws its own above)
    if (!isLoop1) {
      ctx.font = `12px ${this.uiFont}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8B7355';
      ctx.fillText('Tap anywhere to close', popupX + popupWidth / 2, popupY + popupHeight - 25);
    }
  }

  private drawInventoryHUD(ctx: CanvasRenderingContext2D): void {
    const padding = 12;
    const iconSize = 24;
    const spacing = 8;
    
    // All items shown from start of each loop - no need to collect first
    const items: { count: number; color: string; label: string }[] = [
      { count: this.state.inventory.slingshot, color: '#D97706', label: 'Y' },
      { count: this.state.inventory.wood, color: '#8B4513', label: 'W' },
      { count: this.state.inventory.stone, color: '#6B7280', label: 'S' },
      { count: this.state.inventory.fish, color: '#3B82F6', label: 'F' },
      { count: this.state.inventory.berries, color: '#DC2626', label: 'B' }
    ];
    
    // Background panel - positioned to the left of the Stone Tablet HUD (top right area)
    const panelWidth = items.length * (iconSize + spacing + 20) + padding;
    const panelHeight = iconSize + padding * 1.5;
    
    // Position to the left of Stone Tablet HUD (which is at canvas.width - hudWidth - 24)
    const stoneTabletHudX = this.logicalWidth - this.hudWidth - 24;
    const stoneTabletHudY = 24; // Stone Tablet HUD is at y=24
    const panelX = stoneTabletHudX - panelWidth - 12; // 12px gap from Stone Tablet HUD
    const yPos = stoneTabletHudY; // Align top edge with Stone Tablet HUD
    let xPos = panelX + padding / 2;
    
    ctx.fillStyle = 'rgba(139, 115, 85, 0.85)';
    ctx.beginPath();
    ctx.roundRect(panelX, yPos - 4, panelWidth, panelHeight, 8);
    ctx.fill();
    ctx.strokeStyle = '#5D4837';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw each item (offset to center in box)
    const iconOffsetX = 4; // Move icons slightly right
    const iconOffsetY = 4; // Move icons slightly down
    items.forEach((item) => {
      // Draw simple colored circle as icon
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(xPos + iconSize / 2 + iconOffsetX, yPos + iconSize / 2 + iconOffsetY, iconSize / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5D4837';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw count
      ctx.font = `bold 14px ${this.uiFont}`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.fillText(`${item.count}`, xPos + iconSize + 4 + iconOffsetX, yPos + iconSize / 2 + 5 + iconOffsetY);
      
      xPos += iconSize + spacing + 20;
    });
    
    // Store inventory area for click detection
    this.inventoryButtonArea = { x: panelX, y: yPos - 4, w: panelWidth, h: panelHeight };
    
    // Draw mute/sound button to the left of inventory (match inventory height, square)
    const muteButtonSize = Math.round(panelHeight);
    const muteX = panelX - muteButtonSize - 12;
    const muteY = yPos - 4;
    
    this.muteButtonArea = { x: muteX, y: muteY, w: muteButtonSize, h: muteButtonSize };
    
    // Button background
    ctx.fillStyle = soundManager.isMuted() ? 'rgba(220, 38, 38, 0.85)' : 'rgba(34, 197, 94, 0.85)';
    ctx.beginPath();
    ctx.roundRect(muteX, muteY, muteButtonSize, muteButtonSize, 8);
    ctx.fill();
    ctx.strokeStyle = '#5D4837';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw speaker icon (centered in larger button)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    
    const iconX = muteX + muteButtonSize / 2 - 10;
    const iconY = muteY + muteButtonSize / 2 - 6;
    
    // Speaker body
    ctx.beginPath();
    ctx.moveTo(iconX, iconY + 4);
    ctx.lineTo(iconX + 6, iconY + 4);
    ctx.lineTo(iconX + 12, iconY);
    ctx.lineTo(iconX + 12, iconY + 12);
    ctx.lineTo(iconX + 6, iconY + 8);
    ctx.lineTo(iconX, iconY + 8);
    ctx.closePath();
    ctx.fill();
    
    if (soundManager.isMuted()) {
      // Draw X for muted
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(iconX + 14, iconY + 2);
      ctx.lineTo(iconX + 20, iconY + 10);
      ctx.moveTo(iconX + 20, iconY + 2);
      ctx.lineTo(iconX + 14, iconY + 10);
      ctx.stroke();
    } else {
      // Draw sound waves
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(iconX + 14, iconY + 6, 4, -0.5, 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(iconX + 14, iconY + 6, 8, -0.5, 0.5);
      ctx.stroke();
    }
    
    // Draw inventory detail popup if open
    if (this.showInventoryDetailPopup) {
      this.drawInventoryDetailPopup(ctx, panelX, yPos + panelHeight + 8);
    }
  }
  
  // Draw inventory hint popup with arrow pointing to inventory box
  private drawInventoryHint(ctx: CanvasRenderingContext2D): void {
    if (!this.inventoryButtonArea) return;
    
    const invBox = this.inventoryButtonArea;
    const centerX = invBox.x + invBox.w / 2;
    const bottomY = invBox.y + invBox.h;
    
    // Pulsing animation for arrow
    const pulse = 0.7 + Math.sin(Date.now() * 0.006) * 0.3;
    
    // Draw hint box below inventory (positioned below the arrow)
    const hintW = 300;
    const hintH = 55;
    const hintX = centerX - hintW / 2;
    const hintY = bottomY + 60;
    
    // Background
    ctx.fillStyle = 'rgba(45, 35, 28, 0.95)';
    ctx.beginPath();
    ctx.roundRect(hintX, hintY, hintW, hintH, 8);
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Arrow pointing up to inventory (animated bounce) - custom drawn arrow
    // Arrow stays at original position (closer to inventory), independent of hint box
    const bounceOffset = Math.sin(Date.now() * 0.008) * 5;
    const arrowY = bottomY + 30 + bounceOffset; // Fixed position near inventory
    
    // Draw main arrow triangle
    ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
    ctx.beginPath();
    ctx.moveTo(centerX, arrowY - 20);
    ctx.lineTo(centerX - 14, arrowY - 2);
    ctx.lineTo(centerX + 14, arrowY - 2);
    ctx.closePath();
    ctx.fill();
    
    // Draw arrow stem
    ctx.fillRect(centerX - 5, arrowY - 4, 10, 12);
    
    // Draw subtle outline for triangle
    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, arrowY - 20);
    ctx.lineTo(centerX - 14, arrowY - 2);
    ctx.lineTo(centerX + 14, arrowY - 2);
    ctx.closePath();
    ctx.stroke();
    
    // Draw outline for stem
    ctx.strokeRect(centerX - 5, arrowY - 4, 10, 12);
    
    // Hint text
    ctx.font = `bold 11px ${this.retroFont}`;
    ctx.fillStyle = '#F5DEB3';
    ctx.textAlign = 'center';
    ctx.fillText('This is your Inventory!', centerX, hintY + 22);
    
    ctx.font = `10px ${this.retroFont}`;
    ctx.fillStyle = '#FFD700';
    ctx.fillText('Tap it to see what you carry.', centerX, hintY + 40);
  }
  
  private drawInventoryDetailPopup(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const popupWidth = 280;
    const itemHeight = 50;
    const padding = 12;
    
    const items = [
      { name: 'Slingshot', count: this.state.inventory.slingshot, color: '#D97706', desc: 'A simple hunting tool' },
      { name: 'Wood', count: this.state.inventory.wood, color: '#8B4513', desc: 'Building material from the Woodcutter' },
      { name: 'Stone', count: this.state.inventory.stone, color: '#6B7280', desc: 'Strong material from the Stone-worker' },
      { name: 'Fish', count: this.state.inventory.fish, color: '#3B82F6', desc: 'Fresh catch from the Fisherman' },
      { name: 'Berries', count: this.state.inventory.berries, color: '#DC2626', desc: 'Sweet berries from the bush' }
    ];
    
    const popupHeight = items.length * itemHeight + padding * 2 + 24;
    const popupX = x + (this.inventoryButtonArea?.w || 200) / 2 - popupWidth / 2;
    
    // Background
    ctx.fillStyle = 'rgba(45, 35, 28, 0.95)';
    ctx.beginPath();
    ctx.roundRect(popupX, y, popupWidth, popupHeight, 8);
    ctx.fill();
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Title
    ctx.font = `bold 14px ${this.uiFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F5DEB3';
    ctx.fillText('INVENTORY', popupX + popupWidth / 2, y + 20);
    
    // Divider
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(popupX + padding, y + 28);
    ctx.lineTo(popupX + popupWidth - padding, y + 28);
    ctx.stroke();
    
    // Draw each item
    let itemY = y + 36;
    items.forEach((item) => {
      // Icon
      const iconSize = 32;
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(popupX + padding + iconSize / 2, itemY + itemHeight / 2, iconSize / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5D4837';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Name and count
      ctx.font = `bold 14px ${this.uiFont}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#F5DEB3';
      ctx.fillText(`${item.name}: ${item.count}`, popupX + padding + iconSize + 10, itemY + 18);
      
      // Description
      ctx.font = `italic 11px ${this.uiFont}`;
      ctx.fillStyle = '#A09080';
      ctx.fillText(item.desc, popupX + padding + iconSize + 10, itemY + 34);
      
      itemY += itemHeight;
    });
    
    // Tap anywhere to close hint
    ctx.font = `italic 10px ${this.uiFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#706050';
    ctx.fillText('Tap anywhere to close', popupX + popupWidth / 2, y + popupHeight - 6);
    
    // Store popup area for click detection
    this.inventoryDetailPopupArea = { x: popupX, y, w: popupWidth, h: popupHeight };
  }

  // Draw dialogue text with highlighting for special phrases like "Double Coincidence of Wants"
  private drawDialogueTextWithHighlight(
    ctx: CanvasRenderingContext2D, 
    text: string, 
    startX: number, 
    startY: number, 
    maxWidth: number, 
    lineHeight: number
  ): void {
    const normalColor = '#F5F5DC';
    const highlightColor = '#FFD700'; // Gold color for highlighted text
    
    // Determine which phrase to highlight based on loop
    // Loop 1: Highlight "Double Coincidence of Wants"
    // Loop 2: Highlight "Ledger" during trade dialogues
    let highlightPhrase: string;
    if (this.state.loop === 1) {
      highlightPhrase = "Double Coincidence of Wants";
    } else {
      highlightPhrase = "Ledger";
    }
    
    // Check if text contains the highlight phrase
    const lowerText = text.toLowerCase();
    const lowerPhrase = highlightPhrase.toLowerCase();
    
    if (!lowerText.includes(lowerPhrase)) {
      // No highlight needed, use simple rendering
      ctx.fillStyle = normalColor;
      const words = text.split(' ');
      let line = '';
      let lineY = startY;
      
      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line.trim(), startX, lineY);
          line = word + ' ';
          lineY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), startX, lineY);
      return;
    }
    
    // Find the phrase boundaries for highlighting
    const phraseStart = lowerText.indexOf(lowerPhrase);
    const phraseEnd = phraseStart + highlightPhrase.length;
    
    // Split text into before, phrase, and after
    const beforePhrase = text.substring(0, phraseStart);
    const phrase = text.substring(phraseStart, phraseEnd);
    const afterPhrase = text.substring(phraseEnd);
    
    // Build segments with color info
    const segments: { text: string; color: string }[] = [];
    if (beforePhrase) segments.push({ text: beforePhrase, color: normalColor });
    if (phrase) segments.push({ text: phrase, color: highlightColor });
    if (afterPhrase) segments.push({ text: afterPhrase, color: normalColor });
    
    // Now render word by word, keeping track of which segment each word belongs to
    let lineY = startY;
    let lineX = startX;
    let currentLineWidth = 0;
    
    for (const segment of segments) {
      const words = segment.text.split(' ');
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (!word && i === 0) continue; // Skip empty leading word from split
        
        const wordWithSpace = word + (i < words.length - 1 || segment !== segments[segments.length - 1] ? ' ' : '');
        const wordWidth = ctx.measureText(wordWithSpace).width;
        
        // Check if we need to wrap to next line
        if (currentLineWidth + wordWidth > maxWidth && currentLineWidth > 0) {
          lineY += lineHeight;
          lineX = startX;
          currentLineWidth = 0;
        }
        
        // Draw the word
        ctx.fillStyle = segment.color;
        ctx.fillText(wordWithSpace, lineX + currentLineWidth, lineY);
        currentLineWidth += wordWidth;
      }
    }
  }

  private drawDialogueBox(ctx: CanvasRenderingContext2D): void {
    const x = 0;
    const y = this.logicalHeight - this.dialogueBoxHeight;
    const w = this.logicalWidth;
    const h = this.dialogueBoxHeight;

    // Background - fully opaque to prevent layer bleed-through
    ctx.fillStyle = '#2D231C';
    ctx.fillRect(x, y, w, h);

    // Border
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w, h);

    // Decorative pattern
    ctx.strokeStyle = 'rgba(139, 115, 85, 0.3)';
    ctx.lineWidth = 1;
    for (let px = 10; px < w; px += 40) {
      ctx.beginPath();
      ctx.moveTo(px, y + 10);
      ctx.lineTo(px, y + h - 10);
      ctx.stroke();
    }

    if (this.state.currentDialogue) {
      // Draw speaker portrait on the left
      const portraitSize = 60;
      const portraitX = 20;
      const portraitY = y + (h - portraitSize) / 2;
      const textStartX = portraitX + portraitSize + 20; // Text starts after portrait
      
      // Get speaker color based on who is speaking
      const speakerColors: Record<string, { bg: string; outline: string }> = {
        'WOODCUTTER': { bg: '#8B4513', outline: '#5D2E0C' },
        'STONE-WORKER': { bg: '#6B7280', outline: '#374151' },
        'FISHERMAN': { bg: '#F97316', outline: '#C2410C' },
        'VILLAGE ELDER': { bg: '#F8FAFC', outline: '#64748B' },
        'YOU': { bg: '#3B82F6', outline: '#FFFFFF' },
        'STONE TABLET': { bg: '#A0826D', outline: '#6B5344' },
      };
      
      const colors = speakerColors[this.state.currentDialogue.speaker] || { bg: '#6B7280', outline: '#374151' };
      
      // Draw portrait background (rounded square)
      ctx.fillStyle = colors.bg;
      ctx.strokeStyle = colors.outline;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(portraitX, portraitY, portraitSize, portraitSize, 8);
      ctx.fill();
      ctx.stroke();
      
      // Draw speaker-specific icon on portrait
      if (this.state.currentDialogue.speaker === 'STONE TABLET') {
        // Draw tablet icon instead of face
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        // Tablet shape
        ctx.fillRect(portraitX + 15, portraitY + 10, 30, 40);
        // Lines on tablet representing text
        ctx.strokeStyle = colors.outline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(portraitX + 20, portraitY + 20);
        ctx.lineTo(portraitX + 40, portraitY + 20);
        ctx.moveTo(portraitX + 20, portraitY + 30);
        ctx.lineTo(portraitX + 40, portraitY + 30);
        ctx.moveTo(portraitX + 20, portraitY + 40);
        ctx.lineTo(portraitX + 35, portraitY + 40);
        ctx.stroke();
      } else {
        // Draw simple face on portrait for NPC speakers
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(portraitX + 15, portraitY + 18, 10, 10); // Left eye
        ctx.fillRect(portraitX + portraitSize - 25, portraitY + 18, 10, 10); // Right eye
      }
      
      // Speaker name - using retro font at proper size (16px per guidelines)
      ctx.font = `16px ${this.retroFont}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#C9B896';
      ctx.fillText(`[${this.state.currentDialogue.speaker}]`, textStartX, y + 36);

      // Dialogue text with typewriter effect - using retro font at 16-18px per guidelines
      const displayText = this.state.currentDialogue.text.substring(0, this.dialogueCharIndex);
      ctx.font = `16px ${this.retroFont}`;

      // Word wrap with highlighting for "Double Coincidence of Wants"
      const maxWidth = w - textStartX - 50;
      const lineHeight = 32; // 16px * 1.6 = ~26, rounded up for readability
      
      // Draw text with potential highlighting for DCW phrase
      this.drawDialogueTextWithHighlight(ctx, displayText, textStartX, y + 70, maxWidth, lineHeight);

      // Continue indicator
      if (this.state.dialogueComplete) {
        const arrowAlpha = (Math.sin(this.continueArrowBlink) + 1) / 2;
        ctx.fillStyle = `rgba(201, 184, 150, ${0.5 + arrowAlpha * 0.5})`;
        ctx.font = `16px ${this.retroFont}`;
        ctx.textAlign = 'right';
        ctx.fillText('v', w - 32, y + h - 20);
      }
    } else if (!this.state.showChoice) {
      // Hint text when no dialogue and no choice dialogue - using retro font at readable size
      ctx.font = `12px ${this.retroFont}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(201, 184, 150, 0.5)';

      let hint = '';
      // CREDIT-FIRST HINTS
      switch (this.state.phase) {
        case 'intro':
          hint = 'A storm approaches...';
          break;
        case 'need_wood':
        case 'loop2_need_wood':
          hint = 'Visit the Woodcutter nearby...';
          break;
        case 'got_wood_need_stone':
        case 'loop2_got_wood':
          hint = 'Find the Stone-worker to the east...';
          break;
        case 'got_stone_need_fish':
        case 'loop2_got_stone':
          hint = 'Get fish from the Fisherman...';
          break;
        case 'got_fish_ready_settle':
          hint = 'Return to Village Center to settle debts...';
          break;
        case 'settlement':
          if (!this.state.woodcutterDisputed) {
            hint = 'Talk to the Woodcutter about your debt...';
          } else if (!this.state.stoneworkerDisputed) {
            hint = 'Talk to the Stone-worker about your debt...';
          } else {
            hint = 'Ask the Elder to help settle the dispute...';
          }
          break;
        case 'loop2_escorting_woodcutter':
        case 'loop2_escorting_stoneworker':
          hint = 'Go to the Stone Tablet to record the debt...';
          break;
        case 'loop2_got_fish':
          // After getting fish, direct to Stone Tablet or settling
          if (this.state.elderVerified || (this.state.woodcutterDebtRecorded && this.state.stoneWorkerDebtRecorded)) {
            hint = 'Pay your debts to the Woodcutter and Stone-worker...';
          } else {
            hint = 'Go to the Stone Tablet to verify your debts...';
          }
          break;
        case 'loop2_verify_at_tablet':
          hint = 'Settle your debts with the Woodcutter and Stone-worker...';
          break;
        case 'loop2_return':
          hint = this.state.roofRepaired 
            ? 'Return home before the storm!' 
            : 'Return home to fix your roof before the storm!';
          break;
        case 'confrontation':
        case 'brawl':
          hint = 'Oh no! A fight is breaking out!';
          break;
        case 'fail':
          hint = 'Memory failed. Try again!';
          break;
        case 'complete_success':
          hint = 'Return home!';
          break;
        case 'quiz':
        case 'complete':
          hint = 'Congratulations!';
          break;
        default:
          hint = 'Touch left/right to move';
      }
      ctx.fillText(hint, w / 2, y + h / 2 + 5);
    }
  }

  private drawInteractButton(ctx: CanvasRenderingContext2D): void {
    // Use opacity for fade transition
    if (this.interactButtonOpacity <= 0) return;

    const size = this.interactButtonSize;
    const x = this.logicalWidth - size - 32;
    // Center vertically on the ground horizon (between ground and dialogue box)
    const groundY = this.logicalHeight - this.groundHeight - this.dialogueBoxHeight;
    const dialogueTop = this.logicalHeight - this.dialogueBoxHeight;
    const y = groundY + (dialogueTop - groundY - size) / 2;

    ctx.save();
    ctx.globalAlpha = this.interactButtonOpacity;

    // Button background
    const gradient = ctx.createRadialGradient(
      x + size / 2, y + size / 2, 0,
      x + size / 2, y + size / 2, size / 2
    );
    gradient.addColorStop(0, '#22C55E');
    gradient.addColorStop(1, '#16A34A');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 16);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Determine the target name to display
    let targetName = '';
    if (this.state.nearbyNPC) {
      // Get friendly name for display
      switch (this.state.nearbyNPC.id) {
        case 'woodcutter': targetName = 'Woodcutter'; break;
        case 'stoneWorker': targetName = 'Stone-worker'; break;
        case 'fisherman': targetName = 'Fisherman'; break;
        case 'villageElder': targetName = 'Elder'; break;
        case 'berryBush': targetName = 'Berry Bush'; break;
        default: targetName = this.state.nearbyNPC.name;
      }
    } else if (this.state.nearbyLocation === 'home') {
      targetName = 'Home';
    } else if (this.state.nearbyLocation === 'stoneTablet') {
      targetName = 'Stone Tablet';
    }

    // Text - using bold rounded sans-serif for button (per design guidelines)
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw "INTERACT" text - smaller to give padding around text
    ctx.font = `bold 14px ${this.uiFont}`;
    ctx.fillText('INTERACT', x + size / 2, y + size / 2 - 8);
    
    // Draw target name below in smaller text
    if (targetName) {
      ctx.font = `bold 10px ${this.uiFont}`;
      ctx.fillText(`(${targetName})`, x + size / 2, y + size / 2 + 10);
    }
    
    ctx.textBaseline = 'alphabetic';

    ctx.restore();
  }

  // Touch zone indicator removed - movement now uses click-and-hold for direction
  // or click-and-release to walk to exact point

  private notifyStateChange(): void {
    if (this.onStateChange) {
      try {
        this.onStateChange({ ...this.state });
      } catch (e) {
        console.error('Error in onStateChange callback:', e);
      }
    }
  }

  public destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.resize.bind(this));
  }

  private setMood(mood: 'neutral' | 'happy' | 'angry') {
    try {
      this.state.playerMood = mood;
      // Set timer for auto-reset to neutral (3 seconds for happy, no timer for angry/neutral)
      if (mood === 'happy') {
        this.state.moodTimer = 3; // Extended from 2 to 3 seconds
        console.log('MOOD: Set to happy, timer=3');
      } else {
        this.state.moodTimer = 0;
      }
      this.notifyStateChange();
    } catch (e) {
      console.error('Error in setMood:', e);
    }
  }

  // Quiz questions - some are single-select, some are multi-select
  private quizQuestions: Array<{
    question: string;
    options: string[];
    correct: number | number[]; // number for single-select, number[] for multi-select
    explanation: string;
    multiSelect?: boolean;
  }> = [
    {
      question: "What is the 'Double Coincidence of Wants' problem?",
      options: ["A: Both people must want exactly what the other has to trade", "B: Everyone wants the same thing at the same time"],
      correct: 0,
      explanation: "For direct trade to work, you need what I have AND I need what you have - at the same time. This rarely happens!"
    },
    {
      question: "Why couldn't you trade directly with the Woodcutter?",
      options: ["A: He was being unfriendly", "B: He wanted fish, but you didn't have fish"],
      correct: 1,
      explanation: "You needed wood, but could only offer a slingshot or berries. The Woodcutter wanted fish - a classic Double Coincidence of Wants problem."
    },
    {
      question: "What problem does the Stone Ledger solve?",
      options: ["A: Keeping a permanent record everyone can verify", "B: Making debts disappear"],
      correct: 0,
      explanation: "The ledger creates a shared, unchangeable record. No more disputes about who owes what - it's carved in stone for all to see."
    },
    {
      question: "Why is recording debts better than relying on memory?",
      options: ["A: People can honestly misremember or disagree", "B: Writing is more fun"],
      correct: 0,
      explanation: "Without records, people may genuinely believe different things about what was promised. A ledger removes this uncertainty."
    },
    {
      question: "What is Money? (Select all that apply)",
      options: [
        "A: A system for tracking debts",
        "B: Just coins and paper",
        "C: A way to trade without double coincidence of wants",
        "D: A shared record of who owes what"
      ],
      correct: [0, 2, 3], // A, C, D are correct
      multiSelect: true,
      explanation: "Money is fundamentally a system for tracking debts - it lets us trade even when we don't have what someone wants right now. It's a shared record that everyone trusts."
    }
  ];

  private currentQuizQuestion: number = 0;
  private quizButtonAreas: { x: number; y: number; w: number; h: number; option: number }[] = [];
  private quizSubmitButton: { x: number; y: number; w: number; h: number } | null = null;
  private multiSelectAnswers: number[] = []; // Track selections for current multi-select question
  private showQuizFeedback: boolean = false;
  private quizWrongAnswers: { questionIndex: number; playerAnswer: number | number[] }[] = [];
  private quizFeedbackScrollOffset: number = 0;
  private quizReviewScrollOffset: number = 0;

  private drawQuizOverlay(ctx: CanvasRenderingContext2D): void {
    const w = this.logicalWidth;
    const h = this.logicalHeight;

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, w, h);

    // Quiz card
    const cardW = Math.min(600, w - 60);
    const cardH = 400;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;

    // Card background
    ctx.fillStyle = '#C9B896';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Title
    ctx.font = `16px ${this.retroFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3D2914';
    ctx.fillText('KNOWLEDGE SCROLL', w / 2, cardY + 40);

    // Question
    const q = this.quizQuestions[this.currentQuizQuestion];
    ctx.font = `12px ${this.retroFont}`;
    ctx.fillStyle = '#3D2914';
    
    // Wrap question text
    const words = q.question.split(' ');
    let line = '';
    let lineY = cardY + 90;
    const maxWidth = cardW - 60;
    
    for (const word of words) {
      const testLine = line + word + ' ';
      if (ctx.measureText(testLine).width > maxWidth && line !== '') {
        ctx.fillText(line.trim(), w / 2, lineY);
        line = word + ' ';
        lineY += 28;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), w / 2, lineY);

    // Options as buttons - smaller for multi-select to fit submit button
    this.quizButtonAreas = [];
    this.quizSubmitButton = null;
    const isMultiSelect = q.multiSelect === true;
    const btnW = cardW - 80;
    const btnH = isMultiSelect ? 40 : 60;
    const btnSpacing = isMultiSelect ? 48 : 80; // Tighter spacing for multi-select
    const btnX = cardX + 40;

    q.options.forEach((option, i) => {
      const btnY = cardY + 140 + i * btnSpacing;
      
      // Check if this option is selected (for multi-select)
      const isSelected = isMultiSelect && this.multiSelectAnswers.includes(i);
      
      // Button background - highlight if selected
      ctx.fillStyle = isSelected ? '#6B8E23' : '#A89080';
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 8);
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#4A6B15' : '#6B5344';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      
      // Draw checkbox for multi-select
      if (isMultiSelect) {
        const checkboxX = btnX + 12;
        const checkboxY = btnY + btnH / 2 - 8;
        const checkboxSize = 16;
        
        ctx.fillStyle = '#FFF';
        ctx.fillRect(checkboxX, checkboxY, checkboxSize, checkboxSize);
        ctx.strokeStyle = '#3D2914';
        ctx.lineWidth = 2;
        ctx.strokeRect(checkboxX, checkboxY, checkboxSize, checkboxSize);
        
        // Draw checkmark if selected
        if (isSelected) {
          ctx.strokeStyle = '#166534';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(checkboxX + 3, checkboxY + 8);
          ctx.lineTo(checkboxX + 7, checkboxY + 12);
          ctx.lineTo(checkboxX + 13, checkboxY + 4);
          ctx.stroke();
        }
      }

      // Button text with word wrapping
      ctx.font = `10px ${this.retroFont}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFF';
      
      // Wrap option text to fit button width (account for checkbox in multi-select)
      const optMaxWidth = isMultiSelect ? btnW - 50 : btnW - 20;
      const textCenterX = isMultiSelect ? btnX + 30 + (btnW - 30) / 2 : btnX + btnW / 2;
      const optWords = option.split(' ');
      let optLine = '';
      const optLines: string[] = [];
      
      for (const word of optWords) {
        const testLine = optLine + word + ' ';
        if (ctx.measureText(testLine).width > optMaxWidth && optLine !== '') {
          optLines.push(optLine.trim());
          optLine = word + ' ';
        } else {
          optLine = testLine;
        }
      }
      optLines.push(optLine.trim());
      
      // Draw lines centered vertically in button
      const optLineHeight = 14;
      const totalTextHeight = optLines.length * optLineHeight;
      let optLineY = btnY + (btnH - totalTextHeight) / 2 + optLineHeight / 2 + 4;
      
      for (const line of optLines) {
        ctx.fillText(line, textCenterX, optLineY);
        optLineY += optLineHeight;
      }

      // Store button area for touch detection
      this.quizButtonAreas.push({ x: btnX, y: btnY, w: btnW, h: btnH, option: i });
    });
    
    // Draw Submit button for multi-select questions
    if (isMultiSelect) {
      const submitBtnW = 180;
      const submitBtnH = 40;
      const submitBtnX = (w - submitBtnW) / 2;
      // Clamp submit button to stay within card bounds (cardY + cardH - submitBtnH - 10)
      const rawSubmitY = cardY + 140 + q.options.length * btnSpacing + 5;
      const maxSubmitY = cardY + cardH - submitBtnH - 10;
      const submitBtnY = Math.min(rawSubmitY, maxSubmitY);
      
      // Only enable if at least one option selected
      const hasSelection = this.multiSelectAnswers.length > 0;
      
      ctx.fillStyle = hasSelection ? '#166534' : '#888';
      ctx.beginPath();
      ctx.roundRect(submitBtnX, submitBtnY, submitBtnW, submitBtnH, 8);
      ctx.fill();
      ctx.strokeStyle = hasSelection ? '#14532D' : '#666';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.font = `12px ${this.retroFont}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFF';
      ctx.fillText('SUBMIT ANSWER', w / 2, submitBtnY + submitBtnH / 2 + 4);
      
      this.quizSubmitButton = { x: submitBtnX, y: submitBtnY, w: submitBtnW, h: submitBtnH };
    }

    // Progress indicator - position higher to avoid overlap with submit button
    ctx.font = `10px ${this.retroFont}`;
    ctx.fillStyle = '#6B5344';
    const progressY = cardY + 65; // Fixed position near top, below title
    ctx.fillText(`Question ${this.currentQuizQuestion + 1} of ${this.quizQuestions.length}`, w / 2, progressY);
  }

  private handleQuizTouch(x: number, y: number): void {
    // If showing feedback, check for retry and navigation buttons
    if (this.showQuizFeedback) {
      // Check retry button
      if (this.retryQuizButton) {
        const btn = this.retryQuizButton;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          // Reset quiz for retry
          this.showQuizFeedback = false;
          this.quizWrongAnswers = [];
          this.currentQuizQuestion = 0;
          this.state.quizAnswers = [];
          this.multiSelectAnswers = []; // Reset multi-select selections
          this.quizFeedbackScrollOffset = 0;
          return;
        }
      }
      // Check prev button
      if (this.prevFeedbackButton) {
        const btn = this.prevFeedbackButton;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          this.quizFeedbackScrollOffset = Math.max(0, this.quizFeedbackScrollOffset - 1);
          return;
        }
      }
      // Check next button
      if (this.nextFeedbackButton) {
        const btn = this.nextFeedbackButton;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          this.quizFeedbackScrollOffset = Math.min(this.quizWrongAnswers.length - 1, this.quizFeedbackScrollOffset + 1);
          return;
        }
      }
      return;
    }
    
    const q = this.quizQuestions[this.currentQuizQuestion];
    const isMultiSelect = q.multiSelect === true;
    
    // Handle multi-select Submit button
    if (isMultiSelect && this.quizSubmitButton) {
      const btn = this.quizSubmitButton;
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        if (this.multiSelectAnswers.length > 0) {
          // Store multi-select answer and move to next question
          this.state.quizAnswers.push([...this.multiSelectAnswers]);
          soundManager.play('choiceSelect');
          this.multiSelectAnswers = []; // Reset for next question
          this.advanceQuizQuestion();
        }
        return;
      }
    }
    
    for (const btn of this.quizButtonAreas) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        if (isMultiSelect) {
          // Toggle selection for multi-select
          const idx = this.multiSelectAnswers.indexOf(btn.option);
          if (idx >= 0) {
            this.multiSelectAnswers.splice(idx, 1);
          } else {
            this.multiSelectAnswers.push(btn.option);
          }
          soundManager.play('choiceSelect');
        } else {
          // Single-select: store answer and advance
          this.state.quizAnswers.push(btn.option);
          soundManager.play('choiceSelect');
          this.advanceQuizQuestion();
        }
        break;
      }
    }
  }
  
  private advanceQuizQuestion(): void {
    if (this.currentQuizQuestion < this.quizQuestions.length - 1) {
      this.currentQuizQuestion++;
    } else {
      // Quiz complete - check for wrong answers
      this.quizWrongAnswers = [];
      this.state.quizAnswers.forEach((answer, i) => {
        const q = this.quizQuestions[i];
        if (q.multiSelect) {
          // Multi-select: compare arrays
          const correctArr = q.correct as number[];
          const answerArr = answer as number[];
          const isCorrect = correctArr.length === answerArr.length && 
            correctArr.every(v => answerArr.includes(v));
          if (!isCorrect) {
            this.quizWrongAnswers.push({ questionIndex: i, playerAnswer: answer });
          }
        } else {
          // Single-select: compare numbers
          if (answer !== q.correct) {
            this.quizWrongAnswers.push({ questionIndex: i, playerAnswer: answer as number });
          }
        }
      });
      
      if (this.quizWrongAnswers.length > 0) {
        // Show feedback for wrong answers (with retry)
        this.showQuizFeedback = true;
        soundManager.play('quizWrong');
      } else {
        // All correct - show quiz review before success
        soundManager.play('quizCorrect');
        soundManager.play('crowdApplause');
        this.state.showQuiz = false;
        this.state.showQuizReview = true;
        this.quizReviewScrollOffset = 0;
      }
    }
  }
  
  private retryQuizButton: { x: number; y: number; w: number; h: number } | null = null;
  
  private drawQuizFeedback(ctx: CanvasRenderingContext2D): void {
    const w = this.logicalWidth;
    const h = this.logicalHeight;
    
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, w, h);
    
    // Feedback card - taller for explanations
    const cardW = Math.min(650, w - 40);
    const cardH = Math.min(520, h - 60);
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;
    
    // Card background
    ctx.fillStyle = '#C9B896';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Title
    ctx.font = `16px ${this.retroFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#DC2626';
    ctx.fillText('NOT QUITE RIGHT...', w / 2, cardY + 40);
    
    ctx.font = `10px ${this.retroFont}`;
    ctx.fillStyle = '#3D2914';
    ctx.fillText(`You got ${this.quizQuestions.length - this.quizWrongAnswers.length} of ${this.quizQuestions.length} correct. Let's review:`, w / 2, cardY + 65);
    
    // Content area with clipping to prevent overflow
    const contentTop = cardY + 85;
    const contentBottom = cardY + cardH - 75;
    const contentHeight = contentBottom - contentTop;
    const maxWidth = cardW - 60;
    
    // Save context and set clip region
    ctx.save();
    ctx.beginPath();
    ctx.rect(cardX + 20, contentTop, cardW - 40, contentHeight);
    ctx.clip();
    
    // Draw wrong answers with explanations (only first one to avoid overflow)
    // Show one wrong answer at a time with compact layout
    const wrongIdx = Math.min(this.quizFeedbackScrollOffset, this.quizWrongAnswers.length - 1);
    const wrong = this.quizWrongAnswers[wrongIdx];
    const q = this.quizQuestions[wrong.questionIndex];
    
    let yOffset = contentTop + 10;
    
    // Question number and navigation hint
    ctx.font = `bold 10px ${this.retroFont}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8B4513';
    const navText = this.quizWrongAnswers.length > 1 
      ? `Question ${wrong.questionIndex + 1} (${wrongIdx + 1} of ${this.quizWrongAnswers.length} wrong):`
      : `Question ${wrong.questionIndex + 1}:`;
    ctx.fillText(navText, cardX + 30, yOffset);
    yOffset += 22;
    
    // The question
    ctx.font = `10px ${this.retroFont}`;
    ctx.fillStyle = '#3D2914';
    const questionLines = this.wrapText(ctx, q.question, maxWidth);
    questionLines.forEach(line => {
      ctx.fillText(line, cardX + 30, yOffset);
      yOffset += 18;
    });
    yOffset += 5;
    
    // Your answer (wrong) - generate letter labels by index (A, B, C, D...)
    ctx.fillStyle = '#DC2626';
    if (q.multiSelect && Array.isArray(wrong.playerAnswer)) {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const yourLetters = (wrong.playerAnswer as number[]).map(i => letters[i]).join(', ') || 'None';
      ctx.fillText(`Your answer: ${yourLetters}`, cardX + 30, yOffset);
    } else {
      ctx.fillText(`Your answer: ${q.options[wrong.playerAnswer as number]}`, cardX + 30, yOffset);
    }
    yOffset += 22;
    
    // Correct answer - darker green for readability
    ctx.fillStyle = '#166534';
    if (q.multiSelect && Array.isArray(q.correct)) {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const correctLetters = (q.correct as number[]).map(i => letters[i]).join(', ');
      ctx.fillText(`Correct: ${correctLetters}`, cardX + 30, yOffset);
    } else {
      ctx.fillText(`Correct: ${q.options[q.correct as number]}`, cardX + 30, yOffset);
    }
    yOffset += 25;
    
    // Explanation with more room
    ctx.font = `italic 10px ${this.retroFont}`;
    ctx.fillStyle = '#5D4837';
    const explanationLines = this.wrapText(ctx, q.explanation, maxWidth);
    explanationLines.forEach(line => {
      ctx.fillText(line, cardX + 30, yOffset);
      yOffset += 18;
    });
    
    ctx.restore();
    
    // Navigation buttons if multiple wrong answers
    if (this.quizWrongAnswers.length > 1) {
      const navBtnW = 80;
      const navBtnH = 30;
      const navY = cardY + cardH - 110;
      
      // Previous button
      if (this.quizFeedbackScrollOffset > 0) {
        const prevX = cardX + 30;
        ctx.fillStyle = '#6B7280';
        ctx.beginPath();
        ctx.roundRect(prevX, navY, navBtnW, navBtnH, 6);
        ctx.fill();
        ctx.font = `10px ${this.retroFont}`;
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.fillText('< PREV', prevX + navBtnW / 2, navY + navBtnH / 2 + 4);
        this.prevFeedbackButton = { x: prevX, y: navY, w: navBtnW, h: navBtnH };
      } else {
        this.prevFeedbackButton = null;
      }
      
      // Next button
      if (this.quizFeedbackScrollOffset < this.quizWrongAnswers.length - 1) {
        const nextX = cardX + cardW - 30 - navBtnW;
        ctx.fillStyle = '#6B7280';
        ctx.beginPath();
        ctx.roundRect(nextX, navY, navBtnW, navBtnH, 6);
        ctx.fill();
        ctx.font = `10px ${this.retroFont}`;
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.fillText('NEXT >', nextX + navBtnW / 2, navY + navBtnH / 2 + 4);
        this.nextFeedbackButton = { x: nextX, y: navY, w: navBtnW, h: navBtnH };
      } else {
        this.nextFeedbackButton = null;
      }
    } else {
      this.prevFeedbackButton = null;
      this.nextFeedbackButton = null;
    }
    
    // Try Again button
    const btnW = 180;
    const btnH = 45;
    const btnX = (w - btnW) / 2;
    const btnY = cardY + cardH - 60;
    
    ctx.fillStyle = '#3B82F6';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.strokeStyle = '#1D4ED8';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.font = `12px ${this.retroFont}`;
    ctx.fillStyle = '#FFF';
    ctx.textAlign = 'center';
    ctx.fillText('TRY AGAIN', w / 2, btnY + btnH / 2 + 4);
    
    this.retryQuizButton = { x: btnX, y: btnY, w: btnW, h: btnH };
  }
  
  private prevFeedbackButton: { x: number; y: number; w: number; h: number } | null = null;
  private nextFeedbackButton: { x: number; y: number; w: number; h: number } | null = null;
  
  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }
  
  private reviewContinueButton: { x: number; y: number; w: number; h: number } | null = null;
  private reviewPrevButton: { x: number; y: number; w: number; h: number } | null = null;
  private reviewNextButton: { x: number; y: number; w: number; h: number } | null = null;
  
  private handleQuizReviewTouch(x: number, y: number): void {
    // Check continue button
    if (this.reviewContinueButton) {
      const btn = this.reviewContinueButton;
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        this.state.showQuizReview = false;
        this.state.showSuccess = true;
        this.state.phase = 'complete';
        // Fade out ambient night when quiz completes
        soundManager.fadeOut('ambientNight', 1000);
        return;
      }
    }
    // Check prev button
    if (this.reviewPrevButton) {
      const btn = this.reviewPrevButton;
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        this.quizReviewScrollOffset = Math.max(0, this.quizReviewScrollOffset - 1);
        return;
      }
    }
    // Check next button
    if (this.reviewNextButton) {
      const btn = this.reviewNextButton;
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        this.quizReviewScrollOffset = Math.min(this.quizQuestions.length - 1, this.quizReviewScrollOffset + 1);
        return;
      }
    }
  }
  
  private drawQuizReview(ctx: CanvasRenderingContext2D): void {
    const w = this.logicalWidth;
    const h = this.logicalHeight;
    
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, w, h);
    
    // Card dimensions
    const cardW = Math.min(700, w - 40);
    const cardH = Math.min(520, h - 40);
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;
    
    // Card background - parchment style
    ctx.fillStyle = '#E8DCC8';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Title
    ctx.font = `bold 20px ${this.retroFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#166534';
    ctx.fillText('LESSON COMPLETE!', w / 2, cardY + 45);
    
    // Score line
    ctx.font = `12px ${this.retroFont}`;
    ctx.fillStyle = '#5D4837';
    ctx.fillText(`You answered all ${this.quizQuestions.length} questions correctly!`, w / 2, cardY + 75);
    
    const maxWidth = cardW - 60;
    let yOffset = cardY + 110;
    
    // Main educational summary
    ctx.font = `bold 14px ${this.retroFont}`;
    ctx.fillStyle = '#3D2914';
    ctx.fillText('What You Learned:', w / 2, yOffset);
    yOffset += 30;
    
    // Key lessons
    ctx.font = `12px ${this.retroFont}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5D4837';
    
    const lessons = [
      "1. The Double Coincidence of Wants makes direct trading difficult - both parties must want exactly what the other has, at the same time.",
      "2. Debt allows trade even when you don't have what someone wants right now - you can promise to pay later.",
      "3. A Ledger creates a permanent, shared record that everyone can verify - no more disputes about who owes what.",
      "4. Money evolved as a social tool to solve these problems - it tracks debts so anyone can trade with anyone, anytime."
    ];
    
    lessons.forEach(lesson => {
      const lines = this.wrapText(ctx, lesson, maxWidth);
      lines.forEach(line => {
        ctx.fillText(line, cardX + 30, yOffset);
        yOffset += 18;
      });
      yOffset += 8;
    });
    
    yOffset += 10;
    
    // Big takeaway - reduce spacing to prevent button overlap
    ctx.font = `bold 11px ${this.retroFont}`;
    ctx.fillStyle = '#6B4423';
    ctx.textAlign = 'center';
    ctx.fillText('The Big Idea:', w / 2, yOffset);
    yOffset += 18;
    
    ctx.font = `italic 10px ${this.retroFont}`;
    ctx.fillStyle = '#3D2914';
    const bigIdea = "Money is not just coins or paper - it's a system for tracking debts. When you get paid, you earn the right to collect value later. The Stone Tablet was an early ledger - today we use banks and computers, but the idea is the same!";
    const bigIdeaLines = this.wrapText(ctx, bigIdea, maxWidth);
    bigIdeaLines.forEach(line => {
      ctx.fillText(line, w / 2, yOffset);
      yOffset += 15;
    });
    
    // Continue button - positioned below the text content, clamped to card bounds
    const btnW = 200;
    const btnH = 45;
    const btnX = (w - btnW) / 2;
    const maxBtnY = cardY + cardH - btnH - 25; // Maximum Y to keep button inside card with more bottom padding
    const btnY = Math.min(yOffset + 35, maxBtnY); // Position below text with proper spacing
    
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.strokeStyle = '#14532D';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.font = `bold 16px ${this.retroFont}`;
    ctx.fillStyle = '#FFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FINISH', w / 2, btnY + btnH / 2);
    ctx.textBaseline = 'alphabetic'; // Reset to default
    
    this.reviewContinueButton = { x: btnX, y: btnY, w: btnW, h: btnH };
    this.reviewPrevButton = null;
    this.reviewNextButton = null;
  }

  private drawSuccessScreen(ctx: CanvasRenderingContext2D): void {
    const w = this.logicalWidth;
    const h = this.logicalHeight;

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, w, h);

    // Success card
    const cardW = Math.min(500, w - 60);
    const cardH = 350;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;

    // Card background
    ctx.fillStyle = '#C9B896';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Title
    ctx.font = `20px ${this.retroFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#22C55E';
    ctx.fillText('SUCCESS!', w / 2, cardY + 60);

    // Score calculation - handle both single-select and multi-select
    let correct = 0;
    this.state.quizAnswers.forEach((answer, i) => {
      const q = this.quizQuestions[i];
      if (q.multiSelect) {
        // Multi-select: compare arrays
        const correctArr = q.correct as number[];
        const answerArr = answer as number[];
        const isCorrect = correctArr.length === answerArr.length && 
          correctArr.every(v => answerArr.includes(v));
        if (isCorrect) correct++;
      } else {
        // Single-select: compare numbers
        if (answer === q.correct) correct++;
      }
    });

    ctx.font = `12px ${this.retroFont}`;
    ctx.fillStyle = '#3D2914';
    ctx.fillText(`You answered ${correct} of ${this.quizQuestions.length} correctly!`, w / 2, cardY + 120);

    ctx.font = `10px ${this.retroFont}`;
    ctx.fillText('You learned about the importance of', w / 2, cardY + 170);
    ctx.fillText('record-keeping and trust in trade.', w / 2, cardY + 195);

    // Play Again button
    const btnW = 200;
    const btnH = 50;
    const btnX = (w - btnW) / 2;
    const btnY = cardY + 250;

    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = `12px ${this.retroFont}`;
    ctx.fillStyle = '#FFF';
    ctx.fillText('PLAY AGAIN', w / 2, btnY + btnH / 2 + 4);

    // Store play again button area
    this.playAgainButton = { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  private playAgainButton: { x: number; y: number; w: number; h: number } | null = null;

  private handleSuccessTouch(x: number, y: number): void {
    if (this.playAgainButton) {
      const btn = this.playAgainButton;
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        this.resetGame();
      }
    }
  }

  private resetGame(): void {
    // Reset all game state
    this.player.x = 100;
    this.state = {
      phase: 'intro',
      loop: 1,
      inventory: { stone: 0, fish: 0, wood: 0, berries: 0, slingshot: 1 },
      badges: [],
      showBadgePopup: false,
      pendingBadge: null,
      showInventoryHint: false,
      inventoryHintShown: false,
      pendingChoiceAfterHint: false,
      showTradeSelection: false,
      tradeSelectionCallback: null,
      roofRepaired: false,
      obtainedWood: false,
      obtainedStone: false,
      escortingNPC: null,
      woodcutterDebtRecorded: false,
      stoneWorkerDebtRecorded: false,
      woodcutterCarvingSoundPlayed: false,
      stoneWorkerCarvingSoundPlayed: false,
      playerBlockedForCarving: false,
      woodReceiveSoundPlayed: false,
      stoneReceiveSoundPlayed: false,
      woodcutterDisputed: false,
      stoneworkerDisputed: false,
      woodcutterSettled: false,
      stoneWorkerSettled: false,
      pendingWoodcutterDispute: false,
      pendingStoneWorkerDispute: false,
      elderVerified: false,
      elderWalkingToCelebrate: false,
      gaveInToWoodcutter: false,
      gaveInToStoneWorker: false,
      extraBerryAvailable: false,
      extraFishAvailable: false,
      resourcesDepleted: false,
      fishingSoundPlayed: false,
      woodIntroduced: false,
      fishIntroduced: false,
      stoneIntroduced: false,
      berriesIntroduced: false,
      slingshotIntroduced: true,
      ledgerEntries: [],
      dialogueQueue: [],
      currentDialogue: null,
      dialogueComplete: false,
      showInteractButton: false,
      nearbyNPC: null,
      nearbyLocation: null,
      elderEntranceProgress: 0,
      playerMood: 'neutral',
      moodTimer: 0,
      showHUD: false,
      quizAnswers: [],
      showQuiz: false,
      showSuccess: false,
      showQuizReview: false,
      showFail: false,
      showBrawl: false,
      brawlTimer: 0,
      showCelebration: false,
      celebrationTimer: 0,
      showNightTransition: false,
      nightTransitionTimer: 0,
      showThunderstorm: false,
      thunderstormTimer: 0,
      showCloudsAnimation: false,
      cloudsAnimationTimer: 0,
      showRainfall: false,
      rainfallTimer: 0,
      playerEnteredHut: false,
      playerFading: false,
      playerAlpha: 1,
      showStoneTabletPopup: false,
      showChoice: false,
      choiceOptions: []
    };
    this.currentQuizQuestion = 0;
    this.playAgainButton = null;
    this.quizButtonAreas = [];
    
    // Reset NPC positions to original locations
    this.woodcutter.x = this.woodcutter.originalX || 700;
    this.woodcutter.targetX = undefined;
    this.stoneWorker.x = this.stoneWorker.originalX || 2150;
    this.stoneWorker.targetX = undefined;
    this.fisherman.x = this.fisherman.originalX || 3175;
    this.fisherman.targetX = undefined;
    
    // Reset animation/sound flags
    this.booFailureTriggered = false;
    this.stormTriggered = false;
    this.rainSoundStarted = false;
    this.celebrationEndTime = 0;
    
    // Resume ambient music and day background
    soundManager.stopLoop('backgroundMusicNight');
    soundManager.fadeIn('ambientVillage', 1000);
    soundManager.startDaytimeMusic();
    
    // Trigger intro again
    setTimeout(() => this.triggerIntro(), 500);
  }

  // Start Loop 2 after fail screen
  private startLoop2(): void {
    // Resume ambient music and day background if it was stopped
    soundManager.stopLoop('backgroundMusicNight');
    soundManager.fadeIn('ambientVillage', 1000);
    soundManager.startDaytimeMusic();
    
    this.player.x = 100;
    this.state = {
      phase: 'loop2_intro',
      loop: 2,
      inventory: { stone: 0, fish: 0, wood: 0, berries: 0, slingshot: 1 },
      badges: [],
      showBadgePopup: false,
      pendingBadge: null,
      showInventoryHint: false,
      inventoryHintShown: false,
      pendingChoiceAfterHint: false,
      showTradeSelection: false,
      tradeSelectionCallback: null,
      roofRepaired: false,
      obtainedWood: false,
      obtainedStone: false,
      escortingNPC: null,
      woodcutterDebtRecorded: false,
      stoneWorkerDebtRecorded: false,
      woodcutterCarvingSoundPlayed: false,
      stoneWorkerCarvingSoundPlayed: false,
      playerBlockedForCarving: false,
      woodReceiveSoundPlayed: false,
      stoneReceiveSoundPlayed: false,
      woodcutterDisputed: false,
      stoneworkerDisputed: false,
      woodcutterSettled: false,
      stoneWorkerSettled: false,
      pendingWoodcutterDispute: false,
      pendingStoneWorkerDispute: false,
      elderVerified: false,
      elderWalkingToCelebrate: false,
      gaveInToWoodcutter: false,
      gaveInToStoneWorker: false,
      extraBerryAvailable: false,
      extraFishAvailable: false,
      resourcesDepleted: false,
      fishingSoundPlayed: false,
      woodIntroduced: false,
      fishIntroduced: false,
      stoneIntroduced: false,
      berriesIntroduced: false,
      slingshotIntroduced: true,
      ledgerEntries: [],
      dialogueQueue: [],
      currentDialogue: null,
      dialogueComplete: false,
      showInteractButton: false,
      nearbyNPC: null,
      nearbyLocation: null,
      elderEntranceProgress: 0,
      playerMood: 'neutral',
      moodTimer: 0,
      showHUD: false,
      quizAnswers: [],
      showQuiz: false,
      showSuccess: false,
      showQuizReview: false,
      showFail: false,
      showBrawl: false,
      brawlTimer: 0,
      showCelebration: false,
      celebrationTimer: 0,
      showNightTransition: false,
      nightTransitionTimer: 0,
      showThunderstorm: false,
      thunderstormTimer: 0,
      showCloudsAnimation: false,
      cloudsAnimationTimer: 0,
      showRainfall: false,
      rainfallTimer: 0,
      playerEnteredHut: false,
      playerFading: false,
      playerAlpha: 1,
      showStoneTabletPopup: false,
      showChoice: false,
      choiceOptions: []
    };
    
    // Reset NPC positions to original locations
    this.woodcutter.x = this.woodcutter.originalX || 700;
    this.woodcutter.targetX = undefined;
    this.stoneWorker.x = this.stoneWorker.originalX || 2150;
    this.stoneWorker.targetX = undefined;
    this.fisherman.x = this.fisherman.originalX || 3175;
    this.fisherman.targetX = undefined;
    
    // Reset animation/sound flags for loop 2
    this.booFailureTriggered = false;
    this.stormTriggered = false;
    this.rainSoundStarted = false;
    this.celebrationEndTime = 0;
    
    setTimeout(() => this.triggerIntro(), 500);
  }
}
