import { useMe } from './useMe';
import { useAuth } from './useAuth';

export type PlanName = 'free' | 'pro' | 'premium';

export interface PlanResult {
  plan: PlanName;
  isPro: boolean;
  isPremium: boolean;
  isLoading: boolean;
  subscriptionVerified: boolean;
  trialPlan: string | null;
  trialExpiresAt: string | null;
  refetch?: () => void;
}

const FALLBACK: PlanResult = {
  plan: 'free',
  isPro: false,
  isPremium: false,
  isLoading: true,
  subscriptionVerified: false,
  trialPlan: null,
  trialExpiresAt: null,
};

/**
 * Returns the current user's active plan.
 *
 * Reads plan data from the shared `useMe` query which calls the `me` edge
 * function. This avoids the silent-failure bug where an expired bridge token
 * causes `auth.uid()` to return null in direct DB queries, making the plan
 * always appear as 'free'.
 *
 * Uses `effective_plan` (computed server-side) which accounts for active trials:
 * if a user has an active trial, `effective_plan` reflects the trial plan rather
 * than the base `plan_name`.
 *
 * Realtime invalidation and 4-second polling are handled inside `useMe`.
 */
export function usePlan(): PlanResult {
  const { isAuthenticated, authReady } = useAuth();
  const { data: meData, isPending, isFetching, refetch } = useMe();

  if (!isAuthenticated) {
    return { ...FALLBACK, isLoading: false };
  }

  const subscriptionVerified = meData?.subscriptionVerified ?? false;
  const subscription = meData?.subscription;

  let plan: PlanName = 'free';
  if (subscription) {
    const raw = String(subscription.effective_plan ?? subscription.plan ?? 'free').toLowerCase();
    plan = raw === 'pro' || raw === 'premium' ? (raw as PlanName) : 'free';
  } else if (subscriptionVerified) {
    plan = 'free';
  }

  // Block UI until the first live plan fetch completes (or auth is still settling).
  const planLoading = !authReady || isPending || (isFetching && meData === undefined);

  return {
    plan,
    isPro: plan === 'pro' || plan === 'premium',
    isPremium: plan === 'premium',
    isLoading: planLoading,
    subscriptionVerified,
    trialPlan: subscription?.trial_plan ?? null,
    trialExpiresAt: subscription?.trial_expires_at ?? null,
    refetch,
  };
}
