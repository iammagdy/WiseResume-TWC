import { memo, useState } from 'react';
import { Activity, Target, Briefcase, Hash, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PortfolioAtsChartPoint } from '@/components/dashboard/dashboardMetricsUtils';
import { PortfolioAtsSparkline } from '@/components/dashboard/PortfolioAtsSparkline';
import { DashboardAtsPortfolioDialog } from '@/components/dashboard/DashboardAtsPortfolioDialog';
import { DashboardMissingKeywordsDialog } from '@/components/dashboard/DashboardMissingKeywordsDialog';
import { DashboardTailoredMetricDialog } from '@/components/dashboard/DashboardTailoredMetricDialog';
import { DashboardApplicationMatchesDialog } from '@/components/dashboard/DashboardApplicationMatchesDialog';
import { DatabaseResume } from '@/hooks/useResumes';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { haptics } from '@/lib/haptics';

interface DashboardMetricsStripProps {
  resumes: DatabaseResume[];
  healthScores: Record<string, ResumeHealthScore>;
  atsAverage: number | null;
  scoredResumeCount: number;
  tailoredThisWeek: number;
  applicationMatches: number;
  hasJobMatchScores: boolean;
  missingKeywordsCount: number;
  atsTrendDelta?: number | null;
  atsChartSeries?: PortfolioAtsChartPoint[] | null;
  isScoring?: boolean;
  scoringId?: string | null;
  onEditResume: (resumeId: string) => void;
  onTailorResume: (resumeId: string) => void;
  className?: string;
}

type MetricTone = 'ats' | 'tailored' | 'matches' | 'keywords';

const TONE_STYLES: Record<MetricTone, { value: string; icon: string; iconBg: string }> = {
  ats: {
    value: 'text-amber-400',
    icon: 'text-amber-400/90',
    iconBg: 'bg-amber-500/12 border-amber-500/20',
  },
  tailored: {
    value: 'text-rose-400',
    icon: 'text-rose-400/90',
    iconBg: 'bg-rose-500/12 border-rose-500/20',
  },
  matches: {
    value: 'text-violet-400',
    icon: 'text-violet-400/90',
    iconBg: 'bg-violet-500/12 border-violet-500/20',
  },
  keywords: {
    value: 'text-orange-400',
    icon: 'text-orange-400/90',
    iconBg: 'bg-orange-500/12 border-orange-500/20',
  },
};

