import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';

export type PlanName = 'free' | 'pro' | 'premium';

export interface PlanResult {
  plan: PlanName;
  isPro: boolean;
  isPremium: boolean;
  isLoading: boolean;
}

const FALLBACK: PlanResult = {
  plan: 'free',
  isPro: false,
  isPremium: false,
  isLoading: false,
};

export function usePlan(): PlanResult {
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['plan', user?.id],
    queryFn: async (): Promise<PlanName> => {
      const { data, error } = await supabase.rpc('get_my_plan');
      if (error) {
        console.error('[usePlan] RPC error:', error);
        return 'free';
      }
      const raw = String(data ?? 'free').toLowerCase();
      if (raw === 'pro' || raw === 'premium') return raw as PlanName;
      return 'free';
    },
    enabled: !!user && isAuthenticated,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 5000),
  });

  if (!isAuthenticated) return FALLBACK;

  const plan = data ?? 'free';

  return {
    plan,
    isPro: plan === 'pro' || plan === 'premium',
    isPremium: plan === 'premium',
    isLoading,
  };
}
