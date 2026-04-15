import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { getUserId } from '@/lib/supabaseBridge';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const STAGES = [
  { id: 'shortlisted', label: 'Shortlisted', color: 'bg-blue-500' },
  { id: 'screening', label: 'Screening', color: 'bg-cyan-500' },
  { id: 'interview', label: 'Interview', color: 'bg-violet-500' },
  { id: 'offer', label: 'Offer', color: 'bg-amber-500' },
  { id: 'hired', label: 'Hired', color: 'bg-emerald-500' },
  { id: 'rejected', label: 'Rejected', color: 'bg-slate-400' },
];

interface StageCounts {
  [stage: string]: number;
}

function usePipelineBreakdown() {
  const { isAuthenticated, supabaseReady } = useAuth();
  const userId = getUserId();
  return useQuery({
    queryKey: ['pipeline-breakdown', userId],
    queryFn: async (): Promise<{ counts: StageCounts; addedThisWeek: number }> => {
      if (!userId) return { counts: {}, addedThisWeek: 0 };

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data } = await supabase
        .from('wisehire_candidates')
        .select('pipeline_stage, created_at')
        .eq('owner_id', userId)
        .eq('is_deleted', false);

      const counts: StageCounts = {};
      let addedThisWeek = 0;
      for (const c of data ?? []) {
        const s = c.pipeline_stage ?? 'shortlisted';
        counts[s] = (counts[s] ?? 0) + 1;
        if (c.created_at >= weekAgo) addedThisWeek++;
      }
      return { counts, addedThisWeek };
    },
    enabled: isAuthenticated && supabaseReady && !!userId,
    staleTime: 60_000,
  });
}

export function PipelineBreakdown() {
  const { data, isLoading } = usePipelineBreakdown();

  const counts = data?.counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const addedThisWeek = data?.addedThisWeek ?? 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pipeline Breakdown</h2>
          {!isLoading && addedThisWeek > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              +{addedThisWeek} added this week
            </p>
          )}
        </div>
        <Link
          to="/wisehire/pipeline"
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          View pipeline
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {STAGES.slice(0, 4).map((s) => (
            <div key={s.id} className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : total === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">
          No candidates in the pipeline yet.
        </p>
      ) : (
        <div className="space-y-3">
          {STAGES.map(({ id, label, color }) => {
            const count = counts[id] ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            if (count === 0) return null;
            return (
              <div key={id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {count}
                    <span className="text-slate-400 font-normal ml-1">({pct}%)</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
