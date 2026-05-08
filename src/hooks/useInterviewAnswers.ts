import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface InterviewAnswer {
  $id: string;
  user_id: string;
  session_id: string;
  question: string;
  answer: string;
  feedback?: string;
  score?: number;
}

export function useInterviewAnswers(sessionId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['interview-answers', sessionId],
    queryFn: async () => {
      if (!user || !sessionId) return [];
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

export function useUpdateInterviewAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      return await databases.updateDocument(DATABASE_ID, 'interview_answers', id, updates);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['interview-answers', data.session_id] });
      toast.success('Answer updated');
    }
  });
}

export function useDeleteInterviewAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await databases.deleteDocument(DATABASE_ID, 'interview_answers', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-answers'] });
      toast.success('Answer deleted');
    }
  });
}
