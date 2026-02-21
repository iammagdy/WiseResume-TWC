import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useInView } from '@/hooks/useInView';

const BEFORE_TEXT = 'Managed team projects and tasks';
const AFTER_TEXT = 'Led cross-functional team of 8, delivering 3 projects 2 weeks ahead of schedule, saving $120K in operational costs';

const TYPING_SPEED = 55; // ms per char
const PAUSE_AFTER_TYPE = 600;
const PAUSE_AFTER_ENHANCE = 400;
const SCORE_DURATION = 1200;
const HOLD_DURATION = 2500;

type Phase = 'typing' | 'enhancing' | 'enhanced' | 'scoring' | 'hold';

export function EditorDemo() {
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('typing');
  const [typed, setTyped] = useState('');
  const [score, setScore] = useState(45);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const { ref: containerRef, inView } = useInView({ threshold: 0.2, triggerOnce: false });

  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  }, []);

  // Reset loop
  const startLoop = useCallback(() => {
    cleanup();
    setPhase('typing');
    setTyped('');
    setScore(45);
  }, [cleanup]);

  // Pause all animations when out of viewport
  useEffect(() => {
    if (!inView && !prefersReducedMotion) {
      cleanup();
    }
  }, [inView, cleanup, prefersReducedMotion]);

  // Typing phase
  useEffect(() => {
    if (prefersReducedMotion || phase !== 'typing' || !inView) return;
    if (typed.length < BEFORE_TEXT.length) {
      timerRef.current = setTimeout(() => {
        setTyped(BEFORE_TEXT.slice(0, typed.length + 1));
      }, TYPING_SPEED);
    } else {
      timerRef.current = setTimeout(() => setPhase('enhancing'), PAUSE_AFTER_TYPE);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, typed, prefersReducedMotion]);

  // Enhancing → enhanced
  useEffect(() => {
    if (prefersReducedMotion || phase !== 'enhancing' || !inView) return;
    timerRef.current = setTimeout(() => setPhase('enhanced'), PAUSE_AFTER_ENHANCE);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, prefersReducedMotion]);

  // Enhanced → scoring
  useEffect(() => {
    if (prefersReducedMotion || phase !== 'enhanced' || !inView) return;
    timerRef.current = setTimeout(() => setPhase('scoring'), 800);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, prefersReducedMotion]);

  // Score animation
  useEffect(() => {
    if (prefersReducedMotion || phase !== 'scoring' || !inView) return;
    const start = performance.now();
    const from = 45;
    const to = 92;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / SCORE_DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setScore(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setPhase('hold');
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [phase, prefersReducedMotion]);

  // Hold → restart
  useEffect(() => {
    if (prefersReducedMotion || phase !== 'hold' || !inView) return;
    timerRef.current = setTimeout(startLoop, HOLD_DURATION);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, startLoop, prefersReducedMotion]);

  useEffect(() => cleanup, [cleanup]);

  const showAfter = phase === 'enhanced' || phase === 'scoring' || phase === 'hold';
  const aiActive = phase === 'enhancing';
  const displayText = prefersReducedMotion
    ? AFTER_TEXT
    : showAfter
      ? AFTER_TEXT
      : typed;
  const displayScore = prefersReducedMotion ? 92 : score;

  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  return (
    <div ref={containerRef} className="flex flex-col items-center">
      {/* Phone frame */}
      <div className="w-[260px] rounded-[28px] border-2 border-border/40 bg-card/80 backdrop-blur-sm shadow-xl overflow-hidden">
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-2 pb-1">
          <span className="text-[10px] text-muted-foreground font-medium">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-2 rounded-sm border border-muted-foreground/40 relative">
              <div className="absolute inset-[1px] right-[2px] rounded-[1px] bg-muted-foreground/50" />
            </div>
          </div>
        </div>

      {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/20">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-foreground">Resume Editor</span>
            <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">Example</span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Score ring */}
            <div className="relative w-10 h-10">
              <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                <circle cx="20" cy="20" r="18" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                <circle
                  cx="20" cy="20" r="18" fill="none"
                  stroke={displayScore >= 80 ? 'hsl(var(--success))' : displayScore >= 60 ? 'hsl(142 71% 45%)' : 'hsl(var(--destructive))'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: prefersReducedMotion ? 'none' : 'stroke-dashoffset 0.1s linear' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground">
                {displayScore}
              </span>
            </div>
          </div>
        </div>

        {/* Resume content area */}
        <div className="px-4 py-3 space-y-2.5 min-h-[180px]">
          {/* Name placeholder */}
          <div className="space-y-1">
            <div className="h-2.5 rounded-full bg-foreground/15 w-24" />
            <div className="h-1.5 rounded-full bg-muted-foreground/10 w-32" />
          </div>

          {/* Section header */}
          <div className="flex items-center gap-1.5 pt-1">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <div className="h-2 rounded-full bg-foreground/12 w-16" />
          </div>

          {/* Bullet point area - the animated zone */}
          <div className={`rounded-lg p-2.5 text-[11px] leading-relaxed min-h-[72px] transition-colors duration-300 ${
            showAfter && !prefersReducedMotion
              ? 'bg-success/8 border border-success/20'
              : aiActive
                ? 'bg-primary/8 border border-primary/30'
                : 'bg-muted/30 border border-border/20'
          }`}>
            <AnimatePresence mode="wait">
              {showAfter || prefersReducedMotion ? (
                <motion.p
                  key="after"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-foreground/90"
                >
                  {AFTER_TEXT}
                </motion.p>
              ) : aiActive ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-primary"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[10px]">Enhancing with AI...</span>
                </motion.div>
              ) : (
                <motion.p
                  key="typing"
                  initial={false}
                  exit={{ opacity: 0 }}
                  className="text-muted-foreground"
                >
                  {displayText}
                  {!prefersReducedMotion && (
                    <span className="inline-block w-[2px] h-3 bg-primary ml-0.5 animate-pulse" />
                  )}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* AI button */}
          <div className="flex justify-end">
            <motion.div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                aiActive
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                  : 'bg-primary/10 text-primary'
              }`}
              animate={aiActive && !prefersReducedMotion ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 0.5, repeat: aiActive ? Infinity : 0 }}
            >
              <Sparkles className="w-3 h-3" />
              AI Enhance
            </motion.div>
          </div>

          {/* More placeholder lines */}
          <div className="space-y-1.5 pt-1">
            <div className="h-1.5 rounded-full bg-muted-foreground/8 w-full" />
            <div className="h-1.5 rounded-full bg-muted-foreground/8 w-4/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
