import { memo, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Sparkles, Target, TrendingUp } from 'lucide-react';
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
  cta: string;
  action: InsightAction;
}

function buildInsight(healthScore?: ResumeHealthScore | null): InsightContent {
  if (!healthScore) {
    return {
      eyebrow: 'AI workspace',
      title: 'Unlock personalized guidance',
      why: 'ATS scoring on your featured resume surfaces the highest-impact fixes — keywords, structure, and bullet quality.',
      impactLabel: null,
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
      eyebrow: 'Biggest ATS opportunity',
      title: `Close ${gapCount} keyword gap${gapCount === 1 ? '' : 's'}`,
      why: `Role-specific terms drive shortlist rates. Your resume is missing ${gapCount} target keywords — tailoring to a job posting closes these fastest.`,
      impactLabel: headroom > 0 ? `Up to +${Math.min(15, gapCount * 3)} pts match` : null,
      cta: 'Tailor to Job',
      action: 'tailor',
    };
  }

  if (weakestScore < 65) {
    return {
      eyebrow: 'Highest impact improvement',
      title: topImprovement,
      why: `${weakestLabel} scores ${weakestScore}% — your lowest ATS signal. Improving this area typically lifts overall match more than polishing strong sections.`,
      impactLabel: headroom > 0 ? `~${headroom} pts headroom` : null,
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
      eyebrow: 'Your weakest bullets',
      title: 'Add outcome-driven phrasing',
      why: `AI flagged bullets missing ${reason}. Recruiters scan for impact in under 10 seconds — quantified wins outperform duty lists.`,
      impactLabel: overallScore < 80 ? 'Content quality boost' : null,
      cta: 'Apply in Editor',
      action: 'editor',
    };
  }

  return {
    eyebrow: 'Next recommended step',
    title: topImprovement,
    why: topStrength
      ? `Strongest signal: ${topStrength}. Address the improvement below before your next application to stay competitive in ATS filters.`
      : 'Focus on the top improvement below to strengthen your next application.',
    impactLabel: overallScore >= 80 ? 'Strong ATS base' : `ATS ${overallScore}%`,
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
    <motion.aside
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      aria-label="AI workspace insight"
      className={cn(
        'rounded-xl p-3.5 dashboard-ai-insight-panel shadow-soft-sm lg:max-w-[300px]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary/90">
          <Sparkles className="w-3 h-3" aria-hidden />
          {insight.eyebrow}
        </span>
        {healthScore && (
          <span className="tabular-nums text-[10px] font-medium text-muted-foreground">
            ATS {healthScore.overallScore}%
          </span>
        )}
      </div>

      <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 mb-1.5">
        {insight.title}
      </h3>

      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-4">
        {insight.why}
      </p>

      {insight.impactLabel && (
        <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
          <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
          <span className="text-[11px] font-medium text-foreground">{insight.impactLabel}</span>
        </div>
      )}

      {!healthScore && (
        <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-lg bg-muted/50 border border-border/60">
          <Target className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
          <span className="text-[11px] text-muted-foreground">Scores update as you edit</span>
        </div>
      )}

      <Button
        size="sm"
        className="w-full h-10 min-h-[44px] rounded-xl font-semibold shadow-soft-sm gap-1.5 text-sm"
        onClick={handleCta}
      >
        {insight.cta}
        <ArrowRight className="w-4 h-4 opacity-80" />
      </Button>
    </motion.aside>
  );
});
