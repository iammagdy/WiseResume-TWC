import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import { useResumeStore } from '@/store/resumeStore';
import type { Job } from '@/hooks/useJobs';

function docToJob(doc: Record<string, unknown>): Job {
  return {
    id: doc.$id as string,
    user_id: doc.user_id as string,
    title: (doc.title as string) ?? '',
    company: (doc.company as string) ?? '',
    company_logo: (doc.company_logo as string | null) ?? null,
    description: (doc.description as string) ?? '',
    requirements: (doc.requirements as string) ?? '',
    location: (doc.location as string) ?? '',
    salary_range: (doc.salary_range as string | null) ?? null,
    job_type: (doc.job_type as string) ?? 'full-time',
    posted_date: (doc.posted_date as string) ?? (doc.$createdAt as string),
    source_url: (doc.source_url as string | null) ?? null,
    is_saved: Boolean(doc.is_saved),
    created_at: doc.$createdAt as string,
    updated_at: doc.$updatedAt as string,
  };
}

function dedupeKey(title: string, company: string, sourceUrl: string | null | undefined): string {
  const url = (sourceUrl || '').trim().toLowerCase();
  if (url) return `url:${url}`;
  return `meta:${title.trim().toLowerCase()}|${company.trim().toLowerCase()}`;
}

async function listJobsCollection(userId: string): Promise<Job[]> {
  const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.jobs, [
    Query.equal('user_id', userId),
    Query.orderDesc('$createdAt'),
    Query.limit(200),
  ]);
  return res.documents.map((d) => docToJob(d as unknown as Record<string, unknown>));
}

function jobsFromLocalHistory(
  userId: string,
  localHistory: Array<{
    id: string;
    jobTitle: string;
    company: string;
    jobDescription: string;
    jobUrl?: string | null;
    createdAt: string;
  }>,
): Job[] {
  return localHistory.map((entry) => ({
    id: `local:${entry.id}`,
    user_id: userId,
    title: entry.jobTitle || 'Untitled role',
    company: entry.company || '',
    company_logo: null,
    description: entry.jobDescription || '',
    requirements: '',
    location: '',
    salary_range: null,
    job_type: 'full-time',
    posted_date: entry.createdAt,
    source_url: entry.jobUrl ?? null,
    is_saved: true,
    created_at: entry.createdAt,
    updated_at: entry.createdAt,
  }));
}

function mergeSavedJobs(sources: Job[][]): Job[] {
  const merged = new Map<string, Job>();
  for (const list of sources) {
    for (const job of list) {
      const key = dedupeKey(job.title, job.company, job.source_url);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, job);
        continue;
      }
      // Prefer real jobs collection ids over history/local synthetic ids.
      const jobIsReal = !job.id.startsWith('history:') && !job.id.startsWith('local:');
      const existingIsReal = !existing.id.startsWith('history:') && !existing.id.startsWith('local:');
      if (jobIsReal && !existingIsReal) {
        merged.set(key, job);
        continue;
      }
      if (!jobIsReal && existingIsReal) continue;
      // Keep the newer record when both are the same kind.
      const jobTime = new Date(job.created_at || 0).getTime();
      const existingTime = new Date(existing.created_at || 0).getTime();
      if (jobTime > existingTime) merged.set(key, job);
    }
  }
  return [...merged.values()].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
  );
}

export function isSyntheticSavedJobId(id: string): boolean {
  return id.startsWith('history:') || id.startsWith('local:');
}

export function buildTailoringHubJobUrl(job: Job): string {
  if (!isSyntheticSavedJobId(job.id)) {
    return `/tailoring-hub?jobId=${encodeURIComponent(job.id)}`;
  }
  const params = new URLSearchParams({
    mode: 'workspace',
    title: job.title,
    company: job.company,
  });
  const desc = [job.description, job.requirements].filter(Boolean).join('\n\n').trim();
  if (desc) params.set('job', desc.slice(0, 4000));
  if (job.source_url) params.set('url', job.source_url);
  return `/tailoring-hub?${params.toString()}`;
}

async function fetchSavedJobPostings(userId: string): Promise<Job[]> {
  const collectionJobs = await listJobsCollection(userId).catch((err) => {
    console.warn('[useSavedJobPostings] jobs collection query failed:', err);
    return [] as Job[];
  });

  return mergeSavedJobs([collectionJobs]);
}

export function useSavedJobPostings() {
  const { user, authReady } = useAuth();
  const userId = user?.id;
  const localHistory = useResumeStore((s) => s.tailorHistory) || [];

  const localJobs = useMemo(
    () => (userId ? jobsFromLocalHistory(userId, localHistory) : []),
    [userId, localHistory],
  );

  const query = useQuery({
    queryKey: ['saved-job-postings', userId],
    queryFn: async () => {
      if (!userId) return [] as Job[];
      return fetchSavedJobPostings(userId);
    },
    enabled: authReady && !!userId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: (previous) => previous,
  });

  const jobs = useMemo(
    () => mergeSavedJobs([query.data ?? [], localJobs]),
    [query.data, localJobs],
  );

  const awaitingNetwork = !query.isFetched && !query.isError;
  const isLoading =
    !authReady ||
    awaitingNetwork ||
    (query.isFetching && jobs.length === 0);

  return {
    jobs,
    count: jobs.length,
    isLoading,
    isFetching: query.isFetching,
    isFetched: query.isFetched,
    isError: query.isError,
    refetch: query.refetch,
  };
}
