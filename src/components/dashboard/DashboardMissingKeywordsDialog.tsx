import { memo, useMemo } from 'react';
import { FileText, Hash, Pencil } from 'lucide-react';
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
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { haptics } from '@/lib/haptics';

interface DashboardMissingKeywordsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumes: DatabaseResume[];
  healthScores: Record<string, ResumeHealthScore>;
  onEditResume: (resumeId: string) => void;
}

export const DashboardMissingKeywordsDialog = memo(function DashboardMissingKeywordsDialog({
  open,
  onOpenChange,
  resumes,
  healthScores,
  onEditResume,
}: DashboardMissingKeywordsDialogProps) {
  const rows = useMemo(() => {
    return resumes
      .map((resume) => {
        const gaps = healthScores[resume.$id]?.keywordGaps ?? [];
        return { resume, gaps };
      })
      .filter((row) => row.gaps.length > 0)
      .sort((a, b) => b.gaps.length - a.gaps.length);
  }, [resumes, healthScores]);

  const noGaps = rows.length === 0;

  const handleFix = (resumeId: string) => {
    haptics.light();
    onOpenChange(false);
    onEditResume(resumeId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[min(90vh,640px)] flex flex-col p-0 gap-0" fullScreenOnMobile>
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-3 shrink-0 text-left">
          <DialogTitle>Missing keywords by resume</DialogTitle>
          <DialogDescription>
            {noGaps
              ? 'No keyword gaps detected in your latest ATS scans.'
              : `${rows.reduce((n, r) => n + r.gaps.length, 0)} gaps across ${rows.length} resume${rows.length !== 1 ? 's' : ''}`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-4 sm:px-6 pb-5">
          <div className="space-y-3 pr-2">
            {noGaps ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Your resumes are using strong keywords for their target roles. Re-run ATS after tailoring to a new job.
              </p>
            ) : (
              rows.map(({ resume, gaps }) => (
                <article
                  key={resume.$id}
                  className="rounded-xl border border-border/50 bg-card/60 p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <p className="text-sm font-semibold text-foreground truncate">{resume.title}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0 tabular-nums">
                      {gaps.length} gap{gaps.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {gaps.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-[11px] font-medium text-orange-300/95"
                      >
                        <Hash className="w-3 h-3 opacity-70" aria-hidden />
                        {kw}
                      </span>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-9 rounded-lg text-xs w-full sm:w-auto"
                    onClick={() => handleFix(resume.$id)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Add keywords in editor
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
