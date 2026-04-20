import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { useAuth } from '@/hooks/useAuth';

export type AnalyticsDateRange = 'week' | 'month' | 'quarter' | 'all';

export interface StageFunnelEntry {
  stage: string;
  label: string;
  count: number;
  pct: number;
}

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
  stageFunnel: StageFunnelEntry[];
  sourceBreakdown: { source: string; count: number }[];
  avgDaysPerStage: { stage: string; label: string; avgDays: number }[];
}

const FUNNEL_STAGES: { id: string; label: string }[] = [
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'interviewing', label: 'Interviewing' },
  { id: 'offer_sent', label: 'Offer Sent' },
  { id: 'hired', label: 'Hired' },
];

interface ServerCandidate {
  id: string;
  pipeline_stage: string;
  resume_text: string | null;
  created_at: string;
  source?: string | null;
}
interface ServerEvent {
  candidate_id: string;
  from_stage: string | null;
  to_stage: string | null;
  created_at: string;
}
interface ServerAnalyticsResponse {
  candidates: ServerCandidate[];
  pipelineEvents: ServerEvent[];
  companyId: string | null;
  bulkJobs: { results?: Array<{ match_score?: number }> }[];
  briefs: { id: string }[];
  roles: { id: string }[];
  talentViews: { id: string }[];
}

export function useHRAnalytics(dateRange: AnalyticsDateRange = 'all') {
  const { isAuthenticated, supabaseReady, user } = useAuth();

  return useQuery({
    queryKey: ['hr-analytics', user?.id, dateRange],
    queryFn: async (): Promise<HRAnalytics> => {
      const data = await apiFetch<ServerAnalyticsResponse>('/api/data/hr-analytics', {
        query: { range: dateRange },
      });

      const candidates = data.candidates ?? [];
      const allEvents = data.pipelineEvents ?? [];
      const bulkJobs = data.bulkJobs ?? [];
      const roles = data.roles ?? [];
      const briefs = data.briefs ?? [];
      const talentViews = data.talentViews ?? [];
      const hireEvents = allEvents.filter(e => e.to_stage === 'hired');

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

      const totalScreened = bulkJobs.reduce((sum, j) => {
        const results = Array.isArray(j.results) ? j.results.length : 0;
        return sum + results;
      }, 0);

      // Top skills from candidate resume_text
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

      // Stage conversion funnel
      const reachedStage: Record<string, Set<string>> = {};
      for (const s of FUNNEL_STAGES) reachedStage[s.id] = new Set();

      for (const c of candidates) {
        const idx = FUNNEL_STAGES.findIndex((s) => s.id === c.pipeline_stage);
        if (idx >= 0) {
          for (let i = 0; i <= idx; i++) reachedStage[FUNNEL_STAGES[i].id].add(c.id);
        }
      }
      for (const evt of allEvents) {
        const idx = FUNNEL_STAGES.findIndex((s) => s.id === evt.to_stage);
        if (idx >= 0) {
          for (let i = 0; i <= idx; i++) reachedStage[FUNNEL_STAGES[i].id].add(evt.candidate_id);
        }
      }

      const topCount = Math.max(reachedStage['shortlisted'].size, 1);
      const stageFunnel: StageFunnelEntry[] = FUNNEL_STAGES.map((s) => ({
        stage: s.id,
        label: s.label,
        count: reachedStage[s.id].size,
        pct: Math.round((reachedStage[s.id].size / topCount) * 100),
      }));

      // Source breakdown
      const srcMap: Record<string, number> = {};
      for (const c of candidates) {
        const src = c.source ?? 'manual';
        const label = src === 'talent_pool' ? 'Talent Pool' : src === 'manual' ? 'Manual' : src === 'bulk_screen' ? 'Bulk Screen' : src;
        srcMap[label] = (srcMap[label] ?? 0) + 1;
      }
      const sourceBreakdown = Object.entries(srcMap)
        .sort(([, a], [, b]) => b - a)
        .map(([source, count]) => ({ source, count }));

      // Avg days per stage
      const candidateEventMap: Record<string, ServerEvent[]> = {};
      for (const evt of allEvents) {
        if (!candidateEventMap[evt.candidate_id]) candidateEventMap[evt.candidate_id] = [];
        candidateEventMap[evt.candidate_id].push(evt);
      }

      const stageTimings: Record<string, number[]> = {};
      for (const evts of Object.values(candidateEventMap)) {
        for (let i = 0; i < evts.length; i++) {
          const fromStage = evts[i].from_stage;
          if (!fromStage) continue;
          const enteredAt = i === 0
            ? new Date(evts[i].created_at).getTime()
            : new Date(evts[i - 1].created_at).getTime();
          const leftAt = new Date(evts[i].created_at).getTime();
          const days = (leftAt - enteredAt) / (1000 * 60 * 60 * 24);
          if (days > 0) {
            if (!stageTimings[fromStage]) stageTimings[fromStage] = [];
            stageTimings[fromStage].push(days);
          }
        }
      }

      const STAGE_LABELS: Record<string, string> = {
        shortlisted: 'Shortlisted', contacted: 'Contacted', interviewing: 'Interviewing',
        offer_sent: 'Offer Sent', hired: 'Hired', rejected: 'Rejected',
      };
      const stageOrder = ['shortlisted', 'contacted', 'interviewing', 'offer_sent', 'hired', 'rejected'];
      const avgDaysPerStage = Object.entries(stageTimings)
        .filter(([, times]) => times.length > 0)
        .map(([stage, times]) => {
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          return {
            stage,
            label: STAGE_LABELS[stage] ?? stage,
            avgDays: Number.isFinite(avg) ? Math.round(avg) : 0,
          };
        })
        .filter((entry) => entry.avgDays > 0)
        .sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage));

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
        stageFunnel,
        sourceBreakdown,
        avgDaysPerStage,
      };
    },
    enabled: isAuthenticated && supabaseReady,
    staleTime: 120_000,
  });
}
