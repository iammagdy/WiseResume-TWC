import { memo } from 'react';
import { Sparkles, Wand2, Hash, BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { getScoreColorClass, getScoreLabel } from '@/components/dashboard/ATSScoreBreakdown';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<keyof ResumeHealthScore['categories'], string> = {
  keywordOptimization: 'Keywords',
  contentQuality: 'Work experience',
  sectionStructure: 'Sections',
  parsability: 'ATS parsing',
  contactCompleteness: 'Contact',
  lengthDensity: 'Length',
  templateFriendliness: 'Template',
};

interface DashboardImproveQuickDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeTitle: string;
  healthScore: ResumeHealthScore;
  onReviewKeywords: () => void;
  onViewAtsBreakdown: () => void;
  onTailorToJob: () => void;
}

export const DashboardImproveQuickDialog = memo(function DashboardImproveQuickDialog({
  open,
  onOpenChange,
  resumeTitle,
  healthScore,
  onReviewKeywords,
  onViewAtsBreakdown,
  onTailorToJob,
}: DashboardImproveQuickDialogProps) {
  const gaps = healthScore.keywordGaps ?? [];
  const weakest = (
    Object.entries(healthScore.categories) as [keyof ResumeHealthScore['categories'], number][]
  ).reduce((min, cur) => (cur[1] < min[1] ? cur : min));

  const run = (fn: () => void) => {
    haptics.light();
    onOpenChange(false);
    fn();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" fullScreenOnMobile>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            Quick wins
          </DialogTitle>
          <DialogDescription>
            Focused fixes for <span className="font-medium text-foreground">{resumeTitle}</span> — stay
            on the dashboard until you choose to edit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-muted/25 p-3.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className={cn('text-2xl font-semibold tabular-nums', getScoreColorClass(healthScore.overallScore))}>
                {healthScore.overallScore}%
              </p>
              <span className="text-xs text-muted-foreground">{getScoreLabel(healthScore.overallScore)} ATS</span>
            </div>
            <p className="text-sm text-foreground mt-2 leading-relaxed">{healthScore.topImprovement}</p>
            <p className="text-xs text-muted-foreground mt-1.5">
              Weakest area: {CATEGORY_LABELS[weakest[0]]} ({weakest[1]}%)
            </p>
          </div>

          {gaps.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                Missing keywords
              </p>
              <div className="flex flex-wrap gap-1.5">
                {gaps.slice(0, 8).map((gap) => (
                  <Badge key={gap} variant="secondary" className="text-[10px] font-normal">
                    {gap}
                  </Badge>
                ))}
                {gaps.length > 8 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{gaps.length - 8} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {gaps.length > 0 && (
              <Button className="w-full rounded-xl h-10" onClick={() => run(onReviewKeywords)}>
                <Hash className="w-4 h-4 mr-2" />
                Review keyword gaps
              </Button>
            )}
            <Button variant="outline" className="w-full rounded-xl h-10" onClick={() => run(onViewAtsBreakdown)}>
              <BarChart3 className="w-4 h-4 mr-2" />
              ATS breakdown by resume
            </Button>
            <Button variant="outline" className="w-full rounded-xl h-10" onClick={() => run(onTailorToJob)}>
              <Wand2 className="w-4 h-4 mr-2" />
              Tailor to a job posting
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
