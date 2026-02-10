import { memo } from 'react';
import { motion } from 'framer-motion';
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
    <div className="px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between relative overflow-x-auto scrollbar-hide">
        {/* Connecting line */}
        <div className="absolute top-5 left-[10%] right-[10%] h-[2px] bg-border/40" />
        <motion.div
          className="absolute top-5 left-[10%] h-[2px] gradient-primary"
          initial={false}
          animate={{
            width: `${activeIndex > 0 ? (activeIndex / (steps.length - 1)) * 80 : 0}%`,
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
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
              <motion.div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-200',
                  isActive && 'border-primary bg-primary/15',
                  isCompleted && !isActive && 'border-success bg-success/15',
                  !isActive && !isCompleted && isPast && 'border-primary/40 bg-primary/5',
                  !isActive && !isCompleted && !isPast && 'border-border bg-card/50',
                )}
                animate={isActive ? {
                  scale: [0.9, 1.1, 1],
                  boxShadow: [
                    '0 0 0 0px hsl(355 90% 60% / 0)',
                    '0 0 0 6px hsl(355 90% 60% / 0.15)',
                    '0 0 0 0px hsl(355 90% 60% / 0)',
                  ],
                } : { scale: 1 }}
                transition={{ duration: 2, repeat: 2 }}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Icon className={cn(
                    'w-4 h-4',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )} />
                )}
              </motion.div>
              <span className={cn(
                'text-[11px] font-medium transition-colors',
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
