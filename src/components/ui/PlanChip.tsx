import { Crown, Gem, Clock } from 'lucide-react';
import type { PlanName } from '@/hooks/usePlan';

interface PlanChipProps {
  plan: PlanName;
  trialPlan?: string | null;
  trialExpiresAt?: string | null;
}

export function PlanChip({ plan, trialPlan = null, trialExpiresAt = null }: PlanChipProps) {
  if (plan === 'free') return null;

  const isActiveTrial =
    !!trialPlan &&
    !!trialExpiresAt &&
    new Date(trialExpiresAt) > new Date();

  if (isActiveTrial && trialPlan) {
    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(trialExpiresAt!).getTime() - Date.now()) / 86_400_000),
    );
    const planLabel = trialPlan === 'premium' ? 'Premium' : 'Pro';
    const colorClass =
      trialPlan === 'premium'
        ? 'bg-amber-500/10 border-amber-400/40 text-amber-600 dark:text-amber-400'
        : 'bg-violet-500/10 border-violet-400/40 text-violet-600 dark:text-violet-400';

    return (
      <span
        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${colorClass}`}
        aria-label={`${planLabel} Trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
      >
        <Clock className="w-3 h-3 shrink-0" />
        {planLabel} Trial · {daysLeft}d
      </span>
    );
  }

  if (plan === 'premium') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-400/40 text-amber-600 dark:text-amber-400 whitespace-nowrap">
        <Gem className="w-3 h-3 shrink-0" />
        Premium
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-400/40 text-blue-600 dark:text-blue-400 whitespace-nowrap">
      <Crown className="w-3 h-3 shrink-0" />
      Pro
    </span>
  );
}
