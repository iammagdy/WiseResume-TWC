import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { useAuth } from './useAuth';

export function useInterviewAnswers(sessionId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['interview-answers', sessionId],
    queryFn: async () => {
      if (!user) return [];
      const response = await databases.listDocuments(DATABASE_ID, 'interview_answers', [
        Query.equal('session_id', sessionId)
      ]);
      return response.documents;
    },
    enabled: !!user && !!sessionId,
  });
}

export function useSaveInterviewAnswer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      if (!user) throw new Error('Not authenticated');
      return await databases.createDocument(DATABASE_ID, 'interview_answers', ID.unique(), {
        user_id: user.id,
        ...input
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['interview-answers', vars.session_id] });
    },
  });
}
