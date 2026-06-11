import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Sparkles,
  X,
  FileSearch,
  Link2,
  PenLine,
  Gauge,
  Package,
} from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Button } from '@/components/ui/button';
import type { TailorProgress, EnhancedTailorProgress, EnhancedTailorStep, TailorStep } from '@/types/resume';
import { cn } from '@/lib/utils';

type AnyStep = EnhancedTailorStep | TailorStep;

interface JobMatchProgressStageProps {
  progress: TailorProgress | EnhancedTailorProgress | null;
  jobTitle?: string;
  company?: string;
  resumeTitle?: string;
  matchScoreBefore?: number;
  onCancel: () => void;
  className?: string;
}

interface TailorPhase {
  id: string;
  label: string;
  detail: string;
  icon: typeof FileSearch;
  steps: AnyStep[];
}

const TAILOR_PHASES: TailorPhase[] = [
  {
    id: 'analyze',
    label: 'Analyze',
    detail: 'Reading requirements & industry context',
    icon: FileSearch,
    steps: ['analyzing_requirements', 'detecting_industry', 'analyzing'],
  },
  {
    id: 'match',
    label: 'Match',
    detail: 'Mapping your experience to the role',
    icon: Link2,
    steps: ['matching_experience', 'matching'],
  },
  {
    id: 'rewrite',
    label: 'Rewrite',
    detail: 'Summary, skills & achievement bullets',
    icon: PenLine,
    steps: ['rewriting_summary', 'optimizing_skills', 'transforming_bullets', 'enhancing_experience'],
  },
  {
    id: 'optimize',
    label: 'Optimize',
    detail: 'ATS keywords & interview talking points',
    icon: Gauge,
    steps: ['calculating_ats', 'generating_interview_prep', 'generating_recs'],
  },
  {
    id: 'finalize',
    label: 'Finalize',
    detail: 'Packaging your tailored resume',
    icon: Package,
    steps: ['finalizing', 'complete'],
  },
];

function useAnimatedNumber(target: number, speed = 0.12) {
  const [display, setDisplay] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    let raf: number;
    const animate = () => {
      const diff = target - current.current;
      if (Math.abs(diff) > 0.4) {
        current.current += diff * speed;
        setDisplay(Math.round(current.current));
        raf = requestAnimationFrame(animate);
      } else {
        current.current = target;
        setDisplay(Math.round(target));
      }
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, speed]);

  return display;
}

function useProgressEta(progressPct: number, isComplete: boolean) {
  const startedAt = useRef(Date.now());
  const [eta, setEta] = useState<number | null>(null);
  const [longRunning, setLongRunning] = useState(false);

  useEffect(() => {
    if (isComplete) {
      setEta(0);
      setLongRunning(false);
      return;
    }
    if (progressPct < 4) {
      setEta(null);
      setLongRunning(false);
      return;
    }
    const elapsed = (Date.now() - startedAt.current) / 1000;
    // Above ~80% the bar plateaus while the server finishes — velocity ETA lies.
    if (progressPct >= 80 && elapsed > 35) {
      setEta(null);
      setLongRunning(true);
      return;
    }
    setLongRunning(false);
    const estimatedTotal = elapsed / (progressPct / 100);
    setEta(Math.max(0, Math.round(estimatedTotal - elapsed)));
  }, [progressPct, isComplete]);

  return { eta, longRunning };
}

function phaseStatus(phase: TailorPhase, currentStep: AnyStep | undefined, isComplete: boolean) {
  if (isComplete) return 'done' as const;
  if (!currentStep) return 'pending' as const;
  const currentPhaseIdx = TAILOR_PHASES.findIndex((p) => p.steps.includes(currentStep));
  const phaseIdx = TAILOR_PHASES.findIndex((p) => p.id === phase.id);
  if (phaseIdx < currentPhaseIdx) return 'done' as const;
  if (phaseIdx === currentPhaseIdx) return 'active' as const;
  return 'pending' as const;
}

