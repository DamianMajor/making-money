import { useEffect, useRef, useCallback, useState } from 'react';
import { VillageLedgerGame, GameState } from '@/lib/gameEngine';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<VillageLedgerGame | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showInteractButton, setShowInteractButton] = useState(false);

  const handleResize = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.resize();
    }
  }, []);

  const handleInteract = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (gameRef.current) {
      gameRef.current.triggerInteraction();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize game
    gameRef.current = new VillageLedgerGame(canvas);
    gameRef.current.start();

    // Listen for state changes
    gameRef.current.onStateChange = (state: GameState) => {
      setShowInteractButton(state.showInteractButton && !state.currentDialogue);
    };

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
      
      {showInteractButton && (
        <button
          className="absolute touch-none select-none"
          style={{
            bottom: 'calc(20% + 48px)',
            right: '32px',
            width: '100px',
            height: '100px',
            maxWidth: '12vw',
            maxHeight: '12vw',
            minWidth: '80px',
            minHeight: '80px',
            background: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)',
            border: '4px solid #15803D',
            borderRadius: '16px',
            color: '#FFFFFF',
            fontFamily: '"Open Sans", sans-serif',
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: 'pointer',
            zIndex: 100,
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
          onTouchStart={handleInteract}
          onMouseDown={handleInteract}
          data-testid="button-interact"
        >
          INTERACT
        </button>
      )}
    </div>
  );
}
