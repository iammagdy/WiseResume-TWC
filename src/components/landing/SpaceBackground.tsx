import { useMemo } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.8,
    opacity: Math.random() * 0.5 + 0.5,
    delay: Math.random() * 4,
    duration: 2.5 + Math.random() * 2.5,
  }));
}

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function SpaceBackground({ children }: { children: React.ReactNode }) {
  const stars = useMemo(() => generateStars(20), []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[hsl(240_30%_3%)]">
      {/* Layer 0: Deep space gradient with warm tint */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%, hsl(355 60% 12% / 0.6) 0%, transparent 50%),
            linear-gradient(180deg, hsl(240_30%_4%) 0%, hsl(270_35%_6%) 50%, hsl(240_30%_3%) 100%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Layer 1: Nebula overlay — boosted opacity with brand red */}
      <div
        className="absolute inset-0 opacity-45"
        style={{
          background: `
            radial-gradient(ellipse at 15% 25%, hsl(270 70% 30% / 0.55) 0%, transparent 45%),
            radial-gradient(ellipse at 85% 55%, hsl(185 70% 28% / 0.45) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 85%, hsl(330 70% 28% / 0.45) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 15%, hsl(355 85% 35% / 0.4) 0%, transparent 35%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Layer 2: Floating orbs — visible and animated */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute w-[380px] h-[380px] rounded-full"
          style={{
            top: '8%',
            left: '15%',
            opacity: 0.16,
            background: 'radial-gradient(circle, hsl(270 65% 55%) 0%, transparent 70%)',
            animation: prefersReducedMotion ? 'none' : 'orb-float 10s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full"
          style={{
            top: '40%',
            right: '8%',
            opacity: 0.13,
            background: 'radial-gradient(circle, hsl(185 65% 48%) 0%, transparent 70%)',
            animation: prefersReducedMotion ? 'none' : 'orb-float 13s ease-in-out 3s infinite reverse',
          }}
        />
        <div
          className="absolute w-[340px] h-[340px] rounded-full"
          style={{
            bottom: '10%',
            left: '50%',
            opacity: 0.14,
            background: 'radial-gradient(circle, hsl(355 80% 50%) 0%, transparent 70%)',
            animation: prefersReducedMotion ? 'none' : 'orb-float 11s ease-in-out 1.5s infinite',
          }}
        />
        <div
          className="absolute w-[220px] h-[220px] rounded-full"
          style={{
            top: '60%',
            left: '5%',
            opacity: 0.10,
            background: 'radial-gradient(circle, hsl(330 60% 50%) 0%, transparent 70%)',
            animation: prefersReducedMotion ? 'none' : 'orb-float 8s ease-in-out 5s infinite reverse',
          }}
        />
      </div>

      {/* Layer 3: Twinkling stars — 20 crisp, visible stars */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ contain: 'layout style paint' }}
        aria-hidden="true"
      >
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animation: prefersReducedMotion
                ? 'none'
                : `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Layer 4: Shooting star */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div
            style={{
              position: 'absolute',
              top: '18%',
              left: '60%',
              width: '120px',
              height: '1.5px',
              borderRadius: '999px',
              background: 'linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.9), transparent)',
              opacity: 0,
              animation: 'shooting-star 8s ease-in-out 2s infinite',
              transform: 'rotate(-30deg)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '40%',
              left: '25%',
              width: '90px',
              height: '1px',
              borderRadius: '999px',
              background: 'linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.7), transparent)',
              opacity: 0,
              animation: 'shooting-star 8s ease-in-out 6s infinite',
              transform: 'rotate(-25deg)',
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes orb-float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-24px) scale(1.04); }
        }
        @keyframes shooting-star {
          0% { opacity: 0; transform: translateX(-60px) rotate(-30deg); }
          5% { opacity: 1; }
          15% { opacity: 0; transform: translateX(120px) rotate(-30deg); }
          100% { opacity: 0; transform: translateX(120px) rotate(-30deg); }
        }
      `}</style>
    </div>
  );
}
