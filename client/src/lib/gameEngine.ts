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
  };
  // Track roof repair state
  roofRepaired: boolean;
  // Track if player ever obtained wood/stone (separate from current inventory)
  obtainedWood: boolean;
  obtainedStone: boolean;
  // Track which debts are recorded on the Stone Tablet (Loop 2 only)
  woodcutterDebtRecorded: boolean;
  stoneWorkerDebtRecorded: boolean;
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
  // Track when items have been introduced (for inventory display)
  woodIntroduced: boolean;
  fishIntroduced: boolean;
  stoneIntroduced: boolean;
  berriesIntroduced: boolean;
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
  quizAnswers: number[];
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
  private worldWidth: number = 3500;
  private groundHeight: number = 100;

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
  private interactButtonSize: number = 100;

  // Animation timers
  private bobTimer: number = 0;
  private dialogueCharIndex: number = 0;
  private dialogueTimer: number = 0;
  private continueArrowBlink: number = 0;
  private inventoryPopup: { text: string; timer: number; y: number } | null = null;
  private hudGlow: number = 0;
  private interactButtonOpacity: number = 0;
  private faceImages: Record<string, HTMLImageElement> = {};
  private moodTimer: number = 0;
  
  // Sound mute button
  private muteButtonArea: { x: number; y: number; w: number; h: number } | null = null;
  
  // Inventory UI
  private inventoryButtonArea: { x: number; y: number; w: number; h: number } | null = null;
  private inventoryDetailPopupArea: { x: number; y: number; w: number; h: number } | null = null;
  private showInventoryDetailPopup: boolean = false;
  
  // Sound timing
  private lastFootstepTime: number = 0;
  private footstepInterval: number = 300;
  
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
      x: 2050,
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
      x: 2550, // Original position - far from village center (50 right of before)
      y: 0,
      width: 50,
      height: 70,
      color: '#6B7280', // Gray for stone
      outlineColor: '#374151',
      visible: true,
      bobOffset: 0,
      bobDirection: 1,
      originalX: 2550
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
      inventory: { stone: 0, fish: 0, wood: 0, berries: 0 },
      roofRepaired: false,
      obtainedWood: false,
      obtainedStone: false,
      escortingNPC: null,
      woodcutterDebtRecorded: false,
      stoneWorkerDebtRecorded: false,
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
      woodIntroduced: false,
      fishIntroduced: false,
      stoneIntroduced: false,
      berriesIntroduced: false,
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
    // Scale coordinates to match canvas internal dimensions
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
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
    
    // Check if clicking on mute button
    if (this.muteButtonArea) {
      const btn = this.muteButtonArea;
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        soundManager.toggleMute();
        soundManager.play('buttonClick');
        return;
      }
    }
    
    // Check if clicking on inventory HUD to open popup
    if (this.inventoryButtonArea) {
      const btn = this.inventoryButtonArea;
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        this.showInventoryDetailPopup = true;
        soundManager.play('buttonClick');
        return;
      }
    }
    
    // Check if clicking on Stone Tablet HUD to open popup
    if (this.state.showHUD) {
      const hudX = this.canvas.width - this.hudWidth - 24;
      const hudY = 24;
      if (x >= hudX && x <= hudX + this.hudWidth && y >= hudY && y <= hudY + this.hudHeight) {
        this.state.showStoneTabletPopup = true;
        return;
      }
    }
    
    // Handle fail screen touches
    if (this.state.showFail) {
      this.handleFailTouch(x, y);
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
    
    // Block input during night transition (cutscene)
    if (this.state.showNightTransition) {
      return;
    }

    // Handle quiz touches
    if (this.state.showQuiz) {
      this.handleQuizTouch(x, y);
      return;
    }
    
    // Handle quiz review touches
    if (this.state.showQuizReview) {
      this.handleQuizReviewTouch(x, y);
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
    const scaleX = this.canvas.width / rect.width;
    const x = (clientX - rect.left) * scaleX;
    this.touchX = x;
    this.updateMoveDirection(x);
  }

  private updateMoveDirection(x: number): void {
    const halfWidth = this.canvas.width / 2;
    this.moveDirection = x < halfWidth ? -1 : 1;
  }

  private isInteractButtonTouched(x: number, y: number): boolean {
    const size = this.interactButtonSize;
    const btnX = this.canvas.width - size - 32;
    const btnY = this.canvas.height - this.dialogueBoxHeight - size - 48;
    // Add padding around button for easier touch targeting
    const padding = 20;
    return x >= btnX - padding && x <= btnX + size + padding && 
           y >= btnY - padding && y <= btnY + size + padding;
  }
  
  // Check if player tapped directly on an NPC, home hut, stone tablet, or berry bush
  // Prioritizes the NPC closest to the player when multiple hitboxes overlap
  private getTappedInteractable(x: number, y: number): Character | 'home' | 'stoneTablet' | null {
    const groundY = this.canvas.height - this.groundHeight - this.dialogueBoxHeight;
    
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
    if (debtsSettled && this.state.loop === 2 && !this.state.showQuiz && !this.state.showCloudsAnimation && !this.state.showNightTransition && !this.state.showSuccess && !this.state.playerEnteredHut) {
      
      // If roof needs fixing, fix it first, then trigger clouds after buffer
      if (!this.state.roofRepaired && hasWood) {
        this.queueDialogue([
          {
            speaker: 'YOU',
            text: "Just in time! Let me fix my roof before the storm hits!",
            onComplete: () => {
              soundManager.play('roofHammer');
              this.state.roofRepaired = true;
              this.state.inventory.wood = 0;
              this.showInventoryPopup('ROOF FIXED! (-1 WOOD)');
              this.setMood('happy');
              // After roof is fixed, add 2 second buffer before storm clouds
              setTimeout(() => {
                this.triggerReturnHomeSequence();
              }, 2000);
            }
          }
        ]);
        return;
      }
      
      // Roof already fixed - show brief dialogue, then trigger return home sequence with buffer
      this.queueDialogue([
        {
          speaker: 'YOU',
          text: "Safe inside! The storm can come now.",
          onComplete: () => {
            // 2 second buffer before storm clouds roll in
            setTimeout(() => {
              this.triggerReturnHomeSequence();
            }, 2000);
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
          soundManager.play('roofHammer');
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
  
  // Trigger the return home sequence with clouds animation
  private triggerReturnHomeSequence(): void {
    // Player enters hut (disappears)
    this.state.playerEnteredHut = true;
    this.player.visible = false;
    
    // Start dark clouds animation (2.5 seconds)
    this.state.showCloudsAnimation = true;
    this.state.cloudsAnimationTimer = 0;
    soundManager.fadeOut('backgroundMusicDay', 1000);
    soundManager.play('thunder');
    
    // Sequence: clouds 2.5s → rainfall 3s → night transition 3s → quiz
    setTimeout(() => {
      try {
        this.state.showCloudsAnimation = false;
        // Start rainfall animation
        this.state.showRainfall = true;
        this.state.rainfallTimer = 0;
        soundManager.fadeIn('rain', 500);
        
        setTimeout(() => {
          try {
            // Keep rainfall visible during night transition for smooth blend
            // Start night transition with fade (rain continues)
            this.state.showNightTransition = true;
            this.state.nightTransitionTimer = 0;
            soundManager.fadeIn('backgroundMusicNight', 2000);
            
            setTimeout(() => {
              try {
                this.state.showRainfall = false; // Now turn off rain
                soundManager.fadeOut('rain', 1000);
                this.state.showNightTransition = false;
                this.state.showQuiz = true;
                this.state.phase = 'quiz';
                // Restore player visibility for quiz
                this.player.visible = true;
                this.state.playerEnteredHut = false;
              } catch (e) {
                console.error('Error in quiz transition:', e);
              }
            }, 3000); // 3 second fade to night
          } catch (e) {
            console.error('Error in rainfall transition:', e);
          }
        }, 3000); // 3 second rainfall
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
          text: "This tablet holds great power, young one. A promise remembered only by one is easily forgotten by another."
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
    
    // LOOP 1: Give wood immediately on credit (verbal promise) - no escort
    if (phase === 'need_wood') {
      this.queueDialogue([
        {
          speaker: 'WOODCUTTER',
          text: "A storm is coming? Here, take this wood for your roof! You owe me a Sharp Stone and 1 Fish. I'll meet you at the Village Center later.",
          onComplete: () => {
            this.state.inventory.wood = 1;
            this.state.obtainedWood = true;
            this.state.woodIntroduced = true; // Wood shown in inventory HUD
            this.state.stoneIntroduced = true; // Stone mentioned as payment
            this.state.fishIntroduced = true; // Fish mentioned as payment
            this.showInventoryPopup('+1 WOOD');
            this.setMood('happy');
            this.state.phase = 'got_wood_need_stone';
            // Woodcutter walks to village center (right of Elder to avoid overlap)
            this.woodcutter.targetX = this.villageCenterX + 80; // Far enough from Elder
          }
        }
      ]);
    }
    // LOOP 2: First visit - offer choice
    else if (phase === 'loop2_need_wood') {
      this.state.showChoice = true;
      this.state.choiceOptions = [
        {
          text: "I promise to bring you a Sharp Stone and 1 Fish.",
          action: () => {
            this.state.showChoice = false;
            this.queueDialogue([
              {
                speaker: 'WOODCUTTER',
                text: "Very well, let's walk to the Village Center together. I'll give you the wood there.",
                onComplete: () => {
                  this.state.phase = 'loop2_escorting_woodcutter';
                  this.state.escortingNPC = 'woodcutter';
                  // Note: woodcutterDebtRecorded stays FALSE (verbal promise)
                  // NPC will follow player via escort behavior
                }
              }
            ]);
          }
        },
        {
          text: "Let's record this debt on the Stone Tablet first.",
          action: () => {
            this.state.showChoice = false;
            this.queueDialogue([
              {
                speaker: 'WOODCUTTER',
                text: "A wise choice! Let's walk to the Stone Tablet together and record our agreement.",
                onComplete: () => {
                  this.state.phase = 'loop2_escorting_woodcutter';
                  this.state.escortingNPC = 'woodcutter';
                  this.state.woodcutterDebtRecorded = true; // Will record on tablet
                  // NPC will follow player via escort behavior
                }
              }
            ]);
          }
        }
      ];
    }
    // Loop 2: Arrived at tablet during escort
    else if (phase === 'loop2_escorting_woodcutter') {
      const playerAtCenter = Math.abs(this.player.x - this.villageCenterX) < 150;
      const woodcutterAtCenter = Math.abs(this.woodcutter.x - this.villageCenterX) < 150;
      
      if (playerAtCenter && woodcutterAtCenter) {
        const recorded = this.state.woodcutterDebtRecorded;
        this.queueDialogue([
          {
            speaker: 'WOODCUTTER',
            text: recorded 
              ? "Good, the debt is now recorded on the Stone Tablet. Here's your Wood!"
              : "We're at the center. Here's your Wood. Remember, you owe me a Sharp Stone and 1 Fish!",
            onComplete: () => {
              this.state.inventory.wood = 1;
              this.state.obtainedWood = true;
              // Show wood in inventory HUD
              this.state.woodIntroduced = true; // Wood shown in inventory HUD
              this.state.stoneIntroduced = true; // Stone mentioned as owed
              this.state.fishIntroduced = true; // Fish mentioned as owed
              this.showInventoryPopup('+1 WOOD');
              this.setMood('happy');
              this.state.phase = 'loop2_got_wood';
              this.state.escortingNPC = null;
              if (recorded) {
                soundManager.playForDuration('stoneCarve', 3000);
                this.state.ledgerEntries.push({ name: 'PLAYER', debt: '1 STONE + 1 FISH | OWED TO WOODCUTTER' });
                this.state.showHUD = true;
                this.hudGlow = 1;
              }
              this.woodcutter.targetX = this.villageCenterX + 80; // Far enough from Elder
            }
          }
        ]);
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
                this.state.woodcutterSettled = true;
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

  // ============ LOOP 1 & 2: STONE-WORKER ============
  // ESCORT FLOW: NPC accompanies player to tablet, records debt, THEN gives item
  private handleStoneWorkerInteraction(): void {
    const phase = this.state.phase;
    
    // LOOP 1: Give stone immediately on credit (verbal promise) - no escort
    if (phase === 'got_wood_need_stone') {
      this.queueDialogue([
        {
          speaker: 'STONE-WORKER',
          text: "Need a sharp stone for the Woodcutter's axe? Here you go! You owe me 2 Fish. I'll meet you at the Village Center later.",
          onComplete: () => {
            this.state.inventory.stone = 1;
            this.state.obtainedStone = true;
            this.state.stoneIntroduced = true;
            this.state.fishIntroduced = true; // Fish mentioned as payment
            this.showInventoryPopup('+1 SHARP STONE');
            this.setMood('happy');
            this.state.phase = 'got_stone_need_fish';
            // Stone-worker walks to village center
            this.stoneWorker.targetX = this.villageCenterX - 100;
          }
        }
      ]);
    }
    // LOOP 2: Offer choice to record or promise
    else if (phase === 'loop2_got_wood') {
      this.state.showChoice = true;
      this.state.choiceOptions = [
        {
          text: "I promise to pay you 2 fish later.",
          action: () => {
            this.state.showChoice = false;
            this.queueDialogue([
              {
                speaker: 'STONE-WORKER',
                text: "Very well, let's walk to the Village Center. I'll give you the stone there.",
                onComplete: () => {
                  this.state.phase = 'loop2_escorting_stoneworker';
                  this.state.escortingNPC = 'stoneworker';
                  // Note: stoneWorkerDebtRecorded stays FALSE (verbal promise)
                  // NPC will follow player via escort behavior
                }
              }
            ]);
          }
        },
        {
          text: "Let's record this debt on the Stone Tablet first.",
          action: () => {
            this.state.showChoice = false;
            this.queueDialogue([
              {
                speaker: 'STONE-WORKER',
                text: "A wise choice! Let's walk to the Stone Tablet together.",
                onComplete: () => {
                  this.state.phase = 'loop2_escorting_stoneworker';
                  this.state.escortingNPC = 'stoneworker';
                  this.state.stoneWorkerDebtRecorded = true; // Will record on tablet
                  // NPC will follow player via escort behavior
                }
              }
            ]);
          }
        }
      ];
    }
    // Loop 2: Arrived at tablet during escort
    else if (phase === 'loop2_escorting_stoneworker') {
      const playerAtCenter = Math.abs(this.player.x - this.villageCenterX) < 150;
      const stoneWorkerAtCenter = Math.abs(this.stoneWorker.x - this.villageCenterX) < 150;
      
      if (playerAtCenter && stoneWorkerAtCenter) {
        const recorded = this.state.stoneWorkerDebtRecorded;
        this.queueDialogue([
          {
            speaker: 'STONE-WORKER',
            text: recorded 
              ? "Good, the debt is now recorded. Here's your Sharp Stone!"
              : "We're at the center. Here's your Sharp Stone. Remember, you owe me 2 Fish!",
            onComplete: () => {
              this.state.inventory.stone = 1;
              this.state.obtainedStone = true;
              // Ensure stone and fish appear in inventory HUD
              this.state.stoneIntroduced = true;
              this.state.fishIntroduced = true;
              this.showInventoryPopup('+1 SHARP STONE');
              this.setMood('happy');
              this.state.phase = 'loop2_got_stone';
              this.state.escortingNPC = null;
              if (recorded) {
                soundManager.playForDuration('stoneCarve', 3000);
                this.state.ledgerEntries.push({ name: 'PLAYER', debt: '2 FISH | OWED TO STONE-WORKER' });
                this.hudGlow = 1;
              }
              this.stoneWorker.targetX = this.villageCenterX - 100;
            }
          }
        ]);
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
                this.state.stoneWorkerSettled = true;
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
          text: "You already have your fish! Go settle your debts."
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
    // Debts initiated AND has berries - trade!
    else if (hasBerries) {
      this.queueDialogue([
        {
          speaker: 'FISHERMAN',
          text: "Ah, 3 lovely berries! Here are 3 Fish in exchange.",
          onComplete: () => {
            this.state.inventory.berries -= 3;
            this.state.inventory.fish = 3;
            this.state.fishIntroduced = true; // Ensure fish shows in inventory HUD
            this.showInventoryPopup('+3 FISH (-3 BERRIES)');
            this.setMood('happy');
            // Update phase based on current loop
            if (phase === 'got_stone_need_fish') {
              this.state.phase = 'got_fish_ready_settle';
            } else if (phase === 'loop2_got_stone') {
              this.state.phase = 'loop2_got_fish';
            }
            // Fisherman stays at his fishing hole - no walking to town center
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
          text: "I'll trade you 3 Fish for 3 Berries. Find them at the berry bush to the west!"
        }
      ]);
    }
  }

  // ============ BERRY BUSH INTERACTION ============
  // CREDIT-FIRST: Always interactable - allows player to pick up to 3 berries at any time
  // Extra berry spawns after giving in to inflated demand
  private handleBerryBushInteraction(): void {
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
      this.showInventoryPopup(`+1 EXTRA BERRY!`);
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
      this.showInventoryPopup(`+1 BERRY (${this.state.inventory.berries}/3)`);
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
              text: "Let me check the Stone Tablet... All debts are recorded clearly here."
            },
            {
              speaker: 'VILLAGE ELDER',
              text: "Woodcutter: 1 Fish. Stone-worker: 2 Fish. The truth is carved in stone!"
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
    this.advanceDialogue();
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
              text: "Fine! The Tablet will prove I'm right! Let's go!",
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
              text: "Fine! The Tablet will prove I'm right! Let's go!",
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

  private advanceDialogue(): void {
    soundManager.play('dialogueAdvance');
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

  private showInventoryPopup(text: string): void {
    soundManager.play('itemPickup');
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
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }

    // Update UI dimensions based on canvas size
    this.dialogueBoxHeight = this.canvas.height * 0.2;
    this.hudWidth = Math.min(260, this.canvas.width * 0.25);
    this.hudHeight = Math.min(185, this.canvas.height * 0.25);
    this.interactButtonSize = Math.min(100, this.canvas.width * 0.12);

    // Calculate ground Y position
    const groundY = this.canvas.height - this.groundHeight - this.dialogueBoxHeight;
    this.player.y = groundY - this.player.height;

    // All NPCs are now at ground level (including Elder who is always visible)
    this.npcs.forEach(npc => {
      npc.y = groundY - npc.height;
    });
  }

  public start(): void {
    this.lastTime = performance.now();
    this.gameLoop();
    soundManager.playLoop('backgroundMusicDay');
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

    // Update NPC bobs and movement toward targets
    const npcSpeed = 80; // NPCs walk slower than player
    this.npcs.forEach((npc, i) => {
      // LOOP 2 ESCORT BEHAVIOR: NPC follows player during Loop 2 escort phases
      const isEscortingWoodcutter = this.state.phase === 'loop2_escorting_woodcutter' && npc.id === 'woodcutter';
      const isEscortingStoneworker = this.state.phase === 'loop2_escorting_stoneworker' && npc.id === 'stoneWorker';
      
      let isWalking = false; // Track if NPC is currently walking
      
      if (isEscortingWoodcutter || isEscortingStoneworker) {
        // Simple escort: NPC always moves toward its target position at the village center
        const npcTargetX = isEscortingWoodcutter ? this.villageCenterX - 100 : this.villageCenterX + 100;
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
    this.cameraTargetX = this.player.x - this.canvas.width / 2;
    this.cameraTargetX = Math.max(0, Math.min(this.worldWidth - this.canvas.width, this.cameraTargetX));
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
    if (this.state.phase === 'complete_success' && this.player.x <= this.playerHomeX + 50 && 
        !this.state.showThunderstorm && !this.state.showNightTransition) {
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
      if (this.state.brawlTimer > 4) {
        this.state.showBrawl = false;
        this.state.showFail = true;
        this.state.phase = 'fail';
      }
    }
    
    // Update celebration animation timer
    if (this.state.showCelebration) {
      this.state.celebrationTimer += dt;
      // Celebration lasts 3 seconds
      if (this.state.celebrationTimer > 3) {
        this.state.showCelebration = false;
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
    if (this.state.showNightTransition) {
      this.state.nightTransitionTimer += dt;
      // Night transition lasts 4 seconds, then show quiz
      if (this.state.nightTransitionTimer > 4) {
        this.state.showNightTransition = false;
        this.state.phase = 'quiz';
        this.state.showQuiz = true;
      }
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
          soundManager.play('celebration');
        }
      },
      {
        speaker: 'VILLAGE ELDER',
        text: "Now return home before the storm arrives. Your roof still needs fixing!",
        onComplete: () => {
          this.state.phase = 'loop2_return';
        }
      }
    ]);
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Draw sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, h - this.dialogueBoxHeight);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(0.4, '#B4D7E8');
    skyGradient.addColorStop(1, '#FFECD2');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, w, h - this.dialogueBoxHeight);

    // Draw parallax background elements
    this.drawBackground(ctx);

    // Draw ground
    const groundY = h - this.groundHeight - this.dialogueBoxHeight;
    const groundGradient = ctx.createLinearGradient(0, groundY, 0, h - this.dialogueBoxHeight);
    groundGradient.addColorStop(0, '#8B7355');
    groundGradient.addColorStop(0.3, '#6B5344');
    groundGradient.addColorStop(1, '#5D4837');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, groundY, w, this.groundHeight);

    // Draw grass line
    ctx.strokeStyle = '#4A7C59';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = -this.cameraX % 30; x < w; x += 30) {
      const grassHeight = 8 + Math.sin(x * 0.1) * 3;
      ctx.moveTo(x, groundY);
      ctx.lineTo(x, groundY - grassHeight);
    }
    ctx.stroke();

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
      // Draw player (in front of NPCs and markers)
      this.drawCharacter(ctx, this.player);
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

    // Draw inventory HUD at top of screen
    this.drawInventoryHUD(ctx);
    
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
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);

    // Choice card
    const cardW = Math.min(500, w - 60);
    const cardH = 200;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;

    ctx.fillStyle = '#C9B896';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Detect if this is a settlement dispute (first option mentions "Tablet")
    // vs procurement deal (first option is a promise)
    const firstOptionText = this.state.choiceOptions[0]?.text || '';
    const isSettlementPhase = firstOptionText.toLowerCase().includes('tablet');
    
    // Title - different header for settlement vs procurement
    ctx.font = `12px ${this.retroFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3D2914';
    const headerText = isSettlementPhase ? 'How will you settle this debt?' : 'How will you seal this deal?';
    ctx.fillText(headerText, w / 2, cardY + 35);

    // Draw choice buttons
    this.choiceButtonAreas = [];
    this.state.choiceOptions.forEach((option, i) => {
      const btnW = cardW - 40;
      const btnH = 50;
      const btnX = cardX + 20;
      const btnY = cardY + 55 + i * 65;

      // Color logic:
      // Settlement phase: first option (consult tablet) = GREEN (smart), second (give in) = RED (risky)
      // Procurement phase: first option (promise) = RED (risky), second (record) = GREEN (smart)
      let btnColor: string;
      if (isSettlementPhase) {
        btnColor = i === 0 ? '#22C55E' : '#DC2626'; // Green for tablet, Red for give-in
      } else {
        btnColor = i === 0 ? '#DC2626' : '#22C55E'; // Red for promise, Green for record
      }
      ctx.fillStyle = btnColor;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 8);
      ctx.fill();

      // Draw button text with horizontal padding and wrapping (max 2 lines)
      ctx.font = `10px ${this.retroFont}`;
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'center';
      
      // Wrap text if too wide (with 20px padding on each side)
      const maxTextWidth = btnW - 40;
      const words = option.text.split(' ');
      let lines: string[] = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = ctx.measureText(testLine).width;
        if (testWidth > maxTextWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      
      // Limit to max 2 lines, truncate if needed
      if (lines.length > 2) {
        lines = lines.slice(0, 2);
        lines[1] = lines[1].slice(0, -3) + '...';
      }
      
      // Draw wrapped lines centered vertically
      const lineHeight = 14;
      const totalHeight = lines.length * lineHeight;
      const startY = btnY + (btnH - totalHeight) / 2 + lineHeight / 2 + 4;
      
      lines.forEach((line, lineIndex) => {
        ctx.fillText(line, w / 2, startY + lineIndex * lineHeight);
      });

      this.choiceButtonAreas.push({ x: btnX, y: btnY, w: btnW, h: btnH, index: i });
    });
  }

  private choiceButtonAreas: { x: number; y: number; w: number; h: number; index: number }[] = [];

  private drawBrawlAnimation(ctx: CanvasRenderingContext2D): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
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
    const w = this.canvas.width;
    const h = this.canvas.height;
    const groundY = h - this.groundHeight - this.dialogueBoxHeight;
    const t = this.state.celebrationTimer;
    
    // Draw confetti particles
    const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#9B59B6', '#2ECC71'];
    for (let i = 0; i < 30; i++) {
      const seed = i * 137.5;
      const x = (seed * 7.3 + t * 100) % w;
      const y = ((seed * 3.7 + t * 150) % (groundY - 100)) + 50;
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
    const celebY = 80 + Math.sin(t * 5) * 10;
    ctx.strokeText('DEBTS SETTLED!', w / 2, celebY);
    ctx.fillText('DEBTS SETTLED!', w / 2, celebY);
  }
  
  private drawThunderstorm(ctx: CanvasRenderingContext2D): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const t = this.state.thunderstormTimer;
    
    // Dark storm overlay that builds up
    const stormProgress = Math.min(1, t / 1.5);
    const stormAlpha = stormProgress * 0.5;
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
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Update timer
    this.state.cloudsAnimationTimer += 1/60;
    const t = this.state.cloudsAnimationTimer;
    
    // Calculate cloud positions rolling in from left and right
    const progress = Math.min(1, t / 2.5); // 0 to 1 over 2.5 seconds
    const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out
    
    // Darken the sky gradually
    const darkenAlpha = easeProgress * 0.6;
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
    
    // Text overlay at the end
    if (progress > 0.7) {
      const textAlpha = (progress - 0.7) / 0.3;
      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.font = `bold 24px ${this.retroFont}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText('THE STORM APPROACHES...', w / 2, h / 2);
      ctx.fillText('THE STORM APPROACHES...', w / 2, h / 2);
      ctx.restore();
    }
  }
  
  private drawRainfallAnimation(ctx: CanvasRenderingContext2D): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Update timer
    this.state.rainfallTimer += 1/60;
    const t = this.state.rainfallTimer;
    
    // Dark stormy sky background
    ctx.fillStyle = 'rgba(20, 20, 35, 0.85)';
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
    const w = this.canvas.width;
    const h = this.canvas.height;
    const t = this.state.nightTransitionTimer;
    
    // Continue rain effect during night transition (fading out)
    if (this.state.showRainfall) {
      const rainFade = Math.max(0, 1 - t / 2); // Fade rain over first 2 seconds
      
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
    
    // Fade from storm to night over first 2 seconds
    const fadeProgress = Math.min(1, t / 2);
    const nightAlpha = 0.85 + fadeProgress * 0.1; // Start darker (storm already dark), end at 95%
    
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
    
    // Draw "THE END OF A GOOD DAY" text after transition
    if (t > 2) {
      const textAlpha = Math.min(1, (t - 2) / 1);
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
    const w = this.canvas.width;
    const h = this.canvas.height;

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

  private drawLocationMarkers(ctx: CanvasRenderingContext2D, groundY: number): void {
    // Player Home marker (at x=100)
    const homeScreenX = this.playerHomeX - this.cameraX;
    if (homeScreenX > -100 && homeScreenX < this.canvas.width + 100) {
      // Draw a simple house shape
      ctx.fillStyle = '#4A3728';
      ctx.fillRect(homeScreenX - 30, groundY - 60, 60, 60);
      
      // Draw roof
      ctx.fillStyle = '#6B4423';
      ctx.beginPath();
      ctx.moveTo(homeScreenX - 40, groundY - 60);
      ctx.lineTo(homeScreenX, groundY - 100);
      ctx.lineTo(homeScreenX + 40, groundY - 60);
      ctx.fill();
      
      // Draw hole in roof if not repaired
      if (!this.state.roofRepaired) {
        // Hole in the roof (dark opening)
        ctx.fillStyle = '#1a0f08';
        ctx.beginPath();
        ctx.ellipse(homeScreenX + 10, groundY - 75, 15, 10, -0.3, 0, Math.PI * 2);
        ctx.fill();
        // Jagged edges for the hole
        ctx.strokeStyle = '#4A3020';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(homeScreenX + 10, groundY - 75, 16, 11, -0.3, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Patch on the roof (lighter wood color)
        ctx.fillStyle = '#8B6B4F';
        ctx.beginPath();
        ctx.ellipse(homeScreenX + 10, groundY - 75, 15, 10, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5D4E37';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Door
      ctx.fillStyle = '#2D1F14';
      ctx.fillRect(homeScreenX - 10, groundY - 35, 20, 35);
      // Label
      ctx.font = `10px ${this.retroFont}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFF';
      ctx.fillText('HOME', homeScreenX, groundY - 110);
    }

    // Village Center / Elder's Rock marker (at x=1500)
    const centerScreenX = this.villageCenterX - this.cameraX;
    if (centerScreenX > -100 && centerScreenX < this.canvas.width + 100) {
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
    if (pondScreenX > -150 && pondScreenX < this.canvas.width + 150) {
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
    
    if (pondScreenX > -150 && pondScreenX < this.canvas.width + 150) {
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
    const w = this.canvas.width;
    const groundY = this.canvas.height - this.groundHeight - this.dialogueBoxHeight;

    // Far background - distant mountains
    ctx.fillStyle = '#C9B8A5';
    for (let i = 0; i < 5; i++) {
      const x = (i * 500 - this.cameraX * 0.2) % (w + 400) - 200;
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + 150, groundY - 120);
      ctx.lineTo(x + 300, groundY);
      ctx.fill();
    }

    // Mid background - village buildings (reduced count, removed rightmost two)
    ctx.fillStyle = '#A89080';
    for (let i = 0; i < 6; i++) {
      const x = (i * 300 - this.cameraX * 0.4) % (w + 300) - 150;
      const buildingWidth = 60 + (i % 3) * 20;
      const buildingHeight = 50 + (i % 2) * 30;

      // Building body
      ctx.fillRect(x, groundY - buildingHeight, buildingWidth, buildingHeight);

      // Roof
      ctx.fillStyle = '#8B7355';
      ctx.beginPath();
      ctx.moveTo(x - 10, groundY - buildingHeight);
      ctx.lineTo(x + buildingWidth / 2, groundY - buildingHeight - 30);
      ctx.lineTo(x + buildingWidth + 10, groundY - buildingHeight);
      ctx.fill();
      ctx.fillStyle = '#A89080';
    }

    // Near decorative elements
    ctx.fillStyle = '#6B8E5E';
    for (let i = 0; i < 12; i++) {
      const x = (i * 200 - this.cameraX * 0.7) % (w + 200) - 100;
      // Bush
      ctx.beginPath();
      ctx.arc(x, groundY, 25, Math.PI, 0);
      ctx.fill();
    }
  }

private drawCharacter(ctx: CanvasRenderingContext2D, char: Character): void {
  // Apply render offset for soft collision visual separation (NPCs only)
  const renderOffset = char.renderOffsetX || 0;
  const screenX = char.x - this.cameraX + renderOffset;
  const screenY = char.y + char.bobOffset;

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
    const x = this.canvas.width - this.hudWidth - 24;
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

  // Large popup view of Stone Tablet - shown when clicking the HUD
  private drawStoneTabletPopup(ctx: CanvasRenderingContext2D): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, w, h);
    
    // Popup dimensions - larger than HUD for readability, wide enough for full debt text
    // Loop 2 needs wider popup for longer debt text
    const isLoop2OrLater = this.state.loop >= 2;
    const popupWidth = Math.min(isLoop2OrLater ? 780 : 620, w - 40);
    const popupHeight = Math.min(500, h - 120);
    const popupX = (w - popupWidth) / 2;
    const popupY = (h - popupHeight) / 2;
    
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
        'only by one is easily',
        'forgotten by another."',
        '',
        '"When debts are carved',
        'in stone, no one can',
        'deny what was agreed."'
      ];
      
      wisdomLines.forEach((line, i) => {
        ctx.fillText(line, popupX + popupWidth / 2, popupY + 120 + i * 34);
      });
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
    
    // Tap to close instruction
    ctx.font = `12px ${this.uiFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8B7355';
    ctx.fillText('Tap anywhere to close', popupX + popupWidth / 2, popupY + popupHeight - 20);
  }

  private drawInventoryHUD(ctx: CanvasRenderingContext2D): void {
    const padding = 12;
    const iconSize = 24;
    const spacing = 8;
    
    // All items shown from start of each loop - no need to collect first
    const items: { count: number; color: string; label: string }[] = [
      { count: this.state.inventory.wood, color: '#8B4513', label: 'W' },
      { count: this.state.inventory.stone, color: '#6B7280', label: 'S' },
      { count: this.state.inventory.fish, color: '#3B82F6', label: 'F' },
      { count: this.state.inventory.berries, color: '#DC2626', label: 'B' }
    ];
    
    // Background panel - positioned to the left of the Stone Tablet HUD (top right area)
    const panelWidth = items.length * (iconSize + spacing + 20) + padding;
    const panelHeight = iconSize + padding * 1.5;
    
    // Position to the left of Stone Tablet HUD (which is at canvas.width - hudWidth - 24)
    const stoneTabletHudX = this.canvas.width - this.hudWidth - 24;
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
  
  private drawInventoryDetailPopup(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const popupWidth = 280;
    const itemHeight = 50;
    const padding = 12;
    
    const items = [
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

  private drawDialogueBox(ctx: CanvasRenderingContext2D): void {
    const x = 0;
    const y = this.canvas.height - this.dialogueBoxHeight;
    const w = this.canvas.width;
    const h = this.dialogueBoxHeight;

    // Background
    ctx.fillStyle = 'rgba(45, 35, 28, 0.95)';
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
      ctx.fillStyle = '#F5F5DC';

      // Word wrap - adjusted for retro font spacing with 1.6 line height
      const maxWidth = w - textStartX - 50;
      const words = displayText.split(' ');
      let line = '';
      let lineY = y + 70;
      const lineHeight = 32; // 16px * 1.6 = ~26, rounded up for readability

      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line.trim(), textStartX, lineY);
          line = word + ' ';
          lineY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), textStartX, lineY);

      // Continue indicator
      if (this.state.dialogueComplete) {
        const arrowAlpha = (Math.sin(this.continueArrowBlink) + 1) / 2;
        ctx.fillStyle = `rgba(201, 184, 150, ${0.5 + arrowAlpha * 0.5})`;
        ctx.font = `16px ${this.retroFont}`;
        ctx.textAlign = 'right';
        ctx.fillText('v', w - 32, y + h - 20);
      }
    } else {
      // Hint text when no dialogue - using retro font at readable size
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
          hint = 'Trade berries for fish with the Fisherman...';
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
        case 'loop2_got_fish':
          hint = 'Settle your debts with the NPCs or visit the Elder...';
          break;
        case 'loop2_verify_at_tablet':
          hint = 'Go to the Stone Tablet to verify the disputed debt...';
          break;
        case 'loop2_return':
          hint = 'Return home to fix your roof before the storm!';
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
    const x = this.canvas.width - size - 32;
    const y = this.canvas.height - this.dialogueBoxHeight - size - 48;

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
    
    // Draw "INTERACT" text
    ctx.font = `bold 18px ${this.uiFont}`;
    ctx.fillText('INTERACT', x + size / 2, y + size / 2 - 10);
    
    // Draw target name below in smaller text
    if (targetName) {
      ctx.font = `bold 12px ${this.uiFont}`;
      ctx.fillText(`(${targetName})`, x + size / 2, y + size / 2 + 12);
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

  // Quiz questions
  private quizQuestions = [
    {
      question: "Why was the Stone-worker angry?",
      options: ["A: He forgot the deal", "B: He didn't like fish"],
      correct: 0,
      explanation: "Without a written record, memories can differ. The Stone-worker genuinely believed a different amount was promised."
    },
    {
      question: "What is the main benefit of the Stone Ledger?",
      options: ["A: It's pretty", "B: It is a shared, immutable record"],
      correct: 1,
      explanation: "The Stone Tablet creates an unchangeable, shared record that everyone can verify - no need to trust anyone's memory."
    },
    {
      question: "Why did the Woodcutter trust you at the end?",
      options: ["A: Because the debt was recorded publicly", "B: Because he is nice"],
      correct: 0,
      explanation: "The public record on the Stone Tablet meant neither party had to rely on trust alone - the truth was carved in stone for all to see."
    }
  ];

  private currentQuizQuestion: number = 0;
  private quizButtonAreas: { x: number; y: number; w: number; h: number; option: number }[] = [];
  private showQuizFeedback: boolean = false;
  private quizWrongAnswers: { questionIndex: number; playerAnswer: number }[] = [];
  private quizFeedbackScrollOffset: number = 0;
  private quizReviewScrollOffset: number = 0;

  private drawQuizOverlay(ctx: CanvasRenderingContext2D): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

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

    // Options as buttons
    this.quizButtonAreas = [];
    const btnW = cardW - 80;
    const btnH = 60;
    const btnX = cardX + 40;

    q.options.forEach((option, i) => {
      const btnY = cardY + 160 + i * 80;
      
      // Button background
      ctx.fillStyle = '#A89080';
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 8);
      ctx.fill();
      ctx.strokeStyle = '#6B5344';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Button text
      ctx.font = `10px ${this.retroFont}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFF';
      ctx.fillText(option, btnX + btnW / 2, btnY + btnH / 2 + 4);

      // Store button area for touch detection
      this.quizButtonAreas.push({ x: btnX, y: btnY, w: btnW, h: btnH, option: i });
    });

    // Progress indicator
    ctx.font = `10px ${this.retroFont}`;
    ctx.fillStyle = '#6B5344';
    ctx.fillText(`Question ${this.currentQuizQuestion + 1} of ${this.quizQuestions.length}`, w / 2, cardY + cardH - 30);
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
    
    for (const btn of this.quizButtonAreas) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        this.state.quizAnswers.push(btn.option);
        soundManager.play('choiceSelect');
        
        if (this.currentQuizQuestion < this.quizQuestions.length - 1) {
          this.currentQuizQuestion++;
        } else {
          // Quiz complete - check for wrong answers
          this.quizWrongAnswers = [];
          this.state.quizAnswers.forEach((answer, i) => {
            if (answer !== this.quizQuestions[i].correct) {
              this.quizWrongAnswers.push({ questionIndex: i, playerAnswer: answer });
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
        break;
      }
    }
  }
  
  private retryQuizButton: { x: number; y: number; w: number; h: number } | null = null;
  
  private drawQuizFeedback(ctx: CanvasRenderingContext2D): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    
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
    
    // Your answer (wrong)
    ctx.fillStyle = '#DC2626';
    ctx.fillText(`Your answer: ${q.options[wrong.playerAnswer]}`, cardX + 30, yOffset);
    yOffset += 22;
    
    // Correct answer - darker green for readability
    ctx.fillStyle = '#166534';
    ctx.fillText(`Correct: ${q.options[q.correct]}`, cardX + 30, yOffset);
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
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, w, h);
    
    // Card dimensions
    const cardW = Math.min(700, w - 40);
    const cardH = Math.min(550, h - 40);
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
    ctx.font = `bold 18px ${this.retroFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3D2914';
    ctx.fillText('LESSON COMPLETE!', w / 2, cardY + 40);
    
    // Score
    ctx.font = `12px ${this.retroFont}`;
    ctx.fillStyle = '#5D4837';
    ctx.fillText(`You answered all ${this.quizQuestions.length} questions correctly!`, w / 2, cardY + 65);
    
    // Current question display (one at a time with navigation)
    const qIdx = this.quizReviewScrollOffset;
    const q = this.quizQuestions[qIdx];
    const playerAnswer = this.state.quizAnswers[qIdx];
    const isCorrect = playerAnswer === q.correct;
    
    const maxWidth = cardW - 60;
    let yOffset = cardY + 100;
    
    // Question counter
    ctx.font = `bold 11px ${this.retroFont}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6B5344';
    ctx.fillText(`Question ${qIdx + 1} of ${this.quizQuestions.length}:`, cardX + 30, yOffset);
    yOffset += 22;
    
    // Question text
    ctx.font = `11px ${this.retroFont}`;
    ctx.fillStyle = '#3D2914';
    const questionLines = this.wrapText(ctx, q.question, maxWidth);
    questionLines.forEach(line => {
      ctx.fillText(line, cardX + 30, yOffset);
      yOffset += 18;
    });
    yOffset += 10;
    
    // Show all options with highlighting
    q.options.forEach((option, optIdx) => {
      const wasChosen = optIdx === playerAnswer;
      const isCorrectOption = optIdx === q.correct;
      
      // Use darker green (#166534) for correct, red for wrong
      if (isCorrectOption) {
        ctx.fillStyle = '#166534'; // Darker green for readability
        ctx.font = `bold 10px ${this.retroFont}`;
      } else if (wasChosen && !isCorrectOption) {
        ctx.fillStyle = '#DC2626'; // Red for wrong answer
        ctx.font = `10px ${this.retroFont}`;
      } else {
        ctx.fillStyle = '#5D4837';
        ctx.font = `10px ${this.retroFont}`;
      }
      
      const prefix = isCorrectOption ? '✓ ' : wasChosen ? '✗ ' : '  ';
      ctx.fillText(`${prefix}${option}`, cardX + 35, yOffset);
      yOffset += 20;
    });
    
    yOffset += 10;
    
    // Explanation
    ctx.font = `italic 10px ${this.retroFont}`;
    ctx.fillStyle = '#5D4837';
    const explanationLines = this.wrapText(ctx, q.explanation, maxWidth);
    explanationLines.forEach(line => {
      ctx.fillText(line, cardX + 30, yOffset);
      yOffset += 16;
    });
    
    // Educational note about money (show on last question)
    if (qIdx === this.quizQuestions.length - 1) {
      yOffset += 15;
      ctx.font = `bold 10px ${this.retroFont}`;
      ctx.fillStyle = '#6B4423';
      ctx.textAlign = 'center';
      ctx.fillText('The Lesson of the Stone Tablet:', w / 2, yOffset);
      yOffset += 18;
      
      ctx.font = `10px ${this.retroFont}`;
      ctx.fillStyle = '#5D4837';
      const lessonText = "Money is a system for tracking debt. When someone creates value for others, money represents what they are owed. Even today, when you work and receive payment, those dollars represent that others owe you something in return—a debt you can collect later in many forms.";
      const lessonLines = this.wrapText(ctx, lessonText, maxWidth);
      lessonLines.forEach(line => {
        ctx.fillText(line, w / 2, yOffset);
        yOffset += 16;
      });
    }
    
    // Navigation buttons
    const navY = cardY + cardH - 110;
    const navBtnW = 90;
    const navBtnH = 35;
    
    // Prev button
    if (qIdx > 0) {
      const prevX = cardX + 30;
      ctx.fillStyle = '#6B7280';
      ctx.beginPath();
      ctx.roundRect(prevX, navY, navBtnW, navBtnH, 6);
      ctx.fill();
      ctx.font = `10px ${this.retroFont}`;
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'center';
      ctx.fillText('< PREV', prevX + navBtnW / 2, navY + navBtnH / 2 + 4);
      this.reviewPrevButton = { x: prevX, y: navY, w: navBtnW, h: navBtnH };
    } else {
      this.reviewPrevButton = null;
    }
    
    // Next button
    if (qIdx < this.quizQuestions.length - 1) {
      const nextX = cardX + cardW - 30 - navBtnW;
      ctx.fillStyle = '#6B7280';
      ctx.beginPath();
      ctx.roundRect(nextX, navY, navBtnW, navBtnH, 6);
      ctx.fill();
      ctx.font = `10px ${this.retroFont}`;
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'center';
      ctx.fillText('NEXT >', nextX + navBtnW / 2, navY + navBtnH / 2 + 4);
      this.reviewNextButton = { x: nextX, y: navY, w: navBtnW, h: navBtnH };
    } else {
      this.reviewNextButton = null;
    }
    
    // Continue button (always visible)
    const btnW = 200;
    const btnH = 50;
    const btnX = (w - btnW) / 2;
    const btnY = cardY + cardH - 60;
    
    ctx.fillStyle = '#166534'; // Darker green to match theme
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.strokeStyle = '#14532D';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.font = `14px ${this.retroFont}`;
    ctx.fillStyle = '#FFF';
    ctx.textAlign = 'center';
    ctx.fillText('CONTINUE', w / 2, btnY + btnH / 2 + 5);
    
    this.reviewContinueButton = { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  private drawSuccessScreen(ctx: CanvasRenderingContext2D): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

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

    // Score calculation
    let correct = 0;
    this.state.quizAnswers.forEach((answer, i) => {
      if (answer === this.quizQuestions[i].correct) correct++;
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
      inventory: { stone: 0, fish: 0, wood: 0, berries: 0 },
      roofRepaired: false,
      obtainedWood: false,
      obtainedStone: false,
      escortingNPC: null,
      woodcutterDebtRecorded: false,
      stoneWorkerDebtRecorded: false,
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
      woodIntroduced: false,
      fishIntroduced: false,
      stoneIntroduced: false,
      berriesIntroduced: false,
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
    this.stoneWorker.x = this.stoneWorker.originalX || 2500;
    this.stoneWorker.targetX = undefined;
    this.fisherman.x = this.fisherman.originalX || 3175;
    this.fisherman.targetX = undefined;
    
    // Resume ambient music
    soundManager.stopLoop('backgroundMusicNight');
    soundManager.fadeIn('backgroundMusicDay', 1000);
    
    // Trigger intro again
    setTimeout(() => this.triggerIntro(), 500);
  }

  // Start Loop 2 after fail screen
  private startLoop2(): void {
    // Resume ambient music if it was stopped
    soundManager.stopLoop('backgroundMusicNight');
    soundManager.fadeIn('backgroundMusicDay', 1000);
    
    this.player.x = 100;
    this.state = {
      phase: 'loop2_intro',
      loop: 2,
      inventory: { stone: 0, fish: 0, wood: 0, berries: 0 },
      roofRepaired: false,
      obtainedWood: false,
      obtainedStone: false,
      escortingNPC: null,
      woodcutterDebtRecorded: false,
      stoneWorkerDebtRecorded: false,
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
      woodIntroduced: false,
      fishIntroduced: false,
      stoneIntroduced: false,
      berriesIntroduced: false,
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
      showStoneTabletPopup: false,
      showChoice: false,
      choiceOptions: []
    };
    
    // Reset NPC positions to original locations
    this.woodcutter.x = this.woodcutter.originalX || 700;
    this.woodcutter.targetX = undefined;
    this.stoneWorker.x = this.stoneWorker.originalX || 2500;
    this.stoneWorker.targetX = undefined;
    this.fisherman.x = this.fisherman.originalX || 3175;
    this.fisherman.targetX = undefined;
    
    setTimeout(() => this.triggerIntro(), 500);
  }
}
