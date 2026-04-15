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
  templateFriendliness: 'Template',
};

const CATEGORY_HINTS: Record<string, (score: number) => string> = {
  keywordOptimization: (s) => s < 70 ? 'Add industry keywords & tools' : '',
  contentQuality: (s) => s < 70 ? 'Use action verbs & metrics' : '',
  sectionStructure: (s) => s < 70 ? 'Add missing sections' : '',
  parsability: (s) => s < 70 ? 'Use consistent date formats' : '',
  contactCompleteness: (s) => s < 70 ? 'Add email, phone & LinkedIn' : '',
  lengthDensity: (s) => s < 70 ? 'Add more detail to bullets' : '',
  templateFriendliness: (s) => s < 70 ? 'Switch to a single-column template' : '',
};

// Weights must match the backend scoring formula exactly
const CATEGORY_WEIGHTS: Record<string, number> = {
  keywordOptimization: 0.35,
  contentQuality: 0.25,
  sectionStructure: 0.10,
  parsability: 0.10,
  contactCompleteness: 0.05,
  lengthDensity: 0.05,
  templateFriendliness: 0.10,
};

// ── Percentile label ─────────────────────────────────────────────────
// Static distribution curve: score → approximate percentile rank
const SCORE_DISTRIBUTION: Array<{ minScore: number; label: string }> = [
  { minScore: 90, label: 'Top 5%' },
  { minScore: 80, label: 'Top 10%' },
  { minScore: 70, label: 'Top 20%' },
  { minScore: 60, label: 'Top 35%' },
  { minScore: 50, label: 'Top 50%' },
  { minScore: 40, label: 'Top 65%' },
  { minScore: 30, label: 'Top 80%' },
  { minScore: 0, label: 'Bottom 30%' },
];

function getPercentileLabel(score: number): string {
  for (const { minScore, label } of SCORE_DISTRIBUTION) {
    if (score >= minScore) return label;
  }
  return 'Bottom 30%';
}

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
  const percentile = getPercentileLabel(overall);

  const keywordGaps = healthScore.keywordGaps ?? [];
  const weakBullets = healthScore.weakBullets ?? [];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          onClick={() => haptics.light()}
          className="w-full flex items-center justify-between gap-2 py-2 touch-manipulation active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">ATS Score:</span>
            <span className={cn('text-lg font-bold', colorClass)}>
              {isScoring ? <MiniSpinner size={16} className="inline" /> : `${overall}/100`}
            </span>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
              overall >= 90 ? 'bg-success/10 text-success' :
              overall >= 70 ? 'bg-warning/10 text-warning' :
              overall >= 50 ? 'bg-orange-500/10 text-orange-500' :
              'bg-destructive/10 text-destructive'
            )}>
              {label}
            </span>
            {!isScoring && (
              <span className="text-xs text-muted-foreground font-medium">
                {percentile}
              </span>
            )}
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
          {Object.entries(healthScore.categories)
            .sort(([keyA, a], [keyB, b]) => {
              const impactA = (100 - a) * (CATEGORY_WEIGHTS[keyA] ?? 0.1);
              const impactB = (100 - b) * (CATEGORY_WEIGHTS[keyB] ?? 0.1);
              return impactB - impactA;
            })
            .map(([key, score], idx) => {
            const hint = CATEGORY_HINTS[key]?.(score) || '';
            const isTopFix = idx === 0 && score < 100;
            const showGaps = key === 'keywordOptimization' && keywordGaps.length > 0;
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
                {showGaps && (
                  <p className="text-xs text-muted-foreground mt-0.5 ml-6 leading-relaxed">
                    Missing from body: {keywordGaps.slice(0, 8).join(', ')}
                    {keywordGaps.length > 8 ? ` +${keywordGaps.length - 8} more` : ''}
                  </p>
                )}
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
              Improve Score
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
