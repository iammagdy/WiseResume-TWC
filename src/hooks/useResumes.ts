import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { apiFetch } from '@/lib/apiFetch';
import { useAuth } from './useAuth';
import { ResumeData, Experience, Education, Certification, ContactInfo, Award, Project, Publication, Volunteering, Language, Hobby, Reference } from '@/types/resume';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import { useResumeStore } from '@/store/resumeStore';
import { useResumeVersionMutations } from '@/hooks/useResumeVersions';
import { readPersistedCache, writePersistedCache } from '@/lib/persistedQueryCache';

export interface DatabaseResume {
  id: string;
  user_id: string;
  title: string;
  contact_info: ContactInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  awards: Award[];
  projects: Project[];
  publications: Publication[];
  volunteering: Volunteering[];
  languages: Language[];
  hobbies: Hobby[];
  references: Reference[];
  template_id: string;
  target_job_title: string | null;
  target_company: string | null;
  job_match_score: number | null;
  is_primary: boolean;
  parent_resume_id: string | null;
  job_url: string | null;
  customization: Record<string, unknown> | null;
  is_trial: boolean;
  trial_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// Type helper to convert database Json types to our types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseDbResume(dbResume: any): DatabaseResume {
  return {
    id: dbResume.id,
    user_id: dbResume.user_id,
    title: dbResume.title,
    contact_info: (dbResume.contact_info as unknown as ContactInfo) || { fullName: '', email: '', phone: '', location: '' },
    summary: dbResume.summary || '',
    experience: (dbResume.experience as unknown as Experience[]) || [],
    education: (dbResume.education as unknown as Education[]) || [],
    skills: (dbResume.skills as unknown as string[]) || [],
    certifications: (dbResume.certifications as unknown as Certification[]) || [],
    awards: (dbResume.awards as unknown as Award[]) || [],
    projects: (dbResume.projects as unknown as Project[]) || [],
    publications: (dbResume.publications as unknown as Publication[]) || [],
    volunteering: (dbResume.volunteering as unknown as Volunteering[]) || [],
    languages: (dbResume.languages as unknown as Language[]) || [],
    hobbies: (dbResume.hobbies as unknown as Hobby[]) || [],
    references: (dbResume.references as unknown as Reference[]) || [],
    template_id: dbResume.template_id || 'modern',
    target_job_title: dbResume.target_job_title,
    target_company: dbResume.target_company,
    job_match_score: dbResume.job_match_score,
    is_primary: dbResume.is_primary || false,
    parent_resume_id: dbResume.parent_resume_id,
    job_url: dbResume.job_url || null,
    customization: (dbResume.customization as unknown as Record<string, unknown>) || null,
    is_trial: dbResume.is_trial || false,
    trial_expires_at: dbResume.trial_expires_at || null,
    created_at: dbResume.created_at,
    updated_at: dbResume.updated_at,
  };
}

// Convert database resume to app ResumeData format
export function dbToResumeData(dbResume: DatabaseResume): ResumeData {
  return {
    id: dbResume.id,
    contactInfo: dbResume.contact_info,
    summary: dbResume.summary,
    experience: dbResume.experience || [],
    education: dbResume.education || [],
    skills: dbResume.skills || [],
    certifications: dbResume.certifications || [],
    awards: dbResume.awards || [],
    projects: dbResume.projects || [],
    publications: dbResume.publications || [],
    volunteering: dbResume.volunteering || [],
    languages: dbResume.languages || [],
    hobbies: dbResume.hobbies || [],
    references: dbResume.references || [],
    templateId: dbResume.template_id,
    createdAt: dbResume.created_at,
    updatedAt: dbResume.updated_at,
  };
}

// Convert app ResumeData to database format
export function resumeDataToDb(resume: ResumeData, userId: string, title?: string) {
  return {
    user_id: userId,
    title: title || resume.contactInfo.fullName || 'Untitled Resume',
    contact_info: resume.contactInfo as unknown as Json,
    summary: resume.summary,
    experience: resume.experience as unknown as Json,
    education: resume.education as unknown as Json,
    skills: resume.skills as unknown as Json,
    certifications: resume.certifications as unknown as Json,
    awards: (resume.awards || []) as unknown as Json,
    projects: (resume.projects || []) as unknown as Json,
    publications: (resume.publications || []) as unknown as Json,
    volunteering: (resume.volunteering || []) as unknown as Json,
    languages: (resume.languages || []) as unknown as Json,
    hobbies: (resume.hobbies || []) as unknown as Json,
    references: (resume.references || []) as unknown as Json,
    template_id: resume.templateId,
  };
}

/**
 * Local-storage persistence key for the resume list. Scoped per-user so
 * a logged-in cache can't leak into another account on the same device.
 */
function resumeListCacheName(userId: string | undefined) {
  return userId ? `resumes:${userId}` : null;
}

