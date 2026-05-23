import { memo, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Brain, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { ResumeHealthScore } from '@/hooks/useResumeScore';

const CATEGORY_LABELS: Record<keyof ResumeHealthScore['categories'], string> = {
  keywordOptimization: 'Keyword alignment',
  contentQuality: 'Content quality',
  sectionStructure: 'Section structure',
  parsability: 'ATS parsability',
  contactCompleteness: 'Contact completeness',
  lengthDensity: 'Length & density',
  templateFriendliness: 'Template compatibility',
};

type InsightAction = 'editor' | 'tailor';

interface InsightContent {
  eyebrow: string;
  title: string;
  why: string;
  impactLabel: string | null;
  weakestLabel: string | null;
  weakestScore: number | null;
  cta: string;
  action: InsightAction;
}

function buildInsight(healthScore?: ResumeHealthScore | null): InsightContent {
  if (!healthScore) {
    return {
      eyebrow: 'AI workspace',
      title: 'Personalized guidance unlocks after scoring',
      why: 'Open your active resume in the editor. ATS scoring surfaces keyword gaps, weak sections, and the next step to improve match rate.',
      impactLabel: null,
      weakestLabel: null,
      weakestScore: null,
      cta: 'Open Editor',
      action: 'editor',
    };
  }

  const { categories, overallScore, keywordGaps, topImprovement, topStrength, weakBullets } =
    healthScore;
  const gapCount = keywordGaps?.length ?? 0;

  const weakestEntry = (
    Object.entries(categories) as [keyof ResumeHealthScore['categories'], number][]
  ).reduce((min, cur) => (cur[1] < min[1] ? cur : min));

  const weakestLabel = CATEGORY_LABELS[weakestEntry[0]];
  const weakestScore = weakestEntry[1];
  const headroom = Math.max(0, 100 - overallScore);

  if (gapCount >= 2) {
    return {
      eyebrow: 'Biggest opportunity',
      title: `Close ${gapCount} keyword gap${gapCount === 1 ? '' : 's'}`,
      why: `Role-specific terms drive shortlist rates. Tailoring to a job posting closes these gaps faster than manual edits alone.`,
      impactLabel: headroom > 0 ? `Up to +${Math.min(15, gapCount * 3)} pts match` : null,
      weakestLabel,
      weakestScore,
      cta: 'Tailor to Job',
      action: 'tailor',
    };
  }

  if (weakestScore < 65) {
    return {
      eyebrow: 'Highest impact',
      title: topImprovement,
      why: `${weakestLabel} scores ${weakestScore}% — your lowest ATS signal. Improving this area lifts overall match more than polishing strong sections.`,
      impactLabel: headroom > 0 ? `~${headroom} pts headroom` : null,
      weakestLabel,
      weakestScore,
      cta: 'Apply in Editor',
      action: 'editor',
    };
  }

  if (weakBullets && weakBullets.length > 0) {
    const reason =
      weakBullets[0].reason === 'both'
        ? 'action verbs and metrics'
        : weakBullets[0].reason === 'no_metric'
          ? 'measurable results'
          : 'strong action verbs';
    return {
      eyebrow: 'Weakest bullets',
      title: 'Add outcome-driven phrasing',
      why: `AI flagged bullets missing ${reason}. Quantified wins outperform duty lists in recruiter scans.`,
      impactLabel: overallScore < 80 ? 'Content quality boost' : null,
      weakestLabel,
      weakestScore,
      cta: 'Apply in Editor',
      action: 'editor',
    };
  }

  return {
    eyebrow: 'Next step',
    title: topImprovement,
    why: topStrength
      ? `Strongest signal: ${topStrength}. Address the improvement below before your next application.`
      : 'Focus on the top improvement below to strengthen your next application.',
    impactLabel: overallScore >= 80 ? 'Strong ATS base' : `ATS ${overallScore}%`,
    weakestLabel,
    weakestScore,
    cta: gapCount > 0 ? 'Tailor to Job' : 'Apply in Editor',
    action: gapCount > 0 ? 'tailor' : 'editor',
  };
}

interface DashboardNextActionCardProps {
  healthScore?: ResumeHealthScore | null;
  onReview: () => void;
  onTailor?: () => void;
  className?: string;
}

export const DashboardNextActionCard = memo(function DashboardNextActionCard({
  healthScore,
  onReview,
  onTailor,
  className,
}: DashboardNextActionCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const insight = useMemo(() => buildInsight(healthScore), [healthScore]);

  const handleCta = () => {
    haptics.light();
    if (insight.action === 'tailor' && onTailor) {
      onTailor();
    } else {
      onReview();
    }
  };

  return (
    <motion.section
      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      aria-label="AI workspace insight"
      className={cn(
        'rounded-2xl p-3.5 dashboard-ai-insight-panel shadow-soft-sm',
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-border/60">
        <span className="dashboard-ai-insight-panel__brand flex items-center justify-center w-7 h-7 rounded-lg bg-primary/8 border border-primary/12">
          <Brain className="w-3.5 h-3.5 text-primary" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            AI workspace
          </p>
          <p className="text-xs font-medium text-foreground truncate">{insight.eyebrow}</p>
        </div>
        {healthScore && (
          <span className="tabular-nums text-[10px] font-medium text-muted-foreground shrink-0">
            ATS {healthScore.overallScore}%
          </span>
        )}
      </div>

      <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 mb-1.5">
        {insight.title}
      </h3>

      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-4">
        {insight.why}
      </p>

      {insight.weakestLabel != null && insight.weakestScore != null && insight.weakestScore < 80 && (
        <div className="flex items-center justify-between gap-2 mb-3 px-2 py-1.5 rounded-lg bg-muted/40 border border-border/50 text-[11px]">
          <span className="text-muted-foreground">Weakest section</span>
          <span className="font-medium text-foreground tabular-nums">
            {insight.weakestLabel} · {insight.weakestScore}%
          </span>
        </div>
      )}

      {insight.impactLabel && (
        <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
          <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
          <span className="text-[11px] font-medium text-foreground">{insight.impactLabel}</span>
        </div>
      )}

      {!healthScore && (
        <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-lg bg-muted/40 border border-border/50">
          <Target className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
          <span className="text-[11px] text-muted-foreground">Scores update as you edit</span>
        </div>
      )}

      <Button
        size="sm"
        className="w-full h-10 min-h-[44px] rounded-xl font-semibold gap-1.5 text-sm shadow-none"
        onClick={handleCta}
      >
        {insight.cta}
        <ArrowRight className="w-4 h-4 opacity-80" />
      </Button>
    </motion.section>
  );
});
