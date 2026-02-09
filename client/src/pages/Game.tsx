import { useEffect, useRef, useCallback, useState } from 'react';
import { VillageLedgerGame } from '@/lib/gameEngine';

const MONEY_ICONS = [
  'money-shell', 'money-beads', 'money-goldbar', 'money-coin', 'money-raistone',
  'money-cattle', 'money-salt', 'money-teabrick', 'money-feather', 'money-cocoa',
  'money-banknote', 'money-creditcard', 'money-moderncoins', 'money-bitcoin',
  'money-yen', 'money-yuan', 'money-euro'
];

const HIGH_FREQ_ICONS = ['money-banknote', 'money-yen', 'money-yuan', 'money-euro'];
const MAX_SIZE_ICONS = ['money-cattle'];

interface FallingItem {
  x: number;
  y: number;
  speed: number;
  sway: number;
  swaySpeed: number;
  swayOffset: number;
  size: number;
  iconIndex: number;
  rotation: number;
  rotationSpeed: number;
  sparkleTimer: number;
  sparkleInterval: number;
  opacity: number;
}

function MoneyRainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const itemsRef = useRef<FallingItem[]>([]);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let loadedCount = 0;
    let initStarted = false;
    MONEY_ICONS.forEach((name, i) => {
      const img = new Image();
      img.onload = () => {
        imagesRef.current[i] = img;
        loadedCount++;
        if (loadedCount >= 3 && !initStarted) {
          initStarted = true;
          initItems(canvas.width, canvas.height);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount >= 3 && !initStarted) {
          initStarted = true;
          initItems(canvas.width, canvas.height);
        }
      };
      img.src = `/sprites/${name}.png`;
    });

    function initItems(w: number, h: number) {
      const count = Math.max(25, Math.floor((w * h) / 20000));
      const items: FallingItem[] = [];
      for (let i = 0; i < count; i++) {
        items.push(createItem(w, h, true));
      }
      itemsRef.current = items;
    }

    function pickIconIndex(): number {
      if (Math.random() < 0.4) {
        const hfName = HIGH_FREQ_ICONS[Math.floor(Math.random() * HIGH_FREQ_ICONS.length)];
        const idx = MONEY_ICONS.indexOf(hfName);
        if (idx >= 0) return idx;
      }
      return Math.floor(Math.random() * MONEY_ICONS.length);
    }

    function createItem(w: number, h: number, randomY: boolean): FallingItem {
      const iconIndex = pickIconIndex();
      const iconName = MONEY_ICONS[iconIndex];
      const size = MAX_SIZE_ICONS.includes(iconName) ? 72 : 24 + Math.random() * 48;
      return {
        x: Math.random() * w,
        y: randomY ? Math.random() * h : -size - Math.random() * 100,
        speed: 15 + Math.random() * 25,
        sway: 10 + Math.random() * 20,
        swaySpeed: 0.3 + Math.random() * 0.6,
        swayOffset: Math.random() * Math.PI * 2,
        size,
        iconIndex,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        sparkleTimer: Math.random() * 5,
        sparkleInterval: 2 + Math.random() * 4,
        opacity: 0.3 + Math.random() * 0.4,
      };
    }

    const matrixCharSize = 14;
    const matrixCols = 4;
    const matrixStripWidth = matrixCols * matrixCharSize;
    const matrixStripX = Math.floor(Math.random() * (canvas.width - matrixStripWidth));
    const matrixRows = Math.ceil(canvas.height / matrixCharSize) + 2;
    const matrixChars: string[][] = [];
    const matrixTimers: number[][] = [];
    for (let r = 0; r < matrixRows; r++) {
      matrixChars[r] = [];
      matrixTimers[r] = [];
      for (let c = 0; c < matrixCols; c++) {
        matrixChars[r][c] = Math.random() < 0.5 ? '1' : '0';
        matrixTimers[r][c] = Math.random() * 2;
      }
    }
    let matrixScrollOffset = 0;

    let lastTime = performance.now();
    function animate(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const w = canvas!.width;
      const h = canvas!.height;
      ctx!.clearRect(0, 0, w, h);

      const items = itemsRef.current;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        item.y += item.speed * dt;
        item.rotation += item.rotationSpeed * dt;
        item.sparkleTimer += dt;

        const swayX = item.x + Math.sin(now / 1000 * item.swaySpeed + item.swayOffset) * item.sway;

        if (item.y > h + item.size) {
          items[i] = createItem(w, h, false);
          continue;
        }

        const img = imagesRef.current[item.iconIndex];
        if (!img) continue;

        ctx!.save();
        ctx!.globalAlpha = item.opacity;
        ctx!.translate(swayX + item.size / 2, item.y + item.size / 2);
        ctx!.rotate(item.rotation);
        ctx!.drawImage(img, -item.size / 2, -item.size / 2, item.size, item.size);

        if (item.sparkleTimer % item.sparkleInterval < 0.4) {
          const sparkleProgress = (item.sparkleTimer % item.sparkleInterval) / 0.4;
          const sparkleAlpha = Math.sin(sparkleProgress * Math.PI) * 0.8;
          ctx!.globalAlpha = sparkleAlpha;
          const sparkleSize = item.size * 0.3;
          const gradient = ctx!.createRadialGradient(0, -item.size * 0.3, 0, 0, -item.size * 0.3, sparkleSize);
          gradient.addColorStop(0, 'rgba(255, 255, 220, 1)');
          gradient.addColorStop(0.5, 'rgba(255, 223, 150, 0.6)');
          gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
          ctx!.fillStyle = gradient;
          ctx!.beginPath();
          ctx!.arc(0, -item.size * 0.3, sparkleSize, 0, Math.PI * 2);
          ctx!.fill();

          ctx!.strokeStyle = `rgba(255, 255, 220, ${sparkleAlpha})`;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(-sparkleSize * 0.8, -item.size * 0.3);
          ctx!.lineTo(sparkleSize * 0.8, -item.size * 0.3);
          ctx!.moveTo(0, -item.size * 0.3 - sparkleSize * 0.8);
          ctx!.lineTo(0, -item.size * 0.3 + sparkleSize * 0.8);
          ctx!.stroke();
        }

        ctx!.restore();
      }

      matrixScrollOffset += dt * 60;
      if (matrixScrollOffset >= matrixCharSize) {
        matrixScrollOffset -= matrixCharSize;
        for (let r = matrixRows - 1; r > 0; r--) {
          for (let c = 0; c < matrixCols; c++) {
            matrixChars[r][c] = matrixChars[r - 1][c];
          }
        }
        for (let c = 0; c < matrixCols; c++) {
          matrixChars[0][c] = Math.random() < 0.5 ? '1' : '0';
        }
      }
      for (let r = 0; r < matrixRows; r++) {
        for (let c = 0; c < matrixCols; c++) {
          matrixTimers[r][c] += dt;
          if (matrixTimers[r][c] > 0.15 + Math.random() * 0.3) {
            matrixTimers[r][c] = 0;
            if (Math.random() < 0.3) {
              matrixChars[r][c] = matrixChars[r][c] === '1' ? '0' : '1';
            }
          }
        }
      }
      ctx!.save();
      ctx!.font = `${matrixCharSize}px monospace`;
      ctx!.textAlign = 'left';
      ctx!.textBaseline = 'top';
      for (let r = 0; r < matrixRows; r++) {
        const drawY = r * matrixCharSize + matrixScrollOffset - matrixCharSize;
        if (drawY < -matrixCharSize || drawY > h) continue;
        const rowProgress = r / matrixRows;
        const fadeAlpha = rowProgress < 0.1 ? rowProgress / 0.1 : rowProgress > 0.85 ? (1 - rowProgress) / 0.15 : 1;
        for (let c = 0; c < matrixCols; c++) {
          const brightness = 120 + Math.floor(Math.random() * 135);
          ctx!.globalAlpha = 0.6 * fadeAlpha;
          ctx!.fillStyle = `rgb(0, ${brightness}, 0)`;
          ctx!.fillText(matrixChars[r][c], matrixStripX + c * matrixCharSize, drawY);
        }
      }
      ctx!.restore();

      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}

