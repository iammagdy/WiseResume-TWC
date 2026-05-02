import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface InterviewSessionRecord {
  id: string;
  user_id: string;
  resume_id: string | null;
  /**
   * Snapshot of the source resume's title at session start. Trigger-
   * maintained so the row survives a resume delete with a meaningful
   * label. See migration 20260522000000_snapshot_resume_title_on_artifacts.sql.
   */
  resume_title: string | null;
  interview_type: string | null;
  job_title: string | null;
  job_description: string | null;
  messages: Json | null;
  overall_score: number | null;
  strengths: Json | null;
  improvements: Json | null;
  duration_seconds: number | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useInterviewHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['interview-sessions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as InterviewSessionRecord[];
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
      messages?: Json;
      overall_score?: number;
      strengths?: string[];
      improvements?: string[];
      duration_seconds?: number;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const payload = {
        user_id: user.id,
        resume_id: input.resume_id || null,
        interview_type: input.interview_type || 'general',
        job_title: input.job_title || null,
        job_description: input.job_description || null,
        messages: input.messages || [],
        overall_score: input.overall_score || null,
        strengths: (input.strengths || []) as unknown as Json,
        improvements: (input.improvements || []) as unknown as Json,
        duration_seconds: input.duration_seconds || null,
        status: 'completed' as const,
      };

      // If we have a draft id, promote it to a completed session in place so
      // we don't end up with two rows (the draft and the final save).
      if (input.draft_id) {
        const { data, error } = await supabase
          .from('interview_sessions')
          .update(payload)
          .eq('id', input.draft_id)
          .eq('user_id', user.id)
          .select()
          .single();
        if (!error && data) return data as InterviewSessionRecord;
        // Fall through to insert if the update failed (e.g., draft was pruned)
      }

      const { data, error } = await supabase
        .from('interview_sessions')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as InterviewSessionRecord;
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
      const { error } = await supabase
        .from('interview_sessions')
        .delete()
        .eq('id', id);
      if (error) throw error;
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
      const { data, error } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .gte('updated_at', cutoff)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;

      // Opportunistic cleanup: prune this user's expired drafts so they don't
      // pile up. Fire-and-forget; failure here is harmless.
      void supabase
        .from('interview_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .lt('updated_at', cutoff);

      return (data || null) as InterviewSessionRecord | null;
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
  messages?: Json;
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
        resume_id: input.resume_id || null,
        interview_type: input.interview_type || 'general',
        job_title: input.job_title || null,
        job_description: input.job_description || null,
        messages: input.messages || [],
        duration_seconds: input.duration_seconds || null,
        status: 'draft' as const,
      };

      if (input.draft_id) {
        const { data, error } = await supabase
          .from('interview_sessions')
          .update(payload)
          .eq('id', input.draft_id)
          .eq('user_id', user.id)
          .select()
          .single();
        if (!error && data) return data as InterviewSessionRecord;
      }

      const { data, error } = await supabase
        .from('interview_sessions')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as InterviewSessionRecord;
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
      const { error } = await supabase
        .from('interview_sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('status', 'draft');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-draft'] });
    },
  });
}
