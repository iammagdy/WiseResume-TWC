import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { getUserId } from '@/lib/supabaseBridge';
import { useMe, type MeSubscription } from '@/hooks/useMe';

export interface WiseHireCompany {
  id: string;
  owner_id: string;
  name: string;
  size: string;
  role_types: string[] | null;
  monthly_volume: string | null;
  onboarding_completed: boolean;
  slug: string | null;
  created_at: string;
  updated_at: string;
}

export interface WiseHireAccountData {
  company: WiseHireCompany | null;
  subscription: MeSubscription | null;
  /** True when trial is active (trial_plan set + trial_expires_at in the future) */
  isTrialActive: boolean;
  /** Days remaining in trial (0 if not active) */
  daysRemaining: number;
  /** The user's effective plan name considering trial */
  currentPlan: string;
  /** True when trial has expired AND no paid WiseHire plan is active */
  isExpiredWithNoPlan: boolean;
}

const WISEHIRE_PAID_PLANS = [
  'wisehire_starter',
  'wisehire_professional',
  'wisehire_business',
  'wisehire_enterprise',
];

function computeAccount(
  company: WiseHireCompany | null,
  sub: MeSubscription | null,
): WiseHireAccountData {
  const now = new Date();

  const isTrialActive = !!(
    sub?.trial_plan &&
    sub?.trial_expires_at &&
    new Date(sub.trial_expires_at) > now
  );

  const daysRemaining = isTrialActive
    ? Math.max(0, Math.ceil((new Date(sub!.trial_expires_at!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const currentPlan = isTrialActive
    ? sub!.trial_plan!
    : (sub?.plan_name ?? 'free');

  const isOnPaidWiseHirePlan =
    !!sub?.plan_name && WISEHIRE_PAID_PLANS.includes(sub.plan_name) && sub.status === 'active';

  const isExpiredWithNoPlan = !isTrialActive && !isOnPaidWiseHirePlan;

  return { company, subscription: sub, isTrialActive, daysRemaining, currentPlan, isExpiredWithNoPlan };
}

/**
 * Fetches WiseHire-specific company data and combines it with the subscription
 * already loaded by `useMe`. The direct `subscriptions` Supabase query has been
 * removed — `MeSubscription` from `/api/data/me` covers all fields needed by
 * `computeAccount`, preventing a duplicate round-trip.
 */
export function useWiseHireAccount() {
  const { isAuthenticated, supabaseReady } = useAuth();
  const userId = getUserId();
  const { data: meData } = useMe();

  const companyQuery = useQuery({
    queryKey: ['wisehire-account', userId],
    queryFn: async (): Promise<WiseHireCompany | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('wisehire_companies')
        .select('id, owner_id, name, size, role_types, monthly_volume, onboarding_completed, slug, created_at, updated_at')
        .eq('owner_id', userId)
        .maybeSingle();

      if (error) console.warn('[useWiseHireAccount] company fetch:', error.message);
      return data as WiseHireCompany | null;
    },
    enabled: isAuthenticated && supabaseReady && !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Combine company (from Supabase, unique to this hook) with subscription
  // (from useMe cache, no extra network call). Recomputed on every render so
  // subscription changes from Realtime invalidations are reflected immediately.
  const accountData = computeAccount(
    companyQuery.data ?? null,
    meData?.subscription ?? null,
  );

  return {
    ...companyQuery,
    data: companyQuery.status !== 'pending' || !isAuthenticated ? accountData : undefined,
  };
}
