import { memo, useEffect, useRef, useCallback, useState } from 'react';
import { Check, User, AlignLeft, Briefcase, GraduationCap, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperNavProps {
  steps: { id: string; label: string }[];
  activeStep: string;
  completedSteps: Record<string, boolean>;
  sectionScores?: Record<string, number>;
  onStepClick: (stepId: string) => void;
  justCompletedStep?: string | null;
}

const STEP_ICONS = [User, AlignLeft, Briefcase, GraduationCap, Wrench];

const PARTICLE_COLORS = ['bg-success', 'bg-primary', 'bg-warning', 'bg-amber-400', 'bg-success', 'bg-primary'];
const PARTICLE_ANGLES = [0, 60, 120, 180, 240, 300];

export const StepperNav = memo(function StepperNav({
  steps,
  activeStep,
  completedSteps,
  sectionScores,
  onStepClick,
  justCompletedStep,
}: StepperNavProps) {
  const activeIndex = steps.findIndex(s => s.id === activeStep);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const setStepRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) stepRefs.current.set(id, el);
    else stepRefs.current.delete(id);
  }, []);

  // Auto-scroll active step into view
  useEffect(() => {
    const el = stepRefs.current.get(activeStep);
    if (el) {
      el.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  }, [activeStep]);

  // Track scroll position for fade indicators
  const updateScrollIndicators = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 4);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 4);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    updateScrollIndicators();
    container.addEventListener('scroll', updateScrollIndicators, { passive: true });
    window.addEventListener('resize', updateScrollIndicators);
    return () => {
      container.removeEventListener('scroll', updateScrollIndicators);
      window.removeEventListener('resize', updateScrollIndicators);
    };
  }, [updateScrollIndicators]);

  return (
    <div className="px-2 py-3 relative">
      {/* Confetti keyframes */}
      <style>{`
        @keyframes stepper-confetti-burst {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
        }
        @keyframes stepper-icon-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Fade indicators */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 z-20 pointer-events-none bg-gradient-to-r from-background to-transparent" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 z-20 pointer-events-none bg-gradient-to-l from-background to-transparent" />
      )}

      <div
        ref={scrollRef}
        className="flex items-center justify-between relative overflow-x-auto scrollbar-hide w-full px-2"
      >
        {/* Connecting line */}
        <div className="absolute top-6 left-[10%] right-[10%] h-[2px] bg-border/40" />
        <div
          className="absolute top-6 left-[10%] h-[2px] gradient-primary transition-all duration-400 ease-out"
          style={{
            width: `${activeIndex > 0 ? (activeIndex / (steps.length - 1)) * 80 : 0}%`,
          }}
        />

        {steps.map((step, i) => {
          const Icon = STEP_ICONS[i];
          const isActive = step.id === activeStep;
          const isCompleted = completedSteps[step.id];
          const isPast = i < activeIndex;
          const score = sectionScores?.[step.id] ?? (isCompleted ? 100 : 0);
          const isInProgress = score > 0 && score < 100;
          const showConfetti = step.id === justCompletedStep;

          return (
            <button
              key={step.id}
              ref={(el) => setStepRef(step.id, el)}
              onClick={() => onStepClick(step.id)}
              className="flex flex-col items-center gap-1.5 relative z-10 touch-manipulation min-w-[48px] min-h-[48px] p-1"
            >
              <div className="relative">
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200',
                    isActive && 'border-primary bg-primary/15 shadow-[0_0_0_5px_hsl(355_90%_60%/0.15)]',
                    isCompleted && !isActive && 'border-success bg-success/15',
                    isInProgress && !isActive && !isCompleted && 'border-warning bg-warning/15',
                    !isActive && !isCompleted && !isInProgress && isPast && 'border-primary/40 bg-primary/5',
                    !isActive && !isCompleted && !isInProgress && !isPast && 'border-border bg-card/50',
                  )}
                  style={showConfetti ? { animation: 'stepper-icon-pulse 400ms ease-out' } : undefined}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 text-success" />
                  ) : (
                    <Icon className={cn(
                      'w-5 h-5',
                      isActive ? 'text-primary' : isInProgress ? 'text-warning' : 'text-muted-foreground'
                    )} />
                  )}
                </div>
                {/* Confetti particles */}
                {showConfetti && PARTICLE_ANGLES.map((angle, pi) => {
                  const rad = (angle * Math.PI) / 180;
                  const dist = 24;
                  return (
                    <span
                      key={pi}
                      className={cn('absolute w-1.5 h-1.5 rounded-full pointer-events-none', PARTICLE_COLORS[pi])}
                      style={{
                        top: '50%',
                        left: '50%',
                        '--tx': `${Math.cos(rad) * dist}px`,
                        '--ty': `${Math.sin(rad) * dist}px`,
                        animation: 'stepper-confetti-burst 800ms ease-out forwards',
                      } as React.CSSProperties}
                    />
                  );
                })}
                {/* Percentage badge for in-progress */}
                {isInProgress && !isCompleted && (
                  <span className="absolute -bottom-0.5 -right-1 text-[9px] font-bold bg-warning text-warning-foreground rounded-full px-1 leading-tight">
                    {score}%
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[11px] font-medium transition-colors whitespace-nowrap',
                isActive ? 'text-primary' : isCompleted ? 'text-success' : isInProgress ? 'text-warning' : 'text-muted-foreground'
              )}>
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
