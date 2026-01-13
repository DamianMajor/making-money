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
  phase: 'initial' | 'got_stone' | 'got_fish' | 'dispute' | 'elder_entering' | 'solution' | 'ledger_shown' | 'resolved';
  inventory: {
    stone: number;
    fish: number;
  };
  ledgerEntries: LedgerEntry[];
  dialogueQueue: DialogueLine[];
  currentDialogue: DialogueLine | null;
  dialogueComplete: boolean;
  showInteractButton: boolean;
  nearbyNPC: Character | null;
  elderEntranceProgress: number;
}

// Game Engine Class
export class VillageLedgerGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private lastTime: number = 0;
  
  // World dimensions
  private worldWidth: number = 2400;
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
    
    // Initialize player
    this.player = {
      id: 'player',
      name: 'PLAYER',
      x: 200,
      y: 0,
      width: 50,
      height: 70,
      color: '#3B82F6',
      outlineColor: '#FFFFFF',
      visible: true,
      bobOffset: 0,
      bobDirection: 1
    };
    
    // Initialize NPCs
    this.stoneWorker = {
      id: 'stoneWorker',
      name: 'STONE-WORKER',
      x: 600,
      y: 0,
      width: 50,
      height: 70,
      color: '#22C55E',
      outlineColor: '#166534',
      visible: true,
      bobOffset: 0,
      bobDirection: 1
    };
    
    this.fisherman = {
      id: 'fisherman',
      name: 'FISHERMAN',
      x: 1200,
      y: 0,
      width: 50,
      height: 70,
      color: '#F97316',
      outlineColor: '#C2410C',
      visible: true,
      bobOffset: 0,
      bobDirection: 1
    };
    
    this.villageElder = {
      id: 'villageElder',
      name: 'VILLAGE ELDER',
      x: 900,
      y: -200,
      width: 60,
      height: 85,
      color: '#F8FAFC',
      outlineColor: '#64748B',
      visible: false,
      bobOffset: 0,
      bobDirection: 1
    };
    
    this.npcs = [this.stoneWorker, this.fisherman, this.villageElder];
    
    // Initialize game state
    this.state = {
      phase: 'initial',
      inventory: { stone: 0, fish: 0 },
      ledgerEntries: [],
      dialogueQueue: [],
      currentDialogue: null,
      dialogueComplete: false,
      showInteractButton: false,
      nearbyNPC: null,
      elderEntranceProgress: 0
    };
    
    // Setup event listeners
    this.setupEventListeners();
    this.resize();
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
    
    // Check if touching interact button FIRST (before any other handling)
    if (this.state.showInteractButton && this.interactButtonOpacity > 0.5) {
      if (this.isInteractButtonTouched(x, y)) {
        this.handleInteraction();
        return;
      }
    }
    
    // Check if touching dialogue to advance
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
    if (!this.state.nearbyNPC) return;
    
    const npc = this.state.nearbyNPC;
    
    if (npc.id === 'stoneWorker') {
      this.handleStoneWorkerInteraction();
    } else if (npc.id === 'fisherman') {
      this.handleFishermanInteraction();
    } else if (npc.id === 'villageElder') {
      this.handleElderInteraction();
    }
    
    this.notifyStateChange();
  }
  
  private handleStoneWorkerInteraction(): void {
    if (this.state.phase === 'initial') {
      this.queueDialogue([
        {
          speaker: 'STONE-WORKER',
          text: "I'll give you the stone, but you owe me a fish later. I'll remember.",
          onComplete: () => {
            this.state.inventory.stone = 1;
            this.state.phase = 'got_stone';
            this.showInventoryPopup('+1 STONE');
          }
        }
      ]);
    } else if (this.state.phase === 'got_stone') {
      // Player has stone but no fish yet - remind them
      this.queueDialogue([
        {
          speaker: 'STONE-WORKER',
          text: "You still owe me a fish! Go see the Fisherman to the east."
        }
      ]);
    } else if (this.state.phase === 'got_fish') {
      this.queueDialogue([
        {
          speaker: 'STONE-WORKER',
          text: "Wait! I remember saying I wanted TWO fish. And that fish is too small. You still owe me!",
          onComplete: () => {
            this.state.phase = 'dispute';
            // Trigger elder entrance immediately after dispute dialogue
            this.state.phase = 'elder_entering';
            this.villageElder.visible = true;
          }
        }
      ]);
    } else if (this.state.phase === 'ledger_shown') {
      this.queueDialogue([
        {
          speaker: 'STONE-WORKER',
          text: "The stone does not forget. I see the record. The deal is settled.",
          onComplete: () => {
            this.state.phase = 'resolved';
          }
        }
      ]);
    }
  }
  
  private handleFishermanInteraction(): void {
    if (this.state.phase === 'got_stone') {
      this.queueDialogue([
        {
          speaker: 'FISHERMAN',
          text: "Here is your Fish. Go settle your debt.",
          onComplete: () => {
            this.state.inventory.fish = 1;
            this.state.phase = 'got_fish';
            this.showInventoryPopup('+1 FISH');
          }
        }
      ]);
    } else if (this.state.phase === 'initial') {
      this.queueDialogue([
        {
          speaker: 'FISHERMAN',
          text: "You look like you need something. Talk to the Stone-worker to the west first!"
        }
      ]);
    } else if (this.state.phase === 'got_fish') {
      this.queueDialogue([
        {
          speaker: 'FISHERMAN',
          text: "You already have a fish. Go settle your debt with the Stone-worker!"
        }
      ]);
    }
  }
  
  private handleElderInteraction(): void {
    if (this.state.phase === 'solution') {
      this.queueDialogue([
        {
          speaker: 'VILLAGE ELDER',
          text: "The Stone Tablet will keep our records. Look at it now - the truth is preserved.",
          onComplete: () => {
            this.state.ledgerEntries = [{ name: 'PLAYER', debt: '1 FISH' }];
            this.state.phase = 'ledger_shown';
            this.hudGlow = 1;
          }
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
    
    this.npcs.forEach(npc => {
      if (npc.id !== 'villageElder') {
        npc.y = groundY - npc.height;
      }
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
    
    // Update NPC bobs
    this.npcs.forEach((npc, i) => {
      npc.bobOffset = Math.sin(this.bobTimer * 0.5 + i * 1.5) * 1.5;
    });
    
    // Update camera
    this.cameraTargetX = this.player.x - this.canvas.width / 2;
    this.cameraTargetX = Math.max(0, Math.min(this.worldWidth - this.canvas.width, this.cameraTargetX));
    this.cameraX += (this.cameraTargetX - this.cameraX) * this.cameraSmoothing;
    
    // Check NPC proximity
    this.state.nearbyNPC = null;
    this.state.showInteractButton = false;
    
    for (const npc of this.npcs) {
      if (!npc.visible) continue;
      const dist = Math.abs(this.player.x - npc.x);
      if (dist < 200) { // Large range for tablet-friendly interaction
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
    
    // Update elder entrance
    if (this.state.phase === 'elder_entering') {
      this.state.elderEntranceProgress += dt * 1.2;
      
      const groundY = this.canvas.height - this.groundHeight - this.dialogueBoxHeight;
      const startY = -200;
      const endY = groundY - this.villageElder.height;
      
      // Ease out animation
      const t = Math.min(1, this.state.elderEntranceProgress);
      const easeOut = 1 - Math.pow(1 - t, 3);
      this.villageElder.y = startY + (endY - startY) * easeOut;
      
      // Center elder between player and stone worker
      const centerX = (this.player.x + this.stoneWorker.x) / 2;
      this.villageElder.x = centerX;
      
      if (t >= 1) {
        this.state.phase = 'solution';
        this.queueDialogue([
          {
            speaker: 'VILLAGE ELDER',
            text: "Stop! There have been too many disputes in our village lately. Nobody's memory can be trusted.",
          },
          {
            speaker: 'VILLAGE ELDER',
            text: "From now on, we use this Stone Tablet to keep records.",
            onComplete: () => {
              this.state.ledgerEntries = [{ name: 'PLAYER', debt: '1 FISH' }];
              this.state.phase = 'ledger_shown';
              this.hudGlow = 1;
            }
          }
        ]);
      }
    }
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
    
    // Draw NPCs
    this.npcs.forEach(npc => {
      if (npc.visible) {
        this.drawCharacter(ctx, npc);
      }
    });
    
    // Draw player
    this.drawCharacter(ctx, this.player);
    
    // Draw inventory popup
    if (this.inventoryPopup) {
      this.drawInventoryPopup(ctx);
    }
    
    // Draw UI elements
    this.drawStoneTabletHUD(ctx);
    this.drawDialogueBox(ctx);
    this.drawInteractButton(ctx);
    this.drawTouchZoneIndicator(ctx);
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
    
    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(screenX, char.y + char.height + 5, char.width * 0.4, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw character body
    ctx.fillStyle = char.color;
    ctx.strokeStyle = char.outlineColor;
    ctx.lineWidth = 3;
    
    // Rounded rectangle
    const radius = 6;
    const x = screenX - char.width / 2;
    const y = screenY;
    
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + char.width - radius, y);
    ctx.quadraticCurveTo(x + char.width, y, x + char.width, y + radius);
    ctx.lineTo(x + char.width, y + char.height - radius);
    ctx.quadraticCurveTo(x + char.width, y + char.height, x + char.width - radius, y + char.height);
    ctx.lineTo(x + radius, y + char.height);
    ctx.quadraticCurveTo(x, y + char.height, x, y + char.height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw face indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x + 10, y + 12, 8, 8);
    ctx.fillRect(x + char.width - 18, y + 12, 8, 8);
    
    // Draw name label for NPCs - using retro font
    if (char.id !== 'player') {
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
      switch (this.state.phase) {
        case 'initial':
          hint = 'Find the Stone-worker...';
          break;
        case 'got_stone':
          hint = 'Visit the Fisherman...';
          break;
        case 'got_fish':
          hint = 'Return to Stone-worker...';
          break;
        case 'ledger_shown':
          hint = 'Talk to Stone-worker...';
          break;
        case 'resolved':
          hint = 'Dispute settled!';
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
}
