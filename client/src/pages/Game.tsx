import { useEffect, useRef, useCallback, useState } from 'react';
import { VillageLedgerGame } from '@/lib/gameEngine';

const MONEY_ICONS = [
  'money-shell', 'money-beads', 'money-goldbar', 'money-coin', 'money-raistone',
  'money-cattle', 'money-salt', 'money-teabrick', 'money-feather', 'money-cocoa',
  'money-banknote', 'money-creditcard', 'money-moderncoins', 'money-bitcoin',
  'money-yen', 'money-yuan', 'money-euro',
  'money-chicken', 'money-fish', 'money-silvercoins'
];

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

    function createItem(w: number, h: number, randomY: boolean): FallingItem {
      const iconIndex = Math.floor(Math.random() * MONEY_ICONS.length);
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
    const matrixStripX = Math.random() < 0.5 ? 10 : canvas.width - matrixStripWidth - 10;
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio('/money_song_1.mp3');
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;
    audio.play().catch(() => {
      const resumeOnInteraction = () => {
        audio.play().catch(() => {});
        document.removeEventListener('click', resumeOnInteraction);
        document.removeEventListener('touchstart', resumeOnInteraction);
      };
      document.addEventListener('click', resumeOnInteraction);
      document.addEventListener('touchstart', resumeOnInteraction);
    });
    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  const handleStart = (answer: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    onStart(answer);
  };

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
        <div className="relative text-center mb-8" data-testid="text-title">
          <style>{`
            @keyframes glowPulse {
              0%, 100% { text-shadow: 2px 2px 0px #5a4a32, 0 0 10px rgba(255,215,100,0.6), 0 0 30px rgba(255,200,80,0.4), 0 0 60px rgba(255,180,50,0.25), 0 0 100px rgba(255,170,40,0.15); }
              50% { text-shadow: 2px 2px 0px #5a4a32, 0 0 15px rgba(255,215,100,0.9), 0 0 40px rgba(255,200,80,0.6), 0 0 80px rgba(255,180,50,0.4), 0 0 120px rgba(255,170,40,0.25); }
            }
            @keyframes sparkle1 { 0%,100% { opacity:0; transform:scale(0.5) rotate(0deg); } 50% { opacity:1; transform:scale(1) rotate(180deg); } }
            @keyframes sparkle2 { 0%,100% { opacity:0; transform:scale(0.6) rotate(0deg); } 40% { opacity:1; transform:scale(1.1) rotate(160deg); } }
            @keyframes sparkle3 { 0%,100% { opacity:0; transform:scale(0.4) rotate(0deg); } 60% { opacity:1; transform:scale(1) rotate(200deg); } }
            @keyframes sparkle4 { 0%,100% { opacity:0; transform:scale(0.5) rotate(0deg); } 45% { opacity:0.9; transform:scale(1.05) rotate(170deg); } }
            @keyframes sparkle5 { 0%,100% { opacity:0; transform:scale(0.3) rotate(0deg); } 55% { opacity:1; transform:scale(0.95) rotate(190deg); } }
          `}</style>
          <h1
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: 'clamp(20px, 5vw, 36px)',
              color: '#E8D5A8',
              animation: 'glowPulse 3s ease-in-out infinite',
              lineHeight: 1.4
            }}
          >
            MAKING MONEY
          </h1>
          {[
            { top: '-6px', left: '-4px', anim: 'sparkle1 2.4s ease-in-out infinite', size: 10 },
            { top: '-4px', right: '2px', anim: 'sparkle2 3.1s ease-in-out infinite 0.5s', size: 8 },
            { bottom: '2px', left: '10%', anim: 'sparkle3 2.8s ease-in-out infinite 1.2s', size: 7 },
            { bottom: '-2px', right: '8%', anim: 'sparkle4 2.6s ease-in-out infinite 0.8s', size: 9 },
            { top: '45%', left: '-8px', anim: 'sparkle5 3.4s ease-in-out infinite 1.6s', size: 6 },
          ].map((s, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                ...Object.fromEntries(Object.entries(s).filter(([k]) => ['top','bottom','left','right'].includes(k))),
                width: s.size,
                height: s.size,
                animation: s.anim,
                pointerEvents: 'none' as const,
              }}
            >
              <svg width={s.size} height={s.size} viewBox="0 0 20 20">
                <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="#FFE4A0" />
              </svg>
            </span>
          ))}
        </div>

        <div className="flex flex-col items-center gap-8">
          <span
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: 'clamp(9px, 2vw, 12px)',
              color: '#B8A07A',
              letterSpacing: '1px'
            }}
            data-testid="text-lesson-label"
          >
            Lesson One — The Barter System
          </span>
          <button
            onClick={() => handleStart('')}
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
