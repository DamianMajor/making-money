// Village Ledger Educational Game Engine
// Touch-only side-scroller optimized for iPad/Tablet

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
  // Loop 1: intro -> need_wood -> got_wood_need_stone -> got_stone_need_fish -> (collect berries) -> got_fish_ready_settle -> confrontation -> brawl -> fail
  // Loop 2: Same but with choice to record debts on Stone Tablet -> success path (partial recording = partial conflict)
  phase: 'intro' | 'need_wood' | 'got_wood_need_stone' | 'got_stone_need_fish' | 'got_fish_ready_settle' | 'confrontation' | 'brawl' | 'fail' | 'loop2_intro' | 'loop2_need_wood' | 'loop2_got_wood' | 'loop2_got_stone' | 'loop2_got_fish' | 'loop2_got_berries' | 'loop2_return' | 'complete_success' | 'quiz' | 'complete';
  loop: 1 | 2;
  inventory: {
    stone: number;
    fish: number;
    wood: number;
    berries: number;
  };
  // Track roof repair state
  roofRepaired: boolean;
  // Track which debts are recorded on the Stone Tablet (Loop 2 only)
  woodcutterDebtRecorded: boolean;
  stoneWorkerDebtRecorded: boolean;
  ledgerEntries: LedgerEntry[];
  dialogueQueue: DialogueLine[];
  currentDialogue: DialogueLine | null;
  dialogueComplete: boolean;
  showInteractButton: boolean;
  nearbyNPC: Character | null;
  nearbyLocation: 'home' | null; // Track if player is near home
  elderEntranceProgress: number;
  playerMood: 'neutral' | 'happy' | 'angry';
  showHUD: boolean;
  quizAnswers: number[];
  showQuiz: boolean;
  showSuccess: boolean;
  showFail: boolean;
  showBrawl: boolean;
  brawlTimer: number;
  showCelebration: boolean; // Dance animation when debts settled
  celebrationTimer: number;
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
  private hudHeight: number = 160;
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
      x: 1480, // Left of Stone Tablet (at x=1600) - more spacing
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
      x: 2000,
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
      x: 2500,
      y: 0,
      width: 50,
      height: 70,
      color: '#6B7280', // Gray for stone
      outlineColor: '#374151',
      visible: true,
      bobOffset: 0,
      bobDirection: 1,
      originalX: 2500
    };

    this.fisherman = {
      id: 'fisherman',
      name: 'FISHERMAN',
      x: 3200,
      y: 0,
      width: 50,
      height: 70,
      color: '#F97316',
      outlineColor: '#C2410C',
      visible: true,
      bobOffset: 0,
      bobDirection: 1,
      originalX: 3200
    };

    this.npcs = [this.woodcutter, this.villageElder, this.berryBush, this.stoneWorker, this.fisherman];

    // Initialize game state
    this.state = {
      phase: 'intro',
      loop: 1,
      inventory: { stone: 0, fish: 0, wood: 0, berries: 0 },
      roofRepaired: false,
      woodcutterDebtRecorded: false,
      stoneWorkerDebtRecorded: false,
      ledgerEntries: [],
      dialogueQueue: [],
      currentDialogue: null,
      dialogueComplete: false,
      showInteractButton: false,
      nearbyNPC: null,
      nearbyLocation: null,
      elderEntranceProgress: 0,
      playerMood: 'neutral',
      showHUD: false,
      quizAnswers: [],
      showQuiz: false,
      showSuccess: false,
      showFail: false,
      showBrawl: false,
      brawlTimer: 0,
      showCelebration: false,
      celebrationTimer: 0,
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
    this.touchActive = false;
    this.moveDirection = 0;
  }

  private handleMouseDown(e: MouseEvent): void {
    this.processTouchStart(e.clientX, e.clientY);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.touchActive) {
      this.processTouchMove(e.clientX);
    }
  }

  private handleMouseUp(): void {
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

    // Handle quiz touches
    if (this.state.showQuiz) {
      this.handleQuizTouch(x, y);
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

    // Movement touch - only if not touching button area
    this.touchActive = true;
    this.touchX = x;
    this.updateMoveDirection(x);
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

    this.notifyStateChange();
  }

  // ============ HOME / HUT INTERACTION ============
  private handleHomeInteraction(): void {
    const hasWood = this.state.inventory.wood >= 1;
    
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
          this.state.roofRepaired = true;
          this.state.inventory.wood = 0;
          this.showInventoryPopup('ROOF FIXED! (-1 WOOD)');
          this.setMood('happy');
        }
      }
    ]);
    
    // Check if player still has outstanding debts
    const hasOutstandingDebts = this.state.ledgerEntries.some(e => e.debt.includes('OWED'));
    const isLoop1 = this.state.loop === 1;
    const needsToSettleDebts = isLoop1 || hasOutstandingDebts || 
      (this.state.phase !== 'complete_success' && this.state.phase !== 'complete');
    
    // Prompt to settle debts if roof is now fixed but debts outstanding
    // Only show reminder if no dialogue is currently active to avoid interrupting
    if (needsToSettleDebts && this.state.inventory.stone >= 0) {
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

  // ============ LOOP 1 & 2: WOODCUTTER ============
  // CREDIT-FIRST: Gives WOOD immediately on first talk, creates debt for Sharp Stone + 1 Fish
  private handleWoodcutterInteraction(): void {
    const phase = this.state.phase;
    
    // LOOP 1: First visit - gives wood on credit
    if (phase === 'need_wood') {
      this.queueDialogue([
        {
          speaker: 'WOODCUTTER',
          text: "Take this Wood for your roof now. Just bring me a Sharp Stone and 1 Fish later. Meet me at the Town Center to settle up!",
          onComplete: () => {
            this.state.inventory.wood = 1;
            this.showInventoryPopup('+1 WOOD');
            this.setMood('happy');
            this.state.phase = 'got_wood_need_stone';
            // Start walking to town center
            this.woodcutter.targetX = this.villageCenterX - 50;
          }
        }
      ]);
    } 
    // LOOP 2: First visit - offer choice to record debt
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
                text: "Very well, I'll remember. Take the wood now and meet me at the Town Center!",
                onComplete: () => {
                  this.state.inventory.wood = 1;
                  this.showInventoryPopup('+1 WOOD');
                  this.setMood('happy');
                  this.state.phase = 'loop2_got_wood'; // Stay on Loop 2 path for partial recording
                  // Note: woodcutterDebtRecorded stays FALSE (verbal promise)
                  // Start walking to town center
                  this.woodcutter.targetX = this.villageCenterX - 50;
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
                text: "A wise choice! Take the wood, and we'll mark it on the Elder's tablet.",
                onComplete: () => {
                  this.state.inventory.wood = 1;
                  this.showInventoryPopup('+1 WOOD');
                  this.setMood('happy');
                  this.state.phase = 'loop2_got_wood';
                  this.state.woodcutterDebtRecorded = true;
                  this.state.ledgerEntries.push({ name: 'PLAYER', debt: '1 STONE + 1 FISH | OWED TO WOODCUTTER' });
                  this.state.showHUD = true;
                  this.hudGlow = 1;
                  // Walk to village center
                  this.woodcutter.targetX = this.villageCenterX - 50;
                }
              }
            ]);
          }
        }
      ];
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
    // Player has everything, ready to settle
    else if (phase === 'got_fish_ready_settle' || phase === 'loop2_got_fish') {
      this.queueDialogue([
        {
          speaker: 'WOODCUTTER',
          text: "You have everything! Meet me at the Town Center to settle your debt!"
        }
      ]);
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
  // CREDIT-FIRST: Gives SHARP STONE immediately, creates debt for 2 Fish
  private handleStoneWorkerInteraction(): void {
    const phase = this.state.phase;
    
    // LOOP 1: Give stone on verbal promise (owes 2 fish)
    if (phase === 'got_wood_need_stone') {
      this.queueDialogue([
        {
          speaker: 'STONE-WORKER',
          text: "Need a stone? Here, take it. You owe me 2 Fish for my work. We'll settle up at the Town Center!",
          onComplete: () => {
            this.state.inventory.stone = 1;
            this.state.phase = 'got_stone_need_fish';
            this.showInventoryPopup('+1 SHARP STONE');
            this.setMood('happy');
            // Start walking to town center
            this.stoneWorker.targetX = this.villageCenterX + 50;
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
                text: "Very well, I'll remember. Get the fish from the Fisherman, then meet me at the Town Center.",
                onComplete: () => {
                  this.state.inventory.stone = 1;
                  this.state.phase = 'loop2_got_stone'; // Stay on Loop 2 path for partial recording
                  // Note: stoneWorkerDebtRecorded stays FALSE (verbal promise)
                  this.showInventoryPopup('+1 SHARP STONE');
                  this.setMood('happy');
                  // Start walking to town center
                  this.stoneWorker.targetX = this.villageCenterX + 50;
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
                text: "A wise choice! Meet me at the Elder's tablet.",
                onComplete: () => {
                  this.state.inventory.stone = 1;
                  this.state.phase = 'loop2_got_stone';
                  this.state.stoneWorkerDebtRecorded = true;
                  this.state.ledgerEntries.push({ name: 'PLAYER', debt: '2 FISH | OWED TO STONE-WORKER' });
                  this.hudGlow = 1;
                  this.showInventoryPopup('+1 SHARP STONE');
                  this.setMood('happy');
                  // Start walking to town center
                  this.stoneWorker.targetX = this.villageCenterX + 50;
                }
              }
            ]);
          }
        }
      ];
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
    else if (phase === 'got_fish_ready_settle' || phase === 'loop2_got_fish') {
      this.queueDialogue([
        {
          speaker: 'STONE-WORKER',
          text: "You have the Fish! Head to the Town Center to settle your debt!"
        }
      ]);
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
  // Fisherman only trades berries for fish AFTER player has initiated debts (has wood AND stone)
  private handleFishermanInteraction(): void {
    const phase = this.state.phase;
    
    // Check if player has items
    const hasBerries = this.state.inventory.berries >= 3;
    const alreadyHasFish = this.state.inventory.fish >= 3;
    const hasWood = this.state.inventory.wood >= 1;
    const hasStone = this.state.inventory.stone >= 1;
    const debtsInitiated = hasWood && hasStone;
    
    // Player already has fish
    if (alreadyHasFish) {
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
    // Debts initiated but no berries - hint to get some
    else {
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
  private handleBerryBushInteraction(): void {
    // Berry bush is now always available (no gating)
    if (this.state.inventory.berries < 3) {
      this.state.inventory.berries++;
      this.showInventoryPopup(`+1 BERRY (${this.state.inventory.berries}/3)`);
      
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
          text: "I have enough berries already."
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
        // ALL RECORDED - Peaceful settlement
        this.setMood('happy');
        this.queueDialogue([
          {
            speaker: 'VILLAGE ELDER',
            text: "Let me check the Stone Tablet... All debts are recorded clearly here.",
            onComplete: () => {
              // Mark all debts as settled
              this.state.ledgerEntries = this.state.ledgerEntries.map(e => ({
                ...e,
                debt: e.debt.replace('OWED', 'SETTLED')
              }));
              this.hudGlow = 1;
            }
          },
          {
            speaker: 'VILLAGE ELDER',
            text: "The Stone does not lie. Your debts are settled! Return to the Woodcutter.",
            onComplete: () => {
              this.state.phase = 'loop2_return';
              // Trigger celebration dance!
              this.state.showCelebration = true;
              this.state.celebrationTimer = 0;
            }
          }
        ]);
      } else if (noneRecorded) {
        // NONE RECORDED - Full confrontation like Loop 1
        this.triggerConfrontation();
      } else {
        // PARTIAL RECORDING - Settle recorded debts, dispute unrecorded ones
        this.triggerPartialSettlement();
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

  private advanceDialogue(): void {
    if (this.state.currentDialogue?.onComplete) {
      this.state.currentDialogue.onComplete();
    }

    if (this.state.dialogueQueue.length > 0) {
      this.state.currentDialogue = this.state.dialogueQueue.shift()!;
      this.dialogueCharIndex = 0;
      this.state.dialogueComplete = false;
      this.dialogueTimer = 0;
    } else {
      this.state.currentDialogue = null;
      this.state.dialogueComplete = false;
      this.setMood('neutral');
    }

    this.notifyStateChange();
  }

  private showInventoryPopup(text: string): void {
    this.inventoryPopup = {
      text,
      timer: 2,
      y: 0
    };
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
    this.hudHeight = Math.min(160, this.canvas.height * 0.2);
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
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private gameLoop(): void {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  private update(dt: number): void {
    // Update bob animation
    this.bobTimer += dt * 8;

    // Update player movement
    if (this.moveDirection !== 0 && !this.state.currentDialogue) {
      this.player.x += this.moveDirection * this.playerSpeed * dt;
      this.player.x = Math.max(this.player.width / 2, Math.min(this.worldWidth - this.player.width / 2, this.player.x));

      // Update player bob
      this.player.bobOffset = Math.sin(this.bobTimer) * 3;
    } else {
      // Subtle idle animation
      this.player.bobOffset = Math.sin(this.bobTimer * 0.5) * 1;
    }

    // Update NPC bobs and movement toward targets
    const npcSpeed = 80; // NPCs walk slower than player
    this.npcs.forEach((npc, i) => {
      npc.bobOffset = Math.sin(this.bobTimer * 0.5 + i * 1.5) * 1.5;
      
      // Move NPC toward target if set
      if (npc.targetX !== undefined) {
        const diff = npc.targetX - npc.x;
        if (Math.abs(diff) > 5) {
          npc.x += Math.sign(diff) * npcSpeed * dt;
          // Walking bob animation
          npc.bobOffset = Math.sin(this.bobTimer * 2 + i) * 3;
        } else {
          // Arrived at target - clear it
          npc.x = npc.targetX;
          npc.targetX = undefined;
        }
      }
    });

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
    if (distToHome <= 150) {
      this.state.nearbyLocation = 'home';
      this.state.showInteractButton = true;
    }

    // Check NPCs (prioritize NPC over location)
    for (const npc of this.npcs) {
      if (!npc.visible) continue;
      const dist = Math.abs(this.player.x - npc.x);
      if (dist <= 250) { // Large range for tablet-friendly interaction (increased from 200)
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

    // CREDIT-FIRST BRAWL TRIGGER
    // Trigger brawl when: player has stone + 3 fish AND is on verbal promise path (got_fish_ready_settle)
    // AND is within 200px of Village Center. This happens in Loop 1 automatically,
    // or in Loop 2 if player chose verbal promise instead of ledger.
    const isVerbalPromisePath = this.state.phase === 'got_fish_ready_settle';
    const hasRequirements = this.state.inventory.stone >= 1 && 
                            this.state.inventory.fish >= 3;
    const nearVillageCenter = Math.abs(this.player.x - this.villageCenterX) < 200;
    const canTrigger = !this.state.showBrawl && 
                       !this.state.currentDialogue && 
                       this.state.phase !== 'confrontation' && 
                       this.state.phase !== 'brawl' && 
                       this.state.phase !== 'fail';
    
    if (isVerbalPromisePath && hasRequirements && nearVillageCenter && canTrigger) {
      this.triggerConfrontation();
    }

    // Check if player completed Loop 2 successfully - trigger quiz
    if (this.state.phase === 'complete_success' && this.player.x <= this.playerHomeX + 50) {
      this.state.phase = 'quiz';
      this.state.showQuiz = true;
    }

    // Update brawl animation timer
    if (this.state.showBrawl) {
      this.state.brawlTimer += dt;
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
          this.state.phase = 'brawl';
          this.state.showBrawl = true;
          this.state.brawlTimer = 0;
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
        this.state.phase = 'brawl';
        this.state.showBrawl = true;
        this.state.brawlTimer = 0;
      }
    });
    
    this.queueDialogue(dialogueLines);
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

    // Draw NPCs (in front of location markers)
    this.npcs.forEach(npc => {
      if (npc.visible) {
        this.drawCharacter(ctx, npc);
      }
    });

    // Draw player (in front of NPCs and markers)
    this.drawCharacter(ctx, this.player);

    // Draw inventory popup
    if (this.inventoryPopup) {
      this.drawInventoryPopup(ctx);
    }

    // Draw UI elements
    if (this.state.showHUD) {
      this.drawStoneTabletHUD(ctx);
    }
    this.drawDialogueBox(ctx);
    this.drawInteractButton(ctx);
    this.drawTouchZoneIndicator(ctx);

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

    // Draw fail screen
    if (this.state.showFail) {
      this.drawFailScreen(ctx);
    }

    // Draw quiz overlay if active
    if (this.state.showQuiz) {
      this.drawQuizOverlay(ctx);
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

    // Title
    ctx.font = `12px ${this.retroFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3D2914';
    ctx.fillText('How will you seal this deal?', w / 2, cardY + 35);

    // Draw choice buttons
    this.choiceButtonAreas = [];
    this.state.choiceOptions.forEach((option, i) => {
      const btnW = cardW - 40;
      const btnH = 50;
      const btnX = cardX + 20;
      const btnY = cardY + 55 + i * 65;

      ctx.fillStyle = i === 0 ? '#DC2626' : '#22C55E'; // Red for promise, Green for ledger
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 8);
      ctx.fill();

      ctx.font = `10px ${this.retroFont}`;
      ctx.fillStyle = '#FFF';
      ctx.fillText(option.text, w / 2, btnY + btnH / 2 + 4);

      this.choiceButtonAreas.push({ x: btnX, y: btnY, w: btnW, h: btnH, index: i });
    });
  }

  private choiceButtonAreas: { x: number; y: number; w: number; h: number; index: number }[] = [];

  private drawBrawlAnimation(ctx: CanvasRenderingContext2D): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const centerX = w / 2;
    // Position brawl on the ground (above dialogue box, at character level)
    const groundY = h - this.groundHeight - this.dialogueBoxHeight;
    const centerY = groundY - 60; // Just above ground level

    // Animate the dust cloud size - LARGER to cover all 3 participants
    const t = this.state.brawlTimer;
    const cloudSize = 150 + Math.sin(t * 10) * 30;
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
    const fishingHoleX = 3200;
    const pondScreenX = fishingHoleX - this.cameraX;
    if (pondScreenX > -150 && pondScreenX < this.canvas.width + 150) {
      // Draw pond/water
      ctx.fillStyle = '#4A90B8';
      ctx.beginPath();
      ctx.ellipse(pondScreenX - 40, groundY + 5, 70, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Pond edge/bank
      ctx.strokeStyle = '#5D4E37';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(pondScreenX - 40, groundY + 5, 72, 22, 0, 0, Math.PI * 2);
      ctx.stroke();
      
      // Water ripples
      ctx.strokeStyle = '#6BB5D8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(pondScreenX - 50, groundY, 20, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(pondScreenX - 25, groundY + 8, 15, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      
      // Fishing pole (held by Fisherman, angled over pond)
      ctx.strokeStyle = '#8B6914';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pondScreenX + 30, groundY - 50); // Held at character level
      ctx.lineTo(pondScreenX - 30, groundY - 80); // Tip extends over water
      ctx.stroke();
      
      // Fishing line
      ctx.strokeStyle = '#AAA';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pondScreenX - 30, groundY - 80); // From pole tip
      ctx.lineTo(pondScreenX - 35, groundY - 5);  // Down to water
      ctx.stroke();
      
      // Float/bobber
      ctx.fillStyle = '#FF4444';
      ctx.beginPath();
      ctx.arc(pondScreenX - 35, groundY - 5, 4, 0, Math.PI * 2);
      ctx.fill();
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

    // Mid background - village buildings
    ctx.fillStyle = '#A89080';
    for (let i = 0; i < 8; i++) {
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
  const screenX = char.x - this.cameraX;
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
    ctx.font = `12px ${this.uiFont}`;
    this.state.ledgerEntries.forEach((entry, i) => {
      const entryY = y + 86 + i * 32;
      ctx.fillStyle = '#5D4837';
      ctx.textAlign = 'left';
      ctx.fillText(entry.name, x + 20, entryY);
      ctx.fillText(entry.debt, x + w * 0.55, entryY);
    });

    // Empty state message
    if (this.state.ledgerEntries.length === 0) {
      ctx.font = `italic 12px ${this.uiFont}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8B7355';
      ctx.fillText('(Empty)', x + w / 2, y + 100);
    }
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
      // Speaker name - using retro font at proper size (16px per guidelines)
      ctx.font = `16px ${this.retroFont}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#C9B896';
      ctx.fillText(`[${this.state.currentDialogue.speaker}]`, 32, y + 36);

      // Dialogue text with typewriter effect - using retro font at 16-18px per guidelines
      const displayText = this.state.currentDialogue.text.substring(0, this.dialogueCharIndex);
      ctx.font = `16px ${this.retroFont}`;
      ctx.fillStyle = '#F5F5DC';

      // Word wrap - adjusted for retro font spacing with 1.6 line height
      const maxWidth = w - 100;
      const words = displayText.split(' ');
      let line = '';
      let lineY = y + 70;
      const lineHeight = 32; // 16px * 1.6 = ~26, rounded up for readability

      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line.trim(), 32, lineY);
          line = word + ' ';
          lineY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), 32, lineY);

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
        case 'loop2_got_fish':
          hint = 'Visit the Elder to settle debts...';
          break;
        case 'loop2_return':
          hint = 'Return to the Woodcutter...';
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

    // Text - using bold rounded sans-serif for button (per design guidelines)
    ctx.font = `bold 20px ${this.uiFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('INTERACT', x + size / 2, y + size / 2);
    ctx.textBaseline = 'alphabetic';

    ctx.restore();
  }

  private drawTouchZoneIndicator(ctx: CanvasRenderingContext2D): void {
    if (this.state.currentDialogue) return;

    const indicatorHeight = 32;
    const y = this.canvas.height - this.dialogueBoxHeight - indicatorHeight;
    const halfWidth = this.canvas.width / 2;

    // Left zone indicator
    ctx.fillStyle = this.moveDirection === -1 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.1)';
    ctx.fillRect(0, y, halfWidth, indicatorHeight);

    // Right zone indicator
    ctx.fillStyle = this.moveDirection === 1 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.1)';
    ctx.fillRect(halfWidth, y, halfWidth, indicatorHeight);

    // Direction arrows - using retro font
    ctx.font = `8px ${this.retroFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('< LEFT', halfWidth / 2, y + 20);
    ctx.fillText('RIGHT >', halfWidth + halfWidth / 2, y + 20);
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  public destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.resize.bind(this));
  }

  private setMood(mood: 'neutral' | 'happy' | 'angry') {
    this.state.playerMood = mood;
    this.notifyStateChange();
  }

  // Quiz questions
  private quizQuestions = [
    {
      question: "Why was the Stone-worker angry?",
      options: ["A: He forgot the deal", "B: He didn't like fish"],
      correct: 0
    },
    {
      question: "What is the main benefit of the Stone Ledger?",
      options: ["A: It's pretty", "B: It is a shared, immutable record"],
      correct: 1
    },
    {
      question: "Why did the Woodcutter trust you at the end?",
      options: ["A: Because the debt was recorded publicly", "B: Because he is nice"],
      correct: 0
    }
  ];

  private currentQuizQuestion: number = 0;
  private quizButtonAreas: { x: number; y: number; w: number; h: number; option: number }[] = [];

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
    for (const btn of this.quizButtonAreas) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        this.state.quizAnswers.push(btn.option);
        
        if (this.currentQuizQuestion < this.quizQuestions.length - 1) {
          this.currentQuizQuestion++;
        } else {
          // Quiz complete
          this.state.showQuiz = false;
          this.state.showSuccess = true;
          this.state.phase = 'complete';
        }
        break;
      }
    }
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
      woodcutterDebtRecorded: false,
      stoneWorkerDebtRecorded: false,
      ledgerEntries: [],
      dialogueQueue: [],
      currentDialogue: null,
      dialogueComplete: false,
      showInteractButton: false,
      nearbyNPC: null,
      nearbyLocation: null,
      elderEntranceProgress: 0,
      playerMood: 'neutral',
      showHUD: false,
      quizAnswers: [],
      showQuiz: false,
      showSuccess: false,
      showFail: false,
      showBrawl: false,
      brawlTimer: 0,
      showCelebration: false,
      celebrationTimer: 0,
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
    this.fisherman.x = this.fisherman.originalX || 3200;
    this.fisherman.targetX = undefined;
    
    // Trigger intro again
    setTimeout(() => this.triggerIntro(), 500);
  }

  // Start Loop 2 after fail screen
  private startLoop2(): void {
    this.player.x = 100;
    this.state = {
      phase: 'loop2_intro',
      loop: 2,
      inventory: { stone: 0, fish: 0, wood: 0, berries: 0 },
      roofRepaired: false,
      woodcutterDebtRecorded: false,
      stoneWorkerDebtRecorded: false,
      ledgerEntries: [],
      dialogueQueue: [],
      currentDialogue: null,
      dialogueComplete: false,
      showInteractButton: false,
      nearbyNPC: null,
      nearbyLocation: null,
      elderEntranceProgress: 0,
      playerMood: 'neutral',
      showHUD: false,
      quizAnswers: [],
      showQuiz: false,
      showSuccess: false,
      showFail: false,
      showBrawl: false,
      brawlTimer: 0,
      showCelebration: false,
      celebrationTimer: 0,
      showChoice: false,
      choiceOptions: []
    };
    
    // Reset NPC positions to original locations
    this.woodcutter.x = this.woodcutter.originalX || 700;
    this.woodcutter.targetX = undefined;
    this.stoneWorker.x = this.stoneWorker.originalX || 2500;
    this.stoneWorker.targetX = undefined;
    this.fisherman.x = this.fisherman.originalX || 3200;
    this.fisherman.targetX = undefined;
    
    setTimeout(() => this.triggerIntro(), 500);
  }
}
