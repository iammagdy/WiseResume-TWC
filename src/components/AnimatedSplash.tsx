import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import WiseLogoLoader from '@/components/loader/WiseLogoLoader';
import { haptics } from '@/lib/haptics';

interface AnimatedSplashProps {
  onComplete: () => void;
  ready?: boolean;
}

const MIN_DURATION = 500;
// Hard safety ceiling — only applies if the app fails to signal `ready`
// for an unusually long time (broken chunk, network stall). Under normal
// conditions the splash dismisses as soon as MIN_DURATION elapses AND
// the app reports it's ready to paint, falling onto the home route's
// LandingSkeleton if the Index chunk hasn't fully loaded yet.
const HARD_MAX_DURATION = 1500;

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

  // Skip entry animation when the HTML pre-paint splash already showed the static frame.
  const skipEntry = typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-splash-painted') === '1';

  const dismiss = useCallback(() => {
    setVisible(false);
    haptics.light();
  }, []);

  // Remove the HTML pre-paint splash same-frame as the React splash mounts.
  useLayoutEffect(() => {
    const el = document.getElementById('pre-react-splash');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), MIN_DURATION);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), HARD_MAX_DURATION);
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
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background overflow-hidden"
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

          {/* Logo loader */}
          <motion.div
            className="relative"
            initial={prefersReduced || skipEntry ? false : { scale: 0.5, opacity: 0 }}
            animate={prefersReduced || skipEntry ? false : { scale: [0.5, 1.08, 1], opacity: 1 }}
            transition={{ duration: 0.6, times: [0, 0.7, 1], ease: 'easeOut', delay: 0.05 }}
          >
            <WiseLogoLoader size="md" variant={brand.isWH ? 'wisehire' : 'wiseresume'} />
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
