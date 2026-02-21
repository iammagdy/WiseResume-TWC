import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppIcon } from '@/components/brand/AppIcon';
import { haptics } from '@/lib/haptics';

interface AnimatedSplashProps {
  onComplete: () => void;
}

const APP_NAME = 'WiseResume';

export function AnimatedSplash({ onComplete }: AnimatedSplashProps) {
  const [visible, setVisible] = useState(true);
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stars = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.3,
        delay: Math.random() * 1.5,
        duration: 2 + Math.random() * 2,
      })),
    [],
  );

  const dismiss = useCallback(() => {
    if (!visible) return;
    setVisible(false);
    haptics.light();
  }, [visible]);

  useEffect(() => {
    const timeout = setTimeout(dismiss, prefersReduced ? 1000 : 3200);
    return () => clearTimeout(timeout);
  }, [dismiss, prefersReduced]);

  const letters = useMemo(() => APP_NAME.split(''), []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          onClick={dismiss}
          role="button"
          tabIndex={0}
          aria-label="Tap to skip"
        >
          {/* ── Nebula gradient overlays ── */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div
              className="absolute -top-1/4 -left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.15]"
              style={{
                background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
              }}
            />
            <div
              className="absolute -bottom-1/4 -right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.15]"
              style={{
                background: 'radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)',
              }}
            />
          </div>

          {/* ── Star-field: rush inward toward center ── */}
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
                initial={{ opacity: 0, scale: 0.5 }}
                animate={
                  prefersReduced
                    ? { opacity: star.opacity }
                    : {
                        opacity: [0, star.opacity, 0.9, star.opacity],
                        x: `${(50 - star.x) * 0.4}%`,
                        y: `${(50 - star.y) * 0.4}%`,
                        scale: [0.5, 1.2, 0.8, 1],
                      }
                }
                transition={
                  prefersReduced
                    ? { duration: 0.3 }
                    : {
                        opacity: {
                          duration: star.duration,
                          repeat: Infinity,
                          delay: star.delay,
                          ease: 'easeInOut',
                        },
                        x: { duration: 1.8, ease: 'easeOut', delay: star.delay * 0.3 },
                        y: { duration: 1.8, ease: 'easeOut', delay: star.delay * 0.3 },
                        scale: {
                          duration: star.duration,
                          repeat: Infinity,
                          delay: star.delay,
                          ease: 'easeInOut',
                        },
                      }
                }
              />
            ))}
          </div>

          {/* ── Phase 1: Light Burst ── */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 400,
              height: 400,
              background:
                'radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, hsl(var(--primary) / 0.15) 40%, transparent 70%)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={
              prefersReduced
                ? { scale: 1, opacity: 0.3 }
                : {
                    scale: [0, 1.5, 1.1],
                    opacity: [0, 0.9, 0.25],
                  }
            }
            transition={
              prefersReduced
                ? { duration: 0.3 }
                : { duration: 0.8, ease: 'easeOut', delay: 0.1 }
            }
          />

          {/* ── Ripple rings ── */}
          {!prefersReduced &&
            [0, 1, 2].map((i) => (
              <motion.div
                key={`ripple-${i}`}
                className="absolute rounded-full border border-primary/20"
                style={{ width: 120, height: 120 }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{
                  scale: [0.5, 2.5 + i * 0.5],
                  opacity: [0.6, 0],
                }}
                transition={{
                  duration: 1.5,
                  ease: 'easeOut',
                  delay: 0.3 + i * 0.25,
                }}
              />
            ))}

          {/* ── Glow ring (breathing) ── */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 180,
              height: 180,
              background:
                'radial-gradient(circle, hsl(var(--primary) / 0.5) 0%, transparent 70%)',
            }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={
              prefersReduced
                ? { scale: 1, opacity: 0.5 }
                : {
                    scale: [0.6, 1.3, 1.1, 1.15, 1.1],
                    opacity: [0, 0.8, 0.5, 0.6, 0.5],
                  }
            }
            transition={
              prefersReduced
                ? { duration: 0.3 }
                : {
                    duration: 3,
                    ease: 'easeInOut',
                    delay: 0.3,
                    times: [0, 0.25, 0.5, 0.75, 1],
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }
            }
          />

          {/* ── Orbital ring ── */}
          {!prefersReduced && (
            <div
              className="absolute rounded-full border border-primary/30"
              style={{
                width: 150,
                height: 52,
                animation: 'splash-orbit 3s linear infinite',
              }}
            />
          )}

          {/* ── Phase 2: Logo entrance ── */}
          <motion.div
            initial={{ scale: 0.3, rotate: -15, opacity: 0 }}
            animate={
              prefersReduced
                ? { scale: 1, rotate: 0, opacity: 1 }
                : {
                    scale: [0.3, 1.15, 1.0, 1.03, 1.0],
                    rotate: [-15, 8, 0],
                    opacity: 1,
                  }
            }
            transition={
              prefersReduced
                ? { duration: 0.3 }
                : {
                    scale: {
                      duration: 2.5,
                      ease: 'easeOut',
                      delay: 0.4,
                      times: [0, 0.3, 0.5, 0.75, 1],
                      repeat: Infinity,
                      repeatType: 'reverse',
                    },
                    rotate: { duration: 0.7, ease: 'easeOut', delay: 0.4 },
                    opacity: { duration: 0.3, delay: 0.4 },
                  }
            }
          >
            <AppIcon size={80} />
          </motion.div>

          {/* ── Phase 3: Letter-by-letter title ── */}
          <motion.h1
            className="mt-5 flex text-fluid-2xl font-bold"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: prefersReduced ? 0 : 0.045,
                  delayChildren: prefersReduced ? 0.2 : 1.2,
                },
              },
            }}
          >
            {letters.map((letter, i) => (
              <motion.span
                key={i}
                className="inline-block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto]"
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.7 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      duration: prefersReduced ? 0.2 : 0.4,
                      ease: 'easeOut',
                    },
                  },
                }}
                style={
                  !prefersReduced
                    ? {
                        animation: 'splash-shimmer 2.5s ease-in-out infinite',
                        animationDelay: `${1.2 + i * 0.045}s`,
                      }
                    : undefined
                }
              >
                {letter}
              </motion.span>
            ))}
          </motion.h1>

          {/* ── Phase 3b: Tagline ── */}
          <motion.p
            className="mt-2 text-fluid-sm text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReduced
                ? { duration: 0.2, delay: 0.3 }
                : { delay: 1.8, duration: 0.6, ease: 'easeOut' }
            }
          >
            Your AI Career Partner
          </motion.p>

          {/* CSS animations for orbital ring & shimmer */}
          <style>{`
            @keyframes splash-orbit {
              from { transform: rotateX(65deg) rotateZ(0deg); }
              to   { transform: rotateX(65deg) rotateZ(360deg); }
            }
            @keyframes splash-shimmer {
              0%, 100% { background-position: 0% center; }
              50%      { background-position: 100% center; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
