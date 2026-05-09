import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { databases, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, ChevronRight, ArrowRight } from 'lucide-react';
import { safeFormatDistanceToNow } from '@/lib/dateUtils';

interface BriefRow {
  id: string;
  match_score: number | null;
  created_at: string;
  candidate: { name: string } | null;
  role: { title: string } | null;
}

function useRecentBriefs() {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['wisehire-recent-briefs', userId],
    queryFn: async (): Promise<BriefRow[]> => {
      if (!userId) return [];
      const briefsRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_candidate_briefs, [
        Query.equal('owner_id', userId),
        Query.orderDesc('created_at'),
        Query.limit(3),
        Query.select(['match_score', 'created_at', 'candidate_id', 'role_id']),
      ]);

      if (briefsRes.total === 0) return [];

      const candidateIds = [...new Set(briefsRes.documents.map((b) => b.candidate_id as string).filter(Boolean))];
      const roleIds = [...new Set(briefsRes.documents.map((b) => b.role_id as string).filter(Boolean))];

      const [candidates, roles] = await Promise.all([
        Promise.all(candidateIds.map((id) =>
          databases.getDocument(DATABASE_ID, COLLECTIONS.wisehire_candidates, id).catch(() => null),
        )),
        Promise.all(roleIds.map((id) =>
          databases.getDocument(DATABASE_ID, COLLECTIONS.wisehire_roles, id).catch(() => null),
        )),
      ]);

      const candidateMap: Record<string, string> = {};
      for (const c of candidates) {
        if (c) candidateMap[c.$id] = c.name as string;
      }
      const roleMap: Record<string, string> = {};
      for (const r of roles) {
        if (r) roleMap[r.$id] = r.title as string;
      }

      return briefsRes.documents.map((b) => ({
        id: b.$id,
        match_score: b.match_score as number | null,
        created_at: b.created_at as string,
        candidate: b.candidate_id ? { name: candidateMap[b.candidate_id as string] ?? 'Unknown candidate' } : null,
        role: b.role_id ? { title: roleMap[b.role_id as string] ?? 'Unknown role' } : null,
      }));
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

function ScoreChip({ score }: { score: number | null }) {
  if (score === null) return null;
  const color =
    score >= 80
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      : score >= 60
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {score}%
    </span>
  );
}

export function RecentBriefs() {
  const { data: briefs, isLoading } = useRecentBriefs();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Recent briefs
        </h2>
        {(briefs?.length ?? 0) > 0 && (
          <Link
            to="/wisehire/brief"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            See all
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-2 w-20 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="h-5 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        ) : !briefs || briefs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 mb-3">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              No briefs yet
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Generate your first AI candidate brief to see it here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {briefs.map((brief) => (
              <Link
                key={brief.id}
                to={`/wisehire/brief/${brief.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {brief.candidate?.name ?? 'Unknown candidate'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                    {brief.role?.title ?? 'Unknown role'} ·{' '}
                    {safeFormatDistanceToNow(brief.created_at, { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ScoreChip score={brief.match_score} />
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
