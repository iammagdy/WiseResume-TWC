import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

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
    size: Math.random() * 2 + 1,
    opacity: Math.random() * 0.5 + 0.3,
    delay: Math.random() * 3,
  }));
}

export function SpaceBackground({ children }: { children: React.ReactNode }) {
  const starsRef = useRef<Star[]>(generateStars(50));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(var(--space-deep))]">
      {/* Deep space gradient */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-[hsl(240_30%_3%)] via-[hsl(270_40%_8%)] to-[hsl(240_30%_3%)]"
        aria-hidden="true"
      />
      
      {/* Nebula overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, hsl(270 60% 20% / 0.4) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 60%, hsl(185 60% 20% / 0.3) 0%, transparent 40%),
            radial-gradient(ellipse at 40% 80%, hsl(330 60% 20% / 0.3) 0%, transparent 45%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Star field */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {starsRef.current.map((star) => (
          <motion.div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
            }}
            initial={{ opacity: star.opacity * 0.3 }}
            animate={{ 
              opacity: [star.opacity * 0.3, star.opacity, star.opacity * 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3,
              delay: star.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Occasional shooting star */}
      <motion.div
        className="absolute w-1 h-1 bg-white rounded-full"
        style={{
          top: '10%',
          left: '-5%',
          boxShadow: '0 0 4px 2px rgba(255,255,255,0.3), -20px 0 10px rgba(255,255,255,0.1)',
        }}
        initial={{ x: 0, y: 0, opacity: 0 }}
        animate={{ 
          x: ['0%', '120vw'],
          y: ['0%', '30vh'],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 3,
          delay: 5,
          repeat: Infinity,
          repeatDelay: 8,
          ease: 'easeOut',
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