function IntroScreen({ onStart }: { onStart: (answer: string) => void }) {
  return (
    <div
      className="fixed inset-0 w-full h-full flex items-center justify-center"
      style={{
        background: 'linear-gradient(180deg, #1a1208 0%, #2d1f0e 30%, #3d2b14 60%, #2a1c0a 100%)',
        zIndex: 50
      }}
      data-testid="intro-screen"
    >
      <MoneyRainCanvas />
      <div className="flex flex-col items-center max-w-xl w-full px-6 py-8" style={{ position: 'relative', zIndex: 1 }}>
        <h1
          className="text-center mb-8"
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 'clamp(20px, 5vw, 36px)',
            color: '#C9B896',
            textShadow: '2px 2px 0px #5a4a32, 0 0 20px rgba(201, 184, 150, 0.3)',
            lineHeight: 1.4
          }}
          data-testid="text-title"
        >
          MAKING MONEY
        </h1>

        <div className="flex flex-col items-center gap-8">
          <span
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: 'clamp(9px, 2vw, 12px)',
              color: '#8B7355',
              letterSpacing: '1px'
            }}
            data-testid="text-lesson-label"
          >
            Lesson One — The Barter System
          </span>
          <button
            onClick={() => onStart('')}
            className="cursor-pointer"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: 'clamp(10px, 2.5vw, 14px)',
              color: '#1a1208',
              background: 'linear-gradient(180deg, #C9B896 0%, #a89478 100%)',
              border: '2px solid #8B7355',
              borderRadius: '8px',
              padding: '14px 32px',
              textShadow: '0 1px 0 rgba(255,255,255,0.2)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              transition: 'transform 0.1s, box-shadow 0.1s',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.97)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
            }}
            data-testid="button-start"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<VillageLedgerGame | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showIntro, setShowIntro] = useState(true);

  const handleResize = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.resize();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    gameRef.current = new VillageLedgerGame(canvas);
    gameRef.current.preloadAudio();
    gameRef.current.start(false);

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  const handleStart = (answer: string) => {
    if (answer.trim()) {
      localStorage.setItem('makingMoney_moneyAnswer', answer.trim());
    }
    setShowIntro(false);
    if (gameRef.current) {
      gameRef.current.beginGameplay();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 w-full h-full overflow-hidden bg-background"
      data-testid="game-container"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none select-none"
        data-testid="game-canvas"
        style={{ 
          touchAction: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
      />
      {!showIntro && (
        <div 
          className="absolute top-4 left-4 flex items-center gap-3 px-4 py-3 rounded-md"
          style={{ 
            background: 'rgba(45, 35, 28, 0.9)',
            border: '2px solid #8B7355'
          }}
          data-testid="game-title"
        >
          <span 
            className="font-bold text-[#C9B896]"
            style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '10px' }}
          >
            THE BARTER SYSTEM
          </span>
        </div>
      )}
      {showIntro && <IntroScreen onStart={handleStart} />}
    </div>
  );
}
