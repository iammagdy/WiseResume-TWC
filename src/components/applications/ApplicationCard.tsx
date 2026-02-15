import { memo } from 'react';
import { Briefcase, MoreVertical, ExternalLink, Clock, Bell, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobApplication, ApplicationStatus } from '@/hooks/useJobApplications';
import { formatDistanceToNow, differenceInDays, differenceInHours } from 'date-fns';
import { openExternal } from '@/lib/openExternal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { haptics } from '@/lib/haptics';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; dotColor: string; bgColor: string }> = {
  saved: { label: 'Saved', dotColor: 'bg-secondary', bgColor: 'bg-secondary/10' },
  applied: { label: 'Applied', dotColor: 'bg-primary', bgColor: 'bg-primary/10' },
  screening: { label: 'Screening', dotColor: 'bg-accent', bgColor: 'bg-accent/10' },
  interviewing: { label: 'Interviewing', dotColor: 'bg-warning', bgColor: 'bg-warning/10' },
  offer: { label: 'Offer', dotColor: 'bg-success', bgColor: 'bg-success/10' },
  rejected: { label: 'Rejected', dotColor: 'bg-destructive', bgColor: 'bg-destructive/10' },
};

function getDeadlineInfo(deadline: string | null) {
  if (!deadline) return null;
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const daysLeft = differenceInDays(deadlineDate, now);
  const hoursLeft = differenceInHours(deadlineDate, now);

  if (hoursLeft < 0) return { text: 'Expired', color: 'text-muted-foreground' };
  if (daysLeft < 2) return { text: `${hoursLeft}h left`, color: 'text-destructive' };
  if (daysLeft < 7) return { text: `${daysLeft}d left`, color: 'text-warning' };
  return { text: `${daysLeft}d left`, color: 'text-success' };
}

interface ApplicationCardProps {
  application: JobApplication;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
  onTap?: (application: JobApplication) => void;
  resumeName?: string;
}

export const ApplicationCard = memo(function ApplicationCard({
  application,
  onStatusChange,
  onDelete,
  onTap,
  resumeName,
}: ApplicationCardProps) {
  const config = STATUS_CONFIG[application.status as ApplicationStatus] || STATUS_CONFIG.applied;
  const timeAgo = formatDistanceToNow(new Date(application.applied_at), { addSuffix: true });
  const deadlineInfo = getDeadlineInfo(application.deadline);
  const hasReminder = !!application.remind_at;

  return (
    <div
      className="glass-surface rounded-2xl p-4 border border-border/30 space-y-3 active:scale-[0.98] transition-transform touch-manipulation cursor-pointer"
      onClick={() => onTap?.(application)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', config.bgColor)}>
            <Briefcase className="w-5 h-5 text-foreground/70" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{application.job_title}</h3>
            <p className="text-xs text-muted-foreground truncate">{application.company}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2 rounded-lg hover:bg-muted/50 touch-manipulation"
              aria-label="More options"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(['saved', 'applied', 'interviewing', 'offer', 'rejected'] as ApplicationStatus[])
              .filter(s => s !== application.status)
              .map(s => (
                <DropdownMenuItem
                  key={s}
                  onClick={(e) => {
                    e.stopPropagation();
                    haptics.medium();
                    onStatusChange(application.id, s);
                  }}
                >
                  Move to {STATUS_CONFIG[s].label}
                </DropdownMenuItem>
              ))}
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                haptics.medium();
                onDelete(application.id);
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', config.dotColor)} />
            <span className="text-xs font-medium">{config.label}</span>
          </div>
          {hasReminder && (
            <Bell className="w-3 h-3 text-warning animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {deadlineInfo && (
            <span className={cn('text-[11px] font-medium flex items-center gap-1', deadlineInfo.color)}>
              <Calendar className="w-3 h-3" />
              {deadlineInfo.text}
            </span>
          )}
          {application.url && (
            <button
              onClick={(e) => { e.stopPropagation(); openExternal(application.url!); }}
              className="text-xs text-primary flex items-center gap-1 hover:underline touch-manipulation"
            >
              <ExternalLink className="w-3 h-3" />
              Link
            </button>
          )}
          <span className="text-[11px] text-muted-foreground">{timeAgo}</span>
        </div>
      </div>

      {resumeName && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-0.5">
          <Clock className="w-3 h-3" />
          {resumeName}
        </p>
      )}

      {application.notes && (
        <p className="text-xs text-muted-foreground line-clamp-2 pt-1 border-t border-border/20">
          {application.notes}
        </p>
      )}
    </div>
  );
});
