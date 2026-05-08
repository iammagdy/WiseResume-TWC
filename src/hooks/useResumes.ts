import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { useAuth } from './useAuth';
import { ResumeData } from '@/types/resume';
import { toast } from 'sonner';
import { useResumeStore } from '@/store/resumeStore';
import { readPersistedCache, writePersistedCache } from '@/lib/persistedQueryCache';

export interface DatabaseResume {
  id: string;
  user_id: string;
  title: string;
  template_id: string;
  content?: string;
  summary?: string;
  experience?: string;
  education?: string;
  skills?: string;
  certifications?: string;
  awards?: string;
  projects?: string;
  publications?: string;
  volunteering?: string;
  hobbies?: string;
  references?: string;
  languages?: string;
  customization?: string;
  contact_info?: string;
  created_at?: string;
  updated_at?: string;
}

export function parseDbResume(doc: any): DatabaseResume {
  return {
    id: doc.$id,
    user_id: doc.user_id,
    title: doc.title,
    template_id: doc.template || 'modern',
    summary: doc.summary,
    content: doc.content,
    experience: doc.experience,
    education: doc.education,
    skills: doc.skills,
    certifications: doc.certifications,
    awards: doc.awards,
    projects: doc.projects,
    publications: doc.publications,
    volunteering: doc.volunteering,
    hobbies: doc.hobbies,
    references: doc.references,
    languages: doc.languages,
    customization: doc.customization,
    contact_info: doc.contact_info,
    created_at: doc.$createdAt,
    updated_at: doc.$updatedAt,
  };
}

export function dbToResumeData(db: DatabaseResume): ResumeData {
  const parseJson = (str: string | undefined, fallback: any) => {
    if (!str) return fallback;
    try { return JSON.parse(str); } catch { return fallback; }
  };

  return {
    id: db.id,
    templateId: db.template_id,
    title: db.title,
    summary: db.summary || '',
    contactInfo: parseJson(db.contact_info, { fullName: '', email: '', phone: '', location: '' }),
    experience: parseJson(db.experience, []),
    education: parseJson(db.education, []),
    skills: parseJson(db.skills, []),
    certifications: parseJson(db.certifications, []),
    awards: parseJson(db.awards, []),
    projects: parseJson(db.projects, []),
    publications: parseJson(db.publications, []),
    volunteering: parseJson(db.volunteering, []),
    hobbies: parseJson(db.hobbies, []),
    references: parseJson(db.references, []),
    languages: parseJson(db.languages, []),
    customization: parseJson(db.customization, undefined),
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

export function useResumes(options: { select?: (data: DatabaseResume[]) => any } = {}) {
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
        template: resume.templateId || 'modern',
        contact_info: JSON.stringify(resume.contactInfo),
        experience: JSON.stringify(resume.experience),
        education: JSON.stringify(resume.education),
        skills: JSON.stringify(resume.skills),
        certifications: JSON.stringify(resume.certifications),
        customization: JSON.stringify(resume.customization)
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
      
      const docData: any = { title };
      if (updates.templateId) docData.template = updates.templateId;
      if (updates.contactInfo) docData.contact_info = JSON.stringify(updates.contactInfo);
      if (updates.experience) docData.experience = JSON.stringify(updates.experience);
      if (updates.education) docData.education = JSON.stringify(updates.education);
      if (updates.skills) docData.skills = JSON.stringify(updates.skills);
      if (updates.summary) docData.summary = updates.summary;
      if (updates.customization) docData.customization = JSON.stringify(updates.customization);

      const doc = await databases.updateDocument(DATABASE_ID, 'resumes', resumeId, docData);
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
