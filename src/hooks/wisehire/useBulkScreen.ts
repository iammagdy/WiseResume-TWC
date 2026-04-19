import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { edgeFunctions } from '@/lib/edgeFunctions';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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

export function useLatestBulkJobs(roleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['bulk-screen-jobs', user?.id, roleId],
    queryFn: async () => {
      let q = supabase
        .from('wisehire_bulk_screen_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (roleId) q = q.eq('role_id', roleId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as BulkScreenJob[];
    },
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

      const { data, error } = await edgeFunctions.invoke<{
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('wisehire_candidates')
        .insert({
          owner_id: user.id,
          name: name || 'Unknown Candidate',
          role_id: roleId ?? null,
          pipeline_stage: 'shortlisted',
          resume_text: resumeSummary ?? null,
        })
        .select('id')
        .single();

      if (error) throw error;
      return { ...data, userId: user.id };
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
