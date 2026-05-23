import { memo, useMemo } from 'react';
import { Clock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeFormatDistanceToNow } from '@/lib/dateUtils';
import { DatabaseResume } from '@/hooks/useResumes';
import { ResumeHealthScore } from '@/hooks/useResumeScore';

interface DashboardRecentActivityProps {
  resumes: DatabaseResume[];
  healthScores?: Record<string, ResumeHealthScore>;
  onOpenResume: (id: string) => void;
  className?: string;
  limit?: number;
}

export const DashboardRecentActivity = memo(function DashboardRecentActivity({
  resumes,
  healthScores = {},
  onOpenResume,
  className,
  limit = 4,
}: DashboardRecentActivityProps) {
  const recent = useMemo(() => {
    return [...resumes]
      .sort((a, b) => {
        const ta = new Date(a.$updatedAt || a.$createdAt || 0).getTime();
        const tb = new Date(b.$updatedAt || b.$createdAt || 0).getTime();
        return tb - ta;
      })
      .slice(0, limit);
  }, [resumes, limit]);

  if (recent.length === 0) return null;

  return (
    <section className={cn('dashboard-utility-section', className)} aria-label="Recent activity">
      <h4 className="dashboard-utility-section__title">Recent activity</h4>
      <ul className="space-y-1.5">
        {recent.map((resume) => {
          const score = healthScores[resume.$id]?.overallScore;
          const when = safeFormatDistanceToNow(
            resume.$updatedAt || resume.$createdAt || Date.now(),
            { addSuffix: true },
          );
          return (
            <li key={resume.$id}>
              <button
                type="button"
                onClick={() => onOpenResume(resume.$id)}
                className="dashboard-activity-row w-full text-left min-h-[44px] touch-manipulation"
              >
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-foreground truncate">{resume.title}</span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                    <Clock className="w-3 h-3 shrink-0" aria-hidden />
                    {when}
                    {score != null && score > 0 && (
                      <span className="tabular-nums">· ATS {score}%</span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
});
