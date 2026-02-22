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
}

const planets: Planet[] = [
  { name: 'WiseResume', locked: false, route: '/home', color: 'hsl(213 90% 55%)', icon: 'rocket' },
  { name: 'PDF Tools', locked: true, route: '', color: 'hsl(0 0% 45%)', icon: 'lock' },
  { name: 'Finance', locked: true, route: '', color: 'hsl(0 0% 45%)', icon: 'lock' },
];

export default function MobileSolarSystem() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wiseAIOpen, setWiseAIOpen] = useState(false);

  // Canvas starfield
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 0.3 + Math.random() * 1.2,
      baseAlpha: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
    }));

    let lastFrame = 0;
    const frameDuration = 1000 / 30; // 30 FPS cap
    let animId: number;
    let paused = false;

    const animate = (time: number) => {
      if (paused) return;
      if (time - lastFrame < frameDuration) {
        animId = requestAnimationFrame(animate);
        return;
      }
      lastFrame = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((star) => {
        const alpha = star.baseAlpha * (0.5 + 0.5 * Math.sin(time * 0.001 * star.speed + star.phase));
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      });

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

  // Orbit layout: center at 50%/40%, 3 planets at equal angles
  const containerSize = 320;
  const centerX = containerSize / 2;
  const centerY = containerSize / 2;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(240 30% 2%) 0%, hsl(250 25% 5%) 40%, hsl(240 20% 8%) 100%)' }}>
      {/* Starfield canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Nebula glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, hsl(270 60% 30% / 0.4) 0%, transparent 70%)' }}
      />

      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+12px)]">
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
        {/* Orbit rings */}
        {[0.38, 0.58, 0.78].map((r, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-white/[0.06]"
            style={{
              width: r * containerSize,
              height: r * containerSize,
              left: centerX - (r * containerSize) / 2,
              top: centerY - (r * containerSize) / 2,
            }}
          />
        ))}

        {/* Sun (center) */}
        <button
          onClick={() => setWiseAIOpen(true)}
          className="absolute z-10 active:scale-95 transition-transform touch-manipulation"
          style={{
            width: 64,
            height: 64,
            left: centerX - 32,
            top: centerY - 32,
          }}
        >
          {/* Outer glow */}
          <div
            className="absolute -inset-6 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(33 100% 50% / 0.25) 0%, transparent 70%)',
            }}
          />
          {/* Mid glow - pulse */}
          <div
            className="absolute -inset-3 rounded-full animate-pulse"
            style={{
              background: 'radial-gradient(circle, hsl(43 96% 70% / 0.4) 0%, transparent 70%)',
              animationDuration: '3s',
            }}
          />
          {/* Core */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle at 40% 40%, hsl(43 96% 90%) 0%, hsl(33 100% 55%) 40%, hsl(20 100% 45%) 80%)',
              boxShadow: '0 0 30px hsl(33 100% 50% / 0.6), 0 0 60px hsl(33 100% 50% / 0.3)',
            }}
          >
            <div
              className="absolute inset-[30%] rounded-full"
              style={{ background: 'radial-gradient(circle, hsl(50 100% 95% / 0.8) 0%, transparent 70%)' }}
            />
          </div>
        </button>

        {/* Planets */}
        {planets.map((planet, i) => {
          const orbitRadii = [0.38, 0.58, 0.78];
          const angles = [-Math.PI / 2, -Math.PI / 2 + (2 * Math.PI) / 3, -Math.PI / 2 + (4 * Math.PI) / 3];
          const r = (orbitRadii[i] * containerSize) / 2;
          const x = centerX + Math.cos(angles[i]) * r - 20;
          const y = centerY + Math.sin(angles[i]) * r - 20;

          return (
            <div key={planet.name} className="absolute" style={{ left: x, top: y }}>
              <button
                onClick={() => handlePlanetClick(planet)}
                className="relative w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform touch-manipulation"
                style={{
                  background: planet.locked
                    ? 'linear-gradient(135deg, hsl(0 0% 30%), hsl(0 0% 20%))'
                    : `linear-gradient(135deg, ${planet.color}, hsl(213 80% 35%))`,
                  boxShadow: planet.locked
                    ? 'none'
                    : `0 0 16px ${planet.color.replace(')', ' / 0.5)')}`,
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
                className="absolute top-11 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium"
                style={{ color: planet.locked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)' }}
              >
                {planet.name}
                {planet.locked && (
                  <span className="ml-1 text-[8px] text-white/20">🔒</span>
                )}
              </p>
            </div>
          );
        })}
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-[calc(env(safe-area-inset-bottom)+20px)] text-center">
        <p className="text-white/25 text-[11px] tracking-wider">
          Tap the sun or planets to explore
        </p>
      </div>

      <WiseAIModal open={wiseAIOpen} onOpenChange={setWiseAIOpen} />
    </div>
  );
}
