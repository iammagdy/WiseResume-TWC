import { memo } from 'react';
import { Briefcase, MoreVertical, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobApplication, ApplicationStatus } from '@/hooks/useJobApplications';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { haptics } from '@/lib/haptics';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; dotColor: string; bgColor: string }> = {
  applied: { label: 'Applied', dotColor: 'bg-primary', bgColor: 'bg-primary/10' },
  interviewing: { label: 'Interviewing', dotColor: 'bg-warning', bgColor: 'bg-warning/10' },
  offer: { label: 'Offer', dotColor: 'bg-success', bgColor: 'bg-success/10' },
  rejected: { label: 'Rejected', dotColor: 'bg-destructive', bgColor: 'bg-destructive/10' },
};

interface ApplicationCardProps {
  application: JobApplication;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
}

export const ApplicationCard = memo(function ApplicationCard({
  application,
  onStatusChange,
  onDelete,
}: ApplicationCardProps) {
  const config = STATUS_CONFIG[application.status as ApplicationStatus] || STATUS_CONFIG.applied;
  const timeAgo = formatDistanceToNow(new Date(application.applied_at), { addSuffix: true });

  return (
    <div className="glass-surface rounded-2xl p-4 border border-border/30 space-y-3">
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
            <button className="p-2 rounded-lg hover:bg-muted/50 touch-manipulation" aria-label="More options">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(['applied', 'interviewing', 'offer', 'rejected'] as ApplicationStatus[])
              .filter(s => s !== application.status)
              .map(s => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => {
                    haptics.medium();
                    onStatusChange(application.id, s);
                  }}
                >
                  Move to {STATUS_CONFIG[s].label}
                </DropdownMenuItem>
              ))}
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
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
        <div className="flex items-center gap-1.5">
          <span className={cn('w-2 h-2 rounded-full', config.dotColor)} />
          <span className="text-xs font-medium">{config.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {application.url && (
            <a
              href={application.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Link
            </a>
          )}
          <span className="text-[11px] text-muted-foreground">{timeAgo}</span>
        </div>
      </div>

      {application.notes && (
        <p className="text-xs text-muted-foreground line-clamp-2 pt-1 border-t border-border/20">
          {application.notes}
        </p>
      )}
    </div>
  );
});
