import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppIcon } from '@/components/brand/AppIcon';
import { haptics } from '@/lib/haptics';

interface AnimatedSplashProps {
  onComplete: () => void;
}

export function AnimatedSplash({ onComplete }: AnimatedSplashProps) {
  const [visible, setVisible] = useState(true);
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stars = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.4 + 0.2,
      delay: Math.random() * 1.5,
      duration: 2 + Math.random() * 2,
    })),
  []);

  const dismiss = useCallback(() => {
    if (!visible) return;
    setVisible(false);
    haptics.light();
  }, [visible]);

  useEffect(() => {
    const timeout = setTimeout(dismiss, prefersReduced ? 1000 : 3000);
    return () => clearTimeout(timeout);
  }, [dismiss, prefersReduced]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          onClick={dismiss}
          role="button"
          tabIndex={0}
          aria-label="Tap to skip"
        >
          {/* Nebula gradient overlays */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div
              className="absolute -top-1/4 -left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.08]"
              style={{
                background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
              }}
            />
            <div
              className="absolute -bottom-1/4 -right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.08]"
              style={{
                background: 'radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)',
              }}
            />
          </div>

          {/* Star-field layer */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {stars.map((star) => (
              <motion.div
                key={star.id}
                className="absolute rounded-full bg-white"
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  width: star.size,
                  height: star.size,
                }}
                initial={{ opacity: star.opacity }}
                animate={
                  prefersReduced
                    ? { opacity: star.opacity }
                    : {
                        opacity: [star.opacity, 0.8, star.opacity],
                        x: `${(50 - star.x) * 0.15}%`,
                        y: `${(50 - star.y) * 0.15}%`,
                      }
                }
                transition={
                  prefersReduced
                    ? { duration: 0 }
                    : {
                        opacity: {
                          duration: star.duration,
                          repeat: Infinity,
                          delay: star.delay,
                          ease: 'easeInOut',
                        },
                        x: { duration: 3, ease: 'easeInOut' },
                        y: { duration: 3, ease: 'easeInOut' },
                      }
                }
              />
            ))}
          </div>

          {/* Glow ring */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 160,
              height: 160,
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={
              prefersReduced
                ? { scale: 1, opacity: 0.6 }
                : {
                    scale: [0.8, 1.2, 1],
                    opacity: [0, 0.8, 0.4],
                  }
            }
            transition={
              prefersReduced
                ? { duration: 0.3 }
                : { duration: 1.2, ease: 'easeOut' }
            }
          />

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={
              prefersReduced
                ? { duration: 0.2 }
                : { type: 'spring', stiffness: 200, damping: 15, duration: 0.6 }
            }
          >
            <AppIcon size={80} />
          </motion.div>

          {/* App name */}
          <motion.h1
            className="mt-5 text-fluid-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto]"
            initial={{ opacity: 0, y: 16 }}
            animate={
              prefersReduced
                ? { opacity: 1, y: 0 }
                : {
                    opacity: 1,
                    y: 0,
                    backgroundPosition: ['0% center', '100% center'],
                  }
            }
            transition={
              prefersReduced
                ? { duration: 0.2, delay: 0.1 }
                : { delay: 0.6, duration: 0.6, ease: 'easeOut' }
            }
          >
            WiseResume
          </motion.h1>

          {/* Tagline */}
          <motion.p
            className="mt-2 text-fluid-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={
              prefersReduced
                ? { duration: 0.2, delay: 0.2 }
                : { delay: 1.2, duration: 0.6, ease: 'easeOut' }
            }
          >
            Your AI Career Partner
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
