import { motion, useReducedMotion } from 'framer-motion';
import { AppIcon } from '@/components/brand/AppIcon';

function AnimatedDots() {
  return (
    <div className="flex items-center gap-[6px]">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-[5px] h-[5px] rounded-full bg-muted-foreground/50"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

function getWHBrand() {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/enterprises' ||
    new URLSearchParams(window.location.search).get('for') === 'companies';
}

export function PageLoadingSpinner() {
  const prefersReduced = useReducedMotion();
  const isWH = getWHBrand();

  const ringColor = isWH ? '#1D4ED8' : 'hsl(var(--primary))';
  const ringBorder = isWH ? 'rgba(29,78,216,0.18)' : undefined;
  const label = isWH ? 'WISEHIRE' : 'WISERESUME';

  if (prefersReduced) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4">
        <div style={isWH ? { filter: 'hue-rotate(220deg) saturate(2) brightness(0.85)' } : undefined}>
          <AppIcon size={44} />
        </div>
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-8">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full border-2"
          style={{
            borderColor: ringBorder ?? 'hsl(var(--muted))',
            borderTopColor: ringColor,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        />

        <motion.div
          className="absolute"
          style={isWH ? { filter: 'hue-rotate(220deg) saturate(2) brightness(0.85)' } : undefined}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <AppIcon size={40} />
        </motion.div>
      </div>

      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2, ease: 'easeOut' }}
      >
        <span
          className="text-sm font-semibold tracking-[0.2em] text-muted-foreground"
          style={isWH ? { color: 'rgba(29,78,216,0.6)' } : undefined}
        >
          {label}
        </span>
        <AnimatedDots />
      </motion.div>
    </div>
  );
}
