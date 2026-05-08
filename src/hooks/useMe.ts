import { useQuery } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { useAuth } from './useAuth';

export interface MeData {
  userId: string;
  profile: any | null;
  subscription: {
    plan: string;
    effective_plan: string;
    trial_expires_at?: string;
  } | null;
  ai_credits: {
    daily_usage: number;
    daily_limit: number;
  } | null;
}

export function useMe() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['me', user?.id],
    queryFn: async (): Promise<MeData> => {
      if (!user?.id) throw new Error('Not authenticated');

      const [pRes, sRes, cRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, 'profiles', [Query.equal('user_id', user.id)]),
        databases.listDocuments(DATABASE_ID, 'subscriptions', [Query.equal('user_id', user.id)]),
        databases.listDocuments(DATABASE_ID, 'ai_credits', [Query.equal('user_id', user.id)])
      ]);

      const sub = sRes.documents[0];
      const creds = cRes.documents[0];

      return {
        userId: user.id,
        profile: pRes.documents[0] || null,
        subscription: sub ? {
          plan: sub.plan,
          effective_plan: sub.plan,
          trial_expires_at: sub.trial_expires_at
        } : { plan: 'free', effective_plan: 'free' },
        ai_credits: creds ? {
          daily_usage: creds.daily_usage,
          daily_limit: creds.daily_limit
        } : { daily_usage: 0, daily_limit: 5 }
      };
    },
    enabled: !!user && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
