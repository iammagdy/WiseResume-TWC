import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AppIcon } from '@/components/brand/AppIcon';
import { haptics } from '@/lib/haptics';

interface AnimatedSplashProps {
  onComplete: () => void;
  ready?: boolean;
}

const MIN_DURATION = 800;
const EXIT_DURATION_MS = 300;
const MAX_TOTAL_DURATION = 1200;
const MAX_VISIBLE_BEFORE_EXIT = MAX_TOTAL_DURATION - EXIT_DURATION_MS;

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

  const brandColor = brand.isWH ? '#1D4ED8' : 'hsl(357,71%,56%)';

  // If the HTML pre-paint splash already showed the static frame,
  // skip the icon scale-in + letter-stagger entry animation so the
  // handoff feels continuous (one splash, not two).
  const skipEntry = typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-splash-painted') === '1';

  const dismiss = useCallback(() => {
    setVisible(false);
    haptics.light();
  }, []);

  // Remove the HTML pre-paint splash once the React splash has mounted.
  // useLayoutEffect runs synchronously after the React splash commits to the
  // DOM but before the browser paints the next frame — the React splash
  // covers the same position with z-[9999], so the handoff is truly
  // same-frame and the user never sees a gap or a double-image.
  useLayoutEffect(() => {
    const el = document.getElementById('pre-react-splash');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), MIN_DURATION);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), MAX_VISIBLE_BEFORE_EXIT);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (minTimePassed && ready && visible) {
      dismiss();
    }
  }, [minTimePassed, ready, visible, dismiss]);

  useEffect(() => {
    if (window.location.pathname === '/editor') {
      import('../pages/EditorPage');
    }
  }, []);

  const nameLetters = brand.name.split('');

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden"
          initial={{ opacity: 1 }}
          exit={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
          transition={prefersReduced ? { duration: 0 } : { duration: 0.3, ease: 'easeInOut' }}
          onClick={() => { if (minTimePassed && ready) dismiss(); }}
          role="button"
          tabIndex={0}
          aria-label="Tap to skip"
        >
          {/* Breathing glow */}
          <motion.div
            className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
            style={{
              width: 320,
              height: 320,
              x: '-50%',
              y: '-50%',
              background: `radial-gradient(circle, ${brandColor} 0%, transparent 70%)`,
            }}
            initial={{ opacity: 0.06 }}
            animate={prefersReduced ? { opacity: 0.08 } : { opacity: [0.06, 0.14, 0.06] }}
            transition={prefersReduced ? { duration: 0 } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          />

          {/* Shockwave ring */}
          {!prefersReduced && (
            <motion.div
              className="absolute top-1/2 left-1/2 rounded-full pointer-events-none border-2"
              style={{
                width: 140,
                height: 140,
                x: '-50%',
                y: '-50%',
                borderColor: brandColor,
              }}
              initial={{ scale: 0.3, opacity: 0.45 }}
              animate={{ scale: 2.6, opacity: 0 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              aria-hidden="true"
            />
          )}

          {/* Icon */}
          <motion.div
            className="relative"
            initial={prefersReduced || skipEntry ? false : { scale: 0.5, opacity: 0 }}
            animate={prefersReduced || skipEntry ? false : { scale: [0.5, 1.08, 1], opacity: 1 }}
            transition={{ duration: 0.6, times: [0, 0.7, 1], ease: 'easeOut', delay: 0.05 }}
            style={brand.isWH ? { filter: 'hue-rotate(220deg) saturate(2) brightness(0.85)' } : undefined}
          >
            <AppIcon size={72} />
          </motion.div>

          {/* Brand name */}
          <h1
            className="mt-5 text-2xl font-bold tracking-tight flex"
            style={{ color: brand.isWH ? '#1D4ED8' : undefined }}
            aria-label={brand.name}
          >
            {nameLetters.map((char, i) => (
              <motion.span
                key={`${char}-${i}`}
                initial={prefersReduced || skipEntry ? false : { opacity: 0, y: 12 }}
                animate={prefersReduced || skipEntry ? false : { opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + i * 0.035, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                aria-hidden="true"
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </h1>

          {/* Tagline */}
          <motion.p
            className="mt-1.5 text-sm text-muted-foreground"
            initial={prefersReduced || skipEntry ? false : { opacity: 0, y: 6 }}
            animate={prefersReduced || skipEntry ? false : { opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.4, ease: 'easeOut' }}
          >
            {brand.tagline}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
