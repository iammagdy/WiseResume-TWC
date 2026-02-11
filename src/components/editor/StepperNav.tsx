import { memo } from 'react';
import { Check, User, AlignLeft, Briefcase, GraduationCap, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperNavProps {
  steps: { id: string; label: string }[];
  activeStep: string;
  completedSteps: Record<string, boolean>;
  onStepClick: (stepId: string) => void;
}

const STEP_ICONS = [User, AlignLeft, Briefcase, GraduationCap, Wrench];

export const StepperNav = memo(function StepperNav({
  steps,
  activeStep,
  completedSteps,
  onStepClick,
}: StepperNavProps) {
  const activeIndex = steps.findIndex(s => s.id === activeStep);

  return (
    <div className="px-2 xs:px-4 sm:px-6 py-4">
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

          return (
            <button
              key={step.id}
              onClick={() => onStepClick(step.id)}
              className="flex flex-col items-center gap-1.5 relative z-10 touch-manipulation min-w-[48px]"
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200',
                  isActive && 'border-primary bg-primary/15 shadow-[0_0_0_4px_hsl(355_90%_60%/0.15)]',
                  isCompleted && !isActive && 'border-success bg-success/15',
                  !isActive && !isCompleted && isPast && 'border-primary/40 bg-primary/5',
                  !isActive && !isCompleted && !isPast && 'border-border bg-card/50',
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Icon className={cn(
                    'w-4 h-4',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )} />
                )}
              </div>
              <span className={cn(
                'hidden xs:block text-[11px] font-medium transition-colors',
                isActive ? 'text-primary' : isCompleted ? 'text-success' : 'text-muted-foreground'
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
