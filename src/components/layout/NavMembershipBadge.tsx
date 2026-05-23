import { memo } from 'react';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlanName } from '@/hooks/usePlan';

interface NavMembershipBadgeProps {
  plan: PlanName;
  trialPlan?: string | null;
  trialExpiresAt?: string | null;
  className?: string;
}

/**
 * Membership indicator for the app shell — premium uses the same amber ring glow as PlanAvatar.
 */
export const NavMembershipBadge = memo(function NavMembershipBadge({
  plan,
  trialPlan = null,
  trialExpiresAt = null,
  className,
}: NavMembershipBadgeProps) {
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
    const tier = trialPlan === 'premium' ? 'Premium' : 'Pro';
    const isPremiumTrial = trialPlan === 'premium';
    return (
      <span
        className={cn(
          'nav-membership-badge nav-membership-badge--trial',
          isPremiumTrial && 'nav-membership-badge--premium',
          className,
        )}
        aria-label={`${tier} trial, ${daysLeft} days remaining`}
        title={`${tier} trial · ${daysLeft}d left`}
      >
        {isPremiumTrial ? (
          <Crown className="nav-membership-badge__icon" strokeWidth={2} aria-hidden />
        ) : (
          <span className="nav-membership-badge__dot nav-membership-badge__dot--pro" aria-hidden />
        )}
        <span className="nav-membership-badge__label">{tier}</span>
        <span className="nav-membership-badge__suffix">trial</span>
      </span>
    );
  }

  if (plan === 'premium') {
    return (
      <span
        className={cn('nav-membership-badge nav-membership-badge--premium', className)}
        aria-label="Premium membership active"
        title="Premium Active"
      >
        <Crown className="nav-membership-badge__icon" strokeWidth={2} aria-hidden />
        <span className="nav-membership-badge__label">Premium</span>
      </span>
    );
  }

  return (
    <span
      className={cn('nav-membership-badge nav-membership-badge--pro', className)}
      aria-label="Pro membership active"
      title="Pro plan"
    >
      <span className="nav-membership-badge__dot nav-membership-badge__dot--pro" aria-hidden />
      <span className="nav-membership-badge__label">Pro</span>
    </span>
  );
});
