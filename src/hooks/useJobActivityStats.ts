import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';

export interface WeeklyTrendPoint {
  week: string;
  label: string;
  count: number;
}

export interface JobActivityStats {
  originals: number;
  tailored: number;
  jobsAnalyzed: number;
  coverLetters: number;
  applicationsSubmitted: number;
  interviewsScheduled: number;
  offersReceived: number;
  screeningCount: number;
  appliedCount: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  weeklyTrend: WeeklyTrendPoint[];
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
        supabase.from('job_applications').select('status, applied_at'),
      ]);

      const resumes = resumesRes.data || [];
      const originals = resumes.filter(r => !r.parent_resume_id).length;
      const tailored = resumes.filter(r => r.parent_resume_id).length;

      const tailorEntries = tailorRes.data || [];
      const uniqueJobs = new Set(
        tailorEntries.map(t => `${t.job_title}||${t.company || ''}`)
      );

      const appsData = appsRes.data || [];

      const appliedCount = appsData.filter(a => a.status === 'applied').length;
      const screeningCount = appsData.filter(a => a.status === 'screening').length;
      const interviewsScheduled = appsData.filter(a => a.status === 'interviewing').length;
      const offersReceived = appsData.filter(a => a.status === 'offer').length;
      const applicationsSubmitted = appliedCount + screeningCount;

      const nonSaved = appsData.filter(a => a.status !== 'saved').length;
      const responseRate = nonSaved > 0
        ? Math.round(((screeningCount + interviewsScheduled + offersReceived) / nonSaved) * 100)
        : 0;
      const interviewRate = nonSaved > 0
        ? Math.round(((interviewsScheduled + offersReceived) / nonSaved) * 100)
        : 0;
      const offerRate = nonSaved > 0
        ? Math.round((offersReceived / nonSaved) * 100)
        : 0;

      const now = new Date();
      const weeklyTrend: WeeklyTrendPoint[] = Array.from({ length: 8 }, (_, i) => {
        const weekStart = startOfWeek(subWeeks(now, 7 - i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, 7 - i), { weekStartsOn: 1 });
        const count = appsData.filter(a => {
          if (!a.applied_at) return false;
          const d = new Date(a.applied_at);
          return d >= weekStart && d <= weekEnd;
        }).length;
        return { week: format(weekStart, 'yyyy-MM-dd'), label: format(weekStart, 'MMM d'), count };
      });

      return {
        originals,
        tailored,
        jobsAnalyzed: uniqueJobs.size,
        coverLetters: (coverRes.data || []).length,
        applicationsSubmitted,
        interviewsScheduled,
        offersReceived,
        screeningCount,
        appliedCount,
        responseRate,
        interviewRate,
        offerRate,
        weeklyTrend,
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
    screeningCount: data?.screeningCount ?? 0,
    appliedCount: data?.appliedCount ?? 0,
    responseRate: data?.responseRate ?? 0,
    interviewRate: data?.interviewRate ?? 0,
    offerRate: data?.offerRate ?? 0,
    weeklyTrend: data?.weeklyTrend ?? [],
    isLoading,
  };
}