export const DashboardMetricsStrip = memo(function DashboardMetricsStrip({
  resumes,
  healthScores,
  atsAverage,
  scoredResumeCount,
  tailoredThisWeek,
  applicationMatches,
  hasJobMatchScores,
  missingKeywordsCount,
  atsTrendDelta = null,
  atsChartSeries = null,
  isScoring = false,
  scoringId = null,
  onEditResume,
  onTailorResume,
  className,
}: DashboardMetricsStripProps) {
  const [activeDialog, setActiveDialog] = useState<MetricTone | null>(null);

  const showSparkline = atsChartSeries != null && atsChartSeries.length >= 2;
  const atsValue =
    isScoring && atsAverage == null
      ? '…'
      : atsAverage != null
        ? `${atsAverage}%`
        : '—';

  const cards: {
    key: MetricTone;
    label: string;
    value: string;
    footer: string | null;
    trend: number | null;
    icon: typeof Activity;
    sparkline?: boolean;
    ariaLabel: string;
  }[] = [
    {
      key: 'ats',
      label: 'ATS Score (Avg.)',
      value: atsValue,
      footer:
        atsTrendDelta == null && scoredResumeCount > 0
          ? `Across ${scoredResumeCount} resume${scoredResumeCount !== 1 ? 's' : ''}`
          : atsTrendDelta == null && isScoring
            ? 'Scoring resumes…'
            : atsTrendDelta == null
              ? 'Run ATS on your resumes'
              : null,
      trend: atsTrendDelta,
      icon: Activity,
      sparkline: showSparkline,
      ariaLabel: 'View ATS scores for all resumes',
    },
    {
      key: 'tailored',
      label: 'Tailored Resumes',
      value: String(tailoredThisWeek),
      footer: 'This week',
      trend: null,
      icon: Target,
      ariaLabel: 'View tailored resumes',
    },
    {
      key: 'matches',
      label: 'Application Matches',
      value: String(applicationMatches),
      footer: hasJobMatchScores ? 'Strong matches' : 'Add a target job to score',
      trend: null,
      icon: Briefcase,
      ariaLabel: 'View application match scores',
    },
    {
      key: 'keywords',
      label: 'Missing Keywords',
      value: String(missingKeywordsCount),
      footer: scoredResumeCount > 0 ? 'Across all resumes' : 'From ATS analysis',
      trend: null,
      icon: Hash,
      ariaLabel: 'View missing keywords by resume',
    },
  ];

  return (
    <>
      <div
        className={cn(
          'dashboard-metrics-strip grid grid-cols-2 gap-2.5 mb-3.5 lg:grid-cols-4',
          className,
        )}
        aria-label="Workspace metrics"
      >
        {cards.map((card) => {
          const Icon = card.icon;
          const styles = TONE_STYLES[card.key];
          const TrendIcon = card.trend != null && card.trend > 0 ? TrendingUp : TrendingDown;

          return (
            <button
              key={card.key}
              type="button"
              className={cn(
                'dashboard-metrics-strip__card dashboard-metrics-strip__card--clickable rounded-2xl px-3.5 py-3 min-w-0 text-left w-full',
                'transition-colors hover:border-border/80 hover:bg-card/90 active:scale-[0.99] touch-manipulation',
              )}
              aria-label={card.ariaLabel}
              onClick={() => {
                haptics.light();
                setActiveDialog(card.key);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-medium text-muted-foreground leading-tight truncate">
                  {card.label}
                </p>
                <span
                  className={cn(
                    'dashboard-metrics-strip__icon-box flex items-center justify-center w-8 h-8 rounded-lg border shrink-0',
                    styles.iconBg,
                  )}
                >
                  <Icon className={cn('w-4 h-4', styles.icon)} aria-hidden />
                </span>
              </div>

              <div className="mt-2 flex items-end justify-between gap-2 min-h-[2.25rem]">
                <div className="min-w-0">
                  <p className={cn('text-2xl font-semibold tabular-nums leading-none', styles.value)}>
                    {card.value}
                  </p>
                  {card.trend != null && (
                    <p
                      className={cn(
                        'flex items-center gap-0.5 text-[10px] font-medium mt-1.5',
                        card.trend > 0 ? 'text-emerald-500' : 'text-amber-500',
                      )}
                    >
                      <TrendIcon className="w-3 h-3 shrink-0" />
                      {card.trend > 0 ? `↑ ${card.trend}%` : `↓ ${Math.abs(card.trend)}%`} vs last 7 days
                    </p>
                  )}
                  {card.footer && card.trend == null && (
                    <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">{card.footer}</p>
                  )}
                </div>
                {card.sparkline && atsChartSeries && (
                  <PortfolioAtsSparkline points={atsChartSeries} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <DashboardAtsPortfolioDialog
        open={activeDialog === 'ats'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        resumes={resumes}
        healthScores={healthScores}
        atsAverage={atsAverage}
        scoringId={scoringId}
        onEditResume={onEditResume}
        onTailorResume={onTailorResume}
      />
      <DashboardMissingKeywordsDialog
        open={activeDialog === 'keywords'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        resumes={resumes}
        healthScores={healthScores}
        onEditResume={onEditResume}
      />
      <DashboardTailoredMetricDialog
        open={activeDialog === 'tailored'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        resumes={resumes}
        tailoredThisWeek={tailoredThisWeek}
        onEditResume={onEditResume}
        onTailorResume={onTailorResume}
      />
      <DashboardApplicationMatchesDialog
        open={activeDialog === 'matches'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        resumes={resumes}
        onTailorResume={onTailorResume}
      />
    </>
  );
});
