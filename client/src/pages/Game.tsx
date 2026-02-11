import { useEffect, useRef, useCallback, useState } from 'react';
import { VillageLedgerGame } from '@/lib/gameEngine';
import { soundManager } from '@/lib/soundManager';

const MONEY_ICONS = [
  'money-shell', 'money-beads', 'money-goldbar', 'money-coin', 'money-raistone',
  'money-cattle', 'money-salt', 'money-teabrick', 'money-feather', 'money-cocoa',
  'money-banknote', 'money-creditcard', 'money-moderncoins', 'money-bitcoin',
  'money-yen', 'money-yuan', 'money-euro',
  'money-chicken', 'money-fish', 'money-silvercoins', 'money-wheat'
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
        opacity: 0.45 + Math.random() * 0.4,
      };
    }

    const matrixCharSize = 14;
    const matrixCols = 4;
    const matrixStripWidth = matrixCols * matrixCharSize;
    const matrixStripX = 10;
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

    const STOCK_POINTS = 300;
    const STOCK_STEP = 8;
    const stockOsc: number[] = [];
    let osc = 0;
    let oscVel = 0;
    const minVel = 0.06;
    for (let i = 0; i < STOCK_POINTS; i++) {
      let nudge = (Math.random() - 0.5) * 0.5;
      oscVel += nudge;
      oscVel *= 0.92;
      if (Math.abs(oscVel) < minVel) oscVel = oscVel >= 0 ? minVel : -minVel;
      osc += oscVel;
      osc = Math.max(-1, Math.min(1, osc));
      if (osc >= 1 || osc <= -1) oscVel *= -0.5;
      stockOsc.push(osc);
    }
    let stockScrollX = 0;
    const STOCK_SPEED = 30;

    let lastTime = performance.now();
    function animate(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const w = canvas!.width;
      const h = canvas!.height;
      ctx!.clearRect(0, 0, w, h);

      stockScrollX += STOCK_SPEED * dt;
      if (stockScrollX >= STOCK_STEP) {
        stockScrollX -= STOCK_STEP;
        let nudge = (Math.random() - 0.5) * 0.5;
        oscVel += nudge;
        oscVel *= 0.92;
        if (Math.abs(oscVel) < minVel) oscVel = oscVel >= 0 ? minVel : -minVel;
        osc += oscVel;
        osc = Math.max(-1, Math.min(1, osc));
        if (osc >= 1 || osc <= -1) oscVel *= -0.5;
        stockOsc.push(osc);
        if (stockOsc.length > STOCK_POINTS + 50) stockOsc.splice(0, 50);
      }

      const bottomY = h * 0.92;
      const topY = h * 0.15;
      const oscAmp = h * 0.06;
      ctx!.save();
      ctx!.lineWidth = 1.5;
      ctx!.globalAlpha = 0.25;
      const startIdx = Math.max(0, stockOsc.length - STOCK_POINTS);
      const offsetX = -stockScrollX;
      const arrowStopX = w * 0.78;
      const slopePerPoint = (topY - bottomY) / (STOCK_POINTS - 1);

      function getStockY(idx: number): number {
        const pos = idx - startIdx;
        const baseline = bottomY + slopePerPoint * pos;
        return baseline + stockOsc[idx] * oscAmp;
      }

      const lastVisibleIdx = stockOsc.length - 1;
      const lastX = (lastVisibleIdx - startIdx) * STOCK_STEP + offsetX;
      const lastY = getStockY(lastVisibleIdx);
      const secondLastY = getStockY(lastVisibleIdx - 1);
      const secondLastX = (lastVisibleIdx - 1 - startIdx) * STOCK_STEP + offsetX;
      const lineEndX = Math.min(lastX, arrowStopX);
      for (let i = startIdx; i < stockOsc.length - 1; i++) {
        const x1 = (i - startIdx) * STOCK_STEP + offsetX;
        const x2 = (i - startIdx + 1) * STOCK_STEP + offsetX;
        if (x2 < 0) continue;
        if (x1 > lineEndX) break;
        const y1 = getStockY(i);
        const y2 = getStockY(i + 1);
        const goingUp = y2 < y1;
        ctx!.strokeStyle = goingUp ? '#00cc44' : '#cc2222';
        ctx!.shadowColor = goingUp ? '#00ff55' : '#ff3333';
        ctx!.shadowBlur = 4;
        ctx!.beginPath();
        ctx!.moveTo(x1, y1);
        const clippedX2 = Math.min(x2, lineEndX);
        const t2 = (x2 === x1) ? 1 : (clippedX2 - x1) / (x2 - x1);
        const clippedY2 = y1 + t2 * (y2 - y1);
        ctx!.lineTo(clippedX2, clippedY2);
        ctx!.stroke();
      }
      {
        const tipX = lineEndX;
        const angle = Math.atan2(lastY - secondLastY, lastX - secondLastX);
        const t = (lineEndX - secondLastX) / ((lastX - secondLastX) || 1);
        const tipY = secondLastY + t * (lastY - secondLastY);
        const arrowLen = 12;
        const goingUp = lastY < secondLastY;
        const arrowColor = goingUp ? '#00cc44' : '#cc2222';
        ctx!.fillStyle = arrowColor;
        ctx!.shadowColor = goingUp ? '#00ff55' : '#ff3333';
        ctx!.shadowBlur = 6;
        ctx!.beginPath();
        ctx!.moveTo(tipX, tipY);
        ctx!.lineTo(tipX - arrowLen * Math.cos(angle - 0.4), tipY - arrowLen * Math.sin(angle - 0.4));
        ctx!.lineTo(tipX - arrowLen * Math.cos(angle + 0.4), tipY - arrowLen * Math.sin(angle + 0.4));
        ctx!.closePath();
        ctx!.fill();
      }
      ctx!.restore();

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

interface AudioGraph {
  ctx: AudioContext;
  dry: GainNode;
  wetGain: GainNode;
  feedback: GainNode;
}

function ReflectionScreen({ onContinue, audioRef, audioGraphRef }: { onContinue: (answer: string) => void; audioRef: React.MutableRefObject<HTMLAudioElement | null>; audioGraphRef: React.MutableRefObject<AudioGraph | null> }) {
  const [answer, setAnswer] = useState('');
  const [muted, setMuted] = useState(() => {
    try {
      const stored = localStorage.getItem('villageLedger_soundSettings');
      if (stored) return JSON.parse(stored).muted ?? false;
    } catch {}
    return false;
  });

  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    if (audioRef.current) {
      audioRef.current.muted = newMuted;
    }
    soundManager.setMuted(newMuted);
    try {
      const stored = localStorage.getItem('villageLedger_soundSettings');
      const settings = stored ? JSON.parse(stored) : {};
      settings.muted = newMuted;
      localStorage.setItem('villageLedger_soundSettings', JSON.stringify(settings));
    } catch {}
  };

  useEffect(() => {
    const muted = (() => {
      try {
        const stored = localStorage.getItem('villageLedger_soundSettings');
        if (stored) return JSON.parse(stored).muted ?? false;
      } catch {}
      return false;
    })();
    const audio = new Audio('/sounds/money_song_1.mp3');
    audio.loop = true;
    audio.volume = 0.5;
    audio.preload = 'auto';
    audio.muted = muted;
    audioRef.current = audio;

    try {
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const source = ctx.createMediaElementSource(audio);
      (audio as any)._mediaSourceAttached = true;

      const dry = ctx.createGain();
      dry.gain.value = 1.0;

      const delayNode = ctx.createDelay(2.0);
      delayNode.delayTime.value = 0.5;

      const feedback = ctx.createGain();
      feedback.gain.value = 0;

      const wetGain = ctx.createGain();
      wetGain.gain.value = 0;

      source.connect(dry);
      dry.connect(ctx.destination);

      source.connect(delayNode);
      delayNode.connect(feedback);
      feedback.connect(delayNode);
      delayNode.connect(wetGain);
      wetGain.connect(ctx.destination);

      audioGraphRef.current = { ctx, dry, wetGain, feedback };
    } catch (e) {
      console.warn('[ReflectionScreen] AudioContext setup failed:', e);
    }

    if (!muted) {
      audio.play().catch(() => {
        const resumeOnInteraction = () => {
          audioRef.current?.play().catch(() => {});
          document.removeEventListener('click', resumeOnInteraction);
          document.removeEventListener('touchstart', resumeOnInteraction);
        };
        document.addEventListener('click', resumeOnInteraction);
        document.addEventListener('touchstart', resumeOnInteraction);
      });
    }
  }, [audioRef, audioGraphRef]);

  const handleContinue = () => {
    onContinue(answer);
  };

  return (
    <div
      className="fixed inset-0 w-full h-full flex items-center justify-center"
      style={{
        background: 'linear-gradient(180deg, #1a1208 0%, #2d1f0e 30%, #3d2b14 60%, #2a1c0a 100%)',
        zIndex: 50
      }}
      data-testid="reflection-screen"
    >
      <button
        onClick={toggleMute}
        className="cursor-pointer"
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 10,
          background: 'none',
          border: 'none',
          padding: '8px',
          opacity: 0.4,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; }}
        data-testid="button-mute-reflection"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {muted ? (
            <>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#888888" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </>
          ) : (
            <>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#888888" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </>
          )}
        </svg>
      </button>
      <div className="flex flex-col items-center max-w-lg w-full px-6 py-8" style={{ position: 'relative', zIndex: 1 }}>
        <h2
          className="text-center mb-6"
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 'clamp(16px, 4vw, 28px)',
            color: '#E8D5A8',
            textShadow: '2px 2px 0px #5a4a32, 0 0 15px rgba(255,215,100,0.4)',
            lineHeight: 1.4
          }}
          data-testid="text-reflection-title"
        >
          What is Money?
        </h2>
        <p
          className="text-center mb-8"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 'clamp(12px, 2.5vw, 16px)',
            color: '#B8A07A',
            lineHeight: 1.7
          }}
          data-testid="text-reflection-description"
        >
        </p>
        <label
          className="w-full mb-2 text-center"
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 'clamp(8px, 1.5vw, 10px)',
            color: '#9B8A6A',
            display: 'block'
          }}
          data-testid="text-reflection-label"
        >
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer here."
          className="w-full mb-6"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 'clamp(12px, 2vw, 15px)',
            textAlign: 'center',
            color: '#E8D5A8',
            background: 'rgba(30, 22, 12, 0.8)',
            border: '2px solid #5a4a32',
            borderRadius: '8px',
            padding: '12px 14px',
            minHeight: '80px',
            resize: 'none',
            outline: 'none',
          }}
          data-testid="input-reflection-answer"
        />
        <button
          onClick={handleContinue}
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
          data-testid="button-continue"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function IntroScreen({ onStart, audioRef, audioGraphRef, onMount }: { onStart: () => void; audioRef: React.MutableRefObject<HTMLAudioElement | null>; audioGraphRef: React.MutableRefObject<AudioGraph | null>; onMount?: () => void }) {
  const [muted, setMuted] = useState(() => {
    try {
      const stored = localStorage.getItem('villageLedger_soundSettings');
      if (stored) return JSON.parse(stored).muted ?? false;
    } catch {}
    return false;
  });

  useEffect(() => {
    if (onMount) onMount();

    return () => {
      if (audioGraphRef.current) {
        audioGraphRef.current.ctx.close().catch(() => {});
        audioGraphRef.current = null;
      }
      if (audioRef.current) {
        (audioRef.current as any)._mediaSourceAttached = false;
      }
    };
  }, [onMount, audioRef, audioGraphRef]);

  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    if (audioRef.current) {
      audioRef.current.muted = newMuted;
    }
    try {
      const stored = localStorage.getItem('villageLedger_soundSettings');
      const settings = stored ? JSON.parse(stored) : {};
      settings.muted = newMuted;
      localStorage.setItem('villageLedger_soundSettings', JSON.stringify(settings));
    } catch {}
  };

  const startedRef = useRef(false);

  const handleStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (audioRef.current && audioGraphRef.current) {
      const audio = audioRef.current;
      const { ctx, dry, wetGain, feedback } = audioGraphRef.current;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const fadeDuration = 2.0;

      feedback.gain.setValueAtTime(0.45, now);
      feedback.gain.linearRampToValueAtTime(0.15, now + fadeDuration);

      wetGain.gain.setValueAtTime(0.6, now);
      wetGain.gain.linearRampToValueAtTime(0, now + fadeDuration);

      dry.gain.setValueAtTime(1.0, now);
      dry.gain.linearRampToValueAtTime(0, now + fadeDuration * 0.6);

      setTimeout(() => {
        audio.pause();
        audio.src = '';
        audioGraphRef.current?.ctx.close().catch(() => {});
        audioGraphRef.current = null;
      }, (fadeDuration + 1.5) * 1000);
    } else if (audioRef.current) {
      const audio = audioRef.current;
      const fadeStep = 0.05;
      const fadeInterval = setInterval(() => {
        if (audio.volume > fadeStep) {
          audio.volume -= fadeStep;
        } else {
          audio.volume = 0;
          audio.pause();
          audio.src = '';
          clearInterval(fadeInterval);
        }
      }, 25);
    }
    onStart();
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
      <button
        onClick={toggleMute}
        className="cursor-pointer"
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 10,
          background: 'none',
          border: 'none',
          padding: '8px',
          opacity: 0.4,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; }}
        data-testid="button-mute"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {muted ? (
            <>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#888888" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </>
          ) : (
            <>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#888888" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </>
          )}
        </svg>
      </button>
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
            onClick={handleStart}
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

