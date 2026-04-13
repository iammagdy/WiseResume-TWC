import { useMe } from './useMe';
import { useAuth } from './useAuth';

export type PlanName = 'free' | 'pro' | 'premium';

export interface PlanResult {
  plan: PlanName;
  isPro: boolean;
  isPremium: boolean;
  isLoading: boolean;
  trialPlan: string | null;
  trialExpiresAt: string | null;
  refetch?: () => void;
}

const FALLBACK: PlanResult = {
  plan: 'free',
  isPro: false,
  isPremium: false,
  isLoading: false,
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
  const { isAuthenticated } = useAuth();
  const { data: meData, isLoading, refetch } = useMe();

  if (!isAuthenticated) return FALLBACK;

  const raw = String(meData?.subscription?.effective_plan ?? 'free').toLowerCase();
  const plan: PlanName = (raw === 'pro' || raw === 'premium') ? (raw as PlanName) : 'free';

  return {
    plan,
    isPro: plan === 'pro' || plan === 'premium',
    isPremium: plan === 'premium',
    isLoading,
    trialPlan: meData?.subscription?.trial_plan ?? null,
    trialExpiresAt: meData?.subscription?.trial_expires_at ?? null,
    refetch,
  };
}
