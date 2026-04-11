import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { getToken } from '@/lib/supabaseBridge';
import { useAuth } from './useAuth';

export type PlanName = 'free' | 'pro' | 'premium';

export interface PlanResult {
  plan: PlanName;
  isPro: boolean;
  isPremium: boolean;
  isLoading: boolean;
  refetch?: () => void;
}

interface GetMyPlanResponse {
  plan_name: string;
  daily_limit: number;
  ai_credits_monthly: number;
  status: string;
}

const FALLBACK: PlanResult = {
  plan: 'free',
  isPro: false,
  isPremium: false,
  isLoading: false,
};

export function usePlan(): PlanResult {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const token = getToken();
    if (token) {
      supabase.realtime.setAuth(token);
    }

    const channel = supabase
      .channel(`subscriptions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['plan'], refetchType: 'all' });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['plan', user?.id],
    queryFn: async (): Promise<PlanName> => {
      const { data, error } = await supabase.rpc('get_my_plan');
      if (error) {
        console.error('[usePlan] RPC error:', error);
        return 'free';
      }
      const obj = data as GetMyPlanResponse | null;
      const raw = String(obj?.plan_name ?? 'free').toLowerCase();
      if (raw === 'pro' || raw === 'premium') return raw as PlanName;
      return 'free';
    },
    enabled: !!user && isAuthenticated,
    staleTime: 5 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 10 * 1000,
    refetchIntervalInBackground: false,
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
    refetch,
  };
}
