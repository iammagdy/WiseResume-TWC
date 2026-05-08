/**
 * Resume Snapshots — graceful no-op stubs.
 *
 * The `resume_snapshots` collection does not exist in the live Appwrite
 * 'main' database (verified 2026-05-08). All hooks return empty results /
 * no-ops until the collection is created in Appwrite Console.
 */
import { useQuery, useMutation } from '@tanstack/react-query';
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

export function useResumeSnapshots(_resumeId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['resume-snapshots', _resumeId, user?.id],
    queryFn: async (): Promise<ResumeSnapshot[]> => [],
    enabled: !!user,
  });
}

export function useSaveResumeSnapshot() {
  return useMutation({
    mutationFn: async (_input: {
      resume_id?: string;
      name: string;
      resume_json: unknown;
      ats_score?: number;
    }): Promise<null> => {
      console.warn('[useResumeSnapshots] resume_snapshots collection not yet created in Appwrite');
      throw new Error('Snapshots are being rebuilt on Appwrite — try again soon');
    },
    onError: () => toast.error('Snapshots are being rebuilt — try again soon'),
  });
}

export function useDeleteResumeSnapshot() {
  return useMutation({
    mutationFn: async (_id: string): Promise<void> => {
      console.warn('[useResumeSnapshots] resume_snapshots collection not yet created in Appwrite');
    },
    onSuccess: () => toast.success('Snapshot deleted'),
  });
}
