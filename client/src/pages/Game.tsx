import { useEffect, useRef, useCallback, useState } from 'react';
import { VillageLedgerGame } from '@/lib/gameEngine';

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
      <div className="flex flex-col items-center max-w-xl w-full px-6 py-8">
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

        <div className="flex flex-col items-center gap-3">
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
