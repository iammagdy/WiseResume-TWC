import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { PlanName } from '@/hooks/usePlan';

interface DashboardPlanBadgeProps {
  plan: PlanName;
  trialPlan?: string | null;
  trialExpiresAt?: string | null;
  className?: string;
}

/** Softer plan indicator for dashboard chrome — calmer than global PlanChip. */
export const DashboardPlanBadge = memo(function DashboardPlanBadge({
  plan,
  trialPlan = null,
  trialExpiresAt = null,
  className,
}: DashboardPlanBadgeProps) {
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
    const label = trialPlan === 'premium' ? 'Premium trial' : 'Pro trial';
    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium',
          'border border-amber-200/50 bg-amber-50/80 text-amber-800/90',
          'dark:border-amber-500/20 dark:bg-amber-950/30 dark:text-amber-200/90',
          className,
        )}
        aria-label={`${label}, ${daysLeft} days left`}
      >
        {label}
      </span>
    );
  }

  if (plan === 'premium') {
    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium',
          'border border-amber-200/35 bg-amber-50/50 text-amber-900/70',
          'dark:border-amber-500/12 dark:bg-amber-950/20 dark:text-amber-100/75',
          className,
        )}
        aria-label="Premium active"
      >
        Premium Active
      </span>
    );
  }

  // Pro plan (non-trial)
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium',
        'border border-blue-200/70 bg-blue-50/60 text-blue-800/90',
        'dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-200/90',
        className,
      )}
      aria-label="Pro plan active"
    >
      Pro
    </span>
  );
});
