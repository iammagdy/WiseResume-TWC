import { useQuery } from '@tanstack/react-query';
import { databases, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import { useMe, type MeSubscription } from '@/hooks/useMe';
import type { Models } from 'appwrite';

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
  isTrialActive: boolean;
  daysRemaining: number;
  currentPlan: string;
  isExpiredWithNoPlan: boolean;
}

const WISEHIRE_PAID_PLANS = [
  'wisehire_starter',
  'wisehire_professional',
  'wisehire_business',
  'wisehire_enterprise',
];

function docToCompany(doc: Models.Document): WiseHireCompany {
  return { ...doc, id: doc.$id } as unknown as WiseHireCompany;
}

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

export function useWiseHireAccount() {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;
  const { data: meData } = useMe();

  const companyQuery = useQuery({
    queryKey: ['wisehire-account', userId],
    queryFn: async (): Promise<WiseHireCompany | null> => {
      if (!userId) return null;
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_companies, [
        Query.equal('owner_id', userId),
        Query.limit(1),
      ]);
      if (res.total === 0) return null;
      return docToCompany(res.documents[0]);
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  const accountData = computeAccount(
    companyQuery.data ?? null,
    meData?.subscription ?? null,
  );

  return {
    ...companyQuery,
    data: companyQuery.status !== 'pending' || !isAuthenticated ? accountData : undefined,
  };
}
