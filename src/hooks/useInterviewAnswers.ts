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

export interface InterviewAnswerInput {
  session_id: string;
  question: string;
  answer: string;
  feedback?: string;
  score?: number;
}

export interface InterviewAnswerUpdates {
  answer?: string;
  feedback?: string;
  score?: number;
}

function docToAnswer(doc: Record<string, unknown>): InterviewAnswer {
  return {
    $id: doc.$id as string,
    user_id: doc.user_id as string,
    session_id: doc.session_id as string,
    question: doc.question as string,
    answer: doc.answer as string,
    feedback: doc.feedback as string | undefined,
    score: doc.score as number | undefined,
  };
}

export function useInterviewAnswers(sessionId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['interview-answers', sessionId],
    queryFn: async (): Promise<InterviewAnswer[]> => {
      if (!user || !sessionId) return [];
      const response = await databases.listDocuments(DATABASE_ID, 'interview_answers', [
        Query.equal('session_id', sessionId),
      ]);
      return response.documents.map(d => docToAnswer(d as unknown as Record<string, unknown>));
    },
    enabled: !!user && !!sessionId,
  });
}

export function useSaveInterviewAnswer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: InterviewAnswerInput): Promise<InterviewAnswer> => {
      if (!user) throw new Error('Not authenticated');
      const doc = await databases.createDocument(DATABASE_ID, 'interview_answers', ID.unique(), {
        user_id: user.id,
        ...input,
      });
      return docToAnswer(doc as unknown as Record<string, unknown>);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['interview-answers', vars.session_id] });
    },
  });
}

export function useUpdateInterviewAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: InterviewAnswerUpdates }): Promise<InterviewAnswer> => {
      const doc = await databases.updateDocument(DATABASE_ID, 'interview_answers', id, updates);
      return docToAnswer(doc as unknown as Record<string, unknown>);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['interview-answers', data.session_id] });
      toast.success('Answer updated');
    },
  });
}

export function useDeleteInterviewAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await databases.deleteDocument(DATABASE_ID, 'interview_answers', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-answers'] });
      toast.success('Answer deleted');
    },
  });
}
