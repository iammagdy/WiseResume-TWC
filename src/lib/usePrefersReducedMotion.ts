import { useEffect, useState } from 'react';

/**
 * Vanilla `prefers-reduced-motion` hook — drop-in replacement for
 * framer-motion's `useReducedMotion()`. Returning a real boolean (never
 * `null`) lets callers use it directly in conditionals without nullish
 * juggling.
 *
 * Lives in `src/lib` (not `src/components/landing`) so importing it does
 * NOT pull framer-motion into the landing initial chunk. Used by
 * `src/pages/Index.tsx` so the page-level component stays
 * framer-motion-free; the heavy motion tree is loaded lazily via
 * `LandingMotionStage`.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefers(e.matches);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
    // Safari < 14 fallback
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, []);

  return prefers;
}
