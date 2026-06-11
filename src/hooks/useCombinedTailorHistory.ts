import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import type { TailorHistory } from '@/types/resume';

function mapDocToHistory(doc: Record<string, unknown>): TailorHistory {
  let appliedSections: string[] = [];
  try {
    appliedSections = doc.applied_sections ? JSON.parse(doc.applied_sections as string) : [];
  } catch {
    // ignore
  }
  return {
    id: doc.$id as string,
    jobTitle: doc.job_title as string,
    company: doc.company as string,
    jobDescription: (doc.job_description as string) || '',
    jobUrl: (doc.job_url as string) || null,
    tailoredResumeId: (doc.tailored_resume_id as string) || null,
    scoreBeforeAfter: {
      before: (doc.score_before as number) || 0,
      after: (doc.score_after as number) || 0,
    },
    appliedSections,
    createdAt: doc.$createdAt as string,
  };
}

export function useCombinedTailorHistory(limit = 20) {
  const { user, authReady } = useAuth();
  const localHistory = useResumeStore((s) => s.tailorHistory) || [];

  const { data: dbHistory = [], isLoading: dbLoading, isFetched } = useQuery({
    queryKey: ['tailor-history-list', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const res = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.tailor_history,
          [
            Query.equal('user_id', [user.id]),
            Query.orderDesc('$createdAt'),
            Query.limit(limit),
          ],
        );
        return res.documents.map((doc) => mapDocToHistory(doc as unknown as Record<string, unknown>));
      } catch (err) {
        console.error('[useCombinedTailorHistory] failed to load:', err);
        return [];
      }
    },
    enabled: authReady && !!user?.id,
    staleTime: 30 * 1000,
  });

  const history = useMemo(() => {
    const list = [...localHistory];
    dbHistory.forEach((dbEntry) => {
      const hasDuplicate = list.some(
        (h) =>
          h.id === dbEntry.id ||
          (h.tailoredResumeId && h.tailoredResumeId === dbEntry.tailoredResumeId),
      );
      if (!hasDuplicate) list.push(dbEntry);
    });
    return list.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [localHistory, dbHistory]);

  return { history, isLoading: !authReady || (dbLoading && history.length === 0) || (!isFetched && history.length === 0) };
}
