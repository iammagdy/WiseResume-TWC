import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { supabase } from '@/integrations/supabase/safeClient';
import { getToken, getUserId } from '@/lib/supabaseBridge';
import { useAuth } from './useAuth';

export interface MeSubscription {
  plan_name: string;
  status: string;
  plan_updated_at: string | null;
  trial_plan: string | null;
  trial_expires_at: string | null;
  effective_plan: string;
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
 * Module-level map — durable across hook remounts and page navigation within
 * the same browser session. Tracks accumulated Realtime connection failures per
 * Supabase userId so the retry cap survives React unmount/remount cycles.
 */
const realtimeFailureCount = new Map<string, number>();

const REALTIME_MAX_ATTEMPTS = 2;
const REALTIME_BACKOFF_MS = [500, 1500];

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

  // Track which supabaseUserId the active channels were created for, so we only
  // tear-down and re-subscribe when a genuinely different user signs in — not on
  // every re-render or bridgeReady flip that changes user?.id mid-session.
  const subscribedUserIdRef = useRef<string | null>(null);

  // Realtime subscriptions for immediate invalidation when data changes.
  // Channel names are stable session-lifetime constants ('me-subscriptions' /
  // 'me-ai-credits') — they do NOT embed the userId, preventing duplicate channel
  // windows when user.id transitions while the bridge is resolving.
  // The per-user filtering is handled exclusively by the postgres_changes `filter`
  // option so the correct rows are still observed after any session transition.
  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const supabaseUserId = getUserId();
    if (!supabaseUserId) return;

    // Check durable failure cap — if exhausted for this user this session,
    // leave subscribedUserIdRef set (so we don't attempt again) and bail out.
    const accumulated = realtimeFailureCount.get(supabaseUserId) ?? 0;
    if (accumulated >= REALTIME_MAX_ATTEMPTS) return;

    // Only re-subscribe when the underlying user actually changes.
    if (subscribedUserIdRef.current === supabaseUserId) return;
    subscribedUserIdRef.current = supabaseUserId;

    let cancelled = false;
    let subChannel: ReturnType<typeof supabase.channel> | null = null;
    let credChannel: ReturnType<typeof supabase.channel> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanupChannels = () => {
      try { if (subChannel) supabase.removeChannel(subChannel); } catch { /* ignore */ }
      try { if (credChannel) supabase.removeChannel(credChannel); } catch { /* ignore */ }
      subChannel = null;
      credChannel = null;
    };

    const doSubscribe = (attempt: number) => {
      if (cancelled) return;

      const token = getToken();
      if (token) {
        supabase.realtime.setAuth(token);
      }

      // Use a per-attempt flag so both channels failing together only counts
      // as a single failure increment (not two).
      let failedThisAttempt = false;

      const onStatus = (status: string) => {
        if (cancelled) return;
        if (status === 'SUBSCRIBED') {
          realtimeFailureCount.delete(supabaseUserId);
          return;
        }
        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !failedThisAttempt) {
          failedThisAttempt = true;
          const failures = (realtimeFailureCount.get(supabaseUserId) ?? 0) + 1;
          realtimeFailureCount.set(supabaseUserId, failures);
          cleanupChannels();
          const nextAttempt = attempt + 1;
          if (nextAttempt < REALTIME_MAX_ATTEMPTS && !cancelled) {
            const backoff = REALTIME_BACKOFF_MS[attempt] ?? 1500;
            console.warn(`[useMe] Realtime failed (attempt ${attempt + 1}), retrying in ${backoff}ms`);
            retryTimer = setTimeout(() => doSubscribe(nextAttempt), backoff);
          } else {
            console.warn(`[useMe] Realtime cap reached (${failures} failure${failures > 1 ? 's' : ''}) — polling fallback active`);
          }
        }
      };

      try {
        subChannel = supabase
          .channel('me-subscriptions')
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
          .subscribe(onStatus);

        credChannel = supabase
          .channel('me-ai-credits')
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
          .subscribe(onStatus);
      } catch (err) {
        if (!failedThisAttempt) {
          failedThisAttempt = true;
          const failures = (realtimeFailureCount.get(supabaseUserId) ?? 0) + 1;
          realtimeFailureCount.set(supabaseUserId, failures);
          const nextAttempt = attempt + 1;
          if (nextAttempt < REALTIME_MAX_ATTEMPTS && !cancelled) {
            const backoff = REALTIME_BACKOFF_MS[attempt] ?? 1500;
            console.warn(`[useMe] Realtime setup threw (attempt ${attempt + 1}), retrying in ${backoff}ms:`, err);
            retryTimer = setTimeout(() => doSubscribe(nextAttempt), backoff);
          } else {
            console.warn(`[useMe] Realtime cap reached after exception — polling fallback active:`, err);
          }
        }
      }
    };

    doSubscribe(accumulated);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      cleanupChannels();
      // Only reset the subscription guard if retry budget remains.
      // Leaving it set when the cap is reached prevents re-subscriptions on
      // every subsequent remount once the user has been marked as failed.
      const failures = realtimeFailureCount.get(supabaseUserId) ?? 0;
      if (failures < REALTIME_MAX_ATTEMPTS) {
        subscribedUserIdRef.current = null;
      }
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
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
    retry: 2,
    retryDelay: (i: number) => Math.min(1000 * 2 ** i, 5000),
    throwOnError: false,
  });
}
