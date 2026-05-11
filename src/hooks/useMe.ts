import { useQuery } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { useAuth } from './useAuth';

export interface MeData {
  userId: string;
  profile: Record<string, unknown> | null;
  subscription: {
    plan: string;
    effective_plan: string;
    trial_plan?: string | null;
    trial_expires_at?: string | null;
  } | null;
  ai_credits: {
    daily_usage: number;
    daily_limit: number;
    total_usage: number;
    usage_date: string;
  } | null;
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
  } catch {
    return { documents: [], total: 0 };
  }
}

export function useMe() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['me', user?.id],
    queryFn: async (): Promise<MeData> => {
      if (!user?.id) throw new Error('Not authenticated');

      const [sRes, cRes] = await Promise.all([
        safeList('subscriptions', [Query.equal('user_id', user.id)]),
        safeList('ai_credits', [Query.equal('user_id', user.id)]),
      ]);

      const sub = sRes.documents[0] as Record<string, unknown> | undefined;
      const creds = cRes.documents[0] as Record<string, unknown> | undefined;

      return {
        userId: user.id,
        profile: null, // Profile is handled by useProfile hook to avoid redundancy
        subscription: sub
          ? {
              plan: (sub.plan as string) ?? 'free',
              // Use server-computed effective_plan when present (accounts for active
              // trials); fall back to plan when the field hasn't been provisioned yet.
              effective_plan: (sub.effective_plan as string | undefined) ?? (sub.plan as string) ?? 'free',
              trial_plan: (sub.trial_plan as string | null | undefined) ?? null,
              trial_expires_at: (sub.trial_expires_at as string | null | undefined) ?? null,
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
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
