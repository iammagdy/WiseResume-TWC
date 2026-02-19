import { useRef, useMemo } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

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
  const stars = useMemo(() => generateStars(25), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end start'] });

  const yFar = useTransform(scrollYProgress, [0, 1], ['0%', '-5%']);
  const yMid = useTransform(scrollYProgress, [0, 1], ['0%', '-15%']);
  const yNear = useTransform(scrollYProgress, [0, 1], ['0%', '-25%']);

  const noMotion = prefersReducedMotion ? '0%' : undefined;

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-x-hidden bg-[hsl(240_30%_3%)]">
      {/* Layer 0: Deep space gradient - farthest */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-[hsl(240_30%_3%)] via-[hsl(270_40%_8%)] to-[hsl(240_30%_3%)]"
        style={{ y: noMotion ?? yFar }}
        aria-hidden="true"
      />

      {/* Layer 1: Nebula overlay - mid */}
      <motion.div
        className="absolute inset-0 opacity-25"
        style={{
          y: noMotion ?? yMid,
          background: `
            radial-gradient(ellipse at 15% 25%, hsl(270 70% 25% / 0.5) 0%, transparent 45%),
            radial-gradient(ellipse at 85% 55%, hsl(185 70% 25% / 0.4) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 85%, hsl(330 70% 25% / 0.4) 0%, transparent 50%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Layer 2: Floating orbs - nearest parallax layer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ y: noMotion ?? yNear }}
        aria-hidden="true"
      >
        <div
          className="absolute w-[320px] h-[320px] rounded-full opacity-[0.08] blur-[80px]"
          style={{
            top: '10%',
            left: '20%',
            background: 'radial-gradient(circle, hsl(270 60% 50%) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute w-[260px] h-[260px] rounded-full opacity-[0.06] blur-[70px]"
          style={{
            top: '45%',
            right: '10%',
            background: 'radial-gradient(circle, hsl(185 60% 45%) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute w-[280px] h-[280px] rounded-full opacity-[0.07] blur-[75px]"
          style={{
            bottom: '15%',
            left: '55%',
            background: 'radial-gradient(circle, hsl(330 50% 45%) 0%, transparent 70%)',
          }}
        />
      </motion.div>

      {/* Layer 3: Twinkling stars */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white/80"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animation: prefersReducedMotion
                ? 'none'
                : `twinkle ${3 + star.delay}s ease-in-out ${star.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
