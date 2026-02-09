import { useRef } from 'react';
import { motion } from 'framer-motion';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
  layer: number; // For parallax effect
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    opacity: Math.random() * 0.6 + 0.2,
    delay: Math.random() * 4,
    layer: Math.floor(Math.random() * 3), // 0, 1, or 2 for depth
  }));
}

export function SpaceBackground({ children }: { children: React.ReactNode }) {
  const starsRef = useRef<Star[]>(generateStars(120));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(240_30%_3%)]">
      {/* Deep space gradient */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-[hsl(240_30%_3%)] via-[hsl(270_40%_8%)] to-[hsl(240_30%_3%)]"
        aria-hidden="true"
      />
      
      {/* Enhanced nebula overlay */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(ellipse at 15% 25%, hsl(270 70% 25% / 0.5) 0%, transparent 45%),
            radial-gradient(ellipse at 85% 55%, hsl(185 70% 25% / 0.4) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 85%, hsl(330 70% 25% / 0.4) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 20%, hsl(200 60% 20% / 0.3) 0%, transparent 35%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Star field with parallax layers */}
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
              scale: [1, star.layer === 0 ? 1.4 : 1.2, 1],
            }}
            transition={{
              duration: 2.5 + star.layer,
              delay: star.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Multiple shooting stars */}
      <motion.div
        className="absolute w-1 h-1 bg-white rounded-full"
        style={{
          top: '8%',
          left: '-5%',
          boxShadow: '0 0 6px 3px rgba(255,255,255,0.4), -30px 0 15px rgba(255,255,255,0.15)',
        }}
        initial={{ x: 0, y: 0, opacity: 0 }}
        animate={{ 
          x: ['0%', '130vw'],
          y: ['0%', '35vh'],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 2.5,
          delay: 3,
          repeat: Infinity,
          repeatDelay: 10,
          ease: 'easeOut',
        }}
        aria-hidden="true"
      />
      
      <motion.div
        className="absolute w-0.5 h-0.5 bg-white rounded-full"
        style={{
          top: '25%',
          left: '-3%',
          boxShadow: '0 0 4px 2px rgba(255,255,255,0.3), -20px 0 10px rgba(255,255,255,0.1)',
        }}
        initial={{ x: 0, y: 0, opacity: 0 }}
        animate={{ 
          x: ['0%', '110vw'],
          y: ['0%', '20vh'],
          opacity: [0, 0.8, 0.8, 0],
        }}
        transition={{
          duration: 2,
          delay: 8,
          repeat: Infinity,
          repeatDelay: 15,
          ease: 'easeOut',
        }}
        aria-hidden="true"
      />
      
      <motion.div
        className="absolute w-1 h-1 bg-cyan-200 rounded-full"
        style={{
          top: '45%',
          left: '-4%',
          boxShadow: '0 0 8px 4px rgba(165,243,252,0.4), -25px 0 12px rgba(165,243,252,0.15)',
        }}
        initial={{ x: 0, y: 0, opacity: 0 }}
        animate={{ 
          x: ['0%', '120vw'],
          y: ['0%', '15vh'],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 3,
          delay: 18,
          repeat: Infinity,
          repeatDelay: 25,
          ease: 'easeOut',
        }}
        aria-hidden="true"
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 rounded-full bg-violet-500/30"
            style={{
              left: `${20 + i * 10}%`,
              top: `${30 + (i % 3) * 20}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 4 + i * 0.5,
              delay: i * 0.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
