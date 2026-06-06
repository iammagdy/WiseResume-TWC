import { useQuery } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useAuth } from './useAuth';

/**
 * Fetches all `tailor_history` entries from Appwrite for the current user
 * and returns a Set of tailored resume IDs.
 *
 * Used to drive the "Tailored" tab on the dashboard reliably — this
 * persists across page refreshes and devices, unlike Zustand localStorage.
 */
export function useAppwriteTailoredIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['tailor-history-ids', user?.id],
    queryFn: async () => {
      const res = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.tailor_history,
        [
          Query.equal('user_id', [user!.id]),
          Query.orderDesc('$createdAt'),
          Query.limit(100),
        ],
      );
      return new Set(
        res.documents
          .map((doc) => doc.tailored_resume_id as string | null)
          .filter(Boolean) as string[],
      );
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    placeholderData: () => new Set<string>(),
  });
}
