import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Mic } from 'lucide-react';
import { useInView } from '@/hooks/useInView';
import { useLocale } from '@/i18n/LocaleProvider';
import { landingDemoCopy } from './landingDemoCopy';

type Phase = 'question' | 'listening' | 'answered' | 'scored' | 'hold';

export function InterviewDemo() {
  const { locale } = useLocale();
  const copy = landingDemoCopy[locale].interview;
  const prefersReducedMotion = useReducedMotion();
  const [qaIdx, setQaIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('question');
  const { ref, inView } = useInView({ threshold: 0.05, triggerOnce: false });

  useEffect(() => {
    if (prefersReducedMotion || !inView) return;
    const delays: Record<Phase, number> = {
      question: 1000,
      listening: 1600,
      answered: 800,
      scored: 200,
      hold: 2400,
    };
    const next: Record<Phase, Phase> = {
      question: 'listening',
      listening: 'answered',
      answered: 'scored',
      scored: 'hold',
      hold: 'question',
    };
    const t = setTimeout(() => {
      setPhase((p) => {
        if (p === 'hold') {
          setQaIdx((i) => (i + 1) % copy.qa.length);
        }
        return next[p];
      });
    }, delays[phase]);
    return () => clearTimeout(t);
  }, [phase, inView, prefersReducedMotion]);

  const qa = copy.qa[qaIdx];
  const circumference = 2 * Math.PI * 14;
  const offset = circumference - (qa.score / 100) * circumference;

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
          {/* Question bubble */}
          <AnimatePresence mode="wait">
            <motion.div
              key={'q-' + qaIdx}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-xl rounded-tl-sm bg-muted p-2.5 border border-border"
            >
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{copy.interviewer}</p>
              <p className="text-[10px] text-foreground leading-relaxed">{qa.q}</p>
            </motion.div>
          </AnimatePresence>

          {/* Answer bubble */}
          <AnimatePresence>
            {(phase === 'answered' || phase === 'scored' || phase === 'hold') && (
              <motion.div
                key={'a-' + qaIdx}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl rounded-tr-sm bg-primary/8 border border-primary/20 p-2.5 ms-4"
              >
                <p className="text-[10px] text-foreground leading-relaxed">{qa.a}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Score ring */}
          <AnimatePresence>
            {(phase === 'scored' || phase === 'hold') && (
              <motion.div
                key={'score-' + qaIdx}
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="flex items-center gap-3 px-2.5 py-2 rounded-xl bg-emerald-500/8 border border-emerald-500/20"
              >
                <div className="relative w-9 h-9 flex-shrink-0">
                  <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
                    <circle cx="16" cy="16" r="14" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
                    <circle
                      cx="16" cy="16" r="14" fill="none"
                      stroke="hsl(142 71% 45%)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground">{qa.score}</span>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">{copy.strong}</p>
                  <p className="text-[9px] text-muted-foreground">{copy.tip}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mic indicator */}
          {phase === 'listening' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-medium">
                <Mic className="w-3 h-3 animate-pulse" />
                {copy.listening}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
