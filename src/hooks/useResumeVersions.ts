/**
 * Resume Versions — graceful no-op stubs.
 *
 * The `resume_versions` collection does not exist in the live Appwrite
 * 'main' database (verified 2026-05-08). All hooks return empty results /
 * no-ops until the collection is created in Appwrite Console.
 */
import { useQuery, useMutation } from '@tanstack/react-query';
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

export function useResumeVersions(_resumeId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['resume-versions', _resumeId],
    queryFn: async (): Promise<ResumeVersion[]> => [],
    enabled: !!user && !!_resumeId,
  });
}

export function useResumeVersionMutations() {
  const saveVersion = useMutation({
    mutationFn: async (_input: {
      resumeId: string;
      snapshot: ResumeData;
      changeSummary?: string;
    }): Promise<null> => {
      console.warn('[useResumeVersions] resume_versions collection not yet created in Appwrite');
      return null;
    },
  });

  const deleteVersion = useMutation({
    mutationFn: async (_input: { versionId: string; resumeId: string }): Promise<void> => {
      console.warn('[useResumeVersions] resume_versions collection not yet created in Appwrite');
    },
    onSuccess: () => {
      toast.error('Version history is being rebuilt — try again soon');
    },
  });

  return { saveVersion, deleteVersion };
}
