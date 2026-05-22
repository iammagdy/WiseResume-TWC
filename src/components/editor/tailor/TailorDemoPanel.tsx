import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DemoExample {
  jobContext: string;
  before: string;
  after: string;
}

const DEMO_EXAMPLES: DemoExample[] = [
  {
    jobContext: 'Software Engineer',
    before: 'Responsible for backend development and fixing bugs in the codebase',
    after:
      'Designed and maintained core API services for a production platform, resolving critical defects and improving system reliability across key integrations',
  },
  {
    jobContext: 'Project Manager',
    before: 'Helped manage projects and coordinated with different teams',
    after:
      'Led cross-functional delivery across engineering, design, and QA to ship a multi-phase product initiative on schedule with full stakeholder alignment',
  },
  {
    jobContext: 'Marketing Manager',
    before: 'Ran marketing campaigns and managed social media accounts',
    after:
      'Executed demand generation programmes across organic and paid channels, aligning creative strategy with quarterly pipeline targets and brand guidelines',
  },
];

type Phase = 'before' | 'transforming' | 'after' | 'resetting';

const PHASE_DURATIONS: Record<Phase, number> = {
  before: 1800,
  transforming: 700,
  after: 1900,
  resetting: 350,
};

const NEXT_PHASE: Record<Phase, Phase> = {
  before: 'transforming',
  transforming: 'after',
  after: 'resetting',
  resetting: 'before',
};

export function TailorDemoPanel() {
  const prefersReducedMotion = useReducedMotion();
  const [exampleIdx, setExampleIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>(prefersReducedMotion ? 'after' : 'before');

  // If reduced-motion preference is toggled while the panel is mounted, snap to static "after" frame
  useEffect(() => {
    if (prefersReducedMotion) setPhase('after');
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const timer = setTimeout(() => {
      if (phase === 'resetting') {
        setExampleIdx((prev) => (prev + 1) % DEMO_EXAMPLES.length);
      }
      setPhase(NEXT_PHASE[phase]);
    }, PHASE_DURATIONS[phase]);

    return () => clearTimeout(timer);
  }, [phase, prefersReducedMotion]);

  const example = DEMO_EXAMPLES[exampleIdx];

  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
      {/* Header strip */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">See it in action</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paste a job description on the left to tailor your real resume
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">
          Live demo
        </Badge>
      </div>

      {/* Job context label */}
      <div className="px-5 pb-2 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary/60" />
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {example.jobContext}
        </span>
      </div>

      {/* Animation stage — fixed height prevents layout jumps */}
      <div className="px-5 pb-5">
        <div className="relative h-[148px]">
          <AnimatePresence mode="wait">
            {/* BEFORE state */}
            {(phase === 'before' || phase === 'transforming') && (
              <motion.div
                key={`before-${exampleIdx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: phase === 'transforming' ? 0.2 : 1,
                  y: 0,
                  filter: phase === 'transforming' ? 'blur(1px)' : 'blur(0px)',
                }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col gap-2"
              >
                <Badge
                  variant="outline"
                  className="self-start text-[10px] h-5 px-2 border-muted-foreground/30 text-muted-foreground"
                >
                  Before
                </Badge>
                <div className="p-3 rounded-lg border border-border bg-muted/30 flex-1 flex items-start">
                  <p className="text-sm text-muted-foreground leading-relaxed">{example.before}</p>
                </div>
              </motion.div>
            )}

            {/* AFTER state */}
            {(phase === 'after' || phase === 'resetting') && (
              <motion.div
                key={`after-${exampleIdx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: phase === 'resetting' ? 0 : 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0 flex flex-col gap-2"
              >
                <Badge
                  variant="outline"
                  className="self-start text-[10px] h-5 px-2 border-primary/50 text-primary bg-primary/5"
                >
                  After
                </Badge>
                <div className="p-3 rounded-lg border border-primary/25 bg-primary/5 flex-1 flex items-start">
                  <p className="text-sm text-foreground leading-relaxed">{example.after}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sparkle overlay during transform */}
          <AnimatePresence>
            {phase === 'transforming' && (
              <motion.div
                key="sparkle-overlay"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <motion.div
                  animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.15, 1.08, 1] }}
                  transition={{ duration: 0.65, ease: 'easeInOut' }}
                  className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-soft-md"
                  style={{ boxShadow: '0 0 24px -4px hsl(var(--primary) / 0.45)' }}
                >
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        {!prefersReducedMotion && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {DEMO_EXAMPLES.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === exampleIdx ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center gap-2">
        <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          AI tailors every bullet, skill, and summary to match the job
        </p>
      </div>
    </div>
  );
}
