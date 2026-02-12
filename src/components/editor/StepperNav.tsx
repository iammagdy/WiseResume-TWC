import { memo } from 'react';
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
const PARTICLE_ANGLES = [0, 60, 120, 180, 240, 300]; // 6 particles evenly spaced

export const StepperNav = memo(function StepperNav({
  steps,
  activeStep,
  completedSteps,
  sectionScores,
  onStepClick,
  justCompletedStep,
}: StepperNavProps) {
  const activeIndex = steps.findIndex(s => s.id === activeStep);

  return (
    <div className="px-2 xs:px-4 sm:px-6 py-4">
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
      <div className="flex items-center justify-between relative overflow-x-auto scrollbar-hide">
        {/* Connecting line */}
        <div className="absolute top-5 left-[10%] right-[10%] h-[2px] bg-border/40" />
        <div
          className="absolute top-5 left-[10%] h-[2px] gradient-primary transition-all duration-400 ease-out"
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
              onClick={() => onStepClick(step.id)}
              className="flex flex-col items-center gap-1.5 relative z-10 touch-manipulation min-w-[48px]"
            >
              <div className="relative">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200',
                    isActive && 'border-primary bg-primary/15 shadow-[0_0_0_4px_hsl(355_90%_60%/0.15)]',
                    isCompleted && !isActive && 'border-success bg-success/15',
                    isInProgress && !isActive && !isCompleted && 'border-warning bg-warning/15',
                    !isActive && !isCompleted && !isInProgress && isPast && 'border-primary/40 bg-primary/5',
                    !isActive && !isCompleted && !isInProgress && !isPast && 'border-border bg-card/50',
                  )}
                  style={showConfetti ? { animation: 'stepper-icon-pulse 400ms ease-out' } : undefined}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Icon className={cn(
                      'w-4 h-4',
                      isActive ? 'text-primary' : isInProgress ? 'text-warning' : 'text-muted-foreground'
                    )} />
                  )}
                </div>
                {/* Confetti particles */}
                {showConfetti && PARTICLE_ANGLES.map((angle, pi) => {
                  const rad = (angle * Math.PI) / 180;
                  const dist = 20; // px distance
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
                'hidden xs:block text-[11px] font-medium transition-colors',
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
