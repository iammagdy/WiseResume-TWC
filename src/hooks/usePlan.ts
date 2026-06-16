import { useMe } from './useMe';
import { useAuth } from './useAuth';
import { readPlanCache, writePlanCache, clearPlanCache } from '@/lib/planCache';

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

const UNAUTHENTICATED: PlanResult = {
  plan: 'free',
  isPro: false,
  isPremium: false,
  isLoading: true,
  subscriptionVerified: false,
  trialPlan: null,
  trialExpiresAt: null,
};

function fromCache(refetch?: () => void): PlanResult | null {
  const entry = readPlanCache();
  if (!entry) return null;
  const isPro = entry.plan === 'pro' || entry.plan === 'premium';
  return {
    plan: entry.plan,
    isPro,
    isPremium: entry.plan === 'premium',
    isLoading: true, // still revalidating in background
    subscriptionVerified: false,
    trialPlan: entry.trialPlan,
    trialExpiresAt: entry.trialExpiresAt,
    refetch,
  };
}

/**
 * Returns the current user's active plan.
 *
 * Reads plan data from the shared `useMe` query. Caches the last known plan
 * in localStorage so returning users see the correct plan immediately instead
 * of a "free" flash while auth / useMe is initialising.
 *
 * Loading states:
 *  - Auth validating → serve cache (or isLoading:true if no cache yet)
 *  - useMe fetching  → serve cache (or isLoading:true if no cache yet)
 *  - Both settled    → serve live data; write to cache for next load
 */
export function usePlan(): PlanResult {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { data: meData, isLoading: meLoading, refetch } = useMe();

  // ── Auth hasn't resolved yet ──────────────────────────────────────────────
  if (authLoading) {
    // Serve cached plan so the badge doesn't flash "free" during account.get()
    return fromCache(refetch) ?? { ...UNAUTHENTICATED, isLoading: true };
  }

  // ── Confirmed unauthenticated ─────────────────────────────────────────────
  if (!isAuthenticated) {
    clearPlanCache();
    return { ...UNAUTHENTICATED, isLoading: false };
  }

  const subscriptionVerified = meData?.subscriptionVerified ?? false;
  const subscription = meData?.subscription;

  // ── Authenticated — resolve effective plan ────────────────────────────────
  let plan: PlanName = 'free';
  if (subscription) {
    const raw = String(subscription.effective_plan ?? subscription.plan ?? 'free').toLowerCase();
    plan = raw === 'pro' || raw === 'premium' ? (raw as PlanName) : 'free';
  } else if (subscriptionVerified) {
    plan = 'free';
  }
  const trialPlan = subscription?.trial_plan ?? null;
  const trialExpiresAt = subscription?.trial_expires_at ?? null;

  // While useMe is still in flight, serve the cache so the UI doesn't flash
  if (meLoading) {
    const cached = fromCache(refetch);
    if (cached) {
      return { ...cached, subscriptionVerified };
    }
    return { ...UNAUTHENTICATED, isLoading: true, subscriptionVerified };
  }

  // Settled — write the authoritative plan to cache for the next page load
  writePlanCache(plan, trialPlan, trialExpiresAt);

  return {
    plan,
    isPro: plan === 'pro' || plan === 'premium',
    isPremium: plan === 'premium',
    isLoading: false,
    subscriptionVerified,
    trialPlan,
    trialExpiresAt,
    refetch,
  };
}