export function useResumes<TData = DatabaseResume[]>(options?: { select?: (data: DatabaseResume[]) => TData }) {
  const { user } = useAuth();
  const cacheName = resumeListCacheName(user?.id);

  return useQuery({
    queryKey: ['resumes', user?.id],
    queryFn: async () => {
      const response = await apiFetch<{ resumes: unknown[] }>('/api/data/resumes');
      const gracePeriodCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3-day grace window
      const result = (response.resumes || [])
        .map(parseDbResume)
        // Hide expired trial resumes that are past the 3-day grace window.
        // Trials within the grace window remain visible as read-only so users can upgrade.
        .filter(r => {
          if (!r.is_trial || !r.trial_expires_at) return true;
          return new Date(r.trial_expires_at) > gracePeriodCutoff;
        });
      if (cacheName) writePersistedCache(cacheName, result);
      return result;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    networkMode: 'offlineFirst',
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    // Prime first paint after a hard refresh from the previous session's
    // persisted list. Background revalidation against Supabase still runs
    // and replaces this immediately. Returning a snapshot via
    // `placeholderData` does not flip `isFetching` off, so call sites that
    // care about freshness can still tell.
    placeholderData: cacheName ? () => readPersistedCache<DatabaseResume[]>(cacheName) ?? undefined : undefined,
    select: options?.select,
  });
  // NOTE: Do NOT add a defensive useEffect that writes `query.data` back to
  // the persisted cache from observers. When callers pass a `select`,
  // `query.data` is the *transformed* (often subset/derived) value, and
  // writing that to the shared per-user `resumes:<userId>` cache would
  // corrupt the dashboard's cold-paint snapshot the next time it primed
  // from the cache (e.g. nav components that select a single item would
  // reduce the persisted list to that one item). The queryFn above is the
  // single source of truth for cache writes and always sees the raw
  // `DatabaseResume[]`.
}

export function useResume(resumeId: string | null) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['resume', resumeId],
    queryFn: async () => {
      if (!resumeId) return null;

      try {
        const response = await apiFetch<{ resume: unknown }>(`/api/data/resumes/${resumeId}`);
        return response.resume ? parseDbResume(response.resume) : null;
      } catch (err: unknown) {
        // Preserve the previous .maybeSingle() semantics: 404 = resume not found → null
        if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!user && !!resumeId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPending: query.isPending,
  };
}

export function useResumeMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { saveVersion } = useResumeVersionMutations();

  const createResume = useMutation({
    mutationFn: async ({ resume, title }: { resume: ResumeData; title?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const dbData = resumeDataToDb(resume, user.id, title);
      const result = await apiFetch<{ resume: unknown }>('/api/data/resumes', {
        method: 'POST',
        body: dbData,
      });
      return parseDbResume(result.resume);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      // Set the newly created resume as the active one
      useResumeStore.getState().setCurrentResumeId(data.id);
      toast.success('Resume created');
    },
    onError: (error) => {
      toast.error('Failed to create resume');
      console.error(error);
    },
  });

  const updateResume = useMutation({
    mutationFn: async ({ 
      resumeId, 
      updates, 
      title 
    }: { 
      resumeId: string; 
      updates: Partial<ResumeData>; 
      title?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.contactInfo !== undefined) dbUpdates.contact_info = updates.contactInfo;
      if (updates.summary !== undefined) dbUpdates.summary = updates.summary;
      if (updates.experience !== undefined) dbUpdates.experience = updates.experience;
      if (updates.education !== undefined) dbUpdates.education = updates.education;
      if (updates.skills !== undefined) dbUpdates.skills = updates.skills;
      if (updates.certifications !== undefined) dbUpdates.certifications = updates.certifications;
      if (updates.awards !== undefined) dbUpdates.awards = updates.awards;
      if (updates.projects !== undefined) dbUpdates.projects = updates.projects;
      if (updates.publications !== undefined) dbUpdates.publications = updates.publications;
      if (updates.volunteering !== undefined) dbUpdates.volunteering = updates.volunteering;
      if (updates.languages !== undefined) dbUpdates.languages = updates.languages;
      if (updates.hobbies !== undefined) dbUpdates.hobbies = updates.hobbies;
      if (updates.references !== undefined) dbUpdates.references = updates.references;
      if (updates.templateId !== undefined) dbUpdates.template_id = updates.templateId;
      if (title) dbUpdates.title = title;

      // Authoritative server-side expiry is handled by the DB trigger
      // expire_trial_resume_on_first_edit (migration 20260418000004).
      // The client also expires the trial in the same UPDATE as a belt-and-
      // suspenders measure. We check both the single-resume cache (always
      // populated when the editor is open) and the list cache as fallback.
      const cachedSingle = queryClient.getQueryData<DatabaseResume>(['resume', resumeId]);
      const cachedList = queryClient.getQueryData<DatabaseResume[]>(['resumes', user.id]);
      const existingResume = cachedSingle ?? cachedList?.find(r => r.id === resumeId);

      if (existingResume?.is_trial && existingResume.trial_expires_at) {
        const expiresAt = new Date(existingResume.trial_expires_at);
        const now = new Date();
        if (expiresAt > now) {
          // Active trial: expire it on this first saved edit
          dbUpdates.trial_expires_at = now.toISOString();
        } else {
          // Already expired: block the write and surface a clear message
          throw new Error('Your free trial has ended. Upgrade to Pro to keep editing this resume.');
        }
      }

      const result = await apiFetch<{ resume: unknown }>(`/api/data/resumes/${encodeURIComponent(resumeId)}`, {
        method: 'PATCH',
        body: dbUpdates,
      });
      return parseDbResume(result.resume);
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      queryClient.invalidateQueries({ queryKey: ['resume', data.id] });
      // Auto-save a version snapshot — awaited so fast navigation doesn't cancel it
      const resumeData = dbToResumeData(data);
      try {
        await saveVersion.mutateAsync({
          resumeId: data.id,
          snapshot: resumeData,
          changeSummary: 'Auto-saved',
        });
      } catch {
        // Version save failure is non-critical — silently ignore
      }
    },
    onError: (error: Error & { code?: string; status?: number }) => {
      // Check for PGRST116 error (no rows found - stale resume ID) or server 404
      if (
        error?.message?.includes('PGRST116') ||
        error?.code === 'PGRST116' ||
        error?.message?.includes('Resume not found') ||
        (error as { status?: number })?.status === 404
      ) {
        toast.error('Resume not found. It may have been deleted.');
        // Clear the stale ID to stop the error loop
        useResumeStore.getState().setCurrentResumeId(null);
      } else if (error?.message?.includes('free trial has ended')) {
        // Propagate trial-ended message directly so the user understands why saving is blocked
        toast.error(error.message, { duration: 6000 });
      } else {
        toast.error('Failed to save resume');
      }
      console.error(error);
    },
  });

  const deleteResume = useMutation({
    mutationFn: async (resumeId: string) => {
      await apiFetch(`/api/data/resumes/${encodeURIComponent(resumeId)}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
    onError: (error) => {
      toast.error('Failed to delete resume');
      console.error(error);
    },
  });

  const deleteMultipleResumes = useMutation({
    mutationFn: async (resumeIds: string[]) => {
      await apiFetch('/api/data/resumes', { method: 'DELETE', body: { ids: resumeIds } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Resumes deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete resumes');
      console.error(error);
    },
  });


  const duplicateResume = useMutation({
    mutationFn: async (resumeId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Fetch the original resume
      const { data: original, error: fetchError } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', resumeId)
        .single();

      if (fetchError) throw fetchError;

      // Create a copy with new title
      const { data, error } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          title: `${original.title} (Copy)`,
          contact_info: original.contact_info,
          summary: original.summary,
          experience: original.experience,
          education: original.education,
          skills: original.skills,
          certifications: original.certifications,
          template_id: original.template_id,
          target_job_title: original.target_job_title,
          target_company: original.target_company,
          is_primary: false,
        })
        .select()
        .single();

      if (error) throw error;
      return parseDbResume(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      // Set the newly duplicated resume as the active one
      useResumeStore.getState().setCurrentResumeId(data.id);
      toast.success('Resume duplicated');
    },
    onError: (error) => {
      toast.error('Failed to duplicate resume');
      console.error(error);
    },
  });

  const setJobTarget = useMutation({
    mutationFn: async ({ 
      resumeId, 
      jobTitle, 
      company, 
      matchScore 
    }: { 
      resumeId: string; 
      jobTitle?: string; 
      company?: string; 
      matchScore?: number;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('resumes')
        .update({
          target_job_title: jobTitle,
          target_company: company,
          job_match_score: matchScore,
        })
        .eq('id', resumeId)
        .select()
        .single();

      if (error) throw error;
      return parseDbResume(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      queryClient.invalidateQueries({ queryKey: ['resume', data.id] });
    },
  });

  return {
    createResume,
    updateResume,
    deleteResume,
    deleteMultipleResumes,
    duplicateResume,
    setJobTarget,
  };
}


export function useSetMasterCV() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resumeId: string) => {
      if (!user) throw new Error('Not authenticated');
      // Single transactional RPC: clears every is_primary row for the caller
      // and sets the target row to is_primary=true atomically. Replaces the
      // previous two-call clear-then-set pattern that could leave the user
      // with zero primary rows if the second call failed.
      const { error } = await supabase.rpc('set_master_cv', { p_resume_id: resumeId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Master CV updated');
    },
    onError: () => {
      toast.error('Failed to set Master CV');
    },
  });
}
