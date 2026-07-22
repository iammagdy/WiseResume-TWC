import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useAuth } from './useAuth';
import { ResumeData } from '@/types/resume';
import { toast } from 'sonner';
import { useResumeStore } from '@/store/resumeStore';
import { readPersistedCache, writePersistedCache } from '@/lib/persistedQueryCache';
import { migrateTemplateId } from '@/lib/templateMigration';
import { withEditorResumeTimeout } from '@/lib/editorResumeStartup';

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
  publications?: string;
  volunteering?: string;
  hobbies?: string;
  references?: string;
  languages?: string;
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

/** Appwrite document id from a raw doc or mapped resume row. */
export function getResumeDocumentId(doc: { $id?: string; id?: string } | null | undefined): string | undefined {
  if (!doc) return undefined;
  return doc.$id ?? doc.id;
}

/** Server timestamp for conflict detection (Appwrite uses $updatedAt). */
export function getResumeDocumentUpdatedAt(doc: {
  $updatedAt?: string;
  updated_at?: string;
  updatedAt?: string;
} | null | undefined): string | undefined {
  if (!doc) return undefined;
  return doc.$updatedAt ?? doc.updated_at ?? doc.updatedAt;
}

export function parseDbJson<T>(str: unknown, fallback: T): T {
  if (!str) return fallback;
  if (typeof str === 'object') return str as T;
  try {
    return JSON.parse(str as string) as T;
  } catch {
    return fallback;
  }
}

/** Maps partial resume updates to Appwrite document fields. */
export function resumeUpdatesToDbFields(updates: Partial<ResumeData>): Record<string, string | undefined> {
  const data: Record<string, string | undefined> = {};
  if (updates.templateId !== undefined) data.template = updates.templateId;
  if (updates.summary !== undefined) data.summary = updates.summary;
  if (updates.contactInfo !== undefined) data.contact_info = JSON.stringify(updates.contactInfo);
  if (updates.experience !== undefined) data.experience = JSON.stringify(updates.experience);
  if (updates.education !== undefined) data.education = JSON.stringify(updates.education);
  if (updates.skills !== undefined) data.skills = JSON.stringify(updates.skills);
  if (updates.certifications !== undefined) data.certifications = JSON.stringify(updates.certifications);
  if (updates.awards !== undefined) data.awards = JSON.stringify(updates.awards);
  if (updates.projects !== undefined) data.projects = JSON.stringify(updates.projects);
  if (updates.publications !== undefined) data.publications = JSON.stringify(updates.publications);
  if (updates.volunteering !== undefined) data.volunteering = JSON.stringify(updates.volunteering);
  if (updates.hobbies !== undefined) data.hobbies = JSON.stringify(updates.hobbies);
  if (updates.references !== undefined) data.references = JSON.stringify(updates.references);
  if (updates.languages !== undefined) data.languages = JSON.stringify(updates.languages);
  if (updates.customization !== undefined) data.customization = JSON.stringify(updates.customization);
  return data;
}

export function dbToResumeData(db: any): ResumeData {
  return {
    id: db.$id,
    // Default to the WiseResume white/crimson template when none is stored;
    // valid user-selected ids pass through unchanged, legacy ids are migrated.
    templateId: migrateTemplateId(db.template),
    title: db.title,
    summary: db.summary || '',
    contactInfo: parseDbJson(db.contact_info, { fullName: '', email: '', phone: '', location: '' }),
    experience: parseDbJson(db.experience, []),
    education: parseDbJson(db.education, []),
    skills: parseDbJson(db.skills, []),
    certifications: parseDbJson(db.certifications, []),
    awards: parseDbJson(db.awards, []),
    projects: parseDbJson(db.projects, []),
    publications: parseDbJson(db.publications, []),
    volunteering: parseDbJson(db.volunteering, []),
    hobbies: parseDbJson(db.hobbies, []),
    references: parseDbJson(db.references, []),
    languages: parseDbJson(db.languages, []),
    customization: parseDbJson(db.customization, undefined),
    createdAt: db.$createdAt,
    updatedAt: getResumeDocumentUpdatedAt(db),
  };
}

