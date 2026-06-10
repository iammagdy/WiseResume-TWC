import { Sparkles, Zap, Infinity as InfinityIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAICost } from '@/lib/aiCostEstimates';
import { useAICredits } from '@/hooks/useAICredits';
import { usePlan } from '@/hooks/usePlan';

interface JobMatchStickyFooterProps {
  canTailor: boolean;
  isTailoring: boolean;
  onTailor: () => void;
  /** AI_COST_MAP operation key — defaults to tailor (2 credits). */
  operation?: string;
  className?: string;
}

function formatCreditLabel(cost: number): string {
  if (cost <= 0) return 'no credits';
  return cost === 1 ? '1 AI credit' : `${cost} AI credits`;
}

export function JobMatchStickyFooter({
  canTailor,
  isTailoring,
  onTailor,
  operation = 'tailor',
  className,
}: JobMatchStickyFooterProps) {
  const { data: credits, isActiveTrial, trialPlan } = useAICredits();
  const { isPremium } = usePlan();
  const creditCost = getAICost(operation);

  const hasUnlimitedCredits =
    isPremium ||
    (isActiveTrial && trialPlan === 'premium') ||
    !Number.isFinite(credits?.daily_limit) ||
    credits?.daily_limit === -1;

  const hintText = hasUnlimitedCredits
    ? isActiveTrial && trialPlan === 'premium'
      ? 'Premium trial · No credits used · Changes saved automatically'
      : 'Premium · No credits used · Changes saved automatically'
    : `Uses ${formatCreditLabel(creditCost)} · Changes saved automatically`;

  return (
    <div className={cn('jmw-sticky-footer', className)}>
      <button
        type="button"
        className="jmw-cta-primary"
        disabled={!canTailor || isTailoring}
        onClick={onTailor}
        aria-label="Create tailored CV"
      >
        {isTailoring ? (
          <>
            <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Creating tailored CV…
          </>
        ) : (
          <>
            <Sparkles className="w-4.5 h-4.5" aria-hidden />
            Create Tailored CV
          </>
        )}
      </button>
      {!isTailoring && (
        <p className="jmw-cta-hint">
          {hasUnlimitedCredits ? (
            <InfinityIcon className="inline-block w-3 h-3 mr-0.5 -mt-0.5" aria-hidden />
          ) : (
            <Zap className="inline-block w-3 h-3 mr-0.5 -mt-0.5" aria-hidden />
          )}
          {hintText}
        </p>
      )}
    </div>
  );
}
