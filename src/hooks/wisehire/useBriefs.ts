import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { getUserId } from '@/lib/supabaseBridge';
import { toast } from 'sonner';

export interface CandidateBrief {
  id: string;
  owner_id: string;
  candidate_id: string;
  role_id: string | null;
  match_score: number | null;
  strengths: string[] | null;
  concerns: string[] | null;
  interview_questions: string[] | null;
  employment_notes: string | null;
  ai_model_used: string | null;
  is_byok: boolean;
  share_token: string | null;
  share_token_active: boolean;
  created_at: string;
  candidate?: { name: string; email: string } | null;
  role?: { title: string } | null;
}

export function useBriefs() {
  const { isAuthenticated, supabaseReady } = useAuth();
  const userId = getUserId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wisehire-briefs', userId],
    queryFn: async (): Promise<CandidateBrief[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('wisehire_candidate_briefs')
        .select('*, candidate:wisehire_candidates(name, email), role:wisehire_roles(title)')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[useBriefs] fetch error:', error.message);
        return [];
      }
      return (data ?? []) as CandidateBrief[];
    },
    enabled: isAuthenticated && supabaseReady && !!userId,
    staleTime: 60 * 1000,
  });

  const revokeShareToken = useMutation({
    mutationFn: async (briefId: string) => {
      const newToken = crypto.randomUUID();
      const { error } = await supabase
        .from('wisehire_candidate_briefs')
        .update({ share_token: newToken, share_token_active: true })
        .eq('id', briefId)
        .eq('owner_id', userId);
      if (error) throw new Error(error.message);
      return newToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wisehire-briefs', userId] });
      toast.success('Share link regenerated. The old link is now invalid.');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke share link');
    },
  });

  return { ...query, revokeShareToken };
}

export function useBrief(briefId: string | undefined) {
  const { isAuthenticated, supabaseReady } = useAuth();
  const userId = getUserId();

  return useQuery({
    queryKey: ['wisehire-brief', briefId],
    queryFn: async (): Promise<CandidateBrief | null> => {
      if (!userId || !briefId) return null;
      const { data, error } = await supabase
        .from('wisehire_candidate_briefs')
        .select('*, candidate:wisehire_candidates(name, email), role:wisehire_roles(title)')
        .eq('id', briefId)
        .eq('owner_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[useBrief] fetch error:', error.message);
        return null;
      }
      return data as CandidateBrief | null;
    },
    enabled: isAuthenticated && supabaseReady && !!userId && !!briefId,
    staleTime: 2 * 60 * 1000,
  });
}
