import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';

interface StickyCtaBarProps {
  heroRef: React.RefObject<HTMLElement | null>;
  onGetStarted: () => void;
  onSignIn: () => void;
  lpMode?: boolean;
}

type BarState = 'hidden' | 'entering' | 'visible' | 'exiting';

export function StickyCtaBar({ heroRef, onGetStarted, onSignIn, lpMode }: StickyCtaBarProps) {
  const [barState, setBarState] = useState<BarState>('hidden');
  const prefersReducedMotion = useReducedMotion();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
          setBarState('entering');
          const t = setTimeout(() => setBarState('visible'), 10);
          exitTimerRef.current = t;
        } else {
          setBarState((prev) => {
            if (prev === 'hidden') return 'hidden';
            if (prefersReducedMotion) return 'hidden';
            return 'exiting';
          });
          exitTimerRef.current = setTimeout(() => setBarState('hidden'), 300);
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(el);
    return () => {
      observerRef.current?.disconnect();
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [heroRef, prefersReducedMotion]);

  if (barState === 'hidden') return null;

  const animClass = prefersReducedMotion
    ? ''
    : barState === 'entering' || barState === 'visible'
    ? 'animate-slide-up-in'
    : barState === 'exiting'
    ? 'animate-slide-down-out'
    : '';

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 ${animClass}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        style={
          lpMode
            ? {
                background: 'rgba(245,240,235,0.95)',
                borderTop: '1px solid rgba(26,26,46,0.1)',
                boxShadow: '0 -4px 20px rgba(26,26,46,0.08)',
              }
            : undefined
        }
        className={lpMode ? '' : 'bg-background/90 backdrop-blur-sm border-t border-border shadow-soft-xl'}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <p
            className="text-sm font-medium hidden sm:block"
            style={lpMode ? { color: '#1A1A2E' } : undefined}
          >
            Start building your perfect resume today
          </p>
          <p
            className="text-sm font-medium sm:hidden"
            style={lpMode ? { color: '#1A1A2E' } : undefined}
          >
            Ready to land your dream job?
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className="text-sm px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={lpMode ? { color: 'rgba(26,26,46,0.6)', background: 'transparent' } : undefined}
              onClick={onSignIn}
            >
              Sign In
            </button>
            <button
              className="flex items-center gap-1.5 text-sm font-semibold px-5 py-2 rounded-xl transition-all"
              style={
                lpMode
                  ? {
                      background: '#4F46E5',
                      color: '#fff',
                      boxShadow: '0 2px 12px rgba(79,70,229,0.3)',
                    }
                  : undefined
              }
              onClick={onGetStarted}
            >
              Get Started Free
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
