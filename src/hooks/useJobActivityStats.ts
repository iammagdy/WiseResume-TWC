import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';

export interface JobActivityStats {
  originals: number;
  tailored: number;
  jobsAnalyzed: number;
  coverLetters: number;
  isLoading: boolean;
}

export function useJobActivityStats(): JobActivityStats {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['job-activity-stats', user?.id],
    queryFn: async () => {
      const [resumesRes, tailorRes, coverRes] = await Promise.all([
        supabase.from('resumes').select('parent_resume_id'),
        supabase.from('tailor_history').select('job_title, company'),
        supabase.from('cover_letters').select('id'),
      ]);

      const resumes = resumesRes.data || [];
      const originals = resumes.filter(r => !r.parent_resume_id).length;
      const tailored = resumes.filter(r => r.parent_resume_id).length;

      // Unique jobs analyzed
      const tailorEntries = tailorRes.data || [];
      const uniqueJobs = new Set(
        tailorEntries.map(t => `${t.job_title}||${t.company || ''}`)
      );

      return {
        originals,
        tailored,
        jobsAnalyzed: uniqueJobs.size,
        coverLetters: (coverRes.data || []).length,
      };
    },
    enabled: !!user,
  });

  return {
    originals: data?.originals ?? 0,
    tailored: data?.tailored ?? 0,
    jobsAnalyzed: data?.jobsAnalyzed ?? 0,
    coverLetters: data?.coverLetters ?? 0,
    isLoading,
  };
}