export function resumeDataToDb(resume: ResumeData, userId: string): Partial<DatabaseResume> {
  return {
    user_id: userId,
    title: resume.title || 'Untitled Resume',
    template: migrateTemplateId(resume.templateId),
    summary: resume.summary,
    contact_info: JSON.stringify(resume.contactInfo),
    experience: JSON.stringify(resume.experience),
    education: JSON.stringify(resume.education),
    skills: JSON.stringify(resume.skills),
    certifications: JSON.stringify(resume.certifications ?? []),
    awards: JSON.stringify(resume.awards ?? []),
    projects: JSON.stringify(resume.projects ?? []),
    publications: JSON.stringify(resume.publications ?? []),
    volunteering: JSON.stringify(resume.volunteering ?? []),
    hobbies: JSON.stringify(resume.hobbies ?? []),
    references: JSON.stringify(resume.references ?? []),
    languages: JSON.stringify(resume.languages ?? []),
    customization: JSON.stringify(resume.customization),
  };
}

export function useResumes(options: { select?: (data: any[]) => any } = {}) {
  const { user, authReady } = useAuth();
  return useQuery({
    queryKey: ['resumes', user?.id],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!user) return [];
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.resumes, [
        Query.equal('user_id', user.id),
        Query.orderDesc('$updatedAt'),
        Query.limit(50),
      ]);
      writePersistedCache(`resumes:${user.id}`, response.documents);
      return response.documents;
    },
    enabled: authReady && !!user,
    placeholderData: (previous) =>
      previous ??
      (user?.id ? readPersistedCache<DatabaseResume[]>(`resumes:${user.id}`) ?? undefined : undefined),
    select: options.select,
    retry: 2,
  });
}

interface UseResumeOptions {
  requestTimeoutMs?: number;
  retry?: boolean | number;
}

export function useResume(resumeId: string | null, options: UseResumeOptions = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['resume', resumeId],
    queryFn: async () => {
      if (!resumeId || !user) return null;
      try {
        const request = databases.getDocument(DATABASE_ID, COLLECTIONS.resumes, resumeId);
        return options.requestTimeoutMs
          ? await withEditorResumeTimeout(request, options.requestTimeoutMs)
          : await request;
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'code' in err && err.code === 404) return null;
        throw err;
      }
    },
    enabled: !!user && !!resumeId,
    ...(options.retry !== undefined ? { retry: options.retry } : {}),
  });
}

export function useSetMasterCV() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resumeId: string) => {
      if (!user) throw new Error('Not authenticated');
      // 1. Reset all
      const all = await databases.listDocuments(DATABASE_ID, COLLECTIONS.resumes, [
        Query.equal('user_id', user.id),
        Query.limit(500)
      ]);
      for (const r of all.documents) {
        if (r.is_master) await databases.updateDocument(DATABASE_ID, COLLECTIONS.resumes, r.$id, { is_master: false });
      }
      // 2. Set new master
      return await databases.updateDocument(DATABASE_ID, COLLECTIONS.resumes, resumeId, { is_master: true });
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
      return await databases.createDocument(DATABASE_ID, COLLECTIONS.resumes, ID.unique(), {
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
      const data: Record<string, string> = { ...resumeUpdatesToDbFields(updates) } as Record<string, string>;
      if (title) data.title = title;

      return await databases.updateDocument(DATABASE_ID, COLLECTIONS.resumes, resumeId, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      queryClient.invalidateQueries({ queryKey: ['resume', data.$id] });
      toast.success('Resume saved');
    },
  });

  const deleteResume = useMutation({
    mutationFn: async (resumeId: string) => {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.resumes, resumeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Resume deleted');
    },
  });

  const deleteMultipleResumes = useMutation({
    mutationFn: async (resumeIds: string[]) => {
      await Promise.all(
        resumeIds.map(id => databases.deleteDocument(DATABASE_ID, COLLECTIONS.resumes, id))
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
      const original = await databases.getDocument(DATABASE_ID, COLLECTIONS.resumes, resumeId);
      const { $id, $createdAt, $updatedAt, $permissions, $collectionId, $databaseId, ...rest } = original as Record<string, unknown>;
      void $id; void $createdAt; void $updatedAt; void $permissions; void $collectionId; void $databaseId;
      return await databases.createDocument(DATABASE_ID, COLLECTIONS.resumes, ID.unique(), {
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
