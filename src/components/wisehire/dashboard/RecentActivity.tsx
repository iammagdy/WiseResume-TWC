import { useQuery } from '@tanstack/react-query';
import { databases, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import type { Models } from 'appwrite';

const STAGE_COLOURS: Record<string, string> = {
  shortlisted: 'text-blue-600 dark:text-blue-400',
  contacted: 'text-violet-600 dark:text-violet-400',
  interviewing: 'text-amber-600 dark:text-amber-400',
  offer_sent: 'text-orange-600 dark:text-orange-400',
  hired: 'text-emerald-600 dark:text-emerald-400',
  rejected: 'text-slate-500 dark:text-slate-400',
};

const STAGE_LABELS: Record<string, string> = {
  shortlisted: 'Shortlisted',
  contacted: 'Contacted',
  interviewing: 'Interviewing',
  offer_sent: 'Offer Sent',
  hired: 'Hired',
  rejected: 'Rejected',
};

interface ActivityRow {
  id: string;
  to_stage: string;
  moved_at: string;
  candidate: { name: string } | null;
}

function useRecentActivity() {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['pipeline-recent-activity', userId],
    queryFn: async (): Promise<ActivityRow[]> => {
      if (!userId) return [];
      const eventsRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_pipeline_events, [
        Query.equal('owner_id', userId),
        Query.orderDesc('moved_at'),
        Query.limit(6),
      ]);

      const candidateIds = [...new Set(eventsRes.documents.map((e) => e.candidate_id as string).filter(Boolean))];
      const candidates = await Promise.all(
        candidateIds.map((id) =>
          databases.getDocument(DATABASE_ID, COLLECTIONS.wisehire_candidates, id).catch(() => null),
        ),
      );

      const candidateMap: Record<string, string> = {};
      for (const c of candidates) {
        if (c) candidateMap[c.$id] = c.name as string;
      }

      return eventsRes.documents.map((e) => ({
        id: e.$id,
        to_stage: e.to_stage as string,
        moved_at: e.moved_at as string,
        candidate: e.candidate_id ? { name: candidateMap[e.candidate_id as string] ?? 'Unknown candidate' } : null,
      }));
    },
    enabled: isAuthenticated && !!userId,
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

  if (!data || data.length === 0) {
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
        <div className="flex flex-col items-center py-6 text-center">
          <Clock className="h-6 w-6 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No activity yet — move a candidate through the pipeline to see it here.
          </p>
        </div>
      </div>
    );
  }

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
          const stageLabel = STAGE_LABELS[ev.to_stage] ?? (ev.to_stage
            ? ev.to_stage.charAt(0).toUpperCase() + ev.to_stage.slice(1)
            : 'Unknown');
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
