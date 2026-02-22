import { motion, useReducedMotion } from 'framer-motion';
import { AppIcon } from '@/components/brand/AppIcon';

const particles = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  angle: (360 / 8) * i,
  delay: i * 0.25,
  radius: 62,
}));

export function PageLoadingSpinner() {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <AppIcon size={20} />
          </div>
          <span className="text-sm text-muted-foreground">Loading...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <motion.div
        className="flex flex-col items-center gap-6"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* Outer glow */}
          <motion.div
            className="absolute -inset-2 rounded-full bg-primary/20"
            animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Ring 1 — outer */}
          <motion.div
            className="absolute inset-0 rounded-full border-[3px] border-primary/40"
            style={{ borderTopColor: 'hsl(var(--primary))', borderRightColor: 'hsl(var(--primary) / 0.6)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          />

          {/* Ring 2 — middle, counter-rotate */}
          <motion.div
            className="absolute inset-4 rounded-full border-[3px] border-primary/30"
            style={{ borderTopColor: 'hsl(var(--primary))', borderLeftColor: 'hsl(var(--primary) / 0.6)' }}
            animate={{ rotate: -360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
          />

          {/* Ring 3 — inner */}
          <motion.div
            className="absolute inset-8 rounded-full border-[3px] border-primary/30"
            style={{ borderBottomColor: 'hsl(var(--primary))', borderRightColor: 'hsl(var(--primary) / 0.5)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />

          {/* Logo with glowing backdrop */}
          <motion.div
            className="relative flex items-center justify-center"
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute w-14 h-14 rounded-full bg-primary/15" />
            <div style={{ filter: 'drop-shadow(0 0 24px hsl(var(--primary) / 0.7))' }}>
              <AppIcon size={40} />
            </div>
          </motion.div>

          {/* Particles */}
          {particles.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const x = Math.cos(rad) * p.radius;
            const y = Math.sin(rad) * p.radius;
            return (
              <motion.div
                key={p.id}
                className="absolute w-2 h-2 rounded-full bg-primary"
                style={{
                  left: '50%',
                  top: '50%',
                  marginLeft: -4,
                  marginTop: -4,
                }}
                animate={{
                  x: [0, x, 0],
                  y: [0, y, 0],
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.2, 0.5],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  delay: p.delay,
                  ease: 'easeInOut',
                }}
              />
            );
          })}
        </div>

        {/* Shimmer text */}
        <motion.span
          className="text-sm font-medium text-muted-foreground"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          Loading...
        </motion.span>
      </motion.div>
    </div>
  );
}
