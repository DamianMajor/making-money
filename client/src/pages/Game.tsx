import { useEffect, useRef, useCallback } from 'react';
import { VillageLedgerGame } from '@/lib/gameEngine';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<VillageLedgerGame | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResize = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.resize();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize game
    gameRef.current = new VillageLedgerGame(canvas);
    gameRef.current.start();

    // Handle resize
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

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
          VILLAGE LEDGER
        </span>
      </div>
    </div>
  );
}
