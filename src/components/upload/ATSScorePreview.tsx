import { memo } from 'react';
import { motion } from 'framer-motion';
import { Shield, TrendingUp, Lightbulb } from 'lucide-react';
import { ScoreRing } from '@/components/dashboard/ScoreRing';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { ResumeHealthScore } from '@/hooks/useResumeScore';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<string, string> = {
  completeness: 'Completeness',
  atsReadiness: 'ATS Readiness',
  impactLanguage: 'Impact Language',
  formatting: 'Formatting',
};

function getBarColor(score: number): string {
  if (score >= 80) return 'bg-success';
  if (score >= 50) return 'bg-warning';
  return 'bg-destructive';
}

function getScoreTip(score: number): { icon: typeof TrendingUp; text: string; color: string } {
  if (score >= 80) return { icon: TrendingUp, text: 'Your resume is well-optimized for ATS systems', color: 'text-success' };
  if (score >= 50) return { icon: Lightbulb, text: 'Consider improving weak areas before applying', color: 'text-warning' };
  return { icon: Shield, text: 'Significant improvements recommended', color: 'text-destructive' };
}

interface ATSScorePreviewProps {
  atsScore: ResumeHealthScore | null;
  isScoring: boolean;
}

export const ATSScorePreview = memo(function ATSScorePreview({ atsScore, isScoring }: ATSScorePreviewProps) {
  // Loading skeleton state
  if (isScoring && !atsScore) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 space-y-3"
      >
        <div className="flex items-center gap-3">
          <ScoreRing score={0} size={56} isLoading />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2 flex-1 rounded-full" />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center animate-pulse">
          Analyzing ATS compatibility...
        </p>
      </motion.div>
    );
  }

  if (!atsScore) return null;

  const tip = getScoreTip(atsScore.overallScore);
  const TipIcon = tip.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 space-y-3"
    >
      {/* Score header */}
      <div className="flex items-center gap-3">
        <ScoreRing score={atsScore.overallScore} size={56} strokeWidth={4} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">ATS Health Score</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            {atsScore.topStrength && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                ✓ {atsScore.topStrength}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Category bars */}
      <div className="space-y-2">
        {Object.entries(atsScore.categories).map(([key, score]) => (
          <div key={key} className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[key] || key}</span>
              <span className={cn(
                'text-xs font-semibold tabular-nums',
                score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-destructive'
              )}>
                {score}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', getBarColor(score))}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Contextual tip */}
      <div className={cn('flex items-start gap-2 pt-1', tip.color)}>
        <TipIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p className="text-xs leading-snug">{tip.text}</p>
      </div>

      {/* Top improvement */}
      {atsScore.topImprovement && (
        <p className="text-[11px] text-muted-foreground italic line-clamp-2 border-t border-border/50 pt-2">
          💡 {atsScore.topImprovement}
        </p>
      )}
    </motion.div>
  );
});
