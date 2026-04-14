import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface InterviewAnswer {
  id: string;
  user_id: string;
  session_id: string | null;
  question_text: string;
  answer_text: string;
  category: string;
  role_context: string | null;
  score: number | null;
  notes: string | null;
  created_at: string;
}

export function useInterviewAnswers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['interview-answers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_answers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as InterviewAnswer[];
    },
    enabled: !!user,
  });
}

export function useSaveInterviewAnswer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      session_id?: string;
      question_text: string;
      answer_text: string;
      category?: string;
      role_context?: string;
      score?: number;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('interview_answers')
        .insert({
          user_id: user.id,
          session_id: input.session_id || null,
          question_text: input.question_text,
          answer_text: input.answer_text,
          category: input.category || 'General',
          role_context: input.role_context || null,
          score: input.score || null,
          notes: input.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as InterviewAnswer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-answers'] });
      toast.success('Answer saved to library!');
    },
    onError: () => toast.error('Failed to save answer'),
  });
}

export function useUpdateInterviewAnswer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      notes?: string;
      category?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('interview_answers')
        .update({
          notes: input.notes,
          category: input.category,
        })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-answers'] });
      toast.success('Answer updated');
    },
    onError: () => toast.error('Failed to update answer'),
  });
}

export function useDeleteInterviewAnswer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('interview_answers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-answers'] });
      toast.success('Answer removed from library');
    },
    onError: () => toast.error('Failed to delete answer'),
  });
}
