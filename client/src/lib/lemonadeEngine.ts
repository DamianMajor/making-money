export type ScreenType = 'TITLE' | 'NAME_INPUT' | 'INTRO' | 'MAP' | 'VISITING' | 'NOTEBOOK' | 'HAMSTER_CATCH' | 'CELEBRATION' | 'QUIZ' | 'BADGE' | 'COMPLETE';

export interface Discovery {
  has: string;
  wants: string;
  canHelp: boolean;
  traded: boolean;
}

interface GameState {
  screen: ScreenType;
  playerName: string;
  currentNeighbor: string | null;
  dialogueIndex: number;
  dialogueCharIndex: number;
  discoveries: Map<string, Discovery>;
  quizAnswers: boolean[];
  currentQuizQuestion: number;
  introPage: number;
  animationTimers: Map<string, number>;
  visitedNeighbors: Set<string>;
  tradeAttempted: Set<string>;
  fadeAlpha: number;
  fadeDirection: 'in' | 'out' | null;
  fadeTarget: ScreenType | null;
  choiceVisible: boolean;
  choiceSelected: number;
  dialogueComplete: boolean;
  celebrationLemons: Array<{ x: number; y: number; vx: number; vy: number; r: number; rot: number; rotSpeed: number }>;
  confettiParticles: Array<{ x: number; y: number; vx: number; vy: number; color: string; size: number; rot: number }>;
  quizFeedback: 'correct' | 'wrong' | null;
  quizFeedbackTimer: number;
  badgeScale: number;
  badgeSparkles: Array<{ x: number; y: number; size: number; alpha: number; speed: number }>;
  clouds: Array<{ x: number; y: number; w: number; h: number; speed: number }>;
  notebookSparkleTimer: number;
  hamsterX: number;
  hamsterY: number;
  hamsterTargetX: number;
  hamsterTargetY: number;
  hamsterCatches: number;
  hamsterState: 'idle' | 'running' | 'caught' | 'escaped';
  hamsterTimer: number;
  hamsterReaction: string;
  hamsterReactionTimer: number;
  hamsterBushes: Array<{ x: number; y: number; w: number; h: number }>;
}

interface DialogueLine {
  speaker: string;
  text: string;
  isChoice?: boolean;
  choices?: Array<{ text: string; action: string }>;
}

interface Neighbor {
  id: string;
  name: string;
  houseX: number;
  houseY: number;
  houseW: number;
  houseH: number;
  wallColor: string;
  roofColor: string;
  has: string;
  wants: string;
  canHelp: boolean;
  dialogue: DialogueLine[];
  tradeDialogue: DialogueLine[];
  failDialogue: DialogueLine[];
  successDialogue: DialogueLine[];
  skinColor: string;
  hairColor: string;
  accessory: string;
}

interface HitArea {
  x: number;
  y: number;
  w: number;
  h: number;
  id: string;
}

const DESIGN_W = 800;
const DESIGN_H = 500;

const COLORS = {
  grass: '#7BC950',
  grassDark: '#5EA63B',
  path: '#E8DCC8',
  pathDark: '#D4C8B0',
  sky: '#87CEEB',
  uiPanel: '#FFF8E1',
  dialogueBg: '#FFF8E1',
  dialogueBorder: '#5D4037',
  btnPrimary: '#FF7043',
  btnSuccess: '#66BB6A',
  btnHover: '#FF8A65',
  text: '#3E2723',
  textLight: '#5D4037',
  textMuted: '#8D6E63',
  white: '#FFFFFF',
  black: '#000000',
  lemon: '#FDD835',
  lemonDark: '#F9A825',
  garciWall: '#FFD54F',
  garciaRoof: '#E53935',
  thompsonWall: '#78909C',
  thompsonRoof: '#5D4037',
  twinsWall: '#AB47BC',
  twinsRoof: '#FF7043',
  playerWall: '#81C784',
  playerRoof: '#FAFAFA',
  notebookBg: '#FFF9C4',
  notebookLine: '#90CAF9',
  gold: '#FFD700',
  confettiColors: ['#FF7043', '#66BB6A', '#42A5F5', '#FDD835', '#AB47BC', '#FF8A65'],
};

const NEIGHBORS: Neighbor[] = [
  {
    id: 'garcia',
    name: 'Mrs. Garcia',
    houseX: 80,
    houseY: 60,
    houseW: 140,
    houseH: 100,
    wallColor: COLORS.garciWall,
    roofColor: COLORS.garciaRoof,
    has: 'Lemons',
    wants: 'Flower watering',
    canHelp: false,
    skinColor: '#D2A679',
    hairColor: '#9E9E9E',
    accessory: 'glasses',
    dialogue: [
      { speaker: 'You', text: "Hi Mrs. Garcia! I'm trying to start a lemonade stand. Do you have any lemons?" },
      { speaker: 'Mrs. Garcia', text: "Oh hello dear! I have the BIGGEST lemon tree on the whole block!" },
      { speaker: 'You', text: "That's amazing! Could I have some? I can rake your leaves in exchange!" },
      { speaker: 'Mrs. Garcia', text: "Oh sweetie, I don't need raking! Look at my yard - not a leaf in sight!" },
      { speaker: 'Mrs. Garcia', text: "My poor flowers are dying of thirst though... I hurt my wrist and can't water them." },
      { speaker: 'You', text: "Hmm... I only know how to rake leaves. I don't have a watering can..." },
      { speaker: 'Mrs. Garcia', text: "That's okay, dear. If you find someone who can water flowers, send them my way!" },
    ],
    tradeDialogue: [
      { speaker: '', text: '', isChoice: true, choices: [
        { text: 'Offer to rake her leaves', action: 'fail' },
        { text: 'Maybe later', action: 'back' },
      ]},
    ],
    failDialogue: [
      { speaker: 'Mrs. Garcia', text: "That's so kind, but I really don't need raking, sweetie!" },
      { speaker: 'Mrs. Garcia', text: "What I REALLY need is someone to water my flowers..." },
      { speaker: 'You', text: "(She has lemons but doesn't need what I can do. Bummer!)" },
    ],
    successDialogue: [],
  },
  {
    id: 'thompson',
    name: 'Mr. Thompson',
    houseX: 560,
    houseY: 60,
    houseW: 140,
    houseH: 100,
    wallColor: COLORS.thompsonWall,
    roofColor: COLORS.thompsonRoof,
    has: 'Nothing you need',
    wants: 'Leaf raking',
    canHelp: false,
    skinColor: '#C8956C',
    hairColor: '#4E342E',
    accessory: 'mustache',
    dialogue: [
      { speaker: 'You', text: "Hi Mr. Thompson! Do you have any lemons? I want to start a lemonade stand!" },
      { speaker: 'Mr. Thompson', text: "Lemons?! Do I LOOK like a lemon farmer to you, kid?" },
      { speaker: 'Mr. Thompson', text: "All I've got is this yard full of leaves. They're EVERYWHERE!" },
      { speaker: 'You', text: "Oh! I can rake leaves! Want me to help?" },
      { speaker: 'Mr. Thompson', text: "Now you're talking! These leaves aren't gonna rake themselves!" },
      { speaker: 'Mr. Thompson', text: "But I don't have any lemons to give you. Sorry, kid." },
      { speaker: 'You', text: "(He wants exactly what I can do... but doesn't have what I need!)" },
    ],
    tradeDialogue: [
      { speaker: '', text: '', isChoice: true, choices: [
        { text: 'Offer to rake his leaves', action: 'fail' },
        { text: 'Maybe later', action: 'back' },
      ]},
    ],
    failDialogue: [
      { speaker: 'Mr. Thompson', text: "I'd love the help, kid! But I still don't have any lemons for you." },
      { speaker: 'Mr. Thompson', text: "Tell you what - if you ever just want to help out, come back anytime." },
      { speaker: 'You', text: "(He needs my help but has nothing I need. This is tricky!)" },
    ],
    successDialogue: [],
  },
  {
    id: 'twins',
    name: 'Zoe & Max',
    houseX: 560,
    houseY: 250,
    houseW: 140,
    houseH: 100,
    wallColor: COLORS.twinsWall,
    roofColor: COLORS.twinsRoof,
    has: 'Lemons',
    wants: 'Help catching hamster',
    canHelp: true,
    skinColor: '#FFCC80',
    hairColor: '#FF8F00',
    accessory: 'cap',
    dialogue: [
      { speaker: 'Zoe', text: "HELP! HELP! HELP! This is a DISASTER!" },
      { speaker: 'Max', text: "Sir Squeaks got out of his cage AGAIN!" },
      { speaker: 'You', text: "Sir Squeaks? Who's that?" },
      { speaker: 'Zoe', text: "Our hamster! He's the BEST hamster in the world and he ESCAPED!" },
      { speaker: 'Max', text: "We've been chasing him everywhere! He's so fast!" },
      { speaker: 'You', text: "I'm actually looking for lemons. Do you have any?" },
      { speaker: 'Zoe', text: "We have a HUGE lemon tree! You can have ALL the lemons you want!" },
      { speaker: 'Max', text: "But ONLY if you help us catch Sir Squeaks first!" },
    ],
    tradeDialogue: [
      { speaker: '', text: '', isChoice: true, choices: [
        { text: 'Help catch Sir Squeaks!', action: 'success' },
        { text: 'Maybe later', action: 'back' },
      ]},
    ],
    failDialogue: [],
    successDialogue: [
      { speaker: 'Zoe', text: "YOU CAUGHT HIM! You're AMAZING!" },
      { speaker: 'Max', text: "Sir Squeaks is back in his cage. Safe and sound!" },
      { speaker: 'Zoe', text: "A deal's a deal! Here, take ALL the lemons you want!" },
      { speaker: 'Max', text: "Sir Squeaks says thank you too! ...I think. He's just squeaking." },
      { speaker: 'You', text: "LEMONS! Finally! My lemonade stand is going to be AMAZING!" },
    ],
  },
];

