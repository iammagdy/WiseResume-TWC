import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { useAuth } from './useAuth';
import { ResumeData } from '@/types/resume';
import { toast } from 'sonner';
import { useResumeStore } from '@/store/resumeStore';
import { readPersistedCache, writePersistedCache } from '@/lib/persistedQueryCache';

export interface DatabaseResume {
  $id: string;
  user_id: string;
  title: string;
  template: string;
  content?: string;
  summary?: string;
  experience?: string;
  education?: string;
  skills?: string;
  certifications?: string;
  awards?: string;
  projects?: string;
  customization?: string;
  contact_info?: string;
  is_master?: boolean;
  $createdAt: string;
  $updatedAt: string;
  // Legacy / optional attributes — may be present in the Appwrite collection
  // if they were provisioned from the old Supabase schema.
  is_trial?: boolean;
  is_primary?: boolean;
  template_id?: string;
  target_job_title?: string;
  target_company?: string;
  parent_resume_id?: string;
  job_match_score?: number;
  job_url?: string;
}

export function parseDbResume(doc: any): DatabaseResume {
  return doc as DatabaseResume;
}

export function dbToResumeData(db: any): ResumeData {
  const parseJson = (str: any, fallback: any) => {
    if (!str) return fallback;
    if (typeof str === 'object') return str;
    try { return JSON.parse(str); } catch { return fallback; }
  };

  return {
    id: db.$id,
    templateId: db.template || 'modern',
    title: db.title,
    summary: db.summary || '',
    contactInfo: parseJson(db.contact_info, { fullName: '', email: '', phone: '', location: '' }),
    experience: parseJson(db.experience, []),
    education: parseJson(db.education, []),
    skills: parseJson(db.skills, []),
    certifications: parseJson(db.certifications, []),
    awards: parseJson(db.awards, []),
    projects: parseJson(db.projects, []),
    customization: parseJson(db.customization, undefined),
    createdAt: db.$createdAt,
    updatedAt: db.$updatedAt
  };
}

export function resumeDataToDb(resume: ResumeData, userId: string): Partial<DatabaseResume> {
  return {
    user_id: userId,
    title: resume.title || 'Untitled Resume',
    template: resume.templateId || 'modern',
    summary: resume.summary,
    contact_info: JSON.stringify(resume.contactInfo),
    experience: JSON.stringify(resume.experience),
    education: JSON.stringify(resume.education),
    skills: JSON.stringify(resume.skills),
    certifications: JSON.stringify(resume.certifications),
    customization: JSON.stringify(resume.customization)
  };
}

export function useResumes(options: { select?: (data: any[]) => any } = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['resumes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await databases.listDocuments(DATABASE_ID, 'resumes', [
        Query.equal('user_id', user.id),
        Query.orderDesc('$updatedAt')
      ]);
      writePersistedCache(`resumes:${user.id}`, response.documents);
      return response.documents;
    },
    enabled: !!user,
    select: options.select
  });
}

export function useResume(resumeId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['resume', resumeId],
    queryFn: async () => {
      if (!resumeId || !user) return null;
      try {
        return await databases.getDocument(DATABASE_ID, 'resumes', resumeId);
      } catch (err: any) {
        if (err.code === 404) return null;
        throw err;
      }
    },
    enabled: !!user && !!resumeId,
  });
}

export function useSetMasterCV() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resumeId: string) => {
      if (!user) throw new Error('Not authenticated');
      // 1. Reset all
      const all = await databases.listDocuments(DATABASE_ID, 'resumes', [Query.equal('user_id', user.id)]);
      for (const r of all.documents) {
        if (r.is_master) await databases.updateDocument(DATABASE_ID, 'resumes', r.$id, { is_master: false });
      }
      // 2. Set new master
      return await databases.updateDocument(DATABASE_ID, 'resumes', resumeId, { is_master: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Master CV updated');
    }
  });
}

export function useResumeMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createResume = useMutation({
    mutationFn: async ({ resume, title }: { resume: ResumeData; title?: string }) => {
      if (!user) throw new Error('Not authenticated');
      return await databases.createDocument(DATABASE_ID, 'resumes', ID.unique(), {
        ...resumeDataToDb(resume, user.id),
        title: title || resume.title
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      useResumeStore.getState().setCurrentResumeId(data.$id);
      toast.success('Resume created');
    },
  });

  const updateResume = useMutation({
    mutationFn: async ({ resumeId, updates, title }: { resumeId: string; updates: Partial<ResumeData>; title?: string; }) => {
      const data: any = {};
      if (title) data.title = title;
      if (updates.templateId) data.template = updates.templateId;
      if (updates.contactInfo) data.contact_info = JSON.stringify(updates.contactInfo);
      if (updates.experience) data.experience = JSON.stringify(updates.experience);
      if (updates.education) data.education = JSON.stringify(updates.education);
      if (updates.skills) data.skills = JSON.stringify(updates.skills);
      if (updates.summary) data.summary = updates.summary;
      if (updates.customization) data.customization = JSON.stringify(updates.customization);

      return await databases.updateDocument(DATABASE_ID, 'resumes', resumeId, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      queryClient.invalidateQueries({ queryKey: ['resume', data.$id] });
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

  const deleteMultipleResumes = useMutation({
    mutationFn: async (resumeIds: string[]) => {
      await Promise.all(
        resumeIds.map(id => databases.deleteDocument(DATABASE_ID, 'resumes', id))
      );
    },
    onSuccess: (_data, resumeIds) => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast.success(`${resumeIds.length} resume${resumeIds.length === 1 ? '' : 's'} deleted`);
    },
    onError: () => {
      toast.error('Failed to delete some resumes');
    },
  });

  const duplicateResume = useMutation({
    mutationFn: async (resumeId: string) => {
      if (!user) throw new Error('Not authenticated');
      const original = await databases.getDocument(DATABASE_ID, 'resumes', resumeId);
      const { $id, $createdAt, $updatedAt, $permissions, $collectionId, $databaseId, ...rest } = original as Record<string, unknown>;
      void $id; void $createdAt; void $updatedAt; void $permissions; void $collectionId; void $databaseId;
      return await databases.createDocument(DATABASE_ID, 'resumes', ID.unique(), {
        ...rest,
        user_id: user.id,
        title: `${(original as Record<string, unknown>).title as string} (Copy)`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Resume duplicated');
    },
    onError: () => {
      toast.error('Failed to duplicate resume');
    },
  });

  return { createResume, updateResume, deleteResume, deleteMultipleResumes, duplicateResume };
}
