import { memo, useMemo } from 'react';
import { FileText, Pencil, Sparkles, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { HeroAtsScoreRing } from '@/components/dashboard/HeroAtsScoreRing';
import { getScoreColorClass, getScoreLabel } from '@/components/dashboard/ATSScoreBreakdown';
import { DatabaseResume } from '@/hooks/useResumes';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<string, string> = {
  keywordOptimization: 'Keywords',
  contentQuality: 'Content',
  sectionStructure: 'Structure',
  parsability: 'Parsability',
  contactCompleteness: 'Contact',
  lengthDensity: 'Length',
  templateFriendliness: 'Template',
};

function weakestCategory(categories: ResumeHealthScore['categories']) {
  const entry = Object.entries(categories).reduce((min, cur) =>
    cur[1] < min[1] ? cur : min,
  );
  return { key: entry[0], score: entry[1], label: CATEGORY_LABELS[entry[0]] ?? entry[0] };
}

interface DashboardAtsPortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumes: DatabaseResume[];
  healthScores: Record<string, ResumeHealthScore>;
  atsAverage: number | null;
  scoringId?: string | null;
  onEditResume: (resumeId: string) => void;
  onTailorResume: (resumeId: string) => void;
}

export const DashboardAtsPortfolioDialog = memo(function DashboardAtsPortfolioDialog({
  open,
  onOpenChange,
  resumes,
  healthScores,
  atsAverage,
  scoringId,
  onEditResume,
  onTailorResume,
}: DashboardAtsPortfolioDialogProps) {
  const { scored, unscored } = useMemo(() => {
    const scoredList: { resume: DatabaseResume; health: ResumeHealthScore }[] = [];
    const unscoredList: DatabaseResume[] = [];

    for (const resume of resumes) {
      const health = healthScores[resume.$id];
      const score = health?.overallScore ?? 0;
      if (score > 0) scoredList.push({ resume, health });
      else unscoredList.push(resume);
    }

    scoredList.sort((a, b) => a.health.overallScore - b.health.overallScore);
    return { scored: scoredList, unscored: unscoredList };
  }, [resumes, healthScores]);

  const handleAction = (fn: () => void) => {
    haptics.light();
    onOpenChange(false);
    fn();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[min(90vh,640px)] flex flex-col p-0 gap-0" fullScreenOnMobile>
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-3 shrink-0 text-left">
          <DialogTitle>ATS scores across your resumes</DialogTitle>
          <DialogDescription>
            {atsAverage != null
              ? `Portfolio average ${atsAverage}% · ${scored.length} scored`
              : 'Open a resume in the editor to run your first ATS check.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-4 sm:px-6 pb-5">
          <div className="space-y-3 pr-2">
            {scored.map(({ resume, health }) => {
              const weak = weakestCategory(health.categories);
              const isScoring = scoringId === resume.$id;

              return (
                <article
                  key={resume.$id}
                  className="rounded-xl border border-border/50 bg-card/60 p-3.5 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <HeroAtsScoreRing
                      score={health.overallScore}
                      size={56}
                      isLoading={isScoring}
                      className="mx-0"
                    />
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <p className="text-sm font-semibold text-foreground truncate">{resume.title}</p>
                      </div>
                      <p className={cn('text-xs font-medium mt-1', getScoreColorClass(health.overallScore))}>
                        {getScoreLabel(health.overallScore)}
                        {!isScoring && (
                          <span className="text-muted-foreground font-normal"> · {health.overallScore}%</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                        {health.topImprovement}
                      </p>
                      {weak.score < 75 && (
                        <p className="text-[11px] text-primary/90 mt-1">
                          Weakest area: {weak.label} ({weak.score}%)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-9 rounded-lg text-xs"
                      onClick={() => handleAction(() => onEditResume(resume.$id))}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Improve in editor
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-lg text-xs"
                      onClick={() => handleAction(() => onTailorResume(resume.$id))}
                    >
                      <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                      Tailor to job
                    </Button>
                  </div>
                </article>
              );
            })}

            {scored.length === 0 && unscored.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No resumes yet.</p>
            )}

            {unscored.map((resume) => (
              <article
                key={resume.$id}
                className="rounded-xl border border-dashed border-border/50 bg-muted/15 p-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{resume.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {scoringId === resume.$id ? (
                      <span className="inline-flex items-center gap-1.5">
                        <MiniSpinner size={12} /> Scoring…
                      </span>
                    ) : (
                      'Not scored yet — open in editor to analyze'
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-lg text-xs shrink-0"
                  onClick={() => handleAction(() => onEditResume(resume.$id))}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Run ATS
                </Button>
              </article>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});
