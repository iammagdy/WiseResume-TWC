import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
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

function docToSession(doc: Record<string, unknown>): ChatSession {
  return {
    id: doc.$id as string,
    user_id: doc.user_id as string,
    resume_id: (doc.resume_id as string | null) ?? null,
    title: (doc.title as string) ?? 'Chat',
    created_at: doc.$createdAt as string,
    updated_at: doc.$updatedAt as string,
  };
}

function docToMessage(doc: Record<string, unknown>): StoredChatMessage {
  const raw = doc.function_call;
  const function_call: Record<string, unknown> | null =
    raw == null ? null :
    typeof raw === 'string' ? JSON.parse(raw) as Record<string, unknown> :
    raw as Record<string, unknown>;
  return {
    id: doc.$id as string,
    session_id: doc.session_id as string,
    role: doc.role as 'user' | 'assistant',
    content: doc.content as string,
    function_call,
    created_at: doc.$createdAt as string,
  };
}

export function useChatSessions() {
  const { isAuthenticated, user } = useAuth();
  return useQuery<ChatSession[]>({
    queryKey: ['chat_sessions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.chat_sessions, [
        Query.equal('user_id', user.id),
        Query.orderDesc('$updatedAt'),
        Query.limit(50),
      ]);
      return res.documents.map(d => docToSession(d as unknown as Record<string, unknown>));
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
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.chat_messages, [
        Query.equal('session_id', sessionId),
        Query.orderAsc('$createdAt'),
        Query.limit(500),
      ]);
      return res.documents.map(d => docToMessage(d as unknown as Record<string, unknown>));
    },
    enabled: !!sessionId,
    staleTime: 60_000,
  });
}

export function useDeleteChatSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      // Cascade: delete all messages first (Appwrite has no FK cascade)
      const msgs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.chat_messages, [
        Query.equal('session_id', sessionId),
        Query.limit(500),
      ]);
      await Promise.all(
        msgs.documents.map(m =>
          databases.deleteDocument(DATABASE_ID, COLLECTIONS.chat_messages, m.$id),
        ),
      );
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.chat_sessions, sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat_sessions', user?.id] });
    },
  });
}
