import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { supabase } from '@/integrations/supabase/safeClient';
import { getToken, getUserId } from '@/lib/supabaseBridge';
import { useAuth } from './useAuth';

export interface MeSubscription {
  plan_name: string;
  status: string;
  plan_updated_at: string | null;
}

export interface MeAICredits {
  daily_usage: number;
  daily_limit: number;
  usage_date: string;
  total_usage: number;
  updated_at: string;
}

export interface MeData {
  userId: string;
  kinde_sub: string | null;
  profile: Record<string, unknown> | null;
  preferences: Record<string, unknown> | null;
  subscription: MeSubscription | null;
  ai_credits: MeAICredits | null;
}

/**
 * Shared hook for fetching the current user's profile, plan, and credits data.
 *
 * Uses the `me` edge function which validates the bridge token server-side via
 * requireAuth(), queries data using a service-role client (bypasses RLS), and
 * returns a proper 401 on auth failure so the edgeFunctions client can auto-retry
 * with a fresh token. This avoids the silent-failure problem that occurs when
 * the bridge token expires and `auth.uid()` returns null in direct DB queries.
 */
export function useMe() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Realtime subscriptions for immediate invalidation when data changes.
  // Uses the v5 UUID (supabase user ID) from the bridge, not the Kinde user ID,
  // so the filter correctly matches the database rows.
  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const supabaseUserId = getUserId();
    if (!supabaseUserId) return;

    const token = getToken();
    if (token) {
      supabase.realtime.setAuth(token);
    }

    const subChannel = supabase
      .channel(`me-subscriptions-${supabaseUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${supabaseUserId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['me'], refetchType: 'all' });
        }
      )
      .subscribe();

    const credChannel = supabase
      .channel(`me-ai-credits-${supabaseUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_credits',
          filter: `user_id=eq.${supabaseUserId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['me'], refetchType: 'all' });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subChannel);
      supabase.removeChannel(credChannel);
    };
  }, [user?.id, isAuthenticated, queryClient]);

  return useQuery({
    queryKey: ['me', user?.id],
    queryFn: async (): Promise<MeData> => {
      const { data, error } = await edgeFunctions.functions.invoke('me', { body: {} });
      if (error) {
        console.error('[useMe] edge function error:', error);
        throw new Error(error.message ?? 'Failed to fetch user data');
      }
      return data as MeData;
    },
    enabled: !!user && isAuthenticated,
    staleTime: 5 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 4 * 1000,
    refetchIntervalInBackground: false,
    retry: 2,
    retryDelay: (i: number) => Math.min(1000 * 2 ** i, 5000),
  });
}
