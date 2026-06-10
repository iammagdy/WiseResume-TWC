import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Briefcase, TrendingUp, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import type { TailorHistory } from '@/types/resume';
import { cn } from '@/lib/utils';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/25' :
    score >= 40 ? 'bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/25' :
    'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20';
  return (
    <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border', color)}>
      <TrendingUp className="w-2.5 h-2.5" aria-hidden />
      {score}%
    </span>
  );
}

interface JobMatchHistoryItemProps {
  entry: TailorHistory;
  onClick: () => void;
}

function JobMatchHistoryItem({ entry, onClick }: JobMatchHistoryItemProps) {
  const afterScore = entry.scoreBeforeAfter?.after ?? 0;

  return (
    <button
      type="button"
      className="jmw-history-item"
      onClick={onClick}
      aria-label={`Open tailoring result for ${entry.jobTitle} at ${entry.company}`}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
        <Briefcase className="w-4 h-4 text-primary" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground leading-snug truncate">
          {entry.jobTitle}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {entry.company}{entry.createdAt ? ` · ${formatDate(entry.createdAt)}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {afterScore > 0 && <ScorePill score={afterScore} />}
        <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden />
      </div>
    </button>
  );
}

interface JobMatchHistoryListProps {
  className?: string;
}

export function JobMatchHistoryList({ className }: JobMatchHistoryListProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const localHistory = useResumeStore((s) => s.tailorHistory) || [];

  // Query Appwrite tailor_history collection
  const { data: dbHistory, isLoading } = useQuery({
    queryKey: ['tailor-history-list-jmw', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const res = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.tailor_history,
          [
            Query.equal('user_id', [user.id]),
            Query.orderDesc('$createdAt'),
            Query.limit(10),
          ]
        );
        return res.documents.map((doc) => {
          let appliedSections: string[] = [];
          try {
            appliedSections = doc.applied_sections ? JSON.parse(doc.applied_sections as string) : [];
          } catch {
            // ignore
          }
          return {
            id: doc.$id,
            jobTitle: doc.job_title as string,
            company: doc.company as string,
            jobDescription: doc.job_description as string || '',
            jobUrl: doc.job_url as string || null,
            tailoredResumeId: doc.tailored_resume_id as string || null,
            scoreBeforeAfter: {
              before: doc.score_before as number || 0,
              after: doc.score_after as number || 0,
            },
            appliedSections,
            createdAt: doc.$createdAt,
          } as TailorHistory;
        });
      } catch (err) {
        console.error('[JobMatchHistoryList] failed to load db history:', err);
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  // Merge histories, deduplicate, and sort chronologically
  const combinedHistory = useMemo(() => {
    const list = [...localHistory];
    if (dbHistory) {
      dbHistory.forEach((dbEntry) => {
        const hasDuplicate = list.some(
          (h) =>
            h.id === dbEntry.id ||
            (h.tailoredResumeId && h.tailoredResumeId === dbEntry.tailoredResumeId)
        );
        if (!hasDuplicate) {
          list.push(dbEntry);
        }
      });
    }
    // Sort by createdAt descending
    return list.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [localHistory, dbHistory]);

  if (isLoading && combinedHistory.length === 0) {
    return null; // hide while initial loading if no local cache
  }

  if (combinedHistory.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2 px-1">
        <History className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Recent tailoring
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        {combinedHistory.slice(0, 5).map((entry: TailorHistory) => (
          <JobMatchHistoryItem
            key={entry.id}
            entry={entry}
            onClick={() =>
              entry.tailoredResumeId
                ? navigate(`/tailoring-hub/result/${entry.tailoredResumeId}`)
                : navigate('/tailoring-hub')
            }
          />
        ))}
      </div>
    </div>
  );
}
