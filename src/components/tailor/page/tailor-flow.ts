import type { TailorFlowStep } from '@/components/tailor/page/TailorStepRail';

export const TAILOR_FLOW_STEPS: TailorFlowStep[] = ['resume', 'job', 'options', 'run'];

export function tailorStepIndex(step: TailorFlowStep): number {
  return TAILOR_FLOW_STEPS.indexOf(step);
}

export function canAccessTailorStep(
  step: TailorFlowStep,
  hasResume: boolean,
  hasJob: boolean,
): boolean {
  if (step === 'resume') return true;
  if (step === 'job') return hasResume;
  return hasResume && hasJob;
}

export function canContinueTailorStep(
  step: TailorFlowStep,
  hasResume: boolean,
  hasJob: boolean,
): boolean {
  if (step === 'resume') return hasResume;
  if (step === 'job') return hasJob;
  return true;
}
