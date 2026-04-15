import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { getUserId } from '@/lib/supabaseBridge';
import { useAuth } from '@/hooks/useAuth';

export interface HRAnalytics {
  totalCandidates: number;
  totalScreened: number;
  avgMatchScore: number | null;
  candidatesByStage: { stage: string; count: number }[];
  candidatesOverTime: { month: string; count: number }[];
  topSkills: { skill: string; count: number }[];
  avgTimeToHire: number | null;
  talentPoolViews: number;
  activeRoles: number;
  briefsGenerated: number;
}

export function useHRAnalytics() {
  const { isAuthenticated, supabaseReady } = useAuth();

  return useQuery({
    queryKey: ['hr-analytics'],
    queryFn: async (): Promise<HRAnalytics> => {
      const userId = await getUserId();
      if (!userId) throw new Error('Not authenticated');

      const [
        candidatesRes,
        bulkJobsRes,
        pipelineEventsRes,
        rolesRes,
        briefsRes,
        talentViewsRes,
      ] = await Promise.all([
        supabase
          .from('wisehire_candidates')
          .select('id, pipeline_stage, resume_text, created_at')
          .eq('owner_id', userId),
        supabase
          .from('wisehire_bulk_screen_jobs')
          .select('results, created_at')
          .eq('owner_id', userId)
          .eq('status', 'completed'),
        supabase
          .from('wisehire_pipeline_events')
          .select('candidate_id, to_stage, created_at')
          .eq('owner_id', userId)
          .eq('to_stage', 'hired'),
        supabase
          .from('wisehire_roles')
          .select('id')
          .eq('owner_id', userId),
        supabase
          .from('wisehire_candidate_briefs')
          .select('id')
          .eq('owner_id', userId),
        supabase
          .from('talent_pool_views')
          .select('id, viewed_at'),
      ]);

      const candidates = candidatesRes.data ?? [];
      const bulkJobs = bulkJobsRes.data ?? [];
      const hireEvents = pipelineEventsRes.data ?? [];
      const roles = rolesRes.data ?? [];
      const briefs = briefsRes.data ?? [];
      const talentViews = talentViewsRes.data ?? [];

      // Candidates by stage
      const stageMap: Record<string, number> = {};
      for (const c of candidates) {
        stageMap[c.pipeline_stage] = (stageMap[c.pipeline_stage] ?? 0) + 1;
      }
      const candidatesByStage = Object.entries(stageMap).map(([stage, count]) => ({ stage, count }));

      // Candidates over time (last 6 months)
      const monthCounts: Record<string, number> = {};
      for (const c of candidates) {
        const d = new Date(c.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthCounts[key] = (monthCounts[key] ?? 0) + 1;
      }
      const now = new Date();
      const candidatesOverTime = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        return { month: label, count: monthCounts[key] ?? 0 };
      });

      // Avg match score from bulk screen results
      const allScores: number[] = [];
      for (const job of bulkJobs) {
        if (Array.isArray(job.results)) {
          for (const r of job.results) {
            if (typeof r.match_score === 'number') allScores.push(r.match_score);
          }
        }
      }
      const avgMatchScore = allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : null;

      // Total screened (bulk jobs × average file count)
      const totalScreened = bulkJobs.reduce((sum, j) => {
        const results = Array.isArray(j.results) ? j.results.length : 0;
        return sum + results;
      }, 0);

      // Top skills from candidate resume_text (simple keyword extraction)
      const commonSkills = ['React', 'TypeScript', 'Python', 'Node.js', 'SQL', 'AWS', 'Docker', 'Java', 'Go', 'Kubernetes', 'GraphQL', 'REST API', 'MongoDB', 'PostgreSQL', 'Machine Learning', 'Product Management', 'Agile', 'Scrum', 'Figma', 'Design'];
      const skillMap: Record<string, number> = {};
      for (const c of candidates) {
        const text = (c.resume_text ?? '').toLowerCase();
        for (const skill of commonSkills) {
          if (text.includes(skill.toLowerCase())) {
            skillMap[skill] = (skillMap[skill] ?? 0) + 1;
          }
        }
      }
      const topSkills = Object.entries(skillMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([skill, count]) => ({ skill, count }));

      // Avg time to hire in days
      let avgTimeToHire: number | null = null;
      if (hireEvents.length > 0) {
        const times: number[] = [];
        for (const evt of hireEvents) {
          const candidate = candidates.find((c) => c.id === evt.candidate_id);
          if (candidate) {
            const created = new Date(candidate.created_at).getTime();
            const hired = new Date(evt.created_at).getTime();
            const days = (hired - created) / (1000 * 60 * 60 * 24);
            if (days > 0) times.push(days);
          }
        }
        if (times.length > 0) {
          avgTimeToHire = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        }
      }

      return {
        totalCandidates: candidates.length,
        totalScreened,
        avgMatchScore,
        candidatesByStage,
        candidatesOverTime,
        topSkills,
        avgTimeToHire,
        talentPoolViews: talentViews.length,
        activeRoles: roles.length,
        briefsGenerated: briefs.length,
      };
    },
    enabled: isAuthenticated && supabaseReady,
    staleTime: 120_000,
  });
}
