import { useQuery } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useAuth } from './useAuth';
import { safeFormatDistanceToNow } from '@/lib/dateUtils';
import type { ActivityFeedItem } from '@/components/dashboard/dashboardActivityLabels';
import { historyFromTailoredResumeOrFallback } from '@/lib/tailoringResumeMetadata';

const PER_COLLECTION_LIMIT = 25;

function makeItem(
  id: string,
  label: string,
  detail: string | undefined,
  date: string,
  resumeId?: string | null,
): ActivityFeedItem {
  return {
    id,
    label,
    detail: detail || undefined,
    time: safeFormatDistanceToNow(date, { addSuffix: true }),
    sortKey: new Date(date).getTime(),
    resumeId: resumeId || undefined,
  };
}

function join(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' - ');
}

export function useActivityFeed(limit = 6) {
  const { user, authReady } = useAuth();
  const userId = user?.id;

  return useQuery<ActivityFeedItem[]>({
    queryKey: ['dashboard-activity-feed', userId],
    enabled: authReady && !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<ActivityFeedItem[]> => {
      if (!userId) return [];

      const list = (collection: string) =>
        databases
          .listDocuments(DATABASE_ID, collection, [
            Query.equal('user_id', userId),
            Query.orderDesc('$createdAt'),
            Query.limit(PER_COLLECTION_LIMIT),
          ])
          .catch(() => ({ documents: [] as Record<string, unknown>[] }));

      const [appRes, coverRes, resumeRes] = await Promise.all([
        list(COLLECTIONS.job_applications),
        list(COLLECTIONS.cover_letters),
        list(COLLECTIONS.resumes),
      ]);

      const items: ActivityFeedItem[] = [];

      for (const doc of resumeRes.documents as Record<string, unknown>[]) {
        const tailored = historyFromTailoredResumeOrFallback(doc as unknown as {
          $id: string;
          $createdAt?: string;
          title?: string;
          parent_resume_id?: string | null;
          customization?: string;
        });
        if (tailored) {
          items.push(
            makeItem(
              `t-${doc.$id}`,
              'Tailored copy saved',
              join(tailored.jobTitle, tailored.company),
              tailored.createdAt || String(doc.$createdAt),
              String(doc.$id),
            ),
          );
          continue;
        }

        items.push(
          makeItem(`r-${doc.$id}`, 'Resume created', String(doc.title ?? ''), String(doc.$createdAt), String(doc.$id)),
        );
      }

      for (const doc of appRes.documents as Record<string, unknown>[]) {
        items.push(
          makeItem(
            `a-${doc.$id}`,
            'Application tracked',
            join(doc.job_title as string, doc.company as string),
            String((doc.applied_at as string) || doc.$createdAt),
            (doc.resume_id as string) ?? null,
          ),
        );
      }

      for (const doc of coverRes.documents as Record<string, unknown>[]) {
        items.push(
          makeItem(
            `c-${doc.$id}`,
            'Cover letter created',
            join(doc.job_title as string, doc.company as string),
            String(doc.$createdAt),
            (doc.resume_id as string) ?? null,
          ),
        );
      }

      return items.sort((a, b) => b.sortKey - a.sortKey).slice(0, limit);
    },
  });
}
