import { useState, memo } from 'react';
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
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
  if (score >= 50) return 'text-warning';
  return 'text-destructive';
}

function getScoreBarBg(score: number): string {
  if (score >= 90) return 'bg-success';
  if (score >= 70) return 'bg-warning';
  if (score >= 50) return 'bg-warning';
  return 'bg-destructive';
}

function StatusIcon({ score }: { score: number }) {
  if (score >= 90) return <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />;
  if (score >= 50) return <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />;
  return <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />;
}

const CATEGORY_LABELS: Record<string, string> = {
  contactCompleteness: 'Contact information',
  summaryCompleteness: 'Professional summary',
  experienceCompleteness: 'Work experience',
  educationCompleteness: 'Education',
  skillsCompleteness: 'Skills',
};

const CATEGORY_HINTS: Record<string, (score: number) => string> = {
  contactCompleteness: (s) => s < 70 ? 'Add email, phone & location' : '',
  summaryCompleteness: (s) => s < 70 ? 'Add a focused 50+ word summary' : '',
  experienceCompleteness: (s) => s < 70 ? 'Add roles, dates & bullet points' : '',
  educationCompleteness: (s) => s < 70 ? 'Add degree, institution & date' : '',
  skillsCompleteness: (s) => s < 70 ? 'List at least 5 relevant skills' : '',
};

// The local readiness rubric weights the five core sections equally.
const CATEGORY_WEIGHTS: Record<string, number> = {
  contactCompleteness: 0.2,
  summaryCompleteness: 0.2,
  experienceCompleteness: 0.2,
  educationCompleteness: 0.2,
  skillsCompleteness: 0.2,
};

// ── Weak bullet reason labels ────────────────────────────────────────
const WEAK_BULLET_REASON: Record<string, string> = {
  no_action_verb: 'No action verb',
  no_metric: 'No measurable result',
  both: 'No action verb or metric',
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
  const [bulletsOpen, setBulletsOpen] = useState(false);
  const overall = healthScore.overallScore;
  const label = getScoreLabel(overall);
  const colorClass = getScoreColorClass(overall);
  const weakBullets = healthScore.weakBullets ?? [];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          onClick={() => haptics.light()}
          className="w-full flex items-center justify-between gap-2 py-2 touch-manipulation active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">Resume readiness:</span>
            <span className={cn('text-lg font-bold', colorClass)}>
              {isScoring ? <MiniSpinner size={16} className="inline" /> : `${overall}/100`}
            </span>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
              overall >= 90 ? 'bg-success/10 text-success' :
              overall >= 70 ? 'bg-warning/10 text-warning' :
              overall >= 50 ? 'bg-warning/10 text-warning' :
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
          {!compact && (
            <p className="text-xs text-muted-foreground leading-relaxed pb-1">
              A local completion check of your five core sections. It does not predict an employer's ATS ranking or measure job-keyword match.
            </p>
          )}
          {Object.entries(healthScore.categories)
            .sort(([keyA, a], [keyB, b]) => {
              const impactA = (100 - a) * (CATEGORY_WEIGHTS[keyA] ?? 0.1);
              const impactB = (100 - b) * (CATEGORY_WEIGHTS[keyB] ?? 0.1);
              return impactB - impactA;
            })
            .map(([key, score], idx) => {
            const hint = CATEGORY_HINTS[key]?.(score) || '';
            const isTopFix = idx === 0 && score < 100;
            return (
              <div key={key}>
                <div className="flex items-center gap-2">
                  <StatusIcon score={score} />
                  <span className="text-sm flex-1 min-w-0 truncate">{CATEGORY_LABELS[key] || key}</span>
                  {isTopFix && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive shrink-0">Fix first</span>
                  )}
                  <span className={cn('text-sm font-semibold tabular-nums', getScoreColorClass(score))}>{score}%</span>
                  {hint && !compact && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">({hint})</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Tense consistency hint */}
          {healthScore.tenseHint && (
            <div className="flex items-start gap-1.5 pt-0.5">
              <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
              <span className="text-xs text-muted-foreground italic">
                {healthScore.tenseHint}
              </span>
            </div>
          )}

          {healthScore.topImprovement && (
            <div className="flex items-start gap-1.5 pt-1">
              <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-xs text-muted-foreground italic line-clamp-2">
                {healthScore.topImprovement}
              </span>
            </div>
          )}

          {/* Weak bullets coaching panel */}
          {weakBullets.length > 0 && (
            <Collapsible open={bulletsOpen} onOpenChange={setBulletsOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className="w-full flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => { e.stopPropagation(); haptics.light(); }}
                >
                  <span className="font-medium">
                    {weakBullets.length} bullet{weakBullets.length !== 1 ? 's' : ''} need attention
                  </span>
                  {bulletsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1.5 space-y-2 border-l-2 border-muted pl-3">
                  {weakBullets.slice(0, 5).map((wb, i) => (
                    <div key={i}>
                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 italic">
                        "{wb.text}"
                      </p>
                      <p className="text-[11px] text-destructive font-medium mt-0.5">
                        {WEAK_BULLET_REASON[wb.reason]}
                      </p>
                    </div>
                  ))}
                  {weakBullets.length > 5 && (
                    <p className="text-[11px] text-muted-foreground">+{weakBullets.length - 5} more bullets</p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
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
              Improve resume
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
