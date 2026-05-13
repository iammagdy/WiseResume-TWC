import { useMe } from './useMe';
import { useAuth } from './useAuth';
import { useQuery } from '@tanstack/react-query';

export interface SuspensionState {
  isSuspended: boolean;
  suspensionReason: string | null;
  isLoading: boolean;
}

export function useSuspensionCheck(): SuspensionState {
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['suspension-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return { is_suspended: false, suspension_reason: null };
      try {
        const { databases, DATABASE_ID, Query } = await import('@/lib/appwrite');
        const res = await databases.listDocuments(DATABASE_ID, 'profiles', [
          Query.equal('user_id', user.id),
          Query.limit(1)
        ]);
        const doc = res.documents[0];
        if (doc) {
          return {
            is_suspended: (doc.is_suspended as boolean) ?? false,
            suspension_reason: (doc.suspension_reason as string | null) ?? null,
          };
        }
      } catch (e) {
        // Fallback gracefully
      }
      return { is_suspended: false, suspension_reason: null };
    },
    enabled: !!user && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  return {
    isSuspended: data?.is_suspended ?? false,
    suspensionReason: data?.suspension_reason ?? null,
    isLoading,
  };
}