function LoadingScreen({ onLoaded }: { onLoaded: () => void }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const totalAssets = MONEY_ICONS.length + 1;
    let loaded = 0;

    function tick() {
      if (cancelled) return;
      loaded++;
      setProgress(Math.min(loaded / totalAssets, 1));
      if (loaded >= totalAssets) {
        setTimeout(() => {
          if (!cancelled) {
            setFadeOut(true);
            setTimeout(() => { if (!cancelled) onLoaded(); }, 500);
          }
        }, 300);
      }
    }

    MONEY_ICONS.forEach(name => {
      const img = new Image();
      img.onload = tick;
      img.onerror = tick;
      img.src = `/sprites/${name}.png`;
    });

    const songCheck = new Audio();
    songCheck.preload = 'auto';
    const songLoaded = () => { tick(); songCheck.removeEventListener('canplaythrough', songLoaded); };
    songCheck.addEventListener('canplaythrough', songLoaded);
    songCheck.src = '/sounds/money_song_1.mp3';
    const songTimeout = setTimeout(() => { songCheck.removeEventListener('canplaythrough', songLoaded); tick(); }, 8000);

    return () => { cancelled = true; clearTimeout(songTimeout); };
  }, [onLoaded]);

  return (
    <div
      className="fixed inset-0 w-full h-full flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(180deg, #1a1208 0%, #2d1f0e 30%, #3d2b14 60%, #2a1c0a 100%)',
        zIndex: 60,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.5s ease-out',
      }}
      data-testid="loading-screen"
    >
      <h1
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 'clamp(18px, 4.5vw, 32px)',
          color: '#E8D5A8',
          textShadow: '2px 2px 0px #5a4a32, 0 0 15px rgba(255,215,100,0.4)',
          lineHeight: 1.4,
          marginBottom: '40px',
        }}
        data-testid="text-loading-title"
      >
        MAKING MONEY
      </h1>
      <div
        style={{
          width: 'min(280px, 70vw)',
          height: '8px',
          background: 'rgba(60, 45, 25, 0.6)',
          borderRadius: '4px',
          border: '1px solid #5a4a32',
          overflow: 'hidden',
        }}
        data-testid="loading-bar-container"
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #8B7355, #C9B896)',
            borderRadius: '4px',
            transition: 'width 0.3s ease-out',
          }}
          data-testid="loading-bar-fill"
        />
      </div>
      <span
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 'clamp(7px, 1.5vw, 9px)',
          color: '#7A6A50',
          marginTop: '16px',
        }}
        data-testid="text-loading-label"
      >
        Loading...
      </span>
    </div>
  );
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<VillageLedgerGame | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioGraphRef = useRef<AudioGraph | null>(null);
  const [screen, setScreen] = useState<'loading' | 'reflection' | 'intro' | 'game'>('loading');
  const gameInitialized = useRef(false);

  const initGameEngine = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || gameInitialized.current) return;
    gameInitialized.current = true;
    gameRef.current = new VillageLedgerGame(canvas);
    gameRef.current.preloadAudio();
    gameRef.current.start(false);
  }, []);

  const handleResize = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.resize();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
      }
    };
  }, []);

  const handleLoadingComplete = useCallback(() => {
    setScreen('reflection');
  }, []);

  const handleReflectionContinue = useCallback((answer: string) => {
    if (answer.trim()) {
      localStorage.setItem('makingMoney_moneyAnswer', answer.trim());
    }
    setScreen('intro');
  }, []);

  const handleIntroMount = useCallback(() => {
    initGameEngine();
    soundManager.prefetch();
  }, [initGameEngine]);

  const handleGameStart = useCallback(() => {
    if (!gameInitialized.current) {
      initGameEngine();
    }
    setScreen('game');
    handleResize();
    if (gameRef.current) {
      gameRef.current.beginGameplay();
    }
  }, [initGameEngine, handleResize]);

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
      {screen === 'game' && (
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
      {screen === 'loading' && <LoadingScreen onLoaded={handleLoadingComplete} />}
      {screen === 'reflection' && <ReflectionScreen onContinue={handleReflectionContinue} audioRef={audioRef} audioGraphRef={audioGraphRef} />}
      {screen === 'intro' && <IntroScreen onStart={handleGameStart} audioRef={audioRef} audioGraphRef={audioGraphRef} onMount={handleIntroMount} />}
    </div>
  );
}
