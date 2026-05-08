/**
 * Resume Versions — live Appwrite SDK implementation.
 *
 * Collections provisioned 2026-05-08 in Appwrite 'main' DB.
 * snapshot field stored as JSON string (Appwrite has no native JSON type).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { ResumeData } from '@/types/resume';

export interface ResumeVersion {
  id: string;
  resume_id: string;
  user_id: string;
  version_number: number;
  snapshot: ResumeData;
  change_summary: string | null;
  created_at: string;
}

function docToVersion(doc: Record<string, unknown>): ResumeVersion {
  return {
    id: doc.$id as string,
    resume_id: doc.resume_id as string,
    user_id: doc.user_id as string,
    version_number: Number(doc.version_number),
    snapshot: JSON.parse(doc.snapshot as string) as ResumeData,
    change_summary: (doc.change_summary as string | null) ?? null,
    created_at: doc.$createdAt as string,
  };
}

export function useResumeVersions(resumeId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['resume-versions', resumeId, user?.id],
    queryFn: async (): Promise<ResumeVersion[]> => {
      if (!user || !resumeId) return [];
      const res = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.resume_versions,
        [
          Query.equal('resume_id', resumeId),
          Query.equal('user_id', user.id),
          Query.orderDesc('version_number'),
          Query.limit(50),
        ],
      );
      return res.documents.map(d => docToVersion(d as unknown as Record<string, unknown>));
    },
    enabled: !!user && !!resumeId,
  });
}

export function useResumeVersionMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const saveVersion = useMutation({
    mutationFn: async (input: {
      resumeId: string;
      snapshot: ResumeData;
      changeSummary?: string;
    }): Promise<ResumeVersion> => {
      if (!user) throw new Error('Not authenticated');

      // Determine next version_number
      const existing = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.resume_versions,
        [
          Query.equal('resume_id', input.resumeId),
          Query.equal('user_id', user.id),
          Query.orderDesc('version_number'),
          Query.limit(1),
        ],
      );
      const lastNum =
        existing.documents.length > 0
          ? Number((existing.documents[0] as unknown as Record<string, unknown>).version_number)
          : 0;

      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.resume_versions,
        ID.unique(),
        {
          resume_id: input.resumeId,
          user_id: user.id,
          version_number: lastNum + 1,
          snapshot: JSON.stringify(input.snapshot),
          change_summary: input.changeSummary ?? null,
        },
      );
      return docToVersion(doc as unknown as Record<string, unknown>);
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['resume-versions', variables.resumeId],
      });
    },
    onError: () => toast.error('Failed to save version'),
  });

  const deleteVersion = useMutation({
    mutationFn: async (input: { versionId: string; resumeId: string }): Promise<{ resumeId: string }> => {
      if (!user) throw new Error('Not authenticated');
      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.resume_versions,
        input.versionId,
      );
      return { resumeId: input.resumeId };
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ['resume-versions', data.resumeId],
      });
      toast.success('Version deleted');
    },
    onError: () => toast.error('Failed to delete version'),
  });

  return { saveVersion, deleteVersion };
}
