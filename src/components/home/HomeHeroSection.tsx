import { motion } from 'framer-motion';
import { AppLogo } from '@/components/brand/AppLogo';

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

  return (
    <header className="relative pt-safe pt-6 pb-4 px-4 flex flex-col items-center text-center">
      {/* Animated logo with CSS float and glow */}
      <div
        className="relative mb-4 animate-float"
      >
        {/* Glow behind logo */}
        <div className="absolute inset-0 scale-150 rounded-full bg-primary/20 blur-2xl animate-pulse-glow" />
        <AppLogo size="lg" showTagline={false} />
      </div>

      {/* Personalized greeting */}
      <motion.p
        className="text-muted-foreground text-base"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {userName ? `${greeting}, ${userName}` : greeting}
        {' '}
        <motion.span
          style={{ display: 'inline-block', transformOrigin: '70% 70%' }}
          animate={{ rotate: [-10, 20, -10, 20, -10, 0] }}
          transition={{ duration: 1.5, ease: 'easeInOut', times: [0, 0.2, 0.4, 0.6, 0.8, 1] }}
        >
          👋
        </motion.span>
      </motion.p>
    </header>
  );
}
