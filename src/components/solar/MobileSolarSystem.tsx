import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import wiseAiLogo from '@/assets/wise-ai-logo.png';
import { WiseAIModal } from './WiseAIModal';

interface Planet {
  name: string;
  locked: boolean;
  route: string;
  color: string;
  icon: 'rocket' | 'lock';
  orbitRadius: number; // fraction of container
  orbitDuration: number; // seconds
  startAngle: number; // negative delay offset in seconds
  size: number; // px
}

const planets: Planet[] = [
  { name: 'WiseResume', locked: false, route: '/home', color: 'hsl(213 90% 55%)', icon: 'rocket', orbitRadius: 0.32, orbitDuration: 14, startAngle: -3, size: 42 },
  { name: 'PDF Tools', locked: true, route: '', color: 'hsl(0 0% 45%)', icon: 'lock', orbitRadius: 0.50, orbitDuration: 20, startAngle: -8, size: 36 },
  { name: 'Finance', locked: true, route: '', color: 'hsl(0 0% 45%)', icon: 'lock', orbitRadius: 0.68, orbitDuration: 28, startAngle: -14, size: 36 },
];

const SUN_SIZE = 80;

export default function MobileSolarSystem() {
  const navigate = useNavigate();
  const starCanvasRef = useRef<HTMLCanvasElement>(null);
  const sunCanvasRef = useRef<HTMLCanvasElement>(null);
  const [wiseAIOpen, setWiseAIOpen] = useState(false);

  // Star + Sun canvas animation (shared loop, 30 FPS)
  useEffect(() => {
    const starCanvas = starCanvasRef.current;
    const sunCanvas = sunCanvasRef.current;
    if (!starCanvas || !sunCanvas) return;

    const starCtx = starCanvas.getContext('2d')!;
    const sunCtx = sunCanvas.getContext('2d')!;

    const resize = () => {
      starCanvas.width = window.innerWidth;
      starCanvas.height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio, 2);
      sunCanvas.width = (SUN_SIZE + 40) * dpr;
      sunCanvas.height = (SUN_SIZE + 40) * dpr;
      sunCtx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * starCanvas.width,
      y: Math.random() * starCanvas.height,
      radius: 0.3 + Math.random() * 1.2,
      baseAlpha: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
    }));

    let lastFrame = 0;
    const frameDuration = 1000 / 30;
    let animId: number;
    let paused = false;

    const drawSun = (time: number) => {
      const w = SUN_SIZE + 40;
      const cx = w / 2;
      const cy = w / 2;
      const r = SUN_SIZE / 2;
      const t = time * 0.001;

      sunCtx.clearRect(0, 0, w, w);

      // Outer corona glow (pulsing)
      const coronaPulse = 0.6 + 0.4 * Math.sin(t * 1.2);
      const coronaGrad = sunCtx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.6);
      coronaGrad.addColorStop(0, `hsla(33, 100%, 50%, ${0.15 * coronaPulse})`);
      coronaGrad.addColorStop(0.5, `hsla(33, 100%, 50%, ${0.06 * coronaPulse})`);
      coronaGrad.addColorStop(1, 'transparent');
      sunCtx.fillStyle = coronaGrad;
      sunCtx.beginPath();
      sunCtx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
      sunCtx.fill();

      // Main body gradient (animated shift)
      const coreShift = 0.5 + 0.5 * Math.sin(t * 0.8);
      const mainGrad = sunCtx.createRadialGradient(
        cx - r * 0.15, cy - r * 0.15, r * 0.05,
        cx, cy, r
      );
      mainGrad.addColorStop(0, `hsl(50, 100%, ${92 + 4 * coreShift}%)`);
      mainGrad.addColorStop(0.25, `hsl(43, 96%, ${78 + 4 * coreShift}%)`);
      mainGrad.addColorStop(0.55, 'hsl(33, 100%, 55%)');
      mainGrad.addColorStop(0.8, 'hsl(20, 100%, 45%)');
      mainGrad.addColorStop(1, 'hsl(10, 100%, 30%)');
      sunCtx.fillStyle = mainGrad;
      sunCtx.beginPath();
      sunCtx.arc(cx, cy, r, 0, Math.PI * 2);
      sunCtx.fill();

      // Surface texture: overlapping semi-transparent arcs
      sunCtx.save();
      sunCtx.globalCompositeOperation = 'soft-light';
      for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2 + t * 0.3;
        const arcR = r * (0.3 + 0.4 * Math.abs(Math.sin(angle * 2 + t)));
        const ax = cx + Math.cos(angle) * r * 0.3;
        const ay = cy + Math.sin(angle) * r * 0.3;
        sunCtx.fillStyle = `hsla(${40 + i * 3}, 100%, ${60 + 10 * Math.sin(t + i)}%, 0.08)`;
        sunCtx.beginPath();
        sunCtx.arc(ax, ay, arcR, 0, Math.PI * 2);
        sunCtx.fill();
      }
      sunCtx.restore();

      // Hot center highlight
      const highlightGrad = sunCtx.createRadialGradient(
        cx - r * 0.2, cy - r * 0.2, 0,
        cx - r * 0.2, cy - r * 0.2, r * 0.45
      );
      highlightGrad.addColorStop(0, 'hsla(50, 100%, 97%, 0.7)');
      highlightGrad.addColorStop(1, 'transparent');
      sunCtx.fillStyle = highlightGrad;
      sunCtx.beginPath();
      sunCtx.arc(cx, cy, r, 0, Math.PI * 2);
      sunCtx.fill();
    };

    const animate = (time: number) => {
      if (paused) return;
      if (time - lastFrame < frameDuration) {
        animId = requestAnimationFrame(animate);
        return;
      }
      lastFrame = time;

      // Stars
      starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
      stars.forEach((star) => {
        const alpha = star.baseAlpha * (0.5 + 0.5 * Math.sin(time * 0.001 * star.speed + star.phase));
        starCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        starCtx.beginPath();
        starCtx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        starCtx.fill();
      });

      // Sun
      drawSun(time);

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    const handleVisibility = () => {
      if (document.hidden) {
        paused = true;
      } else {
        paused = false;
        animId = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handlePlanetClick = useCallback(
    (planet: Planet) => {
      if (planet.locked) {
        toast('Coming Soon', { description: `${planet.name} is still in development` });
      } else {
        navigate(planet.route);
      }
    },
    [navigate]
  );

  const containerSize = Math.min(window.innerWidth * 0.85, 360);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(240 30% 2%) 0%, hsl(250 25% 5%) 40%, hsl(240 20% 8%) 100%)' }}>
      {/* Starfield canvas */}
      <canvas ref={starCanvasRef} className="absolute inset-0 w-full h-full" />

      {/* Nebula glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, hsl(270 60% 30% / 0.4) 0%, transparent 70%)' }}
      />

      {/* Header overlay - entrance animation */}
      <div
        className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+12px)]"
        style={{ animation: 'solar-fade-in 0.8s ease-out 0.2s both' }}
      >
        <img src={wiseAiLogo} alt="Wise AI" className="w-8 h-8 object-contain" />
        <div>
          <p className="text-white/90 text-sm font-display font-bold tracking-wider">WISE AI</p>
          <p className="text-white/40 text-[10px] tracking-wide">Your universe of intelligent tools</p>
        </div>
      </div>

      {/* Solar system container */}
      <div
        className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2"
        style={{ width: containerSize, height: containerSize }}
      >
        {/* Orbit rings with entrance animations */}
        {planets.map((planet, i) => {
          const ringSize = planet.orbitRadius * 2 * containerSize;
          const isUnlocked = !planet.locked;
          return (
            <div
              key={`ring-${i}`}
              className="absolute rounded-full"
              style={{
                width: ringSize,
                height: ringSize,
                left: containerSize / 2 - ringSize / 2,
                top: containerSize / 2 - ringSize / 2,
                border: isUnlocked
                  ? '1.5px solid rgba(74, 158, 255, 0.18)'
                  : '1px solid rgba(255, 255, 255, 0.10)',
                boxShadow: isUnlocked
                  ? '0 0 12px rgba(74, 158, 255, 0.08), inset 0 0 12px rgba(74, 158, 255, 0.04)'
                  : 'none',
                animation: `solar-fade-in 0.6s ease-out ${0.4 + i * 0.15}s both`,
              }}
            />
          );
        })}

        {/* Sun (center) - Canvas 2D + entrance animation */}
        <button
          onClick={() => setWiseAIOpen(true)}
          className="absolute z-10 active:scale-95 transition-transform touch-manipulation"
          style={{
            width: SUN_SIZE + 40,
            height: SUN_SIZE + 40,
            left: containerSize / 2 - (SUN_SIZE + 40) / 2,
            top: containerSize / 2 - (SUN_SIZE + 40) / 2,
            animation: 'solar-scale-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both',
          }}
        >
          <canvas
            ref={sunCanvasRef}
            className="w-full h-full"
            style={{ width: SUN_SIZE + 40, height: SUN_SIZE + 40 }}
          />
        </button>

        {/* Orbiting planets with CSS animations */}
        {planets.map((planet, i) => {
          const orbitR = planet.orbitRadius * containerSize;
          return (
            <div
              key={planet.name}
              className="absolute"
              style={{
                width: 0,
                height: 0,
                left: containerSize / 2,
                top: containerSize / 2,
                animation: `solar-orbit ${planet.orbitDuration}s linear infinite`,
                animationDelay: `${planet.startAngle}s`,
                animationFillMode: 'both',
              }}
            >
              {/* Planet offset from center, counter-rotate to stay upright */}
              <div
                style={{
                  position: 'absolute',
                  left: orbitR - planet.size / 2,
                  top: -planet.size / 2,
                  width: planet.size,
                  height: planet.size,
                  animation: `solar-counter-orbit ${planet.orbitDuration}s linear infinite`,
                  animationDelay: `${planet.startAngle}s`,
                  animationFillMode: 'both',
                  opacity: 0,
                  // Entrance: fade in after ring
                  ...({
                    '--entrance-delay': `${0.6 + i * 0.2}s`,
                  } as React.CSSProperties),
                }}
                className="solar-planet-entrance"
              >
                <button
                  onClick={() => handlePlanetClick(planet)}
                  className="relative w-full h-full rounded-full flex items-center justify-center active:scale-90 transition-transform touch-manipulation"
                  style={{
                    background: planet.locked
                      ? 'linear-gradient(135deg, hsl(0 0% 30%), hsl(0 0% 18%))'
                      : `linear-gradient(135deg, ${planet.color}, hsl(213 80% 35%))`,
                    boxShadow: planet.locked
                      ? '0 2px 8px rgba(0,0,0,0.4)'
                      : `0 0 18px ${planet.color.replace(')', ' / 0.45)')}, 0 2px 8px rgba(0,0,0,0.3)`,
                  }}
                >
                  {planet.locked ? (
                    <Lock className="w-4 h-4 text-white/40" />
                  ) : (
                    <Rocket className="w-4 h-4 text-white" />
                  )}
                </button>
                {/* Label */}
                <p
                  className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium"
                  style={{
                    top: planet.size + 4,
                    color: planet.locked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)',
                  }}
                >
                  {planet.name}
                  {planet.locked && <span className="ml-1 text-[8px] text-white/20">🔒</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom hint - entrance animation */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 pb-[calc(env(safe-area-inset-bottom)+20px)] text-center"
        style={{ animation: 'solar-fade-in 0.8s ease-out 1.2s both' }}
      >
        <p className="text-white/25 text-[11px] tracking-wider">
          Tap the sun or planets to explore
        </p>
      </div>

      <WiseAIModal open={wiseAIOpen} onOpenChange={setWiseAIOpen} />

      {/* Scoped CSS keyframes for orbit + entrance animations */}
      <style>{`
        @keyframes solar-orbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes solar-counter-orbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
        @keyframes solar-fade-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes solar-scale-in {
          0% { opacity: 0; transform: scale(0); }
          100% { opacity: 1; transform: scale(1); }
        }
        .solar-planet-entrance {
          animation: solar-planet-appear 0.5s ease-out var(--entrance-delay, 0.6s) both,
                     solar-counter-orbit var(--orbit-dur, 14s) linear infinite;
        }
        @keyframes solar-planet-appear {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
