import { useEffect, useRef, useCallback, useState } from 'react';
import LemonadeGame from '@/lib/lemonadeEngine';

function useIsPortrait() {
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    const mql = window.matchMedia('(orientation: portrait)');
    mql.addEventListener('change', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
      mql.removeEventListener('change', check);
    };
  }, []);

  return isPortrait;
}

function RotateDeviceOverlay() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        zIndex: 9999,
        background: 'linear-gradient(180deg, #FFF8E1 0%, #FFE082 50%, #FFD54F 100%)',
      }}
      data-testid="rotate-device-overlay"
    >
      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#5D4037" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '24px' }}>
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2" />
        <path d="M17 8l3 3-3 3" stroke="#FF7043" strokeWidth="2" />
        <path d="M20 11h-4" stroke="#FF7043" strokeWidth="2" />
      </svg>
      <h2
        style={{
          fontFamily: 'Fredoka One, Baloo 2, Nunito, sans-serif',
          fontSize: 'clamp(16px, 4vw, 24px)',
          color: '#3E2723',
          lineHeight: 1.6,
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        Please rotate your device
      </h2>
      <p
        style={{
          fontFamily: 'Nunito, sans-serif',
          fontSize: 'clamp(12px, 2.5vw, 16px)',
          color: '#5D4037',
          lineHeight: 1.7,
          textAlign: 'center',
          padding: '0 32px',
          marginTop: '12px',
        }}
      >
        This game is best played in landscape mode
      </p>
    </div>
  );
}

export default function LemonadeStand() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<LemonadeGame | null>(null);
  const isPortrait = useIsPortrait();

  const initGame = useCallback(() => {
    if (!canvasRef.current) return;
    if (gameRef.current) {
      gameRef.current.destroy();
    }
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const game = new LemonadeGame(canvas);
    gameRef.current = game;
    game.start();
  }, []);

  useEffect(() => {
    initGame();
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, [initGame]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#7BC950',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      data-testid="lemonade-game-container"
    >
      {isPortrait && <RotateDeviceOverlay />}
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100vw',
          height: '100vh',
          touchAction: 'none',
        }}
        data-testid="lemonade-game-canvas"
      />
    </div>
  );
}
