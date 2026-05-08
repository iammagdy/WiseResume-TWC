/**
 * Resume Snapshots — live Appwrite SDK implementation.
 *
 * Collections provisioned 2026-05-08 in Appwrite 'main' DB.
 * resume_json stored as JSON string (Appwrite has no native JSON type).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ResumeSnapshot {
  id: string;
  user_id: string;
  resume_id: string | null;
  name: string;
  resume_json: unknown;
  ats_score: number | null;
  created_at: string;
}

function docToSnapshot(doc: Record<string, unknown>): ResumeSnapshot {
  return {
    id: doc.$id as string,
    user_id: doc.user_id as string,
    resume_id: (doc.resume_id as string | null) ?? null,
    name: doc.name as string,
    resume_json: JSON.parse(doc.resume_json as string) as unknown,
    ats_score: doc.ats_score != null ? Number(doc.ats_score) : null,
    created_at: doc.$createdAt as string,
  };
}

export function useResumeSnapshots(resumeId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['resume-snapshots', resumeId, user?.id],
    queryFn: async (): Promise<ResumeSnapshot[]> => {
      if (!user) return [];
      const filters = [
        Query.equal('user_id', user.id),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ];
      if (resumeId) filters.push(Query.equal('resume_id', resumeId));
      const res = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.resume_snapshots,
        filters,
      );
      return res.documents.map(d => docToSnapshot(d as unknown as Record<string, unknown>));
    },
    enabled: !!user,
  });
}

export function useSaveResumeSnapshot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      resume_id?: string;
      name: string;
      resume_json: unknown;
      ats_score?: number;
    }): Promise<ResumeSnapshot> => {
      if (!user) throw new Error('Not authenticated');
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.resume_snapshots,
        ID.unique(),
        {
          user_id: user.id,
          resume_id: input.resume_id ?? null,
          name: input.name,
          resume_json: JSON.stringify(input.resume_json),
          ats_score: input.ats_score ?? null,
        },
      );
      return docToSnapshot(doc as unknown as Record<string, unknown>);
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ['resume-snapshots', data.resume_id, user?.id],
      });
      toast.success('Snapshot saved');
    },
    onError: () => toast.error('Failed to save snapshot'),
  });
}

export function useDeleteResumeSnapshot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!user) throw new Error('Not authenticated');
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.resume_snapshots, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resume-snapshots'] });
      toast.success('Snapshot deleted');
    },
    onError: () => toast.error('Failed to delete snapshot'),
  });
}
