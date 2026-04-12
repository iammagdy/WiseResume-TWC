import { Crown, Gem } from 'lucide-react';
import type { PlanName } from '@/hooks/usePlan';
import { useMe } from '@/hooks/useMe';

interface PlanChipProps {
  plan: PlanName;
}

export function PlanChip({ plan }: PlanChipProps) {
  const { data: meData } = useMe();

  if (plan === 'free') return null;

  const isActiveTrial =
    !!meData?.subscription?.trial_plan &&
    !!meData?.subscription?.trial_expires_at &&
    new Date(meData.subscription.trial_expires_at) > new Date();

  if (isActiveTrial) return null;

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
