import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { CareerPathResult } from '@/lib/careerPath';
import type { TablesInsert } from '@/integrations/supabase/types';

export interface CareerAssessment {
  id: string;
  user_id: string;
  resume_id: string | null;
  result: CareerPathResult;
  quiz_answers: Record<string, unknown>;
  completed_milestones: string[];
  created_at: string;
  updated_at: string;
}

export function useCareerAssessment() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['career-assessments', user?.id],
    queryFn: async () => {
       
      const { data, error } = await supabase
        .from('career_assessments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        user_id: data.user_id,
        resume_id: data.resume_id,
        result: data.result as unknown as CareerPathResult,
        quiz_answers: (data.quiz_answers as Record<string, unknown>) || {},
        completed_milestones: (data.completed_milestones as string[]) || [],
        created_at: data.created_at,
        updated_at: data.updated_at,
      } as CareerAssessment;
    },
    enabled: !!user,
  });
}

export function useCareerMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createAssessment = useMutation({
    mutationFn: async ({
      resumeId,
      result,
      quizAnswers,
    }: {
      resumeId?: string;
      result: CareerPathResult;
      quizAnswers: Record<string, unknown>;
    }) => {
      if (!user) throw new Error('Not authenticated');

       
      const insertPayload = {
          user_id: user.id,
          resume_id: resumeId || null,
          result: JSON.parse(JSON.stringify(result)),
          quiz_answers: JSON.parse(JSON.stringify(quizAnswers)),
          completed_milestones: JSON.parse(JSON.stringify([])),
        } satisfies TablesInsert<'career_assessments'>;
      const { data, error } = await supabase
        .from('career_assessments')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-assessments'] });
      toast.success('Career assessment saved!');
    },
    onError: () => toast.error('Failed to save assessment'),
  });

  const toggleMilestone = useMutation({
    mutationFn: async ({
      assessmentId,
      milestoneId,
      completed,
    }: {
      assessmentId: string;
      milestoneId: string;
      completed: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      const newMilestones = completed.includes(milestoneId)
        ? completed.filter((m) => m !== milestoneId)
        : [...completed, milestoneId];

       
      const { error } = await supabase
        .from('career_assessments')
        .update({ completed_milestones: newMilestones })
        .eq('id', assessmentId);

      if (error) throw error;
      return newMilestones;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-assessments'] });
    },
  });

  return { createAssessment, toggleMilestone };
}