export function JobMatchProgressStage({
  progress,
  jobTitle,
  company,
  resumeTitle,
  matchScoreBefore,
  onCancel,
  className,
}: JobMatchProgressStageProps) {
  const isComplete = progress?.step === 'complete';
  const progressPct = progress?.progress ?? 0;
  const displayPct = useAnimatedNumber(isComplete ? 100 : progressPct);
  const { eta, longRunning } = useProgressEta(displayPct, Boolean(isComplete));
  const message = progress?.message ?? 'Warming up AI engines…';
  const funFact = progress && 'funFact' in progress ? progress.funFact : undefined;
  const currentStep = progress?.step;

  const activePhase = useMemo(
    () => TAILOR_PHASES.find((p) => currentStep && p.steps.includes(currentStep)) ?? TAILOR_PHASES[0],
    [currentStep],
  );

  const projectedAfter = useMemo(() => {
    if (matchScoreBefore == null) return null;
    const floor = Math.min(90, matchScoreBefore + 12);
    const ceiling = Math.min(95, matchScoreBefore + 28);
    return { floor, ceiling };
  }, [matchScoreBefore]);

  const [showCancel, setShowCancel] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowCancel(true), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={cn('jmw-progress-overlay', className)}
      role="status"
      aria-live="polite"
      aria-label="AI tailoring in progress"
      aria-valuenow={displayPct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="jmw-progress-stage">
        <div className="jmw-progress-stage__header">
          <div className="jmw-progress-stage__badge">
            <Sparkles className="w-3.5 h-3.5" aria-hidden />
            Step 3 · Creating tailored resume
          </div>
          <h2 className="jmw-progress-stage__title">
            {isComplete ? 'Tailoring complete' : 'AI is tailoring your resume'}
          </h2>
          <p className="jmw-progress-stage__subtitle">
            {[jobTitle, company].filter(Boolean).join(' @ ') || 'Your target role'}
            {resumeTitle ? ` · from “${resumeTitle}”` : ''}
          </p>
        </div>

        <div className="jmw-progress-stage__panel">
          <div className="jmw-progress-stage__hero">
            <div className="jmw-progress-stage__ring-wrap">
              <svg className="jmw-progress-stage__ring" viewBox="0 0 120 120" aria-hidden>
                <circle
                  className="jmw-progress-stage__ring-track"
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  strokeWidth="8"
                />
                <circle
                  className="jmw-progress-stage__ring-fill"
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - displayPct / 100)}
                />
              </svg>
              <div className="jmw-progress-stage__ring-label">
                <span className="jmw-progress-stage__pct">{displayPct}%</span>
                <span className="jmw-progress-stage__pct-caption">
                  {isComplete ? 'Done' : 'Overall'}
                </span>
              </div>
            </div>

            <div className="jmw-progress-stage__hero-copy">
              <p className="jmw-progress-stage__phase-label">{activePhase.label}</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={message}
                  className="jmw-progress-stage__message"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  {message}
                </motion.p>
              </AnimatePresence>

              <div className="jmw-progress-stage__meta">
                {!isComplete && longRunning && (
                  <span className="jmw-progress-stage__eta">Still working — detailed tailoring can take up to 2 min</span>
                )}
                {!isComplete && !longRunning && eta != null && (
                  <span className="jmw-progress-stage__eta">~{eta}s remaining</span>
                )}
                {matchScoreBefore != null && !isComplete && (
                  <span className="jmw-progress-stage__match">
                    Baseline {matchScoreBefore}%
                    {projectedAfter
                      ? ` → targeting ${projectedAfter.floor}–${projectedAfter.ceiling}%`
                      : ''}
                  </span>
                )}
              </div>

              <div className="jmw-progress-stage__bar" aria-hidden>
                <motion.div
                  className="jmw-progress-stage__bar-fill"
                  animate={{ width: `${displayPct}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>

          <div className="jmw-progress-stage__phases" aria-label="Tailoring phases">
            {TAILOR_PHASES.map((phase, index) => {
              const status = phaseStatus(phase, currentStep, Boolean(isComplete));
              const Icon = phase.icon;
              return (
                <div
                  key={phase.id}
                  className={cn('jmw-progress-phase', `jmw-progress-phase--${status}`)}
                >
                  <div className="jmw-progress-phase__icon" aria-hidden>
                    {status === 'done' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : status === 'active' ? (
                      <MiniSpinner size={14} />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="jmw-progress-phase__copy">
                    <p className="jmw-progress-phase__label">{phase.label}</p>
                    <p className="jmw-progress-phase__detail">
                      {status === 'active' ? phase.detail : status === 'done' ? 'Complete' : 'Waiting'}
                    </p>
                  </div>
                  {index < TAILOR_PHASES.length - 1 && (
                    <div className="jmw-progress-phase__connector" aria-hidden />
                  )}
                </div>
              );
            })}
          </div>

          {funFact && !isComplete && (
            <div className="jmw-progress-stage__tip">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-primary" aria-hidden />
              <p>{funFact}</p>
            </div>
          )}

          {!isComplete && showCancel && (
            <div className="jmw-progress-stage__actions">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-1.5" aria-hidden />
                Cancel tailoring
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
