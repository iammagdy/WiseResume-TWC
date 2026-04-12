import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReducedMotion } from 'framer-motion';

interface StickyCtaBarProps {
  heroRef: React.RefObject<HTMLElement | null>;
  onGetStarted: () => void;
  onSignIn: () => void;
}

type BarState = 'hidden' | 'entering' | 'visible' | 'exiting';

export function StickyCtaBar({ heroRef, onGetStarted, onSignIn }: StickyCtaBarProps) {
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
      <div className="bg-background/95 backdrop-blur-sm border-t border-border shadow-soft-xl">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-foreground hidden sm:block">
            Start building your perfect resume today
          </p>
          <p className="text-sm font-medium text-foreground sm:hidden">
            Ready to land your dream job?
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={onSignIn}
            >
              Sign In
            </Button>
            <Button
              size="sm"
              className="font-semibold rounded-xl px-5 shadow-soft-lg"
              onClick={onGetStarted}
            >
              Get Started Free
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
