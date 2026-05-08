import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { CareerPathResult } from '@/lib/careerPath';

export interface CareerAssessment {
  id: string;
  user_id: string;
  resume_id: string | null;
  resume_title: string | null;
  result: CareerPathResult;
  quiz_answers: Record<string, unknown>;
  completed_milestones: string[];
  created_at: string;
  updated_at: string;
}

function docToAssessment(doc: Record<string, unknown>): CareerAssessment {
  const parseJson = (v: unknown): unknown => {
    if (typeof v === 'string') {
      try { return JSON.parse(v); } catch { return v; }
    }
    return v;
  };
  return {
    id: doc.$id as string,
    user_id: doc.user_id as string,
    resume_id: (doc.resume_id as string | null) ?? null,
    resume_title: (doc.resume_title as string | null) ?? null,
    result: parseJson(doc.result) as CareerPathResult,
    quiz_answers: (parseJson(doc.quiz_answers) as Record<string, unknown>) ?? {},
    completed_milestones: (parseJson(doc.completed_milestones) as string[]) ?? [],
    created_at: doc.$createdAt as string,
    updated_at: doc.$updatedAt as string,
  };
}

export function useCareerAssessment() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['career-assessments', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.career_assessments, [
        Query.equal('user_id', user.id),
        Query.orderDesc('$createdAt'),
        Query.limit(1),
      ]);
      if (res.documents.length === 0) return null;
      return docToAssessment(res.documents[0] as unknown as Record<string, unknown>);
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
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.career_assessments,
        ID.unique(),
        {
          user_id: user.id,
          resume_id: resumeId ?? null,
          result: JSON.stringify(result),
          quiz_answers: JSON.stringify(quizAnswers),
          completed_milestones: JSON.stringify([]),
        },
      );
      return docToAssessment(doc as unknown as Record<string, unknown>);
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
        ? completed.filter(m => m !== milestoneId)
        : [...completed, milestoneId];

      await databases.updateDocument(DATABASE_ID, COLLECTIONS.career_assessments, assessmentId, {
        completed_milestones: JSON.stringify(newMilestones),
      });
      return newMilestones;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-assessments'] });
    },
  });

  return { createAssessment, toggleMilestone };
}
