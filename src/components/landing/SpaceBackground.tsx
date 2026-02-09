import { useMemo } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.5 + 0.3,
    delay: Math.random() * 3,
  }));
}

export function SpaceBackground({ children }: { children: React.ReactNode }) {
  // Reduced star count for performance - CSS animations only
  const stars = useMemo(() => generateStars(25), []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(240_30%_3%)]">
      {/* Deep space gradient - static, no JS */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-[hsl(240_30%_3%)] via-[hsl(270_40%_8%)] to-[hsl(240_30%_3%)]"
        aria-hidden="true"
      />
      
      {/* Nebula overlay - static */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(ellipse at 15% 25%, hsl(270 70% 25% / 0.5) 0%, transparent 45%),
            radial-gradient(ellipse at 85% 55%, hsl(185 70% 25% / 0.4) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 85%, hsl(330 70% 25% / 0.4) 0%, transparent 50%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Star field - CSS-only animations for performance */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white star-twinkle"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Single shooting star - CSS animation */}
      <div
        className="absolute w-1 h-1 bg-white rounded-full shooting-star"
        style={{
          top: '10%',
          left: '-5%',
          boxShadow: '0 0 6px 2px rgba(255,255,255,0.4), -20px 0 10px rgba(255,255,255,0.1)',
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
