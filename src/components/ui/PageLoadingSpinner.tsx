import { motion, useReducedMotion } from 'framer-motion';
import { AppIcon } from '@/components/brand/AppIcon';

function AnimatedDots() {
  return (
    <div className="flex items-center gap-[6px]">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-[5px] h-[5px] rounded-full bg-primary/70"
          animate={{ opacity: [0.2, 1, 0.2], y: [0, -5, 0] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.16,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export function PageLoadingSpinner() {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4">
        <AppIcon size={44} />
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-8">
      <div className="relative w-28 h-28 flex items-center justify-center">

        {/* Ambient glow — breathes slowly behind the logo */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle, hsl(var(--primary) / 0.22) 0%, transparent 70%)',
          }}
          animate={{ scale: [0.75, 1.25, 0.75], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Gradient arc ring — single, smooth, professional */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, hsl(var(--primary)) 0deg, hsl(var(--primary) / 0.35) 210deg, transparent 270deg, transparent 360deg)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.25, repeat: Infinity, ease: 'linear' }}
        />

        {/* Inner mask — turns the filled circle into a ring */}
        <div
          className="absolute rounded-full bg-background"
          style={{ inset: '5px' }}
        />

        {/* Logo — spring entrance, then gentle breathing pulse */}
        <motion.div
          className="absolute"
          initial={{ scale: 0.55, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.6,
            }}
          >
            <AppIcon size={48} />
          </motion.div>
        </motion.div>
      </div>

      {/* Brand name + bouncing dots */}
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.25, ease: 'easeOut' }}
      >
        <span
          className="text-[15px] font-semibold tracking-widest bg-clip-text text-transparent"
          style={{
            backgroundImage:
              'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.65), hsl(var(--primary)))',
            backgroundSize: '200% auto',
          }}
        >
          WISERESUME
        </span>
        <AnimatedDots />
      </motion.div>
    </div>
  );
}
