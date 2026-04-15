import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';

export interface ChatSession {
  id: string;
  user_id: string;
  resume_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface StoredChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  function_call: Record<string, unknown> | null;
  created_at: string;
}

export function useChatSessions() {
  const { isAuthenticated } = useAuth();
  return useQuery<ChatSession[]>({
    queryKey: ['chat_sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as ChatSession[];
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useSessionMessages(sessionId: string | null) {
  return useQuery<StoredChatMessage[]>({
    queryKey: ['chat_messages', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as StoredChatMessage[];
    },
    enabled: !!sessionId,
    staleTime: 60_000,
  });
}

export function useDeleteChatSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat_sessions'] });
    },
  });
}
