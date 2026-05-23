import { memo, useMemo, useState } from 'react';
import { FileText, Target, Wand2 } from 'lucide-react';
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
import { SetTargetJobSheet } from '@/components/dashboard/SetTargetJobSheet';
import { getScoreColorClass } from '@/components/dashboard/ATSScoreBreakdown';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface DashboardApplicationMatchesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumes: DatabaseResume[];
  onTailorResume: (resumeId: string) => void;
}

export const DashboardApplicationMatchesDialog = memo(function DashboardApplicationMatchesDialog({
  open,
  onOpenChange,
  resumes,
  onTailorResume,
}: DashboardApplicationMatchesDialogProps) {
  const [targetJobResume, setTargetJobResume] = useState<DatabaseResume | null>(null);

  const rows = useMemo(() => {
    return [...resumes]
      .map((resume) => ({
        resume,
        match: typeof resume.job_match_score === 'number' ? resume.job_match_score : null,
      }))
      .sort((a, b) => {
        if (a.match == null && b.match == null) return 0;
        if (a.match == null) return 1;
        if (b.match == null) return -1;
        return b.match - a.match;
      });
  }, [resumes]);

  const strongCount = rows.filter((r) => r.match != null && r.match >= 70).length;

  const handleTailor = (resumeId: string) => {
    haptics.light();
    onOpenChange(false);
    onTailorResume(resumeId);
  };

  const handleSetJob = (resume: DatabaseResume) => {
    haptics.light();
    setTargetJobResume(resume);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[min(90vh,640px)] flex flex-col p-0 gap-0" fullScreenOnMobile>
          <DialogHeader className="px-4 sm:px-6 pt-5 pb-3 shrink-0 text-left">
            <DialogTitle>Application match scores</DialogTitle>
            <DialogDescription>
              {strongCount > 0
                ? `${strongCount} strong match${strongCount !== 1 ? 'es' : ''} (≥ 70%) · scores from target job on each CV`
                : 'Set a target job on a resume to calculate match scores.'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 px-4 sm:px-6 pb-5">
            <div className="space-y-2.5 pr-2">
              {rows.map(({ resume, match }) => (
                <article
                  key={resume.$id}
                  className="rounded-xl border border-border/50 bg-card/60 p-3.5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <p className="text-sm font-semibold text-foreground truncate">{resume.title}</p>
                    </div>
                    {match != null ? (
                      <span
                        className={cn(
                          'text-sm font-bold tabular-nums shrink-0',
                          getScoreColorClass(match),
                        )}
                      >
                        {match}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground shrink-0">No job set</span>
                    )}
                  </div>

                  {match != null && match >= 70 && (
                    <Badge className="text-[10px] bg-violet-500/15 text-violet-300 border-violet-500/25 w-fit">
                      Strong match
                    </Badge>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={match == null ? 'default' : 'outline'}
                      className="h-9 rounded-lg text-xs"
                      onClick={() => handleSetJob(resume)}
                    >
                      <Target className="w-3.5 h-3.5 mr-1.5" />
                      {match == null ? 'Set target job' : 'Update target job'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-lg text-xs"
                      onClick={() => handleTailor(resume.$id)}
                    >
                      <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                      Tailor to job
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {targetJobResume && (
        <SetTargetJobSheet
          open={!!targetJobResume}
          onOpenChange={(next) => {
            if (!next) setTargetJobResume(null);
          }}
          resume={targetJobResume}
        />
      )}
    </>
  );
});
