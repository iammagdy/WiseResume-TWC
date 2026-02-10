import { useRef } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  animationDelay: number;
  animationDuration: number;
}

// Pre-generate stars for consistent renders
function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    animationDelay: Math.random() * 5,
    animationDuration: 3 + Math.random() * 2,
  }));
}

interface HomeBackgroundProps {
  children: React.ReactNode;
}

export function HomeBackground({ children }: HomeBackgroundProps) {
  const starsRef = useRef<Star[]>(generateStars(12));

  return (
    <div className="relative min-h-full bg-background">
      {/* Floating stars layer - CSS animations only for performance */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {starsRef.current.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-primary/60"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              animation: `twinkle ${star.animationDuration}s ease-in-out ${star.animationDelay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Nebula gradient overlays */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Top-left primary nebula */}
        <div 
          className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.12]"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
          }}
        />
        {/* Bottom-right accent nebula */}
        <div 
          className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.08]"
          style={{
            background: 'radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)',
          }}
        />
        {/* Center secondary glow */}
        <div 
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[300px] opacity-[0.06]"
          style={{
            background: 'radial-gradient(ellipse, hsl(var(--secondary)) 0%, transparent 60%)',
          }}
        />
        {/* Bottom center primary glow */}
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-[0.05]"
          style={{
            background: 'radial-gradient(ellipse at bottom, hsl(var(--primary)) 0%, transparent 70%)',
          }}
        />
      </div>
      
      {/* Content layer */}
      <div className="relative z-10">
        {children}
      </div>

      {/* CSS Keyframes for star twinkle - injected via style tag */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
