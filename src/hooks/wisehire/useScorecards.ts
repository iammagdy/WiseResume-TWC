import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';

export interface Scorecard {
  id: string;
  owner_id: string;
  candidate_id: string;
  brief_id: string | null;
  questions: string[];
  ratings: (number | null)[];
  notes: string[];
  overall_score: number | null;
  submitted_at: string | null;
  share_token: string;
  share_token_active: boolean;
  created_at: string;
}

export function useScorecards(candidateId: string) {
  return useQuery({
    queryKey: ['scorecards', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wisehire_scorecards')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Scorecard[];
    },
    enabled: Boolean(candidateId),
  });
}

export function useScorecard(scorecardId: string | undefined) {
  return useQuery({
    queryKey: ['scorecard', scorecardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wisehire_scorecards')
        .select('*')
        .eq('id', scorecardId!)
        .single();
      if (error) throw error;
      return data as Scorecard;
    },
    enabled: Boolean(scorecardId),
  });
}

export function usePublicScorecard(shareToken: string | undefined) {
  return useQuery({
    queryKey: ['public-scorecard', shareToken],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wisehire_scorecards')
        .select('*')
        .eq('share_token', shareToken!)
        .eq('share_token_active', true)
        .maybeSingle();
      if (error) throw error;
      return data as Scorecard | null;
    },
    enabled: Boolean(shareToken),
    retry: false,
  });
}

export function useCreateScorecard() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      candidateId,
      briefId,
      questions,
    }: {
      candidateId: string;
      briefId?: string;
      questions: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('wisehire_scorecards')
        .insert({
          owner_id: user.id,
          candidate_id: candidateId,
          brief_id: briefId ?? null,
          questions,
          ratings: new Array(questions.length).fill(null),
          notes: new Array(questions.length).fill(''),
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as Scorecard;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['scorecards', data.candidate_id] });
    },
    onError: () => {
      toast.error('Failed to create scorecard');
    },
  });
}

export function useSaveScorecard() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ratings,
      notes,
      submit = false,
    }: {
      id: string;
      ratings: (number | null)[];
      notes: string[];
      submit?: boolean;
    }) => {
      const filled = ratings.filter((r) => r !== null && r > 0);
      const overall = filled.length
        ? Math.round((filled.reduce((a, b) => a + (b ?? 0), 0) / filled.length) * 10) / 10
        : null;

      const patch: Record<string, unknown> = { ratings, notes, overall_score: overall };
      if (submit) patch.submitted_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('wisehire_scorecards')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data as Scorecard;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['scorecard', data.id] });
      qc.invalidateQueries({ queryKey: ['scorecards', data.candidate_id] });
      toast.success(data.submitted_at ? 'Scorecard submitted' : 'Draft saved');
    },
    onError: () => {
      toast.error('Failed to save scorecard');
    },
  });
}

export function useRevokeShareToken() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('wisehire_scorecards')
        .update({
          share_token: crypto.randomUUID(),
          share_token_active: true,
        })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as Scorecard;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['scorecard', data.id] });
      qc.invalidateQueries({ queryKey: ['scorecards', data.candidate_id] });
      toast.success('Share link revoked — a new link has been generated');
    },
    onError: () => {
      toast.error('Failed to revoke share link');
    },
  });
}
