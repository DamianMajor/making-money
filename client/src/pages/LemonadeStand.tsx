import { useEffect, useRef, useCallback } from 'react';
import LemonadeGame from '@/lib/lemonadeEngine';

export default function LemonadeStand() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<LemonadeGame | null>(null);

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
        background: '#000',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      data-testid="lemonade-game-container"
    >
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