const QUIZ_QUESTIONS = [
  {
    question: "Why couldn't you trade with Mrs. Garcia?",
    options: [
      'She was mean',
      'She had lemons but didn\'t need your help',
      'She didn\'t have lemons',
    ],
    correct: 1,
  },
  {
    question: "What does 'Double Coincidence of Wants' mean?",
    options: [
      'Both people want the same thing',
      'Both people have what the other person wants',
      'Two people want to be friends',
    ],
    correct: 1,
  },
];

export class LemonadeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private scaleX: number = 1;
  private scaleY: number = 1;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private state: GameState;
  private hitAreas: HitArea[] = [];
  private hiddenInput: HTMLInputElement | null = null;
  private onNameSubmit: ((name: string) => void) | null = null;
  private globalTime: number = 0;
  private elapsed: number = 0;
  private boundHandleInput: (e: MouseEvent | TouchEvent) => void;
  private boundHandleResize: () => void;
  private playerMapX: number = 400;
  private playerMapY: number = 400;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.state = this.createInitialState();
    this.boundHandleInput = this.handleInput.bind(this);
    this.boundHandleResize = this.handleResize.bind(this);
    this.setupEventListeners();
    this.createHiddenInput();
    this.handleResize();
  }

  private createInitialState(): GameState {
    return {
      screen: 'TITLE',
      playerName: '',
      currentNeighbor: null,
      dialogueIndex: 0,
      dialogueCharIndex: 0,
      discoveries: new Map(),
      quizAnswers: [],
      currentQuizQuestion: 0,
      introPage: 0,
      animationTimers: new Map(),
      visitedNeighbors: new Set(),
      tradeAttempted: new Set(),
      fadeAlpha: 0,
      fadeDirection: null,
      fadeTarget: null,
      choiceVisible: false,
      choiceSelected: -1,
      dialogueComplete: false,
      celebrationLemons: [],
      confettiParticles: [],
      quizFeedback: null,
      quizFeedbackTimer: 0,
      badgeScale: 0,
      badgeSparkles: [],
      clouds: [
        { x: 50, y: 30, w: 90, h: 30, speed: 12 },
        { x: 250, y: 55, w: 70, h: 22, speed: 8 },
        { x: 500, y: 20, w: 100, h: 35, speed: 15 },
        { x: 700, y: 45, w: 80, h: 25, speed: 10 },
      ],
      notebookSparkleTimer: 0,
      hamsterX: 400,
      hamsterY: 250,
      hamsterTargetX: 400,
      hamsterTargetY: 250,
      hamsterCatches: 0,
      hamsterState: 'idle' as const,
      hamsterTimer: 0,
      hamsterReaction: '',
      hamsterReactionTimer: 0,
      hamsterBushes: [
        { x: 80, y: 100, w: 70, h: 50 },
        { x: 600, y: 80, w: 80, h: 55 },
        { x: 150, y: 320, w: 75, h: 50 },
        { x: 550, y: 300, w: 70, h: 45 },
        { x: 350, y: 380, w: 65, h: 50 },
      ],
    };
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.boundHandleInput);
    this.canvas.addEventListener('touchstart', this.boundHandleInput, { passive: false });
    window.addEventListener('resize', this.boundHandleResize);
  }

  private createHiddenInput(): void {
    this.hiddenInput = document.createElement('input');
    this.hiddenInput.type = 'text';
    this.hiddenInput.maxLength = 20;
    this.hiddenInput.autocomplete = 'off';
    this.hiddenInput.style.position = 'absolute';
    this.hiddenInput.style.left = '-9999px';
    this.hiddenInput.style.top = '-9999px';
    this.hiddenInput.style.opacity = '0';
    this.hiddenInput.style.fontSize = '16px';
    document.body.appendChild(this.hiddenInput);
    this.hiddenInput.addEventListener('input', () => {
      if (this.hiddenInput) {
        this.state.playerName = this.hiddenInput.value.slice(0, 20);
      }
    });
    this.hiddenInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && this.state.playerName.length > 0) {
        this.submitName();
      }
    });
  }

  private handleResize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const pw = parent.clientWidth;
    const ph = parent.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = pw * dpr;
    this.canvas.height = ph * dpr;
    this.canvas.style.width = pw + 'px';
    this.canvas.style.height = ph + 'px';
    const scaleX = (pw * dpr) / DESIGN_W;
    const scaleY = (ph * dpr) / DESIGN_H;
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = ((pw * dpr) - DESIGN_W * this.scale) / 2;
    this.offsetY = ((ph * dpr) - DESIGN_H * this.scale) / 2;
    this.scaleX = scaleX;
    this.scaleY = scaleY;
  }

  start(): void {
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.canvas.removeEventListener('mousedown', this.boundHandleInput);
    this.canvas.removeEventListener('touchstart', this.boundHandleInput);
    window.removeEventListener('resize', this.boundHandleResize);
    if (this.hiddenInput && this.hiddenInput.parentNode) {
      this.hiddenInput.parentNode.removeChild(this.hiddenInput);
    }
  }

  setPlayerName(name: string): void {
    this.state.playerName = name;
    if (this.hiddenInput) this.hiddenInput.value = name;
  }

  onNameSubmitCallback(cb: (name: string) => void): void {
    this.onNameSubmit = cb;
  }

  private submitName(): void {
    if (this.state.playerName.length > 0) {
      if (this.onNameSubmit) this.onNameSubmit(this.state.playerName);
      this.transitionTo('INTRO');
    }
  }

  private transitionTo(screen: ScreenType): void {
    this.state.fadeDirection = 'out';
    this.state.fadeTarget = screen;
    this.state.fadeAlpha = 0;
  }

  private completeTransition(): void {
    if (this.state.fadeTarget) {
      const target = this.state.fadeTarget;
      this.state.screen = target;
      this.state.fadeTarget = null;
      this.state.fadeDirection = 'in';
      this.state.fadeAlpha = 1;
      if (target === 'INTRO') {
        this.state.introPage = 0;
      } else if (target === 'CELEBRATION') {
        this.spawnCelebrationLemons();
      } else if (target === 'BADGE') {
        this.state.badgeScale = 0;
        this.spawnBadgeSparkles();
      } else if (target === 'QUIZ') {
        this.state.currentQuizQuestion = 0;
        this.state.quizAnswers = [];
        this.state.quizFeedback = null;
      }
    }
  }

  private gameLoop(time: number): void {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    this.globalTime += dt;
    this.update(dt);
    this.render();
    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  private update(dt: number): void {
    this.elapsed += dt;
    if (this.state.fadeDirection === 'out') {
      this.state.fadeAlpha += dt * 3;
      if (this.state.fadeAlpha >= 1) {
        this.state.fadeAlpha = 1;
        this.completeTransition();
      }
    } else if (this.state.fadeDirection === 'in') {
      this.state.fadeAlpha -= dt * 3;
      if (this.state.fadeAlpha <= 0) {
        this.state.fadeAlpha = 0;
        this.state.fadeDirection = null;
      }
    }

    if (this.state.screen === 'VISITING' && !this.state.dialogueComplete && !this.state.choiceVisible) {
      const neighbor = this.getCurrentNeighbor();
      if (neighbor) {
        const lines = this.getCurrentDialogueLines();
        if (this.state.dialogueIndex < lines.length) {
          const line = lines[this.state.dialogueIndex];
          if (line.isChoice) {
            this.state.choiceVisible = true;
          } else {
            this.state.dialogueCharIndex += dt * 16;
          }
        }
      }
    }

    if (this.state.screen === 'CELEBRATION') {
      for (const lemon of this.state.celebrationLemons) {
        lemon.x += lemon.vx * dt;
        lemon.y += lemon.vy * dt;
        lemon.vy += 300 * dt;
        lemon.rot += lemon.rotSpeed * dt;
        if (lemon.y > DESIGN_H - 30) {
          lemon.y = DESIGN_H - 30;
          lemon.vy = -lemon.vy * 0.6;
        }
        if (lemon.x < 10) lemon.vx = Math.abs(lemon.vx);
        if (lemon.x > DESIGN_W - 10) lemon.vx = -Math.abs(lemon.vx);
      }
    }

    if (this.state.screen === 'BADGE') {
      if (this.state.badgeScale < 1) {
        this.state.badgeScale += dt * 2;
        if (this.state.badgeScale > 1) this.state.badgeScale = 1;
      }
      for (const s of this.state.badgeSparkles) {
        s.alpha -= dt * s.speed;
        s.y -= dt * 20;
      }
      this.state.badgeSparkles = this.state.badgeSparkles.filter(s => s.alpha > 0);
      if (Math.random() < dt * 5 && this.state.badgeScale >= 1) {
        this.spawnBadgeSparkles();
      }
    }

    for (const cloud of this.state.clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x > DESIGN_W + cloud.w) {
        cloud.x = -cloud.w;
      }
    }

    if (this.state.notebookSparkleTimer > 0) {
      this.state.notebookSparkleTimer -= dt;
      if (this.state.notebookSparkleTimer < 0) this.state.notebookSparkleTimer = 0;
    }

    if (this.state.screen === 'HAMSTER_CATCH') {
      if (this.state.hamsterReactionTimer > 0) {
        this.state.hamsterReactionTimer -= dt;
        if (this.state.hamsterReactionTimer <= 0) {
          this.state.hamsterReaction = '';
          if (this.state.hamsterState === 'caught') {
            if (this.state.hamsterCatches >= 3) {
              this.state.dialogueIndex = 0;
              this.state.dialogueCharIndex = 0;
              this.state.currentNeighbor = 'twins';
              this.currentDialogueMode = 'success';
              this.transitionTo('VISITING');
            } else {
              this.state.hamsterState = 'running';
              this.pickNewHamsterTarget();
            }
          }
        }
      }

      if (this.state.hamsterState === 'running') {
        this.state.hamsterTimer += dt;
        const speed = 180 + this.state.hamsterCatches * 40;
        const dx = this.state.hamsterTargetX - this.state.hamsterX;
        const dy = this.state.hamsterTargetY - this.state.hamsterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) {
          this.state.hamsterState = 'idle';
          this.state.hamsterTimer = 0;
        } else {
          this.state.hamsterX += (dx / dist) * speed * dt;
          this.state.hamsterY += (dy / dist) * speed * dt;
        }
      }

      if (this.state.hamsterState === 'idle') {
        this.state.hamsterTimer += dt;
        if (this.state.hamsterTimer > 0.5 + Math.random() * 0.8) {
          this.state.hamsterState = 'running';
          this.pickNewHamsterTarget();
        }
      }
    }

    if (this.state.quizFeedback) {
      this.state.quizFeedbackTimer += dt;
      if (this.state.quizFeedback === 'correct' && this.state.quizFeedbackTimer > 1.2) {
        this.state.quizFeedback = null;
        this.state.quizFeedbackTimer = 0;
        this.state.currentQuizQuestion++;
        if (this.state.currentQuizQuestion >= QUIZ_QUESTIONS.length) {
          this.transitionTo('BADGE');
        }
      }
      if (this.state.quizFeedback === 'wrong' && this.state.quizFeedbackTimer > 1.0) {
        this.state.quizFeedback = null;
        this.state.quizFeedbackTimer = 0;
      }

      if (this.state.quizFeedback === 'correct') {
        for (const p of this.state.confettiParticles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 200 * dt;
          p.rot += 3 * dt;
        }
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    switch (this.state.screen) {
      case 'TITLE': this.renderTitle(ctx); break;
      case 'NAME_INPUT': this.renderNameInput(ctx); break;
      case 'INTRO': this.renderIntro(ctx); break;
      case 'MAP': this.renderMap(ctx); break;
      case 'VISITING': this.renderMap(ctx); this.renderDialogue(ctx); break;
      case 'NOTEBOOK': this.renderNotebook(ctx); break;
      case 'HAMSTER_CATCH': this.renderHamsterCatch(ctx); break;
      case 'CELEBRATION': this.renderCelebration(ctx); break;
      case 'QUIZ': this.renderQuiz(ctx); break;
      case 'BADGE': this.renderBadge(ctx); break;
      case 'COMPLETE': this.renderComplete(ctx); break;
    }

    if (this.state.fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.state.fadeAlpha})`;
      ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
    }

    ctx.restore();
  }

  private renderTitle(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, 0, DESIGN_H);
    grad.addColorStop(0, '#FFE082');
    grad.addColorStop(1, '#FFB74D');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);

    for (let i = 0; i < 6; i++) {
      const x = 100 + i * 120;
      const y = 30 + Math.sin(this.globalTime * 2 + i) * 5;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(x, y, 15 + Math.sin(this.globalTime + i) * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawLemonadeStand(ctx, 340, 100, 120, 120);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.fillStyle = COLORS.text;
    const titleY = 270;
    const letters = 'MAKING MONEY'.split('');
    let tx = 400 - (letters.length * 22) / 2;
    for (let i = 0; i < letters.length; i++) {
      ctx.save();
      const angle = Math.sin(this.globalTime * 3 + i * 0.5) * 0.05;
      const ly = titleY + Math.sin(this.globalTime * 2 + i * 0.8) * 3;
      ctx.translate(tx + i * 22, ly);
      ctx.rotate(angle);
      ctx.fillStyle = i % 2 === 0 ? COLORS.text : '#D84315';
      ctx.fillText(letters[i], 0, 0);
      ctx.restore();
    }

    ctx.font = '20px Arial, sans-serif';
    ctx.fillStyle = COLORS.textLight;
    ctx.fillText('The Lemonade Stand', 400, 310);

    const pulse = 1 + Math.sin(this.globalTime * 3) * 0.05;
    ctx.save();
    ctx.translate(400, 380);
    ctx.scale(pulse, pulse);
    this.drawRoundedRect(ctx, -80, -25, 160, 50, 12);
    ctx.fillStyle = COLORS.btnPrimary;
    ctx.fill();
    ctx.strokeStyle = '#E64A19';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PLAY', 0, 0);
    ctx.restore();

    ctx.font = '14px Arial, sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = 'center';
    ctx.fillText('Chapter 1: The Trade', 400, 440);
    ctx.restore();

    this.hitAreas = [{ x: 320, y: 355, w: 160, h: 50, id: 'play' }];
  }

  private renderNameInput(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, 0, DESIGN_H);
    grad.addColorStop(0, '#E1F5FE');
    grad.addColorStop(1, '#B3E5FC');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.fillText("What's your name?", 400, 150);

    this.drawRoundedRect(ctx, 250, 210, 300, 50, 8);
    ctx.fillStyle = COLORS.white;
    ctx.fill();
    ctx.strokeStyle = COLORS.dialogueBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    const name = this.state.playerName;
    ctx.font = '22px Arial, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    const cursorBlink = Math.sin(this.globalTime * 4) > 0;
    const displayText = name + (cursorBlink ? '|' : '');
    ctx.fillText(displayText, 265, 235);

    if (name.length === 0) {
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText('Type your name...', 265, 235);
    }

    if (name.length > 0) {
      ctx.textAlign = 'center';
      const pulse = 1 + Math.sin(this.globalTime * 3) * 0.03;
      ctx.save();
      ctx.translate(400, 320);
      ctx.scale(pulse, pulse);
      this.drawRoundedRect(ctx, -80, -22, 160, 44, 10);
      ctx.fillStyle = COLORS.btnSuccess;
      ctx.fill();
      ctx.strokeStyle = '#43A047';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.fillStyle = COLORS.white;
      ctx.fillText("Let's Go!", 0, 0);
      ctx.restore();
    }

    ctx.restore();

    this.hitAreas = [
      { x: 250, y: 210, w: 300, h: 50, id: 'nameInput' },
    ];
    if (name.length > 0) {
      this.hitAreas.push({ x: 320, y: 298, w: 160, h: 44, id: 'nameSubmit' });
    }
  }

  private renderIntro(ctx: CanvasRenderingContext2D): void {
    const pages = [
      {
        text: `Hi ${this.state.playerName}! It's a beautiful sunny day.`,
        draw: (c: CanvasRenderingContext2D) => {
          const grad = c.createLinearGradient(0, 0, 0, DESIGN_H);
          grad.addColorStop(0, COLORS.sky);
          grad.addColorStop(1, '#C8E6C9');
          c.fillStyle = grad;
          c.fillRect(0, 0, DESIGN_W, DESIGN_H);
          c.fillStyle = '#FDD835';
          c.beginPath();
          c.arc(650, 80, 50, 0, Math.PI * 2);
          c.fill();
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + this.globalTime;
            c.strokeStyle = '#FDD835';
            c.lineWidth = 3;
            c.beginPath();
            c.moveTo(650 + Math.cos(angle) * 55, 80 + Math.sin(angle) * 55);
            c.lineTo(650 + Math.cos(angle) * 70, 80 + Math.sin(angle) * 70);
            c.stroke();
          }
          for (let i = 0; i < 4; i++) {
            this.drawTree(c, 100 + i * 180, 300 + (i % 2) * 30, 30 + i * 5);
          }
          c.fillStyle = COLORS.grass;
          c.fillRect(0, 350, DESIGN_W, 150);
        }
      },
      {
        text: `You have a GREAT idea... a LEMONADE STAND!`,
        draw: (c: CanvasRenderingContext2D) => {
          const grad = c.createLinearGradient(0, 0, 0, DESIGN_H);
          grad.addColorStop(0, '#FFF9C4');
          grad.addColorStop(1, '#FFF176');
          c.fillStyle = grad;
          c.fillRect(0, 0, DESIGN_W, DESIGN_H);
          this.drawLemonadeStand(c, 300, 150, 200, 200);
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + this.globalTime * 2;
            const dist = 140 + Math.sin(this.globalTime * 3 + i) * 20;
            const sx = 400 + Math.cos(angle) * dist;
            const sy = 250 + Math.sin(angle) * dist;
            this.drawSparkle(c, sx, sy, 4 + Math.sin(this.globalTime + i) * 2);
          }
        }
      },
      {
        text: `But first, you need LEMONS! Let's ask the neighbors.`,
        draw: (c: CanvasRenderingContext2D) => {
          const grad = c.createLinearGradient(0, 0, 0, DESIGN_H);
          grad.addColorStop(0, '#C8E6C9');
          grad.addColorStop(1, '#A5D6A7');
          c.fillStyle = grad;
          c.fillRect(0, 0, DESIGN_W, DESIGN_H);
          const bounce = Math.sin(this.globalTime * 3) * 10;
          this.drawLemon(c, 360, 180 + bounce, 50);
          c.font = 'bold 60px Arial, sans-serif';
          c.fillStyle = COLORS.text;
          c.textAlign = 'center';
          c.fillText('?', 440, 200 + bounce);
          c.fillStyle = COLORS.textMuted;
          c.font = '16px Arial, sans-serif';
          c.fillText('Tap to continue', 400, 460);
        }
      },
    ];

    const page = pages[this.state.introPage];
    if (page) {
      page.draw(ctx);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      this.drawRoundedRect(ctx, 50, 380, 700, 80, 12);
      ctx.fillStyle = 'rgba(255,248,225,0.95)';
      ctx.fill();
      ctx.strokeStyle = COLORS.dialogueBorder;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.fillText(page.text, 400, 420);

      const tapAlpha = (Math.sin(this.globalTime * 3) + 1) / 2;
      ctx.globalAlpha = tapAlpha;
      ctx.font = '14px Arial, sans-serif';
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText('Tap to continue', 400, 475);
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    this.hitAreas = [{ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, id: 'introAdvance' }];
  }

  private renderMap(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);

    ctx.fillStyle = COLORS.grassDark;
    for (let i = 0; i < 20; i++) {
      const gx = (i * 137 + 23) % DESIGN_W;
      const gy = (i * 89 + 47) % DESIGN_H;
      ctx.beginPath();
      ctx.arc(gx, gy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const cloud of this.state.clouds) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.ellipse(cloud.x + cloud.w / 2, cloud.y + cloud.h / 2, cloud.w / 2, cloud.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cloud.x + cloud.w * 0.3, cloud.y + cloud.h * 0.6, cloud.w * 0.3, cloud.h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cloud.x + cloud.w * 0.7, cloud.y + cloud.h * 0.55, cloud.w * 0.35, cloud.h * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    this.drawPaths(ctx);
    this.drawDecorations(ctx);

    for (const n of NEIGHBORS) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(n.houseX + n.houseW / 2, n.houseY + n.houseH + 5, n.houseW * 0.45, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      this.drawHouse(ctx, n);
    }

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(400, 455, 55, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.drawPlayerHouse(ctx);
    const playerBob = Math.sin(this.globalTime * 2.5) * 2.5;
    this.drawPlayerCharacter(ctx, this.playerMapX, this.playerMapY + playerBob);

    ctx.save();
    ctx.textAlign = 'right';
    const nbX = DESIGN_W - 20;
    const nbY = 20;
    const nbW = 50;
    const nbH = 50;
    const nbPulse = 1 + Math.sin(this.globalTime * 2) * 0.05;
    ctx.save();
    ctx.translate(nbX - nbW / 2, nbY + nbH / 2);
    ctx.scale(nbPulse, nbPulse);
    this.drawRoundedRect(ctx, -nbW / 2, -nbH / 2, nbW, nbH, 8);
    ctx.fillStyle = COLORS.notebookBg;
    ctx.fill();
    ctx.strokeStyle = '#F57F17';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '24px Arial, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\uD83D\uDCD3', 0, 0);
    ctx.restore();
    if (this.state.notebookSparkleTimer > 0) {
      const sparkleAlpha = Math.min(1, this.state.notebookSparkleTimer * 2) * ((Math.sin(this.globalTime * 10) + 1) / 2);
      const sparkleRot = this.globalTime * 4;
      ctx.save();
      ctx.translate(nbX - 5, nbY + 5);
      ctx.rotate(sparkleRot);
      ctx.globalAlpha = sparkleAlpha;
      this.drawSparkle(ctx, 0, 0, 6);
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.save();
      ctx.translate(nbX - nbW + 10, nbY + nbH - 5);
      ctx.rotate(-sparkleRot * 0.7);
      ctx.globalAlpha = sparkleAlpha * 0.7;
      this.drawSparkle(ctx, 0, 0, 4);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    ctx.restore();

    this.hitAreas = [];
    for (const n of NEIGHBORS) {
      const pad = 15;
      this.hitAreas.push({
        x: n.houseX - pad,
        y: n.houseY - pad - 30,
        w: n.houseW + pad * 2,
        h: n.houseH + pad * 2 + 30,
        id: 'house_' + n.id,
      });
    }
    this.hitAreas.push({ x: nbX - nbW, y: nbY, w: nbW, h: nbH, id: 'notebook' });
  }

  private renderDialogue(ctx: CanvasRenderingContext2D): void {
    const neighbor = this.getCurrentNeighbor();
    if (!neighbor) return;

    const panelH = 200;
    const panelY = DESIGN_H - panelH;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, DESIGN_W, panelY);

    this.drawRoundedRect(ctx, 10, panelY, DESIGN_W - 20, panelH - 10, 12);
    ctx.fillStyle = COLORS.dialogueBg;
    ctx.fill();
    ctx.strokeStyle = COLORS.dialogueBorder;
    ctx.lineWidth = 3;
    ctx.stroke();

    const portraitX = 40;
    const portraitY = panelY + 30;
    const portraitR = 35;
    this.drawPortrait(ctx, portraitX + portraitR, portraitY + portraitR, portraitR, neighbor);

    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const lines = this.getCurrentDialogueLines();
    if (this.state.dialogueIndex < lines.length) {
      const line = lines[this.state.dialogueIndex];

      if (line.isChoice && line.choices) {
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText('What do you want to do?', 120, panelY + 25);

        const btnW = 260;
        const btnH = 44;
        const btnX = 120;
        this.hitAreas = [];
        line.choices.forEach((choice, i) => {
          const btnY = panelY + 60 + i * 55;
          this.drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 8);
          ctx.fillStyle = i === 0 ? COLORS.btnPrimary : '#BDBDBD';
          ctx.fill();
          ctx.strokeStyle = i === 0 ? '#E64A19' : '#9E9E9E';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.font = 'bold 15px Arial, sans-serif';
          ctx.fillStyle = COLORS.white;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(choice.text, btnX + btnW / 2, btnY + btnH / 2);
          this.hitAreas.push({ x: btnX, y: btnY, w: btnW, h: btnH, id: 'choice_' + i });
        });
      } else {
        const speakerName = line.speaker;
        ctx.font = 'bold 15px Arial, sans-serif';
        ctx.fillStyle = speakerName === 'You' ? '#1565C0' : COLORS.text;
        ctx.textAlign = 'left';
        ctx.fillText(speakerName, 120, panelY + 20);

        const maxChars = Math.floor(this.state.dialogueCharIndex);
        const visibleText = line.text.substring(0, maxChars);
        ctx.font = '15px Arial, sans-serif';
        ctx.fillStyle = COLORS.textLight;
        this.wrapText(ctx, visibleText, 120, panelY + 45, DESIGN_W - 160, 20);

        if (maxChars >= line.text.length) {
          const arrowAlpha = (Math.sin(this.globalTime * 4) + 1) / 2;
          ctx.fillStyle = `rgba(62,39,35,${arrowAlpha})`;
          ctx.font = '14px Arial, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText('Tap to continue \u25BC', DESIGN_W - 40, panelY + panelH - 25);
        }

        this.hitAreas = [{ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, id: 'dialogueAdvance' }];
      }
    }

    if (this.state.dialogueComplete) {
      const btnW = 180;
      const btnH = 40;
      const btnX = DESIGN_W - btnW - 30;
      const btnY = panelY + panelH - 55;
      this.drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 8);
      ctx.fillStyle = COLORS.btnPrimary;
      ctx.fill();
      ctx.strokeStyle = '#E64A19';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillStyle = COLORS.white;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Back to Map', btnX + btnW / 2, btnY + btnH / 2);
      this.hitAreas = [{ x: btnX, y: btnY, w: btnW, h: btnH, id: 'backToMap' }];
    }
  }

  private renderNotebook(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);

    const nbX = 50;
    const nbY = 30;
    const nbW = DESIGN_W - 100;
    const nbH = DESIGN_H - 60;

    this.drawRoundedRect(ctx, nbX, nbY, nbW, nbH, 10);
    ctx.fillStyle = COLORS.notebookBg;
    ctx.fill();
    ctx.strokeStyle = '#F57F17';
    ctx.lineWidth = 3;
    ctx.stroke();

    for (let i = 0; i < 15; i++) {
      const ly = nbY + 60 + i * 28;
      if (ly > nbY + nbH - 20) break;
      ctx.strokeStyle = COLORS.notebookLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(nbX + 20, ly);
      ctx.lineTo(nbX + nbW - 20, ly);
      ctx.stroke();
    }

    ctx.strokeStyle = '#EF5350';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(nbX + 60, nbY + 40);
    ctx.lineTo(nbX + 60, nbY + nbH - 20);
    ctx.stroke();

    ctx.save();
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.fillText('My Trading Notes', nbX + nbW / 2, nbY + 35);

    let cardY = nbY + 70;
    const cardX = nbX + 80;
    const cardW = nbW - 110;

    for (const n of NEIGHBORS) {
      if (!this.state.visitedNeighbors.has(n.id)) continue;
      const discovery = this.state.discoveries.get(n.id);

      this.drawRoundedRect(ctx, cardX, cardY, cardW, 70, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fill();
      ctx.strokeStyle = '#BCAAA4';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'left';
      ctx.fillText(n.name, cardX + 10, cardY + 22);

      if (discovery) {
        ctx.font = '13px Arial, sans-serif';
        ctx.fillStyle = COLORS.textLight;
        ctx.fillText(`Has: ${discovery.has}`, cardX + 10, cardY + 42);
        ctx.fillText(`Wants: ${discovery.wants}`, cardX + 10, cardY + 58);

        if (this.state.tradeAttempted.has(n.id)) {
          ctx.textAlign = 'right';
          ctx.font = 'bold 14px Arial, sans-serif';
          if (discovery.canHelp && discovery.traded) {
            ctx.fillStyle = '#43A047';
            ctx.fillText('\u2B50 TRADED!', cardX + cardW - 10, cardY + 22);
          } else if (discovery.canHelp) {
            ctx.fillStyle = '#43A047';
            ctx.fillText('\u2705 Can help!', cardX + cardW - 10, cardY + 22);
          } else {
            ctx.fillStyle = '#E53935';
            ctx.fillText('\u274C No match', cardX + cardW - 10, cardY + 22);
          }
        }
      }

      cardY += 80;
    }

    if (this.state.visitedNeighbors.size === 0) {
      ctx.font = '16px Arial, sans-serif';
      ctx.fillStyle = COLORS.textMuted;
      ctx.textAlign = 'center';
      ctx.fillText('Visit neighbors to learn about them!', nbX + nbW / 2, nbY + 120);
    }

    const closeW = 160;
    const closeH = 44;
    const closeX = nbX + nbW / 2 - closeW / 2;
    const closeY = nbY + nbH - 55;
    this.drawRoundedRect(ctx, closeX, closeY, closeW, closeH, 10);
    ctx.fillStyle = COLORS.btnPrimary;
    ctx.fill();
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Close', closeX + closeW / 2, closeY + closeH / 2);
    ctx.restore();

    const hitPad = 10;
    this.hitAreas = [{ x: closeX - hitPad, y: closeY - hitPad, w: closeW + hitPad * 2, h: closeH + hitPad * 2, id: 'closeNotebook' }];
  }

  private renderHamsterCatch(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, 0, DESIGN_H);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(0.3, '#87CEEB');
    grad.addColorStop(0.35, '#7BC950');
    grad.addColorStop(1, '#5EA63B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);

    ctx.strokeStyle = '#8B5A2B';
    ctx.lineWidth = 4;
    ctx.setLineDash([15, 10]);
    ctx.strokeRect(30, 50, DESIGN_W - 60, DESIGN_H - 80);
    ctx.setLineDash([]);

    for (let i = 0; i < 6; i++) {
      const fx = 50 + i * 140 + Math.sin(this.elapsed * 0.5 + i) * 5;
      const fy = DESIGN_H - 30;
      ctx.fillStyle = '#E8F5E9';
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx - 4, fy - 12);
      ctx.lineTo(fx + 4, fy - 12);
      ctx.fill();
      ctx.fillStyle = '#C8E6C9';
      ctx.beginPath();
      ctx.moveTo(fx + 8, fy);
      ctx.lineTo(fx + 4, fy - 10);
      ctx.lineTo(fx + 12, fy - 10);
      ctx.fill();
    }

    for (const bush of this.state.hamsterBushes) {
      ctx.fillStyle = '#388E3C';
      ctx.beginPath();
      ctx.ellipse(bush.x + bush.w / 2, bush.y + bush.h, bush.w / 2, bush.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#43A047';
      ctx.beginPath();
      ctx.ellipse(bush.x + bush.w / 2 - 10, bush.y + bush.h - 8, bush.w / 3, bush.h / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.ellipse(bush.x + bush.w / 2 + 12, bush.y + bush.h - 5, bush.w / 4, bush.h / 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Catch Sir Squeaks!', DESIGN_W / 2, 12);

    const catchIndicatorY = 38;
    for (let i = 0; i < 3; i++) {
      const cx = DESIGN_W / 2 - 30 + i * 30;
      ctx.beginPath();
      ctx.arc(cx, catchIndicatorY, 8, 0, Math.PI * 2);
      if (i < this.state.hamsterCatches) {
        ctx.fillStyle = '#FF7043';
        ctx.fill();
        ctx.fillStyle = COLORS.white;
        ctx.font = 'bold 10px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u2713', cx, catchIndicatorY);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fill();
      }
    }

    const hx = this.state.hamsterX;
    const hy = this.state.hamsterY;
    const isMoving = this.state.hamsterState === 'running';
    const bob = isMoving ? Math.sin(this.elapsed * 15) * 3 : Math.sin(this.elapsed * 3) * 1;

    ctx.fillStyle = '#D4A373';
    ctx.beginPath();
    ctx.ellipse(hx, hy + bob, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#C49265';
    ctx.beginPath();
    ctx.ellipse(hx, hy + bob, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#D4A373';
    ctx.beginPath();
    ctx.ellipse(hx + 16, hy - 4 + bob, 6, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#E8C9A0';
    ctx.beginPath();
    ctx.ellipse(hx + 16, hy - 4 + bob, 4, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#D4A373';
    ctx.beginPath();
    ctx.ellipse(hx - 16, hy - 4 + bob, 6, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#E8C9A0';
    ctx.beginPath();
    ctx.ellipse(hx - 16, hy - 4 + bob, 4, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.arc(hx - 5, hy - 5 + bob, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hx + 5, hy - 5 + bob, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF8A80';
    ctx.beginPath();
    ctx.ellipse(hx, hy - 2 + bob, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F5F5F5';
    ctx.beginPath();
    ctx.ellipse(hx, hy + 2 + bob, 8, 4, 0, 0, Math.PI);
    ctx.fill();

    if (isMoving) {
      const tailWag = Math.sin(this.elapsed * 20) * 8;
      ctx.strokeStyle = '#D4A373';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - 15, hy + 5 + bob);
      ctx.quadraticCurveTo(hx - 25, hy + bob + tailWag, hx - 30, hy - 5 + bob);
      ctx.stroke();
    }

    if (this.state.hamsterReaction) {
      const reactY = hy - 35 + bob;
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const alpha = Math.min(1, this.state.hamsterReactionTimer * 2);
      if (this.state.hamsterCatches >= 3 && this.state.hamsterState === 'caught') {
        ctx.fillStyle = `rgba(76,175,80,${alpha})`;
      } else if (this.state.hamsterState === 'caught') {
        ctx.fillStyle = `rgba(255,112,67,${alpha})`;
      } else {
        ctx.fillStyle = `rgba(62,39,35,${alpha})`;
      }
      ctx.fillText(this.state.hamsterReaction, hx, reactY - this.state.hamsterReactionTimer * 15);
    }

    if (this.state.hamsterState !== 'caught') {
      this.hitAreas = [{ x: hx - 30, y: hy - 25 + bob, w: 60, h: 50, id: 'hamster' }];
    } else {
      this.hitAreas = [];
    }
  }

  private renderCelebration(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, 0, DESIGN_H);
    grad.addColorStop(0, '#FFF9C4');
    grad.addColorStop(1, '#FFEE58');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);

    for (const lemon of this.state.celebrationLemons) {
      ctx.save();
      ctx.translate(lemon.x, lemon.y);
      ctx.rotate(lemon.rot);
      this.drawLemon(ctx, -lemon.r, -lemon.r, lemon.r * 2);
      ctx.restore();
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const bounce = Math.sin(this.globalTime * 3) * 5;
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.fillText('You got the LEMONS!', 400, 140 + bounce);

    ctx.font = '30px Arial, sans-serif';
    ctx.fillText('\uD83C\uDF4B', 280, 140 + bounce);
    ctx.fillText('\uD83C\uDF4B', 520, 140 + bounce);

    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = COLORS.textLight;
    this.wrapText(ctx, 'But wow, it took a while! You had to find someone who had what you needed AND wanted what you could offer.', 100, 210, 600, 22);

    const btnW = 180;
    const btnH = 44;
    const btnX = 400 - btnW / 2;
    const btnY = 380;
    const pulse = 1 + Math.sin(this.globalTime * 3) * 0.03;
    ctx.save();
    ctx.translate(400, btnY + btnH / 2);
    ctx.scale(pulse, pulse);
    this.drawRoundedRect(ctx, -btnW / 2, -btnH / 2, btnW, btnH, 10);
    ctx.fillStyle = COLORS.btnPrimary;
    ctx.fill();
    ctx.strokeStyle = '#E64A19';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillStyle = COLORS.white;
    ctx.fillText('Continue', 0, 0);
    ctx.restore();

    ctx.restore();

    this.hitAreas = [{ x: btnX, y: btnY, w: btnW, h: btnH, id: 'celebrationContinue' }];
  }

  private renderQuiz(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, 0, DESIGN_H);
    grad.addColorStop(0, '#E8EAF6');
    grad.addColorStop(1, '#C5CAE9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);

    if (this.state.currentQuizQuestion >= QUIZ_QUESTIONS.length) return;

    const q = QUIZ_QUESTIONS[this.state.currentQuizQuestion];
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '14px Arial, sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(`Question ${this.state.currentQuizQuestion + 1} of ${QUIZ_QUESTIONS.length}`, 400, 40);

    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillStyle = COLORS.text;
    this.wrapText(ctx, q.question, 80, 80, 640, 28);

    this.hitAreas = [];
    const optW = 500;
    const optH = 50;
    const optX = 400 - optW / 2;
    let optY = 160;

    for (let i = 0; i < q.options.length; i++) {
      const y = optY + i * 65;
      this.drawRoundedRect(ctx, optX, y, optW, optH, 10);

      let bgColor = COLORS.white;
      let borderColor = '#BDBDBD';
      let textColor = COLORS.text;

      if (this.state.quizFeedback && this.state.choiceSelected === i) {
        if (this.state.quizFeedback === 'correct') {
          bgColor = '#C8E6C9';
          borderColor = '#43A047';
          textColor = '#2E7D32';
        } else {
          bgColor = '#FFCDD2';
          borderColor = '#E53935';
          textColor = '#C62828';
        }
      }

      ctx.fillStyle = bgColor;
      ctx.fill();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '16px Arial, sans-serif';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(q.options[i], 400, y + optH / 2);

      if (!this.state.quizFeedback) {
        this.hitAreas.push({ x: optX, y, w: optW, h: optH, id: 'quiz_' + i });
      }
    }

    if (this.state.quizFeedback === 'correct') {
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.fillStyle = '#43A047';
      ctx.textAlign = 'center';
      ctx.fillText("That's right!", 400, 420);

      for (const p of this.state.confettiParticles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    } else if (this.state.quizFeedback === 'wrong') {
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.fillStyle = '#E53935';
      ctx.textAlign = 'center';
      ctx.fillText('Not quite! Try again', 400, 420);
    }

    ctx.restore();
  }

  private renderBadge(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, 0, DESIGN_H);
    grad.addColorStop(0, '#FFF8E1');
    grad.addColorStop(1, '#FFECB3');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cx = 400;
    const cy = 170;
    const s = this.state.badgeScale;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);

    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.gold;
    ctx.fill();
    ctx.strokeStyle = '#F9A825';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 58, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFF8E1';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '40px Arial, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.fillText('\uD83E\uDD1D', 0, 0);

    ctx.restore();

    for (const sp of this.state.badgeSparkles) {
      this.drawSparkle(ctx, sp.x, sp.y, sp.size * sp.alpha);
    }

    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.fillText('Badge Earned!', 400, 270);

    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillStyle = '#F57F17';
    ctx.fillText('"Double Coincidence of Wants"', 400, 300);

    ctx.font = '15px Arial, sans-serif';
    ctx.fillStyle = COLORS.textLight;
    this.wrapText(ctx, 'You learned that trading only works when both people have what the other wants!', 100, 340, 600, 20);

    const btnW = 220;
    const btnH = 44;
    const btnX = 400 - btnW / 2;
    const btnY = 410;
    const pulse = 1 + Math.sin(this.globalTime * 3) * 0.03;
    ctx.save();
    ctx.translate(400, btnY + btnH / 2);
    ctx.scale(pulse, pulse);
    this.drawRoundedRect(ctx, -btnW / 2, -btnH / 2, btnW, btnH, 10);
    ctx.fillStyle = COLORS.btnSuccess;
    ctx.fill();
    ctx.strokeStyle = '#43A047';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillStyle = COLORS.white;
    ctx.fillText('Chapter 1 Complete!', 0, 0);
    ctx.restore();

    ctx.restore();

    this.hitAreas = [{ x: btnX, y: btnY, w: btnW, h: btnH, id: 'badgeComplete' }];
  }

  private renderComplete(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, 0, DESIGN_H);
    grad.addColorStop(0, '#FFF9C4');
    grad.addColorStop(1, '#FFE082');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);

    for (let i = 0; i < 20; i++) {
      const sx = (i * 137 + this.globalTime * 30) % (DESIGN_W + 40) - 20;
      const sy = 50 + (i * 89) % (DESIGN_H - 100);
      const sparkleAlpha = (Math.sin(this.globalTime * 2 + i) + 1) / 2 * 0.5;
      ctx.save();
      ctx.globalAlpha = sparkleAlpha;
      this.drawSparkle(ctx, sx, sy, 3 + (i % 3));
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    this.drawLemonadeStand(ctx, 300, 60, 200, 180);

    const bounce = Math.sin(this.globalTime * 2) * 4;
    ctx.font = 'bold 38px Arial, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.fillText('Congratulations!', 400, 280 + bounce);

    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillStyle = '#E65100';
    ctx.fillText(`Amazing work, ${this.state.playerName}!`, 400, 320);

    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = COLORS.textLight;
    ctx.fillText('You mastered the Double Coincidence of Wants', 400, 355);
    ctx.fillText('and built your very own lemonade stand!', 400, 378);

    const btnW = 180;
    const btnH = 46;
    const btnX = 400 - btnW / 2;
    const btnY = 410;
    const pulse = 1 + Math.sin(this.globalTime * 3) * 0.04;
    ctx.save();
    ctx.translate(400, btnY + btnH / 2);
    ctx.scale(pulse, pulse);
    this.drawRoundedRect(ctx, -btnW / 2, -btnH / 2, btnW, btnH, 12);
    ctx.fillStyle = COLORS.btnPrimary;
    ctx.fill();
    ctx.strokeStyle = '#E64A19';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillStyle = COLORS.white;
    ctx.fillText('Play Again', 0, 0);
    ctx.restore();

    ctx.font = '13px Arial, sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('More chapters coming soon...', 400, 475);
    ctx.restore();

    this.hitAreas = [{ x: btnX, y: btnY, w: btnW, h: btnH, id: 'playAgain' }];
  }

  private handleInput(e: MouseEvent | TouchEvent): void {
    e.preventDefault();
    let clientX: number, clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    const dpr = window.devicePixelRatio || 1;
    const designX = (canvasX * dpr - this.offsetX) / this.scale;
    const designY = (canvasY * dpr - this.offsetY) / this.scale;

    if (this.state.fadeDirection) return;

    for (const area of this.hitAreas) {
      if (designX >= area.x && designX <= area.x + area.w && designY >= area.y && designY <= area.y + area.h) {
        this.handleHit(area.id);
        return;
      }
    }
  }

  private handleHit(id: string): void {
    switch (this.state.screen) {
      case 'TITLE':
        if (id === 'play') this.transitionTo('NAME_INPUT');
        break;

      case 'NAME_INPUT':
        if (id === 'nameInput' && this.hiddenInput) {
          this.hiddenInput.focus();
        } else if (id === 'nameSubmit') {
          this.submitName();
        }
        break;

      case 'INTRO':
        if (id === 'introAdvance') {
          this.state.introPage++;
          if (this.state.introPage >= 3) {
            this.transitionTo('MAP');
          }
        }
        break;

      case 'MAP':
        if (id === 'notebook') {
          this.state.screen = 'NOTEBOOK';
        } else if (id.startsWith('house_')) {
          const neighborId = id.replace('house_', '');
          this.startVisit(neighborId);
        }
        break;

      case 'VISITING':
        if (id === 'dialogueAdvance') {
          this.advanceDialogue();
        } else if (id.startsWith('choice_')) {
          const choiceIndex = parseInt(id.replace('choice_', ''));
          this.handleChoice(choiceIndex);
        } else if (id === 'backToMap') {
          this.state.screen = 'MAP';
          this.state.currentNeighbor = null;
          this.state.dialogueComplete = false;
          this.currentDialogueMode = 'main';
        }
        break;

      case 'NOTEBOOK':
        if (id === 'closeNotebook') {
          this.state.screen = 'MAP';
        }
        break;

      case 'HAMSTER_CATCH':
        if (id === 'hamster' && this.state.hamsterState !== 'caught' && this.state.hamsterReactionTimer <= 0) {
          this.state.hamsterCatches++;
          this.state.hamsterState = 'caught';
          const reactions = [
            ['SQUEAK!', 'Almost had me!', 'Too quick for you!'],
            ['EEK!', 'Not again!', 'So close!'],
            ['GOTCHA! \uD83D\uDC39', 'Caught him!', 'Sir Squeaks is safe!'],
          ];
          const catchIndex = Math.min(this.state.hamsterCatches - 1, 2);
          const reactionSet = reactions[catchIndex];
          this.state.hamsterReaction = reactionSet[Math.floor(Math.random() * reactionSet.length)];
          this.state.hamsterReactionTimer = this.state.hamsterCatches >= 3 ? 1.5 : 1.0;
        }
        break;

      case 'CELEBRATION':
        if (id === 'celebrationContinue') {
          this.transitionTo('QUIZ');
        }
        break;

      case 'QUIZ':
        if (id.startsWith('quiz_') && !this.state.quizFeedback) {
          const answerIndex = parseInt(id.replace('quiz_', ''));
          this.state.choiceSelected = answerIndex;
          const q = QUIZ_QUESTIONS[this.state.currentQuizQuestion];
          if (answerIndex === q.correct) {
            this.state.quizFeedback = 'correct';
            this.state.quizFeedbackTimer = 0;
            this.spawnConfetti();
            this.state.quizAnswers.push(true);
          } else {
            this.state.quizFeedback = 'wrong';
            this.state.quizFeedbackTimer = 0;
          }
        }
        break;

      case 'BADGE':
        if (id === 'badgeComplete') {
          this.transitionTo('COMPLETE');
        }
        break;

      case 'COMPLETE':
        if (id === 'playAgain') {
          this.state = this.createInitialState();
        }
        break;
    }
  }

  private startVisit(neighborId: string): void {
    const neighbor = NEIGHBORS.find(n => n.id === neighborId);
    if (!neighbor) return;

    this.state.screen = 'VISITING';
    this.state.currentNeighbor = neighborId;
    this.state.dialogueIndex = 0;
    this.state.dialogueCharIndex = 0;
    this.state.choiceVisible = false;
    this.state.dialogueComplete = false;
    this.currentDialogueMode = 'main';
    this.state.visitedNeighbors.add(neighborId);
    this.state.notebookSparkleTimer = 1.5;
    this.state.discoveries.set(neighborId, {
      has: neighbor.has,
      wants: neighbor.wants,
      canHelp: neighbor.canHelp,
      traded: false,
    });
  }

  private advanceDialogue(): void {
    const lines = this.getCurrentDialogueLines();
    if (this.state.dialogueIndex >= lines.length) return;

    const line = lines[this.state.dialogueIndex];
    const maxChars = Math.floor(this.state.dialogueCharIndex);

    if (maxChars < line.text.length) {
      this.state.dialogueCharIndex = line.text.length;
      return;
    }

    this.state.dialogueIndex++;
    this.state.dialogueCharIndex = 0;

    if (this.state.dialogueIndex >= lines.length) {
      if (this.currentDialogueMode === 'success' && this.state.currentNeighbor === 'twins') {
        this.state.currentNeighbor = null;
        this.state.dialogueComplete = false;
        this.currentDialogueMode = 'main';
        this.transitionTo('CELEBRATION');
        return;
      }
      this.state.dialogueComplete = true;
    }
  }

  private handleChoice(choiceIndex: number): void {
    const neighbor = this.getCurrentNeighbor();
    if (!neighbor) return;

    const lines = this.getCurrentDialogueLines();
    const line = lines[this.state.dialogueIndex];
    if (!line || !line.choices) return;

    const choice = line.choices[choiceIndex];
    this.state.tradeAttempted.add(neighbor.id);

    if (choice.action === 'back') {
      this.state.screen = 'MAP';
      this.state.currentNeighbor = null;
      this.state.dialogueComplete = false;
      return;
    }

    if (choice.action === 'success') {
      const disc = this.state.discoveries.get(neighbor.id);
      if (disc) disc.traded = true;
      this.state.choiceVisible = false;
      if (neighbor.id === 'twins') {
        this.state.hamsterCatches = 0;
        this.state.hamsterState = 'running';
        this.state.hamsterTimer = 0;
        this.state.hamsterX = 400;
        this.state.hamsterY = 250;
        this.state.hamsterReaction = '';
        this.state.hamsterReactionTimer = 0;
        this.pickNewHamsterTarget();
        this.transitionTo('HAMSTER_CATCH');
      } else {
        this.state.dialogueIndex = 0;
        this.state.dialogueCharIndex = 0;
        this.currentDialogueMode = 'success';
      }
      return;
    }

    if (choice.action === 'fail') {
      this.state.dialogueIndex = 0;
      this.state.dialogueCharIndex = 0;
      this.state.choiceVisible = false;
      this.currentDialogueMode = 'fail';
      return;
    }
  }

  private currentDialogueMode: 'main' | 'trade' | 'fail' | 'success' = 'main';

  private getCurrentDialogueLines(): DialogueLine[] {
    const neighbor = this.getCurrentNeighbor();
    if (!neighbor) return [];

    switch (this.currentDialogueMode) {
      case 'main': return [...neighbor.dialogue, ...neighbor.tradeDialogue];
      case 'fail': return neighbor.failDialogue;
      case 'success': return neighbor.successDialogue;
      default: return neighbor.dialogue;
    }
  }

  private pickNewHamsterTarget(): void {
    let tx: number, ty: number;
    do {
      tx = 60 + Math.random() * 680;
      ty = 80 + Math.random() * 320;
    } while (Math.abs(tx - this.state.hamsterX) < 100 && Math.abs(ty - this.state.hamsterY) < 80);
    this.state.hamsterTargetX = tx;
    this.state.hamsterTargetY = ty;
  }

  private getCurrentNeighbor(): Neighbor | undefined {
    return NEIGHBORS.find(n => n.id === this.state.currentNeighbor);
  }

  private drawPaths(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = COLORS.path;
    ctx.lineWidth = 30;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(400, 430);
    ctx.lineTo(400, 300);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(400, 300);
    ctx.quadraticCurveTo(200, 300, 150, 160);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(400, 300);
    ctx.quadraticCurveTo(600, 300, 630, 160);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(630, 250);
    ctx.lineTo(630, 300);
    ctx.stroke();

    ctx.strokeStyle = COLORS.pathDark;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(400, 430);
    ctx.lineTo(400, 300);
    ctx.lineTo(150, 160);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(400, 300);
    ctx.lineTo(630, 160);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(630, 250);
    ctx.lineTo(630, 300);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawDecorations(ctx: CanvasRenderingContext2D): void {
    this.drawTree(ctx, 300, 180, 25);
    this.drawTree(ctx, 500, 200, 22);
    this.drawTree(ctx, 50, 300, 28);
    this.drawTree(ctx, 740, 350, 20);

    ctx.fillStyle = '#E53935';
    ctx.beginPath();
    ctx.arc(460, 370, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#B71C1C';
    ctx.fillRect(458, 370, 4, 12);

    ctx.fillStyle = '#42A5F5';
    ctx.fillRect(250, 420, 14, 20);
    ctx.fillStyle = '#1565C0';
    ctx.fillRect(250, 430, 14, 3);
    ctx.fillStyle = '#E53935';
    ctx.beginPath();
    ctx.moveTo(257, 415);
    ctx.lineTo(268, 420);
    ctx.lineTo(257, 425);
    ctx.closePath();
    ctx.fill();

    this.drawFlowerPatch(ctx, 100, 380, 5);
    this.drawFlowerPatch(ctx, 700, 280, 4);
    this.drawFlowerPatch(ctx, 350, 470, 3);

    this.drawBush(ctx, 200, 250);
    this.drawBush(ctx, 550, 380);
  }

  private drawHouse(ctx: CanvasRenderingContext2D, n: Neighbor): void {
    const { houseX: x, houseY: y, houseW: w, houseH: h } = n;
    const glowIntensity = (Math.sin(this.globalTime * 2.5) + 1) / 2;
    const glowAlpha = 0.15 + glowIntensity * 0.15;
    ctx.save();
    ctx.shadowColor = `rgba(255, 193, 7, ${glowAlpha})`;
    ctx.shadowBlur = 15 + glowIntensity * 10;

    ctx.fillStyle = n.wallColor;
    ctx.fillRect(x, y, w, h);

    ctx.restore();

    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = n.roofColor;
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + w / 2, y - 35);
    ctx.lineTo(x + w + 10, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#5D4037';
    ctx.fillRect(x + w / 2 - 12, y + h - 40, 24, 40);
    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    ctx.arc(x + w / 2 + 7, y + h - 20, 3, 0, Math.PI * 2);
    ctx.fill();

    const winY = y + 20;
    const winSize = 18;
    ctx.fillStyle = '#E3F2FD';
    ctx.fillRect(x + 15, winY, winSize, winSize);
    ctx.fillRect(x + w - 15 - winSize, winY, winSize, winSize);
    ctx.strokeStyle = '#90A4AE';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 15, winY, winSize, winSize);
    ctx.strokeRect(x + w - 15 - winSize, winY, winSize, winSize);
    ctx.beginPath();
    ctx.moveTo(x + 15 + winSize / 2, winY);
    ctx.lineTo(x + 15 + winSize / 2, winY + winSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w - 15 - winSize / 2, winY);
    ctx.lineTo(x + w - 15 - winSize / 2, winY + winSize);
    ctx.stroke();

    if (n.id === 'garcia') {
      this.drawLemonTree(ctx, x + w + 15, y + 20);
      this.drawFlowerPatch(ctx, x + 20, y + h + 10, 6);
    }

    if (n.id === 'thompson') {
      for (let i = 0; i < 12; i++) {
        const lx = x + Math.random() * (w + 40) - 20;
        const ly = y + h + Math.random() * 30;
        ctx.fillStyle = ['#A1887F', '#8D6E63', '#795548'][Math.floor(Math.random() * 3)];
        ctx.beginPath();
        ctx.ellipse(lx, ly, 5 + Math.random() * 3, 3 + Math.random() * 2, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (n.id === 'twins') {
      ctx.fillStyle = '#FF5722';
      ctx.beginPath();
      ctx.arc(x - 10, y + h + 10, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2196F3';
      ctx.fillRect(x + w - 5, y + h + 5, 10, 10);
      ctx.strokeStyle = '#FFC107';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + w + 20, y + h - 10, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w + 14, y + h - 10);
      ctx.lineTo(x + w + 26, y + h - 10);
      ctx.stroke();
    }

    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.fillText(n.name, x + w / 2, y - 40);
  }

  private drawPlayerHouse(ctx: CanvasRenderingContext2D): void {
    const x = 340;
    const y = 370;
    const w = 120;
    const h = 80;

    ctx.fillStyle = COLORS.playerWall;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = COLORS.playerRoof;
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x + w / 2, y - 28);
    ctx.lineTo(x + w + 8, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#BDBDBD';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#5D4037';
    ctx.fillRect(x + w / 2 - 10, y + h - 35, 20, 35);

    const standX = x + w + 20;
    const standY = y + 30;
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(standX, standY, 50, 5);
    ctx.fillRect(standX + 5, standY + 5, 5, 30);
    ctx.fillRect(standX + 40, standY + 5, 5, 30);
    ctx.font = '8px Arial, sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = 'center';
    ctx.fillText('LEMONADE', standX + 25, standY + 20);
    ctx.fillText('(coming soon!)', standX + 25, standY + 30);

    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.fillText('Your House', x + w / 2, y - 32);
  }

  private drawPlayerCharacter(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const bob = Math.sin(this.globalTime * 3) * 2;

    ctx.fillStyle = '#FFCC80';
    ctx.beginPath();
    ctx.arc(x, y - 20 + bob, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#4E342E';
    ctx.beginPath();
    ctx.arc(x, y - 26 + bob, 10, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#42A5F5';
    ctx.fillRect(x - 7, y - 10 + bob, 14, 18);

    ctx.fillStyle = '#1565C0';
    ctx.fillRect(x - 6, y + 8 + bob, 5, 10);
    ctx.fillRect(x + 1, y + 8 + bob, 5, 10);

    ctx.fillStyle = '#3E2723';
    ctx.beginPath();
    ctx.arc(x - 3, y - 22 + bob, 1.5, 0, Math.PI * 2);
    ctx.arc(x + 3, y - 22 + bob, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y - 17 + bob, 4, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }

  private drawPortrait(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, n: Neighbor): void {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#E8E8E8';
    ctx.fill();
    ctx.strokeStyle = COLORS.dialogueBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y - 5, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = n.skinColor;
    ctx.fill();

    ctx.fillStyle = n.hairColor;
    if (n.id === 'garcia') {
      ctx.beginPath();
      ctx.arc(x, y - 12, r * 0.5, Math.PI, 0);
      ctx.fill();
    } else if (n.id === 'thompson') {
      ctx.fillRect(x - r * 0.4, y - 18, r * 0.8, 8);
    } else {
      ctx.beginPath();
      ctx.arc(x, y - 12, r * 0.45, Math.PI, 0);
      ctx.fill();
    }

    ctx.fillStyle = '#3E2723';
    ctx.beginPath();
    ctx.arc(x - 5, y - 7, 2, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 7, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 1;
    const talking = Math.sin(this.globalTime * 8) > 0;
    if (talking && !this.state.dialogueComplete) {
      ctx.beginPath();
      ctx.ellipse(x, y + 1, 5, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y + 2, 5, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }

    if (n.accessory === 'glasses') {
      ctx.strokeStyle = '#616161';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x - 6, y - 7, 5, 0, Math.PI * 2);
      ctx.arc(x + 6, y - 7, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 1, y - 7);
      ctx.lineTo(x + 1, y - 7);
      ctx.stroke();
    }

    if (n.accessory === 'mustache') {
      ctx.fillStyle = '#4E342E';
      ctx.beginPath();
      ctx.ellipse(x - 4, y + 1, 5, 2, -0.2, 0, Math.PI);
      ctx.ellipse(x + 4, y + 1, 5, 2, 0.2, 0, Math.PI);
      ctx.fill();
    }

    if (n.accessory === 'cap') {
      ctx.fillStyle = '#FF5722';
      ctx.beginPath();
      ctx.arc(x, y - 14, r * 0.45, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(x - r * 0.55, y - 14, r * 1.1, 3);
    }
  }

  private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(x - 3, y, 6, size * 0.8);

    ctx.fillStyle = '#66BB6A';
    ctx.beginPath();
    ctx.arc(x, y - size * 0.2, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(x - size * 0.2, y - size * 0.1, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + size * 0.2, y, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLemonTree(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(x - 3, y + 15, 6, 25);

    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#66BB6A';
    ctx.beginPath();
    ctx.arc(x - 8, y + 5, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 8, y - 3, 12, 0, Math.PI * 2);
    ctx.fill();

    const positions = [[-8, -5], [6, -8], [0, 5], [-12, 3], [10, 2]];
    for (const [ox, oy] of positions) {
      this.drawLemon(ctx, x + ox - 4, y + oy - 4, 8);
    }
  }

  private drawLemon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.fillStyle = COLORS.lemon;
    ctx.beginPath();
    ctx.ellipse(x + size / 2, y + size / 2, size / 2, size / 2.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.lemonDark;
    ctx.beginPath();
    ctx.ellipse(x + size / 2, y + size / 2, size / 4, size / 5, 0.3, 0, Math.PI);
    ctx.fill();
  }

  private drawLemonadeStand(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const legH = h * 0.5;
    const tableY = y + h - legH;

    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(x + w * 0.1, tableY, w * 0.08, legH);
    ctx.fillRect(x + w * 0.82, tableY, w * 0.08, legH);

    ctx.fillStyle = '#A1887F';
    ctx.fillRect(x, tableY - 6, w, 8);
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, tableY - 6, w, 8);

    ctx.fillStyle = '#FFE082';
    ctx.fillRect(x + w * 0.1, tableY - h * 0.45, w * 0.8, h * 0.4);
    ctx.strokeStyle = '#F57F17';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + w * 0.1, tableY - h * 0.45, w * 0.8, h * 0.4);

    ctx.save();
    ctx.font = `bold ${Math.floor(h * 0.12)}px Arial, sans-serif`;
    ctx.fillStyle = '#E65100';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEMONADE', x + w / 2, tableY - h * 0.25);
    ctx.restore();

    ctx.fillStyle = '#FFFFFF';
    ctx.save();
    ctx.translate(x + w - 15, tableY - h * 0.5);
    ctx.rotate(0.15);
    ctx.fillRect(-10, -15, 20, 25);
    ctx.font = 'bold 8px Arial, sans-serif';
    ctx.fillStyle = '#E65100';
    ctx.textAlign = 'center';
    ctx.fillText('OPEN', 0, -2);
    ctx.restore();

    const glassX = x + w * 0.3;
    const glassY = tableY - 20;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(glassX, glassY, 12, 16);
    ctx.fillStyle = '#FDD835';
    ctx.fillRect(glassX + 1, glassY + 4, 10, 11);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(glassX, glassY, 12, 16);
  }

  private drawFlowerPatch(ctx: CanvasRenderingContext2D, x: number, y: number, count: number): void {
    const colors = ['#E91E63', '#FF5722', '#FFC107', '#9C27B0', '#2196F3'];
    for (let i = 0; i < count; i++) {
      const fx = x + (i - count / 2) * 10;
      const fy = y + Math.sin(i * 1.5) * 5;
      const color = colors[i % colors.length];
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(fx, fy, 2, 8);
      ctx.fillStyle = color;
      for (let p = 0; p < 5; p++) {
        const angle = (p / 5) * Math.PI * 2 + this.globalTime * 0.5;
        ctx.beginPath();
        ctx.arc(fx + 1 + Math.cos(angle) * 3, fy - 2 + Math.sin(angle) * 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#FFC107';
      ctx.beginPath();
      ctx.arc(fx + 1, fy - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBush(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#388E3C';
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(x - 6, y + 2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 6, y + 2, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.fillStyle = COLORS.gold;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.3, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * 0.3, y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x, y - size * 0.3);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line.trim(), x + maxWidth / 2, currentY);
        line = words[i] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x + maxWidth / 2, currentY);
  }

  private spawnCelebrationLemons(): void {
    this.state.celebrationLemons = [];
    for (let i = 0; i < 15; i++) {
      this.state.celebrationLemons.push({
        x: 100 + Math.random() * 600,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 150,
        vy: Math.random() * 100,
        r: 12 + Math.random() * 10,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 5,
      });
    }
  }

  private spawnConfetti(): void {
    this.state.confettiParticles = [];
    for (let i = 0; i < 40; i++) {
      this.state.confettiParticles.push({
        x: 400 + (Math.random() - 0.5) * 200,
        y: 200,
        vx: (Math.random() - 0.5) * 400,
        vy: -200 - Math.random() * 300,
        color: COLORS.confettiColors[Math.floor(Math.random() * COLORS.confettiColors.length)],
        size: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
      });
    }
  }

  private spawnBadgeSparkles(): void {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 80;
      this.state.badgeSparkles.push({
        x: 400 + Math.cos(angle) * dist,
        y: 170 + Math.sin(angle) * dist,
        size: 3 + Math.random() * 5,
        alpha: 1,
        speed: 0.5 + Math.random() * 0.5,
      });
    }
  }
}

export default LemonadeGame;
