import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface InterviewSessionRecord {
  id: string;
  user_id: string;
  resume_id: string | null;
  interview_type: string | null;
  job_title: string | null;
  job_description: string | null;
  messages: Json | null;
  overall_score: number | null;
  strengths: Json | null;
  improvements: Json | null;
  duration_seconds: number | null;
  created_at: string | null;
}

export function useInterviewHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['interview-sessions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as InterviewSessionRecord[];
    },
    enabled: !!user,
  });
}

export function useSaveInterviewSession() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      resume_id?: string;
      interview_type?: string;
      job_title?: string;
      job_description?: string;
      messages?: Json;
      overall_score?: number;
      strengths?: string[];
      improvements?: string[];
      duration_seconds?: number;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('interview_sessions')
        .insert({
          user_id: user.id,
          resume_id: input.resume_id || null,
          interview_type: input.interview_type || 'general',
          job_title: input.job_title || null,
          job_description: input.job_description || null,
          messages: input.messages || [],
          overall_score: input.overall_score || null,
          strengths: (input.strengths || []) as unknown as Json,
          improvements: (input.improvements || []) as unknown as Json,
          duration_seconds: input.duration_seconds || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as InterviewSessionRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-sessions'] });
    },
    onError: () => toast.error('Failed to save interview session'),
  });
}

export function useDeleteInterviewSession() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('interview_sessions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-sessions'] });
      toast.success('Session deleted');
    },
    onError: () => toast.error('Failed to delete session'),
  });
}
