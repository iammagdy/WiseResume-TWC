import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { useAuth } from './useAuth';
import { ResumeData, Experience, Education, Certification, ContactInfo, Award, Project, Publication, Volunteering, Language, Hobby, Reference } from '@/types/resume';
import { toast } from 'sonner';
import { useResumeStore } from '@/store/resumeStore';
import { readPersistedCache, writePersistedCache } from '@/lib/persistedQueryCache';

export interface DatabaseResume {
  id: string;
  user_id: string;
  title: string;
  template_id: string;
  content?: string;
  created_at?: string;
  updated_at?: string;
}

export function parseDbResume(doc: any): DatabaseResume {
  return {
    id: doc.$id,
    user_id: doc.user_id,
    title: doc.title,
    template_id: doc.template || 'modern',
    created_at: doc.$createdAt,
    updated_at: doc.$updatedAt,
  };
}

export function useResumes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['resumes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await databases.listDocuments(DATABASE_ID, 'resumes', [
        Query.equal('user_id', user.id),
        Query.orderDesc('$updatedAt')
      ]);
      const result = response.documents.map(parseDbResume);
      writePersistedCache(`resumes:${user.id}`, result);
      return result;
    },
    enabled: !!user,
  });
}

export function useResume(resumeId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['resume', resumeId],
    queryFn: async () => {
      if (!resumeId || !user) return null;
      try {
        const doc = await databases.getDocument(DATABASE_ID, 'resumes', resumeId);
        return parseDbResume(doc);
      } catch (err: any) {
        if (err.code === 404) return null;
        throw err;
      }
    },
    enabled: !!user && !!resumeId,
  });
}

export function useResumeMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createResume = useMutation({
    mutationFn: async ({ resume, title }: { resume: ResumeData; title?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const doc = await databases.createDocument(DATABASE_ID, 'resumes', ID.unique(), {
        user_id: user.id,
        title: title || resume.contactInfo.fullName || 'Untitled Resume',
        template: resume.templateId || 'modern'
      });
      return parseDbResume(doc);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      useResumeStore.getState().setCurrentResumeId(data.id);
      toast.success('Resume created');
    },
  });

  const updateResume = useMutation({
    mutationFn: async ({ resumeId, updates, title }: { resumeId: string; updates: Partial<ResumeData>; title?: string; }) => {
      if (!user) throw new Error('Not authenticated');
      const doc = await databases.updateDocument(DATABASE_ID, 'resumes', resumeId, {
        title: title,
        template: updates.templateId
      });
      return parseDbResume(doc);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      queryClient.invalidateQueries({ queryKey: ['resume', data.id] });
      toast.success('Resume saved');
    },
  });

  const deleteResume = useMutation({
    mutationFn: async (resumeId: string) => {
      await databases.deleteDocument(DATABASE_ID, 'resumes', resumeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Resume deleted');
    },
  });

  return { createResume, updateResume, deleteResume };
}
