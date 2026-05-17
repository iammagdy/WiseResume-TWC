import { useQuery, useQueryClient } from '@tanstack/react-query';
import { databases, client, DATABASE_ID, Query } from '@/lib/appwrite';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { useAuth } from './useAuth';
import { useEffect } from 'react';

export interface MeData {
  userId: string;
  profile: Record<string, unknown> | null;
  subscription: MeSubscription | null;
  ai_credits: {
    daily_usage: number;
    daily_limit: number;
    total_usage: number;
    usage_date: string;
  } | null;
}

export interface MeSubscription {
  plan: string;
  plan_name?: string;
  effective_plan: string;
  status?: string | null;
  trial_plan?: string | null;
  trial_expires_at?: string | null;
  coupon_code?: string | null;
}

const TODAY = () => new Date().toISOString().split('T')[0];

const DEFAULT_SUBSCRIPTION = {
  plan: 'free',
  effective_plan: 'free',
  trial_plan: null,
  trial_expires_at: null,
} as const;

const DEFAULT_CREDITS = {
  daily_usage: 0,
  daily_limit: 5,
  total_usage: 0,
  usage_date: TODAY(),
} as const;

async function safeList(collectionId: string, queries: string[]) {
  try {
    return await databases.listDocuments(DATABASE_ID, collectionId, queries);
  } catch (e) {
    console.warn(`[useMe] ${collectionId} query failed — plan may default to free:`, e);
    return { documents: [], total: 0 };
  }
}

export function useMe() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    const unsubscribe = client.subscribe(
      'databases.main.collections.subscriptions.documents',
      (event: { payload?: { user_id?: string } }) => {
        if (event.payload?.user_id === userId) {
          queryClient.invalidateQueries({ queryKey: ['me', userId] });
        }
      },
    );
    return () => { unsubscribe(); };
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ['me', user?.id],
    queryFn: async (): Promise<MeData> => {
      if (!user?.id) throw new Error('Not authenticated');

      const [subResult, cRes] = await Promise.all([
        appwriteFunctions.invoke<{
          plan: string;
          effective_plan: string;
          status: string | null;
          trial_plan: string | null;
          trial_expires_at: string | null;
          coupon_code: string | null;
        }>('get-subscription'),
        safeList('ai_credits', [Query.equal('user_id', user.id)]),
      ]);

      // Fall back to direct DB query if the function is unavailable (not deployed)
      let sub: Record<string, unknown> | undefined;
      if (subResult.data) {
        sub = subResult.data as Record<string, unknown>;
      } else {
        const sRes = await safeList('subscriptions', [Query.equal('user_id', user.id)]);
        sub = sRes.documents[0] as Record<string, unknown> | undefined;
      }

      const creds = cRes.documents[0] as Record<string, unknown> | undefined;
      const basePlan = (sub?.plan as string | undefined) ?? 'free';
      const trialPlan = (sub?.trial_plan as string | null | undefined) ?? null;
      const trialExpiresAt = (sub?.trial_expires_at as string | null | undefined) ?? null;
      const trialActive = !!trialPlan && !!trialExpiresAt && new Date(trialExpiresAt).getTime() > Date.now();
      const effectivePlan = (sub?.effective_plan as string | undefined) ?? (trialActive ? trialPlan : basePlan);

      return {
        userId: user.id,
        profile: null, // Profile is handled by useProfile hook to avoid redundancy
        subscription: sub
          ? {
              plan: basePlan,
              plan_name: (sub?.plan_name as string | undefined) ?? basePlan,
              effective_plan: effectivePlan,
              status: (sub?.status as string | null | undefined) ?? null,
              trial_plan: trialPlan,
              trial_expires_at: trialExpiresAt,
              coupon_code: (sub?.coupon_code as string | null | undefined) ?? null,
            }
          : DEFAULT_SUBSCRIPTION,
        ai_credits: creds
          ? {
              daily_usage: (creds.daily_usage as number) ?? 0,
              daily_limit: (creds.daily_limit as number) ?? 5,
              total_usage: (creds.total_usage as number) ?? 0,
              usage_date: (creds.usage_date as string) ?? TODAY(),
            }
          : { ...DEFAULT_CREDITS, usage_date: TODAY() },
      };
    },
    enabled: !!user && isAuthenticated,
    // Keep staleTime short so admin-driven plan changes (via DevKit) are
    // visible to the target user within ~1 minute instead of the previous
    // 5-minute window. refetchOnWindowFocus ensures that when a user returns
    // to the browser tab after an admin changes their plan, the new plan
    // is fetched immediately rather than waiting for the stale timer.
    staleTime: 60 * 1000,
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
