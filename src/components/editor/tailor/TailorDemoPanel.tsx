import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles, ArrowRight, Briefcase, TrendingUp } from 'lucide-react';
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
    <div className="tailor-results-empty tailor-results-panel">
      <div className="tailor-results-empty__hero">
        <div className="tailor-results-empty__hero-glow" aria-hidden />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/90">
              Example transformation
            </p>
            <p className="text-lg font-semibold text-foreground mt-1 leading-tight">
              See what tailoring unlocks
            </p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-md">
              Complete the steps on the left — match scores, keyword gaps, section-by-section diffs,
              and one-click apply will render in this studio panel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Badge variant="secondary" className="text-[10px] border border-primary/15 bg-primary/5 text-primary">
              Live demo
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1">
              <TrendingUp className="w-3 h-3" aria-hidden />
              ATS-focused
            </Badge>
          </div>
        </div>
      </div>

      <div className="px-5 pb-2 flex items-center gap-2">
        <Briefcase className="w-3.5 h-3.5 text-primary/70 shrink-0" aria-hidden />
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Target role: {example.jobContext}
        </span>
      </div>

      <div className="tailor-results-empty__stage">
        <div className="relative min-h-[200px] sm:min-h-[220px] overflow-hidden">
          <AnimatePresence mode="wait">
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
                className="absolute inset-0 flex flex-col gap-2 p-4 sm:p-5"
              >
                <Badge
                  variant="outline"
                  className="self-start text-[10px] h-5 px-2 border-muted-foreground/30 text-muted-foreground"
                >
                  Before
                </Badge>
                <p className="text-sm text-muted-foreground leading-relaxed">{example.before}</p>
              </motion.div>
            )}

            {(phase === 'after' || phase === 'resetting') && (
              <motion.div
                key={`after-${exampleIdx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: phase === 'resetting' ? 0 : 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0 flex flex-col gap-2 p-4 sm:p-5"
              >
                <Badge
                  variant="outline"
                  className="self-start text-[10px] h-5 px-2 border-primary/50 text-primary bg-primary/5"
                >
                  After tailoring
                </Badge>
                <p className="text-sm text-foreground leading-relaxed font-medium">{example.after}</p>
              </motion.div>
            )}
          </AnimatePresence>

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
                  animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.12, 1.06, 1] }}
                  transition={{ duration: 0.65, ease: 'easeInOut' }}
                  className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center"
                  style={{ boxShadow: '0 0 28px -4px hsl(var(--primary) / 0.5)' }}
                >
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!prefersReducedMotion && (
          <div className="flex items-center justify-center gap-1.5 py-3 border-t border-border/40">
            {DEMO_EXAMPLES.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === exampleIdx ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/25',
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className="tailor-results-empty__footer flex items-center gap-2">
        <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Bullets, skills, and summary are rewritten to mirror the job posting — your original resume stays safe until you apply.
        </p>
      </div>
    </div>
  );
}
