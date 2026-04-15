import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { getUserId } from '@/lib/supabaseBridge';

export interface WiseHireCompany {
  id: string;
  owner_id: string;
  name: string;
  slug: string | null;
  size: string;
  role_types: string[] | null;
  monthly_volume: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface WiseHireSubscription {
  user_id: string;
  plan_name: string;
  status: string;
  trial_plan: string | null;
  trial_expires_at: string | null;
  coupon_code: string | null;
  coupon_discount_percent: number | null;
  current_period_end: string | null;
}

export interface WiseHireAccountData {
  company: WiseHireCompany | null;
  subscription: WiseHireSubscription | null;
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
  sub: WiseHireSubscription | null,
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

export function useWiseHireAccount() {
  const { isAuthenticated, supabaseReady } = useAuth();
  const userId = getUserId();

  return useQuery({
    queryKey: ['wisehire-account', userId],
    queryFn: async (): Promise<WiseHireAccountData> => {
      if (!userId) return computeAccount(null, null);

      const [companyRes, subRes] = await Promise.all([
        supabase
          .from('wisehire_companies')
          .select('id, owner_id, name, slug, size, role_types, monthly_volume, onboarding_completed, created_at, updated_at')
          .eq('owner_id', userId)
          .maybeSingle(),
        supabase
          .from('subscriptions')
          .select('user_id, plan_name, status, trial_plan, trial_expires_at, coupon_code, coupon_discount_percent, current_period_end')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      if (companyRes.error) console.warn('[useWiseHireAccount] company fetch:', companyRes.error.message);
      if (subRes.error) console.warn('[useWiseHireAccount] subscription fetch:', subRes.error.message);

      return computeAccount(
        companyRes.data as WiseHireCompany | null,
        subRes.data as WiseHireSubscription | null,
      );
    },
    enabled: isAuthenticated && supabaseReady && !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}
