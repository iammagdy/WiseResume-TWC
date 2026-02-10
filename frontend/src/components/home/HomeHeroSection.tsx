import { useRef } from 'react';
import { motion } from 'framer-motion';
import { AppLogo } from '@/components/brand/AppLogo';

interface OrbitingParticle {
  id: number;
  size: number;
  duration: number;
  delay: number;
  radius: number;
}

// Pre-generate particles for consistent renders
const particles: OrbitingParticle[] = [
  { id: 0, size: 3, duration: 8, delay: 0, radius: 50 },
  { id: 1, size: 2, duration: 10, delay: 2, radius: 45 },
  { id: 2, size: 2.5, duration: 12, delay: 4, radius: 55 },
  { id: 3, size: 2, duration: 9, delay: 6, radius: 48 },
];

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

interface HomeHeroSectionProps {
  userName?: string;
}

export function HomeHeroSection({ userName }: HomeHeroSectionProps) {
  const greeting = getTimeBasedGreeting();
  const particlesRef = useRef(particles);

  return (
    <header className="relative pt-safe pt-8 pb-6 px-4 flex flex-col items-center text-center">
      {/* Orbiting particles around logo */}
      <div className="absolute inset-0 flex items-start justify-center pointer-events-none" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' }}>
        <div className="relative w-32 h-32">
          {particlesRef.current.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute left-1/2 top-1/2 rounded-full bg-primary"
              style={{
                width: particle.size,
                height: particle.size,
                marginLeft: -particle.size / 2,
                marginTop: -particle.size / 2,
              }}
              animate={{
                x: [
                  Math.cos(0) * particle.radius,
                  Math.cos(Math.PI / 2) * particle.radius,
                  Math.cos(Math.PI) * particle.radius,
                  Math.cos((3 * Math.PI) / 2) * particle.radius,
                  Math.cos(2 * Math.PI) * particle.radius,
                ],
                y: [
                  Math.sin(0) * particle.radius,
                  Math.sin(Math.PI / 2) * particle.radius,
                  Math.sin(Math.PI) * particle.radius,
                  Math.sin((3 * Math.PI) / 2) * particle.radius,
                  Math.sin(2 * Math.PI) * particle.radius,
                ],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          ))}
        </div>
      </div>

      {/* Animated logo with float and glow */}
      <motion.div
        className="relative mb-4"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Glow behind logo */}
        <div className="absolute inset-0 scale-150 rounded-full bg-primary/20 blur-2xl animate-pulse-glow" />
        <AppLogo size="lg" showTagline={false} />
      </motion.div>

      {/* Personalized greeting */}
      <motion.p
        className="text-muted-foreground text-base"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {userName ? `${greeting}, ${userName}!` : `${greeting}!`}
      </motion.p>
    </header>
  );
}
