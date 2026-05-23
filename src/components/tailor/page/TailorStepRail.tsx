import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canAccessTailorStep, tailorStepIndex } from '@/components/tailor/page/tailor-flow';

export type TailorFlowStep = 'resume' | 'job' | 'options' | 'run';

const STEPS: { id: TailorFlowStep; num: number; label: string }[] = [
  { id: 'resume', num: 1, label: 'Resume' },
  { id: 'job', num: 2, label: 'Job' },
  { id: 'options', num: 3, label: 'Options' },
  { id: 'run', num: 4, label: 'Optimize' },
];

interface TailorStepRailProps {
  activeStep: TailorFlowStep;
  hasResume: boolean;
  hasJob: boolean;
  variant?: 'horizontal' | 'vertical';
  className?: string;
  onStepClick?: (step: TailorFlowStep) => void;
}

export function TailorStepRail({
  activeStep,
  hasResume,
  hasJob,
  variant = 'horizontal',
  className,
  onStepClick,
}: TailorStepRailProps) {
  const activeIdx = tailorStepIndex(activeStep);
  const isVertical = variant === 'vertical';

  return (
    <nav
      className={cn(
        'tailor-step-rail',
        isVertical && 'tailor-step-rail--vertical',
        className,
      )}
      aria-label="Tailor progress"
    >
      {isVertical && <p className="tailor-setup-panel__rail-label">Workflow</p>}
      {STEPS.map((step, idx) => {
        const isActive = step.id === activeStep;
        const accessible = canAccessTailorStep(step.id, hasResume, hasJob);
        const isDone =
          (step.id === 'resume' && hasResume && !isActive) ||
          (step.id === 'job' && hasJob && activeIdx > tailorStepIndex('job')) ||
          (step.id === 'options' && activeIdx > tailorStepIndex('options')) ||
          idx < activeIdx;

        const pillClass = cn(
          'tailor-step-pill',
          onStepClick && accessible && 'tailor-step-pill--clickable',
        );

        const inner = (
          <>
            <span className="tailor-step-pill__num" aria-hidden>
              {isDone && !isActive ? <Check className="w-3 h-3" strokeWidth={3} /> : step.num}
            </span>
            {step.label}
          </>
        );

        if (onStepClick && accessible) {
          return (
            <button
              key={step.id}
              type="button"
              className={pillClass}
              data-active={isActive ? 'true' : 'false'}
              data-done={isDone && !isActive ? 'true' : 'false'}
              aria-current={isActive ? 'step' : undefined}
              onClick={() => onStepClick(step.id)}
            >
              {inner}
            </button>
          );
        }

        return (
          <span
            key={step.id}
            className={pillClass}
            data-active={isActive ? 'true' : 'false'}
            data-done={isDone && !isActive ? 'true' : 'false'}
            data-disabled={!accessible ? 'true' : 'false'}
            aria-current={isActive ? 'step' : undefined}
          >
            {inner}
          </span>
        );
      })}
    </nav>
  );
}
