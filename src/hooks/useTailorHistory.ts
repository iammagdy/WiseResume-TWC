import { useQuery } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { historyFromTailoredResumeOrFallback } from '@/lib/tailoringResumeMetadata';
import { useAuth } from './useAuth';

/**
 * Returns tailored resume IDs from the owner-scoped resumes collection.
 * Legacy Tailor History remains server-only; browser surfaces use durable
 * resume lineage and metadata instead.
 */
export function useAppwriteTailoredIds() {
  const { user, authReady } = useAuth();
  return useQuery({
    queryKey: ['tailored-resume-ids', user?.id],
    queryFn: async () => {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.resumes, [
        Query.equal('user_id', user!.id),
        Query.orderDesc('$createdAt'),
        Query.select(['$id', '$createdAt', 'title', 'parent_resume_id', 'customization']),
        Query.limit(200),
      ]);

      return new Set(
        res.documents
          .filter((doc) =>
            historyFromTailoredResumeOrFallback(doc as unknown as {
              $id: string;
              $createdAt?: string;
              title?: string;
              parent_resume_id?: string | null;
              customization?: string;
            }),
          )
          .map((doc) => doc.$id),
      );
    },
    enabled: authReady && !!user?.id,
    staleTime: 60 * 1000,
    placeholderData: () => new Set<string>(),
  });
}
