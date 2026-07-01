import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Wand2 } from 'lucide-react';
import { useInView } from '@/hooks/useInView';
import { useLocale } from '@/i18n/LocaleProvider';
import { landingDemoCopy } from './landingDemoCopy';

type Phase = 'before' | 'injecting' | 'after' | 'hold';

export function TailoringDemo() {
  const { locale } = useLocale();
  const copy = landingDemoCopy[locale].tailoring;
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('before');
  const [injectIdx, setInjectIdx] = useState(0);
  const { ref, inView } = useInView({ threshold: 0.05, triggerOnce: false });

  useEffect(() => {
    if (prefersReducedMotion || !inView) return;
    const delays: Record<Phase, number> = { before: 1200, injecting: 1800, after: 200, hold: 2800 };
    const next: Record<Phase, Phase> = { before: 'injecting', injecting: 'after', after: 'hold', hold: 'before' };
    const t = setTimeout(() => {
      setPhase((p) => {
        if (next[p] === 'before') setInjectIdx(0);
        return next[p];
      });
    }, delays[phase]);
    return () => clearTimeout(t);
  }, [phase, inView, prefersReducedMotion]);

  useEffect(() => {
    if (phase !== 'injecting' || prefersReducedMotion || !inView) return;
    if (injectIdx < copy.before.length - 1) {
      const t = setTimeout(() => setInjectIdx((i) => i + 1), 400);
      return () => clearTimeout(t);
    }
  }, [phase, injectIdx, prefersReducedMotion, inView, copy.before.length]);

  const showAfter = phase === 'after' || phase === 'hold';
  const showBefore = phase === 'before' || phase === 'injecting';

  return (
    <div ref={ref} className="flex flex-col items-center">
      <div className="w-[260px] rounded-[28px] border-2 border-border bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-2 pb-1">
          <span className="text-[10px] text-muted-foreground font-medium">9:41</span>
          <div className="w-3.5 h-2 rounded-sm border border-muted-foreground/40 relative">
            <div className="absolute inset-[1px] right-[2px] rounded-[1px] bg-muted-foreground/50" />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-1.5 border-b border-border">
          <span className="text-[11px] font-semibold text-foreground">{copy.title}</span>
          <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">{copy.example}</span>
        </div>

        <div className="px-4 py-3 space-y-3 min-h-[200px]">
          {/* Job description snippet */}
          <div className="rounded-lg bg-muted p-2.5 border border-border">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{copy.job}</p>
            <div className="space-y-1">
              {copy.role.map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-blue-500/60" />
                  <span className="text-[9px] text-foreground/70">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Before / After keywords */}
          <div>
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {showAfter ? copy.afterLabel : copy.beforeLabel}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(showAfter ? copy.after : copy.before).map((kw, i) => (
                <AnimatePresence key={kw} mode="wait">
                  <motion.span
                    key={showAfter ? 'after-' + kw : 'before-' + kw}
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.25, delay: showAfter ? i * 0.06 : 0 }}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-medium border ${
                      showAfter
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {kw}
                  </motion.span>
                </AnimatePresence>
              ))}
            </div>
          </div>

          {/* Status pill */}
          <div className="flex justify-center pt-1">
            <AnimatePresence mode="wait">
              {phase === 'injecting' ? (
                <motion.div
                  key="injecting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-medium"
                >
                  <Wand2 className="w-3 h-3 animate-spin" />
                  {copy.injecting}
                </motion.div>
              ) : showAfter ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium"
                >
                  ✓ {copy.done}
                </motion.div>
              ) : (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-medium"
                >
                  {copy.ready}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
