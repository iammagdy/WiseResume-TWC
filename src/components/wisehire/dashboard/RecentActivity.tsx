import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { getUserId } from '@/lib/supabaseBridge';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const STAGE_COLOURS: Record<string, string> = {
  shortlisted: 'text-blue-600 dark:text-blue-400',
  screening: 'text-cyan-600 dark:text-cyan-400',
  interview: 'text-violet-600 dark:text-violet-400',
  offer: 'text-amber-600 dark:text-amber-400',
  hired: 'text-emerald-600 dark:text-emerald-400',
  rejected: 'text-slate-500 dark:text-slate-400',
};

interface ActivityRow {
  id: string;
  to_stage: string;
  moved_at: string;
  candidate: { name: string } | null;
}

function useRecentActivity() {
  const { isAuthenticated, supabaseReady } = useAuth();
  const userId = getUserId();
  return useQuery({
    queryKey: ['pipeline-recent-activity', userId],
    queryFn: async (): Promise<ActivityRow[]> => {
      if (!userId) return [];
      const { data } = await supabase
        .from('wisehire_pipeline_events')
        .select('id, to_stage, moved_at, candidate:wisehire_candidates!candidate_id(name)')
        .eq('owner_id', userId)
        .order('moved_at', { ascending: false })
        .limit(6);
      return (data ?? []) as ActivityRow[];
    },
    enabled: isAuthenticated && supabaseReady && !!userId,
    staleTime: 60_000,
  });
}

export function RecentActivity() {
  const { data, isLoading } = useRecentActivity();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Activity</h2>
        <Link
          to="/wisehire/pipeline"
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Pipeline
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <ul className="space-y-2.5">
        {data.map((ev) => {
          const stageLabel = ev.to_stage
            ? ev.to_stage.charAt(0).toUpperCase() + ev.to_stage.slice(1)
            : 'Unknown';
          const stageColor = STAGE_COLOURS[ev.to_stage] ?? 'text-slate-500';
          const candidateName = ev.candidate?.name ?? 'Unknown candidate';
          return (
            <li key={ev.id} className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Clock className="h-3 w-3 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                  <span className="font-medium">{candidateName}</span>
                  {' → '}
                  <span className={`font-semibold ${stageColor}`}>{stageLabel}</span>
                </p>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">
                {formatDistanceToNow(new Date(ev.moved_at), { addSuffix: true })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
