import { useState, memo } from 'react';
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Needs Work';
}

export function getScoreColorClass(score: number): string {
  if (score >= 90) return 'text-success';
  if (score >= 70) return 'text-warning';
  if (score >= 50) return 'text-orange-500';
  return 'text-destructive';
}

function getScoreBarBg(score: number): string {
  if (score >= 90) return 'bg-success';
  if (score >= 70) return 'bg-warning';
  if (score >= 50) return 'bg-orange-500';
  return 'bg-destructive';
}

function StatusIcon({ score }: { score: number }) {
  if (score >= 90) return <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />;
  if (score >= 50) return <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />;
  return <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />;
}

const CATEGORY_LABELS: Record<string, string> = {
  keywordOptimization: 'Keywords',
  contentQuality: 'Content Quality',
  sectionStructure: 'Structure',
  parsability: 'Parsability',
  contactCompleteness: 'Contact Info',
  lengthDensity: 'Length & Density',
};

const CATEGORY_HINTS: Record<string, (score: number) => string> = {
  keywordOptimization: (s) => s < 70 ? 'Add industry keywords & tools' : '',
  contentQuality: (s) => s < 70 ? 'Use action verbs & metrics' : '',
  sectionStructure: (s) => s < 70 ? 'Add missing sections' : '',
  parsability: (s) => s < 70 ? 'Use consistent date formats' : '',
  contactCompleteness: (s) => s < 70 ? 'Add email, phone & LinkedIn' : '',
  lengthDensity: (s) => s < 70 ? 'Add more detail to bullets' : '',
};

interface ATSScoreBreakdownProps {
  healthScore: ResumeHealthScore;
  isScoring?: boolean;
  onImprove?: () => void;
  compact?: boolean;
  defaultOpen?: boolean;
}

export const ATSScoreBreakdown = memo(function ATSScoreBreakdown({
  healthScore,
  isScoring = false,
  onImprove,
  compact = false,
  defaultOpen = false,
}: ATSScoreBreakdownProps) {
  const [open, setOpen] = useState(defaultOpen);
  const overall = healthScore.overallScore;
  const label = getScoreLabel(overall);
  const colorClass = getScoreColorClass(overall);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          onClick={() => haptics.light()}
          className="w-full flex items-center justify-between gap-2 py-2 touch-manipulation active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">ATS Score:</span>
            <span className={cn('text-lg font-bold', colorClass)}>
              {isScoring ? <Loader2 className="w-4 h-4 animate-spin inline" /> : `${overall}/100`}
            </span>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', 
              overall >= 90 ? 'bg-success/10 text-success' :
              overall >= 70 ? 'bg-warning/10 text-warning' :
              overall >= 50 ? 'bg-orange-500/10 text-orange-500' :
              'bg-destructive/10 text-destructive'
            )}>
              {label}
            </span>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        {/* Score bar - only visible when expanded */}
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-3 mt-1">
          <div
            className={cn('h-full rounded-full transition-all duration-500', getScoreBarBg(overall))}
            style={{ width: `${overall}%` }}
          />
        </div>
        <div className="space-y-2">
          {Object.entries(healthScore.categories).map(([key, score]) => {
            const hint = CATEGORY_HINTS[key]?.(score) || '';
            return (
              <div key={key} className="flex items-center gap-2">
                <StatusIcon score={score} />
                <span className="text-sm flex-1 min-w-0 truncate">{CATEGORY_LABELS[key] || key}</span>
                <span className={cn('text-sm font-semibold tabular-nums', getScoreColorClass(score))}>{score}%</span>
                {hint && !compact && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">({hint})</span>
                )}
              </div>
            );
          })}

          {healthScore.topImprovement && (
            <div className="flex items-start gap-1.5 pt-1">
              <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-xs text-muted-foreground italic line-clamp-2">
                {healthScore.topImprovement}
              </span>
            </div>
          )}

          {onImprove && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 min-h-[48px] active:scale-95 touch-manipulation"
              onClick={(e) => {
                e.stopPropagation();
                haptics.medium();
                onImprove();
              }}
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Improve Score
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
