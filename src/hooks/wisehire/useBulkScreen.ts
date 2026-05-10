import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, ID, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Models } from 'appwrite';

export interface ScreenResult {
  rank: number;
  filename_name: string;
  match_score: number;
  strengths: string[];
  concerns: string[];
  summary: string;
}

export interface BulkScreenJob {
  id: string;
  owner_id: string;
  role_id: string | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  results: ScreenResult[] | null;
  resume_count: number;
  error_message: string | null;
  created_at: string;
}

function docToJob(doc: Models.Document): BulkScreenJob {
  return { ...doc, id: doc.$id } as unknown as BulkScreenJob;
}

export function useLatestBulkJobs(roleId?: string) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['bulk-screen-jobs', userId, roleId],
    queryFn: async () => {
      if (!userId) return [];
      const queries: string[] = [
        Query.equal('owner_id', userId),
        Query.orderDesc('created_at'),
        Query.limit(5),
      ];
      if (roleId) queries.push(Query.equal('role_id', roleId));
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_bulk_screen_jobs, queries);
      return res.documents.map(docToJob);
    },
    enabled: !!userId,
  });
}

export function useRunBulkScreen() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      files,
      jdText,
      roleId,
    }: {
      files: File[];
      jdText: string;
      roleId?: string;
    }) => {
      const form = new FormData();
      form.append('jd_text', jdText);
      if (roleId) form.append('role_id', roleId);
      files.forEach((f) => form.append('files', f));

      const { data, error } = await appwriteFunctions.invoke<{
        jobId: string | null;
        results: ScreenResult[];
        requiresApiKey?: boolean;
        rateLimited?: boolean;
        error?: string;
      }>('wisehire-bulk-screen', { body: form });

      if (error) {
        const status = (error as { status?: number }).status;
        if (status === 402) throw Object.assign(new Error('requires_api_key'), { code: 'requires_api_key' });
        if (status === 429) throw Object.assign(new Error('rate_limited'), { code: 'rate_limited' });
        throw new Error((error as { message?: string }).message ?? 'Bulk screening failed');
      }

      return data as { jobId: string | null; results: ScreenResult[] };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bulk-screen-jobs'] });
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code === 'requires_api_key') return;
      if (err.code === 'rate_limited') {
        toast.error('Daily screening limit reached. Try again tomorrow.');
        return;
      }
      toast.error(err.message ?? 'Screening failed. Please try again.');
    },
  });
}

export function useAddCandidateFromScreen() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      name,
      roleId,
      resumeSummary,
    }: {
      name: string;
      roleId?: string;
      resumeSummary?: string;
    }) => {
      const userId = user?.id;
      if (!userId) throw new Error('Not authenticated');

      const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_candidates, [
        Query.equal('owner_id', userId),
        Query.equal('name', name || 'Unknown Candidate'),
        Query.limit(1),
      ]);

      if (existing.total > 0) {
        return { id: existing.documents[0].$id, userId };
      }

      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.wisehire_candidates,
        ID.unique(),
        {
          owner_id: userId,
          name: name || 'Unknown Candidate',
          role_id: roleId ?? null,
          pipeline_stage: 'shortlisted',
          resume_text: resumeSummary ?? null,
          is_deleted: false,
        },
      );

      return { id: doc.$id, userId };
    },
    onSuccess: ({ userId }) => {
      qc.invalidateQueries({ queryKey: ['wisehire-pipeline', userId] });
      qc.invalidateQueries({ queryKey: ['wisehire-dashboard-stats', userId] });
      toast.success('Candidate added to pipeline as Shortlisted');
    },
    onError: () => {
      toast.error('Failed to add candidate to pipeline');
    },
  });
}
