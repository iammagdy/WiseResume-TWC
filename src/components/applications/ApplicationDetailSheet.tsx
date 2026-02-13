import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { JobApplication, ApplicationStatus, useJobApplicationMutations } from '@/hooks/useJobApplications';
import { Briefcase, ExternalLink, Calendar, FileText, Clock, Bell } from 'lucide-react';
import { formatDistanceToNow, differenceInDays, differenceInHours, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { haptics } from '@/lib/haptics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
  saved: { label: 'Saved', color: 'bg-secondary/15 text-secondary-foreground' },
  applied: { label: 'Applied', color: 'bg-primary/15 text-primary' },
  screening: { label: 'Screening', color: 'bg-accent/15 text-accent-foreground' },
  interviewing: { label: 'Interviewing', color: 'bg-warning/15 text-warning' },
  offer: { label: 'Offer', color: 'bg-success/15 text-success' },
  rejected: { label: 'Rejected', color: 'bg-destructive/15 text-destructive' },
};

interface ApplicationDetailSheetProps {
  application: JobApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplicationDetailSheet({ application, open, onOpenChange }: ApplicationDetailSheetProps) {
  const navigate = useNavigate();
  const { updateApplication } = useJobApplicationMutations();

  const { data: linkedResume } = useQuery({
    queryKey: ['resume-name', application?.resume_id],
    queryFn: async () => {
      if (!application?.resume_id) return null;
      const { data } = await supabase
        .from('resumes')
        .select('id, title')
        .eq('id', application.resume_id)
        .maybeSingle();
      return data;
    },
    enabled: !!application?.resume_id,
  });

  if (!application) return null;

  const config = STATUS_CONFIG[application.status as ApplicationStatus] || STATUS_CONFIG.applied;
  const timeAgo = formatDistanceToNow(new Date(application.applied_at), { addSuffix: true });

  const deadlineInfo = application.deadline ? (() => {
    const d = new Date(application.deadline);
    const now = new Date();
    const daysLeft = differenceInDays(d, now);
    const hoursLeft = differenceInHours(d, now);
    if (hoursLeft < 0) return { text: 'Expired', color: 'text-muted-foreground' };
    if (daysLeft < 2) return { text: `${hoursLeft} hours left`, color: 'text-destructive' };
    if (daysLeft < 7) return { text: `${daysLeft} days left`, color: 'text-warning' };
    return { text: `${daysLeft} days left`, color: 'text-success' };
  })() : null;

  const handleStatusChange = (status: ApplicationStatus) => {
    haptics.medium();
    updateApplication.mutate({ id: application.id, status });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85dvh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            {application.job_title}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4">
          {/* Company & Status */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{application.company}</p>
            <Badge variant="secondary" className={cn('text-xs', config.color)}>
              {config.label}
            </Badge>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>Applied {timeAgo}</span>
            </div>

            {application.deadline && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>Deadline: {format(new Date(application.deadline), 'MMM d, yyyy')}</span>
                {deadlineInfo && (
                  <span className={cn('text-xs font-medium', deadlineInfo.color)}>
                    ({deadlineInfo.text})
                  </span>
                )}
              </div>
            )}

            {application.remind_at && (
              <div className="flex items-center gap-2 text-sm text-warning">
                <Bell className="w-4 h-4 shrink-0" />
                <span>Reminder set</span>
              </div>
            )}

            {application.url && (
              <a
                href={application.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4 shrink-0" />
                View Job Posting
              </a>
            )}

            {linkedResume && (
              <button
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/editor?id=${linkedResume.id}`);
                }}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <FileText className="w-4 h-4 shrink-0" />
                {linkedResume.title}
              </button>
            )}
          </div>

          {/* Notes */}
          {application.notes && (
            <div className="space-y-1 pt-2 border-t border-border/20">
              <p className="text-xs font-medium text-muted-foreground">Notes</p>
              <p className="text-sm">{application.notes}</p>
            </div>
          )}
        </div>

        {/* Status change buttons */}
        <div className="shrink-0 pt-2 pb-safe space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Change Status</p>
          <div className="flex flex-wrap gap-2">
            {(['saved', 'applied', 'interviewing', 'offer', 'rejected'] as ApplicationStatus[])
              .filter(s => s !== application.status)
              .map(s => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange(s)}
                  className="text-xs"
                >
                  {STATUS_CONFIG[s].label}
                </Button>
              ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
