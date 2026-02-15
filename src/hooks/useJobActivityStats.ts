import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';

export interface JobActivityStats {
  originals: number;
  tailored: number;
  jobsAnalyzed: number;
  coverLetters: number;
  applicationsSubmitted: number;
  interviewsScheduled: number;
  offersReceived: number;
  isLoading: boolean;
}

export function useJobActivityStats(): JobActivityStats {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['job-activity-stats', user?.id],
    queryFn: async () => {
      const [resumesRes, tailorRes, coverRes, appsRes] = await Promise.all([
        supabase.from('resumes').select('parent_resume_id'),
        supabase.from('tailor_history').select('job_title, company'),
        supabase.from('cover_letters').select('id'),
        supabase.from('job_applications').select('status'),
      ]);

      const resumes = resumesRes.data || [];
      const originals = resumes.filter(r => !r.parent_resume_id).length;
      const tailored = resumes.filter(r => r.parent_resume_id).length;

      const tailorEntries = tailorRes.data || [];
      const uniqueJobs = new Set(
        tailorEntries.map(t => `${t.job_title}||${t.company || ''}`)
      );

      const apps = appsRes.data || [];
      const applicationsSubmitted = apps.filter(a => a.status === 'applied' || a.status === 'screening').length;
      const interviewsScheduled = apps.filter(a => a.status === 'interviewing').length;
      const offersReceived = apps.filter(a => a.status === 'offer').length;

      return {
        originals,
        tailored,
        jobsAnalyzed: uniqueJobs.size,
        coverLetters: (coverRes.data || []).length,
        applicationsSubmitted,
        interviewsScheduled,
        offersReceived,
      };
    },
    enabled: !!user,
  });

  return {
    originals: data?.originals ?? 0,
    tailored: data?.tailored ?? 0,
    jobsAnalyzed: data?.jobsAnalyzed ?? 0,
    coverLetters: data?.coverLetters ?? 0,
    applicationsSubmitted: data?.applicationsSubmitted ?? 0,
    interviewsScheduled: data?.interviewsScheduled ?? 0,
    offersReceived: data?.offersReceived ?? 0,
    isLoading,
  };
}
