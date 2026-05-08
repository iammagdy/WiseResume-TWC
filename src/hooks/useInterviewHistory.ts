import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface InterviewSessionRecord {
  id: string;
  user_id: string;
  resume_id: string | null;
  resume_title: string | null;
  interview_type: string | null;
  job_title: string | null;
  job_description: string | null;
  messages: unknown | null;
  overall_score: number | null;
  strengths: unknown | null;
  improvements: unknown | null;
  duration_seconds: number | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function parseJsonField<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function docToRecord(doc: Record<string, unknown>): InterviewSessionRecord {
  return {
    id: doc.$id as string,
    user_id: doc.user_id as string,
    resume_id: (doc.resume_id as string | null) ?? null,
    resume_title: (doc.resume_title as string | null) ?? null,
    interview_type: (doc.interview_type as string | null) ?? null,
    job_title: (doc.job_title as string | null) ?? null,
    job_description: (doc.job_description as string | null) ?? null,
    messages: parseJsonField<unknown>(doc.messages, null),
    overall_score: (doc.overall_score as number | null) ?? null,
    strengths: parseJsonField<unknown>(doc.strengths, []),
    improvements: parseJsonField<unknown>(doc.improvements, []),
    duration_seconds: (doc.duration_seconds as number | null) ?? null,
    status: (doc.status as string | null) ?? null,
    created_at: (doc.$createdAt as string) ?? null,
    updated_at: (doc.$updatedAt as string) ?? null,
  };
}

export function useInterviewHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['interview-sessions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.interview_sessions, [
        Query.equal('user_id', user.id),
        Query.equal('status', 'completed'),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ]);
      return res.documents.map(d => docToRecord(d as unknown as Record<string, unknown>));
    },
    enabled: !!user,
  });
}

export function useSaveInterviewSession() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      draft_id?: string;
      resume_id?: string;
      interview_type?: string;
      job_title?: string;
      job_description?: string;
      messages?: unknown;
      overall_score?: number;
      strengths?: string[];
      improvements?: string[];
      duration_seconds?: number;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const payload = {
        user_id: user.id,
        resume_id: input.resume_id ?? null,
        interview_type: input.interview_type ?? 'general',
        job_title: input.job_title ?? null,
        job_description: input.job_description ?? null,
        messages: JSON.stringify(input.messages ?? []),
        overall_score: input.overall_score ?? null,
        strengths: JSON.stringify(input.strengths ?? []),
        improvements: JSON.stringify(input.improvements ?? []),
        duration_seconds: input.duration_seconds ?? null,
        status: 'completed',
      };

      if (input.draft_id) {
        try {
          const doc = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.interview_sessions,
            input.draft_id,
            payload,
          );
          return docToRecord(doc as unknown as Record<string, unknown>);
        } catch {
          // Draft was pruned — fall through to create
        }
      }

      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.interview_sessions,
        ID.unique(),
        payload,
      );
      return docToRecord(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['interview-draft'] });
    },
    onError: () => toast.error('Failed to save interview session'),
  });
}

export function useDeleteInterviewSession() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.interview_sessions, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-sessions'] });
      toast.success('Session deleted');
    },
    onError: () => toast.error('Failed to delete session'),
  });
}

// ---------- Draft (in-progress) sessions ----------

const DRAFT_FRESHNESS_MS = 24 * 60 * 60 * 1000;

export function useLatestInterviewDraft() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['interview-draft', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const cutoff = new Date(Date.now() - DRAFT_FRESHNESS_MS).toISOString();
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.interview_sessions, [
        Query.equal('user_id', user.id),
        Query.equal('status', 'draft'),
        Query.greaterThanEqual('$updatedAt', cutoff),
        Query.orderDesc('$updatedAt'),
        Query.limit(1),
      ]);
      return res.documents.length > 0
        ? docToRecord(res.documents[0] as unknown as Record<string, unknown>)
        : null;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
  });
}

export interface UpsertDraftInput {
  draft_id?: string | null;
  resume_id?: string | null;
  interview_type?: string;
  job_title?: string | null;
  job_description?: string | null;
  messages?: unknown;
  duration_seconds?: number;
}

export function useUpsertInterviewDraft() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpsertDraftInput) => {
      if (!user) throw new Error('Not authenticated');
      const payload = {
        user_id: user.id,
        resume_id: input.resume_id ?? null,
        interview_type: input.interview_type ?? 'general',
        job_title: input.job_title ?? null,
        job_description: input.job_description ?? null,
        messages: JSON.stringify(input.messages ?? []),
        duration_seconds: input.duration_seconds ?? null,
        status: 'draft',
      };

      if (input.draft_id) {
        try {
          const doc = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.interview_sessions,
            input.draft_id,
            payload,
          );
          return docToRecord(doc as unknown as Record<string, unknown>);
        } catch {
          // Fall through to create
        }
      }

      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.interview_sessions,
        ID.unique(),
        payload,
      );
      return docToRecord(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-draft'] });
    },
  });
}

export function useDeleteInterviewDraft() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      // Verify it's a draft belonging to this user before deleting
      const doc = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.interview_sessions,
        id,
      ) as unknown as Record<string, unknown>;
      if (doc.user_id !== user.id || doc.status !== 'draft') {
        throw new Error('Not authorised to delete this draft');
      }
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.interview_sessions, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-draft'] });
    },
  });
}
