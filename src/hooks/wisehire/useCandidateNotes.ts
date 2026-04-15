import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { getUserId } from '@/lib/supabaseBridge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type NoteTag = 'general' | 'highlight' | 'concern';

export interface CandidateNote {
  id: string;
  candidate_id: string;
  owner_id: string;
  author_id: string;
  body: string;
  tag: NoteTag;
  pinned: boolean;
  created_at: string;
}

export function useCandidateNotes(candidateId: string | undefined) {
  const { isAuthenticated, supabaseReady } = useAuth();
  return useQuery({
    queryKey: ['candidate-notes', candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data, error } = await supabase
        .from('wisehire_candidate_notes')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CandidateNote[];
    },
    enabled: isAuthenticated && supabaseReady && !!candidateId,
    staleTime: 30_000,
  });
}

export function useAddNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      candidateId,
      body,
      tag = 'general',
    }: {
      candidateId: string;
      body: string;
      tag?: NoteTag;
    }) => {
      const userId = await getUserId();
      if (!userId) throw new Error('Not authenticated');

      // owner_id and author_id are both the current HR user
      const { data, error } = await supabase
        .from('wisehire_candidate_notes')
        .insert({
          owner_id: userId,
          candidate_id: candidateId,
          author_id: userId,
          body: body.trim(),
          tag,
          pinned: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CandidateNote;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['candidate-notes', vars.candidateId] });
    },
    onError: () => toast.error('Failed to add note'),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ noteId, candidateId }: { noteId: string; candidateId: string }) => {
      const { error } = await supabase
        .from('wisehire_candidate_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;
      return candidateId;
    },
    onSuccess: (candidateId) => {
      qc.invalidateQueries({ queryKey: ['candidate-notes', candidateId] });
    },
    onError: () => toast.error('Failed to delete note'),
  });
}

export function useTogglePinNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      noteId,
      candidateId,
      pinned,
    }: {
      noteId: string;
      candidateId: string;
      pinned: boolean;
    }) => {
      const { error } = await supabase
        .from('wisehire_candidate_notes')
        .update({ pinned: !pinned })
        .eq('id', noteId);
      if (error) throw error;
      return candidateId;
    },
    onSuccess: (candidateId) => {
      qc.invalidateQueries({ queryKey: ['candidate-notes', candidateId] });
    },
  });
}
