import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AppIcon } from '@/components/brand/AppIcon';
import { haptics } from '@/lib/haptics';

interface AnimatedSplashProps {
  onComplete: () => void;
  ready?: boolean;
}

function getInitialBrand() {
  if (typeof window === 'undefined') return { name: 'WiseResume', tagline: 'Your AI Career Partner', isWH: false };
  const isWH = window.location.pathname === '/enterprises' ||
    new URLSearchParams(window.location.search).get('for') === 'companies';
  return isWH
    ? { name: 'WiseHire', tagline: 'Hire Smarter. Screen Faster.', isWH: true }
    : { name: 'WiseResume', tagline: 'Your AI Career Partner', isWH: false };
}

export function AnimatedSplash({ onComplete, ready = true }: AnimatedSplashProps) {
  const [visible, setVisible] = useState(true);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const prefersReduced = useReducedMotion();
  const brand = getInitialBrand();

  const dismiss = useCallback(() => {
    if (!visible) return;
    setVisible(false);
    haptics.light();
  }, [visible]);

  useEffect(() => {
    const timeout = setTimeout(() => setMinTimePassed(true), prefersReduced ? 500 : 600);
    return () => clearTimeout(timeout);
  }, [prefersReduced]);

  useEffect(() => {
    if (minTimePassed && ready) {
      dismiss();
    }
  }, [minTimePassed, ready, dismiss]);

  useEffect(() => {
    if (window.location.pathname === '/editor') {
      import('../pages/EditorPage');
    }
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden"
          initial={{ opacity: 1 }}
          exit={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
          transition={prefersReduced ? { duration: 0 } : { duration: 0.3, ease: 'easeInOut' }}
          onClick={dismiss}
          role="button"
          tabIndex={0}
          aria-label="Tap to skip"
        >
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full opacity-[0.08]"
              style={{
                background: brand.isWH
                  ? 'radial-gradient(circle, #1D4ED8 0%, transparent 70%)'
                  : 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
              }}
            />
          </div>

          <motion.div
            initial={prefersReduced ? false : { scale: 0.7, opacity: 0 }}
            animate={prefersReduced ? false : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
            style={brand.isWH ? { filter: 'hue-rotate(220deg) saturate(2) brightness(0.85)' } : undefined}
          >
            <AppIcon size={72} />
          </motion.div>

          <motion.h1
            className="mt-5 text-2xl font-bold tracking-tight"
            style={{ color: brand.isWH ? '#1D4ED8' : undefined }}
            initial={prefersReduced ? false : { opacity: 0, y: 10 }}
            animate={prefersReduced ? false : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.5 }}
          >
            {brand.name}
          </motion.h1>

          <motion.p
            className="mt-1.5 text-sm text-muted-foreground"
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={prefersReduced ? false : { opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4, ease: 'easeOut' }}
          >
            {brand.tagline}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
