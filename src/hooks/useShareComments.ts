import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ShareComment {
  id: string;
  author_name: string;
  section: string | null;
  content: string;
  is_resolved: boolean;
  created_at: string;
}

/** Fetch comments for a share (owner, by share_id) */
export function useShareComments(shareId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['share-comments', shareId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('share_comments')
        .select('*')
        .eq('share_id', shareId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ShareComment[];
    },
    enabled: !!user && !!shareId,
  });
}

/** Fetch comments for a public share page (by token, via RPC) */
export function usePublicShareComments(token: string | null) {
  return useQuery({
    queryKey: ['public-share-comments', token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_share_comments', {
        p_share_token: token!,
      });
      if (error) throw error;
      return (data || []) as unknown as ShareComment[];
    },
    enabled: !!token,
  });
}

/** Add a comment via RPC (public, no auth required) */
export function useAddShareComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      shareToken: string;
      authorName: string;
      content: string;
      section?: string;
    }) => {
      const { data, error } = await supabase.rpc('add_share_comment', {
        p_share_token: input.shareToken,
        p_author_name: input.authorName,
        p_content: input.content,
        p_section: input.section ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['public-share-comments', variables.shareToken] });
      toast.success('Feedback submitted!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to submit feedback');
    },
  });
}

/** Resolve a comment (owner only) */
export function useResolveComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, resolved }: { commentId: string; resolved: boolean }) => {
      const { error } = await supabase
        .from('share_comments')
        .update({ is_resolved: resolved })
        .eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-comments'] });
    },
  });
}
