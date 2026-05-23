import { memo, useMemo } from 'react';
import { FileText, Wand2, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DatabaseResume } from '@/hooks/useResumes';
import { safeFormatDistanceToNow } from '@/lib/dateUtils';
import { haptics } from '@/lib/haptics';

const WEEK_MS = 7 * 86_400_000;

interface DashboardTailoredMetricDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumes: DatabaseResume[];
  tailoredThisWeek: number;
  onEditResume: (resumeId: string) => void;
  onTailorResume: (resumeId: string) => void;
}

export const DashboardTailoredMetricDialog = memo(function DashboardTailoredMetricDialog({
  open,
  onOpenChange,
  resumes,
  tailoredThisWeek,
  onEditResume,
  onTailorResume,
}: DashboardTailoredMetricDialogProps) {
  const tailored = useMemo(() => {
    const weekAgo = Date.now() - WEEK_MS;
    return resumes
      .filter((r) => r.parent_resume_id)
      .map((r) => ({
        resume: r,
        thisWeek:
          new Date(r.$createdAt || r.$updatedAt || 0).getTime() >= weekAgo,
      }))
      .sort(
        (a, b) =>
          new Date(b.resume.$updatedAt || b.resume.$createdAt || 0).getTime() -
          new Date(a.resume.$updatedAt || a.resume.$createdAt || 0).getTime(),
      );
  }, [resumes]);

  const handle = (fn: () => void) => {
    haptics.light();
    onOpenChange(false);
    fn();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[min(90vh,560px)] flex flex-col p-0 gap-0" fullScreenOnMobile>
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-3 shrink-0 text-left">
          <DialogTitle>Tailored resumes</DialogTitle>
          <DialogDescription>
            {tailoredThisWeek} created this week · {tailored.length} total tailored versions
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-4 sm:px-6 pb-5">
          <div className="space-y-2.5 pr-2">
            {tailored.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-muted-foreground">No tailored resumes yet.</p>
                <Button
                  size="sm"
                  className="rounded-lg"
                  onClick={() => {
                    const master = resumes.find((r) => !r.parent_resume_id);
                    if (master) handle(() => onTailorResume(master.$id));
                  }}
                >
                  <Wand2 className="w-4 h-4 mr-1.5" />
                  Tailor a resume
                </Button>
              </div>
            ) : (
              tailored.map(({ resume, thisWeek }) => (
                <article
                  key={resume.$id}
                  className="rounded-xl border border-border/50 bg-card/60 p-3 flex items-center gap-3"
                >
                  <FileText className="w-4 h-4 text-rose-400/80 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{resume.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Updated{' '}
                      {safeFormatDistanceToNow(resume.$updatedAt || resume.$createdAt || Date.now(), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {thisWeek && (
                    <Badge className="text-[10px] bg-rose-500/15 text-rose-300 border-rose-500/25 shrink-0">
                      This week
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2.5 text-xs shrink-0"
                    onClick={() => handle(() => onEditResume(resume.$id))}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </article>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});
