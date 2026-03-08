import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useInView } from '@/hooks/useInView';

const THEME_ACCENTS = [
  'hsl(var(--primary))',
  'hsl(165 60% 45%)',
  'hsl(28 90% 55%)',
];

export function PortfolioDemo() {
  const prefersReducedMotion = useReducedMotion();
  const [animStep, setAnimStep] = useState(prefersReducedMotion ? 5 : 0);
  const [themeIdx, setThemeIdx] = useState(0);
  const { ref: viewRef, inView } = useInView({ triggerOnce: false, rootMargin: '100px' });

  useEffect(() => {
    if (prefersReducedMotion || !inView) return;
    const delays: Record<number, number> = { 0: 300, 1: 500, 2: 500, 3: 600, 4: 3000 };
    const delay = delays[animStep] ?? 3000;
    const t = setTimeout(() => {
      setAnimStep((s) => (s >= 5 ? 0 : s + 1));
    }, delay);
    return () => clearTimeout(t);
  }, [animStep, prefersReducedMotion, inView]);

  useEffect(() => {
    if (!inView) return;
    const t = setInterval(() => setThemeIdx((i) => (i + 1) % 3), 2000);
    return () => clearInterval(t);
  }, [inView]);

  const accent = THEME_ACCENTS[themeIdx];
  const show = (step: number) => prefersReducedMotion || animStep >= step;

  return (
    <div ref={viewRef} className="flex flex-col items-center">
      <div className="w-[260px] rounded-[28px] border-2 border-border/40 bg-card/80 backdrop-blur-sm shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-2 pb-1">
          <span className="text-[10px] text-muted-foreground font-medium">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-2 rounded-sm border border-muted-foreground/40 relative">
              <div className="absolute inset-[1px] right-[2px] rounded-[1px] bg-muted-foreground/50" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border/20">
          <Globe className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
          <span className="text-[10px] text-muted-foreground/70 font-mono truncate">WiseResume/you</span>
        </div>

        <div className="px-4 py-3 min-h-[190px] space-y-2.5">
          <div className="flex items-center gap-2.5">
            <AnimatePresence>
              {show(1) && (
                <motion.div
                  key="avatar"
                  initial={prefersReducedMotion ? false : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-card"
                  style={{ background: accent }}
                >
                  YN
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex-1 space-y-1 min-w-0">
              <AnimatePresence>
                {show(2) && (
                  <motion.div
                    key="name"
                    initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35 }}
                    className="h-2.5 rounded-full w-20"
                    style={{ background: accent + '55' }}
                  />
                )}
              </AnimatePresence>
              <AnimatePresence>
                {show(3) && (
                  <motion.div
                    key="badge"
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-semibold text-card"
                    style={{ background: accent }}
                  >
                    Product Designer · Open to work
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-1.5">
            {['Experience', 'Skills', 'Projects'].map((label, i) => (
              <AnimatePresence key={label}>
                {show(4) && (
                  <motion.div
                    key={label}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 bg-muted/30 border border-border/20"
                  >
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
                    <span className="text-[9px] font-medium text-foreground/70">{label}</span>
                    <div className="flex-1 h-1 rounded-full bg-muted-foreground/15" />
                  </motion.div>
                )}
              </AnimatePresence>
            ))}
          </div>

          <div className="flex items-center justify-end gap-1.5 pt-1">
            <span className="text-[8px] text-muted-foreground/50 mr-0.5">Theme</span>
            {THEME_ACCENTS.map((color, i) => (
              <motion.div
                key={i}
                className="rounded-full border-2 transition-all duration-300"
                animate={{ width: i === themeIdx ? 14 : 8, height: i === themeIdx ? 14 : 8, borderColor: i === themeIdx ? color : 'transparent' }}
                transition={{ duration: 0.3 }}
                style={{ background: color, opacity: i === themeIdx ? 1 : 0.4 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
