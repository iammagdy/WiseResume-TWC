import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, ID, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { wisehireOwnerPermissions } from '@/lib/wisehire/documentPermissions';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { useAuth } from '@/hooks/useAuth';
import { useAIAction } from '@/hooks/useAIAction';
import { extractTextFromPDF } from '@/lib/pdf/textExtractor';
import { PIPELINE_STAGES, type PipelineStage } from '@/hooks/wisehire/usePipeline';
import { toast } from 'sonner';
import type { Models } from 'appwrite';

export interface ScreenResult {
  rank: number;
  filename_name: string;
  match_score: number | null;
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

export function parseScreenResults(value: unknown): ScreenResult[] | null {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed)) return null;
  return parsed.flatMap((result): ScreenResult[] => {
    if (
      typeof result !== 'object' ||
      result === null ||
      typeof (result as ScreenResult).rank !== 'number' ||
      typeof (result as ScreenResult).filename_name !== 'string'
    ) return [];
    const candidate = result as Partial<ScreenResult>;
    const numericScore = typeof candidate.match_score === 'number' && Number.isFinite(candidate.match_score)
      ? Math.max(0, Math.min(100, candidate.match_score))
      : null;
    return [{
      rank: candidate.rank as number,
      filename_name: candidate.filename_name as string,
      match_score: numericScore,
      strengths: Array.isArray(candidate.strengths) ? candidate.strengths.filter((item): item is string => typeof item === 'string') : [],
      concerns: Array.isArray(candidate.concerns) ? candidate.concerns.filter((item): item is string => typeof item === 'string') : [],
      summary: typeof candidate.summary === 'string' ? candidate.summary : '',
    }];
  });
}

function docToJob(doc: Models.Document): BulkScreenJob {
  return {
    ...doc,
    id: doc.$id,
    results: parseScreenResults(doc.results),
  } as unknown as BulkScreenJob;
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
  const { execute: executeAI } = useAIAction({ operation: 'wisehire_bulk_screen' });

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
      const result = await executeAI(async () => {
        const candidates = await Promise.all(files.map(async (file) => {
          if (file.size > 10 * 1024 * 1024) {
            throw new Error(`${file.name} is larger than the 10 MB limit.`);
          }
          const extraction = await extractTextFromPDF(file);
          const resumeText = extraction.text.trim().slice(0, 6000);
          if (extraction.needsOCR || resumeText.length < 80) {
            throw new Error(`${file.name} does not contain enough readable text. Use a text-based PDF.`);
          }
          return { filename_name: file.name, resume_text: resumeText };
        }));

        const { data, error } = await appwriteFunctions.invoke<{
          jobId: string | null;
          results: ScreenResult[];
          rateLimited?: boolean;
          error?: string;
        }>('wisehire-bulk-screen', {
          body: {
            jd_text: jdText,
            role_id: roleId || undefined,
            candidates,
          },
        });

        if (error) {
          const status = (error as { status?: number }).status;
          if (status === 429) throw Object.assign(new Error('rate_limited'), { code: 'rate_limited' });
          throw Object.assign(
            new Error((error as { message?: string }).message ?? 'Bulk review failed'),
            { status: status ?? 500, code: (error as { code?: string }).code },
          );
        }
        if (!data) throw new Error('Bulk review returned no result.');
        return data;
      }, { silent: true });

      if (!result) {
        throw Object.assign(new Error('AI review was not started.'), { code: 'cancelled' });
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bulk-screen-jobs'] });
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code === 'cancelled') return;
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
      stage,
      resumeSummary,
    }: {
      name: string;
      roleId?: string;
      stage: PipelineStage;
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
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.wisehire_candidates,
          existing.documents[0].$id,
          { pipeline_stage: PIPELINE_STAGES.some((candidate) => candidate.id === stage) ? stage : 'shortlisted' },
        );
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
          pipeline_stage: PIPELINE_STAGES.some((candidate) => candidate.id === stage) ? stage : 'shortlisted',
          resume_text: resumeSummary ?? null,
          is_deleted: false,
        },
        wisehireOwnerPermissions(userId),
      );

      return { id: doc.$id, userId };
    },
    onSuccess: ({ userId }) => {
      qc.invalidateQueries({ queryKey: ['wisehire-pipeline', userId] });
      qc.invalidateQueries({ queryKey: ['wisehire-dashboard-stats', userId] });
      toast.success('Candidate added to the selected pipeline stage');
    },
    onError: () => {
      toast.error('Failed to add candidate to pipeline');
    },
  });
}
