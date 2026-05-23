import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TailorFlowStep } from '@/components/tailor/page/TailorStepRail';
import { TAILOR_FLOW_STEPS } from '@/components/tailor/page/tailor-flow';

interface TailorSetupWizardFooterProps {
  step: TailorFlowStep;
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
}

export function TailorSetupWizardFooter({
  step,
  canContinue,
  onBack,
  onContinue,
}: TailorSetupWizardFooterProps) {
  const stepIdx = TAILOR_FLOW_STEPS.indexOf(step);
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === TAILOR_FLOW_STEPS.length - 1;

  return (
    <div className="tailor-wizard-footer">
      {!isFirst ? (
        <Button
          type="button"
          variant="outline"
          className="flex-1 min-h-[44px] rounded-xl"
          onClick={onBack}
        >
          <ChevronLeft className="w-4 h-4 mr-1" aria-hidden />
          Back
        </Button>
      ) : (
        <div className="flex-1" aria-hidden />
      )}
      {!isLast && (
        <Button
          type="button"
          className="flex-1 min-h-[44px] rounded-xl font-semibold"
          onClick={onContinue}
          disabled={!canContinue}
        >
          Continue
          <ChevronRight className="w-4 h-4 ml-1" aria-hidden />
        </Button>
      )}
    </div>
  );
}
