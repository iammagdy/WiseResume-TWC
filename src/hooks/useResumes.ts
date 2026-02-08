import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { ResumeData, Experience, Education, Certification, ContactInfo } from '@/types/resume';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

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
  template_id: string;
  target_job_title: string | null;
  target_company: string | null;
  job_match_score: number | null;
  is_primary: boolean;
  parent_resume_id: string | null;
  created_at: string;
  updated_at: string;
}

// Type helper to convert database Json types to our types
function parseDbResume(dbResume: {
  id: string;
  user_id: string;
  title: string;
  contact_info: Json;
  summary: string | null;
  experience: Json;
  education: Json;
  skills: Json;
  certifications: Json;
  template_id: string | null;
  target_job_title: string | null;
  target_company: string | null;
  job_match_score: number | null;
  is_primary: boolean | null;
  parent_resume_id: string | null;
  created_at: string;
  updated_at: string;
}): DatabaseResume {
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
    template_id: dbResume.template_id || 'modern',
    target_job_title: dbResume.target_job_title,
    target_company: dbResume.target_company,
    job_match_score: dbResume.job_match_score,
    is_primary: dbResume.is_primary || false,
    parent_resume_id: dbResume.parent_resume_id,
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
    template_id: resume.templateId,
  };
}

export function useResumes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['resumes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(parseDbResume);
    },
    enabled: !!user,
  });
}

export function useResume(resumeId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['resume', resumeId],
    queryFn: async () => {
      if (!resumeId) return null;

      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', resumeId)
        .single();

      if (error) throw error;
      return parseDbResume(data);
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

      const dbData = resumeDataToDb(resume, user.id, title);
      const { data, error } = await supabase
        .from('resumes')
        .insert(dbData)
        .select()
        .single();

      if (error) throw error;
      return parseDbResume(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
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
      
      if (updates.contactInfo) dbUpdates.contact_info = updates.contactInfo;
      if (updates.summary !== undefined) dbUpdates.summary = updates.summary;
      if (updates.experience) dbUpdates.experience = updates.experience;
      if (updates.education) dbUpdates.education = updates.education;
      if (updates.skills) dbUpdates.skills = updates.skills;
      if (updates.certifications) dbUpdates.certifications = updates.certifications;
      if (updates.templateId) dbUpdates.template_id = updates.templateId;
      if (title) dbUpdates.title = title;

      const { data, error } = await supabase
        .from('resumes')
        .update(dbUpdates)
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
    onError: (error) => {
      toast.error('Failed to save resume');
      console.error(error);
    },
  });

  const deleteResume = useMutation({
    mutationFn: async (resumeId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resumeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Resume deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete resume');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
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
    duplicateResume,
    setJobTarget,
  };
}
