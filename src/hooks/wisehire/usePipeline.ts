import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { getUserId } from '@/lib/supabaseBridge';
import { toast } from 'sonner';

export type PipelineStage =
  | 'shortlisted'
  | 'contacted'
  | 'interviewing'
  | 'offer_sent'
  | 'hired'
  | 'rejected';

export const PIPELINE_STAGES: { id: PipelineStage; label: string; color: string }[] = [
  { id: 'shortlisted', label: 'Shortlisted', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  { id: 'contacted', label: 'Contacted', color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400' },
  { id: 'interviewing', label: 'Interviewing', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  { id: 'offer_sent', label: 'Offer Sent', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
  { id: 'hired', label: 'Hired', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  { id: 'rejected', label: 'Rejected', color: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' },
];

export interface PipelineCandidate {
  id: string;
  owner_id: string;
  role_id: string | null;
  client_id: string | null;
  name: string;
  email: string | null;
  pipeline_stage: PipelineStage;
  notes: string | null;
  resume_pdf_path: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  brief?: { id: string; match_score: number | null } | null;
  role?: { title: string; client_id: string | null } | null;
}

export interface PipelineEvent {
  id: string;
  candidate_id: string;
  from_stage: string | null;
  to_stage: string;
  moved_at: string;
}

export function usePipeline(roleId?: string, clientId?: string) {
  const { isAuthenticated, supabaseReady } = useAuth();
  const userId = getUserId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wisehire-pipeline', userId, roleId, clientId],
    queryFn: async (): Promise<PipelineCandidate[]> => {
      if (!userId) return [];
      let q = supabase
        .from('wisehire_candidates')
        .select('*, brief:wisehire_candidate_briefs(id, match_score), role:wisehire_roles(title, client_id)')
        .eq('owner_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (roleId) q = q.eq('role_id', roleId);

      const { data, error } = await q;
      if (error) {
        console.warn('[usePipeline] fetch error:', error.message);
        return [];
      }
      let results = (data ?? []) as PipelineCandidate[];
      if (clientId) {
        results = results.filter(
          (c) => c.client_id === clientId || c.role?.client_id === clientId
        );
      }
      return results;
    },
    enabled: isAuthenticated && supabaseReady && !!userId,
    staleTime: 30 * 1000,
  });

  const updatePipelineStage = useMutation({
    mutationFn: async ({ candidateId, toStage, fromStage }: { candidateId: string; toStage: PipelineStage; fromStage: PipelineStage }) => {
      if (!userId) throw new Error('Not authenticated');

      const [updateResult, eventResult] = await Promise.all([
        supabase
          .from('wisehire_candidates')
          .update({ pipeline_stage: toStage })
          .eq('id', candidateId)
          .eq('owner_id', userId),
        supabase
          .from('wisehire_pipeline_events')
          .insert({
            owner_id: userId,
            candidate_id: candidateId,
            from_stage: fromStage,
            to_stage: toStage,
            moved_by: userId,
          }),
      ]);

      if (updateResult.error) throw new Error(updateResult.error.message);
    },
    onMutate: async ({ candidateId, toStage }) => {
      await queryClient.cancelQueries({ queryKey: ['wisehire-pipeline', userId, roleId, clientId] });
      const prev = queryClient.getQueryData<PipelineCandidate[]>(['wisehire-pipeline', userId, roleId, clientId]);
      queryClient.setQueryData<PipelineCandidate[]>(['wisehire-pipeline', userId, roleId, clientId], (old) =>
        (old ?? []).map((c) => c.id === candidateId ? { ...c, pipeline_stage: toStage } : c)
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['wisehire-pipeline', userId, roleId, clientId], context.prev);
      }
      toast.error('Failed to update stage. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wisehire-pipeline', userId] });
      queryClient.invalidateQueries({ queryKey: ['wisehire-dashboard-stats', userId] });
    },
  });

  const bulkUpdatePipelineStage = useMutation({
    mutationFn: async ({ candidateIds, toStage }: { candidateIds: string[]; toStage: PipelineStage }) => {
      if (!userId) throw new Error('Not authenticated');
      if (candidateIds.length === 0) return 0;
      const { data, error } = await supabase.rpc('bulk_update_pipeline_stage', {
        p_candidate_ids: candidateIds,
        p_to_stage: toStage,
      });
      if (error) throw new Error(error.message);
      return (data as number | null) ?? 0;
    },
    onMutate: async ({ candidateIds, toStage }) => {
      await queryClient.cancelQueries({ queryKey: ['wisehire-pipeline', userId, roleId, clientId] });
      const prev = queryClient.getQueryData<PipelineCandidate[]>(['wisehire-pipeline', userId, roleId, clientId]);
      const idSet = new Set(candidateIds);
      queryClient.setQueryData<PipelineCandidate[]>(
        ['wisehire-pipeline', userId, roleId, clientId],
        (old) => (old ?? []).map((c) => (idSet.has(c.id) ? { ...c, pipeline_stage: toStage } : c)),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['wisehire-pipeline', userId, roleId, clientId], context.prev);
      }
      toast.error('Failed to move candidates. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wisehire-pipeline', userId] });
      queryClient.invalidateQueries({ queryKey: ['wisehire-dashboard-stats', userId] });
    },
  });

  const updateNotes = useMutation({
    mutationFn: async ({ candidateId, notes }: { candidateId: string; notes: string }) => {
      const { error } = await supabase
        .from('wisehire_candidates')
        .update({ notes })
        .eq('id', candidateId)
        .eq('owner_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wisehire-pipeline', userId] });
    },
  });

  const addCandidate = useMutation({
    mutationFn: async ({ name, email, roleId: rId, resumePdfPath, resumeText, stage }: {
      name: string;
      email?: string;
      roleId?: string;
      resumePdfPath?: string;
      resumeText?: string;
      stage?: string;
    }) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('wisehire_candidates')
        .insert({
          owner_id: userId,
          name,
          email: email ?? null,
          role_id: rId ?? null,
          resume_pdf_path: resumePdfPath ?? null,
          resume_text: resumeText ?? null,
          pipeline_stage: (stage ?? 'shortlisted') as PipelineStage,
          is_deleted: false,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wisehire-pipeline', userId] });
      queryClient.invalidateQueries({ queryKey: ['wisehire-dashboard-stats', userId] });
      const stageLabel = PIPELINE_STAGES.find((s) => s.id === (variables.stage ?? 'shortlisted'))?.label ?? 'Shortlisted';
      toast.success(`Candidate added to ${stageLabel}.`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to add candidate');
    },
  });

  return { ...query, updatePipelineStage, bulkUpdatePipelineStage, updateNotes, addCandidate };
}

export function useCandidateHistory(candidateId: string | null) {
  const { isAuthenticated, supabaseReady } = useAuth();
  const userId = getUserId();

  return useQuery({
    queryKey: ['wisehire-pipeline-events', candidateId],
    queryFn: async (): Promise<PipelineEvent[]> => {
      if (!candidateId || !userId) return [];
      const { data, error } = await supabase
        .from('wisehire_pipeline_events')
        .select('id, candidate_id, from_stage, to_stage, moved_at')
        .eq('candidate_id', candidateId)
        .eq('owner_id', userId)
        .order('moved_at', { ascending: false });
      if (error) return [];
      return (data ?? []) as PipelineEvent[];
    },
    enabled: isAuthenticated && supabaseReady && !!candidateId,
    staleTime: 30 * 1000,
  });
}
