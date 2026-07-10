import { memo, useState, useMemo } from 'react';
import { Activity, Target, Briefcase, Bookmark, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PortfolioAtsChartPoint } from '@/components/dashboard/dashboardMetricsUtils';
import { useLocale } from '@/i18n/LocaleProvider';
import { PortfolioAtsSparkline } from '@/components/dashboard/PortfolioAtsSparkline';
import { DashboardAtsPortfolioDialog } from '@/components/dashboard/DashboardAtsPortfolioDialog';
import { DashboardSavedJobsDialog } from '@/components/dashboard/DashboardSavedJobsDialog';
import { DashboardTailoredMetricDialog } from '@/components/dashboard/DashboardTailoredMetricDialog';
import { DashboardApplicationMatchesDialog } from '@/components/dashboard/DashboardApplicationMatchesDialog';
import { DatabaseResume } from '@/hooks/useResumes';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { haptics } from '@/lib/haptics';
import type { Job } from '@/hooks/useJobs';

import { isTailoredResume } from '@/lib/resumeLineage';

interface DashboardMetricsStripProps {
  resumes: DatabaseResume[];
  healthScores: Record<string, ResumeHealthScore>;
  atsAverage: number | null;
  scoredResumeCount: number;
  tailoredThisWeek: number;
  applicationMatches: number;
  hasJobMatchScores: boolean;
  savedJobsCount: number;
  savedJobs?: Job[];
  isSavedJobsLoading?: boolean;
  onImportJob?: () => void;
  atsTrendDelta?: number | null;
  atsChartSeries?: PortfolioAtsChartPoint[] | null;
  isScoring?: boolean;
  scoringId?: string | null;
  onEditResume: (resumeId: string) => void;
  onTailorResume: (resumeId: string) => void;
  className?: string;
  tailoredIds?: Set<string>;
}

type MetricTone = 'ats' | 'tailored' | 'matches' | 'jobs';

const TONE_STYLES: Record<MetricTone, { value: string; icon: string; iconBg: string }> = {
  ats: {
    value: 'text-primary',
    icon: 'text-primary/90',
    iconBg: 'bg-primary/10 border-primary/20',
  },
  tailored: {
    value: 'text-foreground',
    icon: 'text-muted-foreground',
    iconBg: 'bg-muted/50 border-border/60',
  },
  matches: {
    value: 'text-foreground',
    icon: 'text-muted-foreground',
    iconBg: 'bg-muted/50 border-border/60',
  },
  jobs: {
    value: 'text-foreground',
    icon: 'text-muted-foreground',
    iconBg: 'bg-muted/50 border-border/60',
  },
};

const SEVEN_DAYS_MS = 7 * 86_400_000;

const ONE_DAY_MS = SEVEN_DAYS_MS / 7;

/** Returns an array of 7 booleans (oldest→newest) — true if a tailored resume was created that day */
function buildTailoredActivityBars(
  resumes: DatabaseResume[],
): boolean[] {
  const now = Date.now();
  const bars = Array(7).fill(false) as boolean[];
  for (const r of resumes) {
    if (!r.parent_resume_id) continue;
    const t = new Date(r.$createdAt || r.$updatedAt || 0).getTime();
    const daysAgo = Math.floor((now - t) / ONE_DAY_MS);
    if (daysAgo >= 0 && daysAgo < 7) {
      bars[6 - daysAgo] = true;
    }
  }
  return bars;
}

/** Segments job_match_scores into strong (≥70), partial (40-69), weak (<40) */
function buildMatchSegments(resumes: DatabaseResume[]): { strong: number; partial: number; weak: number } | null {
  const scored = resumes.filter(r => typeof r.job_match_score === 'number');
  if (scored.length === 0) return null;
  return {
    strong: scored.filter(r => (r.job_match_score as number) >= 70).length,
    partial: scored.filter(r => (r.job_match_score as number) >= 40 && (r.job_match_score as number) < 70).length,
    weak: scored.filter(r => (r.job_match_score as number) < 40).length,
  };
}

export const DashboardMetricsStrip = memo(function DashboardMetricsStrip({
  resumes,
  healthScores,
  atsAverage,
  scoredResumeCount,
  tailoredThisWeek,
  applicationMatches,
  hasJobMatchScores,
  savedJobsCount,
  savedJobs,
  isSavedJobsLoading = false,
  onImportJob,
  atsTrendDelta = null,
  atsChartSeries = null,
  isScoring = false,
  scoringId = null,
  onEditResume,
  onTailorResume,
  className,
  tailoredIds,
}: DashboardMetricsStripProps) {
  const { t } = useLocale();
  const [activeDialog, setActiveDialog] = useState<MetricTone | null>(null);

  const showSparkline = atsChartSeries != null && atsChartSeries.length >= 2;
  const atsValue =
    atsAverage != null
      ? `${atsAverage}%`
      : isScoring
        ? '…'
        : '—';

  const totalTailored = useMemo(() => resumes.filter(r => isTailoredResume(r, tailoredIds)).length, [resumes, tailoredIds]);
  const tailoredBars = useMemo(() => buildTailoredActivityBars(resumes), [resumes]);
  const matchSegments = useMemo(() => buildMatchSegments(resumes), [resumes]);
  const jobChips = useMemo(
    () => (savedJobs ?? []).slice(0, 2).map(j => j.title).filter(Boolean),
    [savedJobs],
  );

  const openDialog = (key: MetricTone) => { haptics.light(); setActiveDialog(key); };

  return (
    <>
      <div
        className={cn(
          'dashboard-metrics-strip grid grid-cols-2 gap-2.5 mb-3.5 lg:grid-cols-4',
          className,
        )}
        aria-label="Workspace metrics"
        aria-live="polite"
        aria-atomic="false"
      >
        {/* ── ATS Score ── sparkline + crimson value + trend delta */}
        <button
          type="button"
          className="dashboard-metrics-strip__card dashboard-metrics-strip__card--clickable rounded-2xl px-3.5 py-3 min-w-0 text-left w-full transition-colors hover:border-border/80 hover:bg-card/90 active:scale-[0.99] touch-manipulation"
          aria-label={t('app.dashboardPage.viewAtsScoresAria', 'View ATS scores for all resumes')}
          onClick={() => openDialog('ats')}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground leading-tight truncate">{t('app.dashboardStats.atsAverage', 'ATS Score (Avg.)')}</p>
            <span className={cn('dashboard-metrics-strip__icon-box flex items-center justify-center w-8 h-8 rounded-lg border shrink-0', TONE_STYLES.ats.iconBg)}>
              <Activity className={cn('w-4 h-4', TONE_STYLES.ats.icon)} aria-hidden />
            </span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-2 min-h-[2.25rem]">
            <div className="min-w-0">
              <p className={cn('text-2xl font-semibold tabular-nums leading-none', TONE_STYLES.ats.value)}>{atsValue}</p>
              {atsTrendDelta != null ? (
                <p className={cn('flex items-center gap-0.5 text-xs font-medium mt-1.5', atsTrendDelta > 0 ? 'text-success' : 'text-warning')}>
                  {atsTrendDelta > 0 ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
                  {atsTrendDelta > 0 ? `↑ ${atsTrendDelta}%` : `↓ ${Math.abs(atsTrendDelta)}%`} {t('app.dashboardPage.vsLast7Days', 'vs last 7 days')}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
                  {scoredResumeCount > 0
                    ? t('app.dashboardPage.acrossResumesCount', 'Across {{count}} resume{{suffix}}', { count: scoredResumeCount, suffix: scoredResumeCount !== 1 ? 's' : '' })
                    : isScoring ? t('app.dashboardPage.scoringResumes', 'Scoring resumes…') : t('app.dashboardPage.runAtsOnResumes', 'Run ATS on your resumes')}
                </p>
              )}
            </div>
            {showSparkline && atsChartSeries && <PortfolioAtsSparkline points={atsChartSeries} />}
          </div>
        </button>

        {/* ── Tailored Resumes ── 7-day activity bar */}
        <button
          type="button"
          className="dashboard-metrics-strip__card dashboard-metrics-strip__card--clickable rounded-2xl px-3.5 py-3 min-w-0 text-left w-full transition-colors hover:border-border/80 hover:bg-card/90 active:scale-[0.99] touch-manipulation"
          aria-label={t('app.dashboardPage.viewTailoredResumesAria', 'View tailored resumes')}
          onClick={() => openDialog('tailored')}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground leading-tight truncate">{t('app.dashboardStats.tailoredResumes', 'Tailored Resumes')}</p>
            <span className={cn('dashboard-metrics-strip__icon-box flex items-center justify-center w-8 h-8 rounded-lg border shrink-0', TONE_STYLES.tailored.iconBg)}>
              <Target className={cn('w-4 h-4', TONE_STYLES.tailored.icon)} aria-hidden />
            </span>
          </div>
          <div className="mt-2 min-h-[2.25rem]">
            <p className="text-2xl font-semibold tabular-nums leading-none text-foreground">{totalTailored}</p>
            {tailoredThisWeek > 0 ? (
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-end gap-0.5 mt-1" aria-label="Tailoring activity this week" role="img">
                  {tailoredBars.map((active, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex-1 rounded-sm transition-all duration-300',
                        active ? 'bg-primary/70 h-3' : 'bg-border h-1.5',
                      )}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                  {t('app.dashboardPage.tailoredThisWeek', '{{count}} this week', { count: tailoredThisWeek })}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
                {t('app.dashboardPage.tailoredThisWeek', '{{count}} this week', { count: 0 })}
              </p>
            )}
          </div>
        </button>

        {/* ── Application Matches ── score distribution bar */}
        <button
          type="button"
          className="dashboard-metrics-strip__card dashboard-metrics-strip__card--clickable rounded-2xl px-3.5 py-3 min-w-0 text-left w-full transition-colors hover:border-border/80 hover:bg-card/90 active:scale-[0.99] touch-manipulation"
          aria-label={t('app.dashboardPage.viewAppMatchesAria', 'View application match scores')}
          onClick={() => openDialog('matches')}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground leading-tight truncate">{t('app.dashboardPage.appMatches', 'App. Matches')}</p>
            <span className={cn('dashboard-metrics-strip__icon-box flex items-center justify-center w-8 h-8 rounded-lg border shrink-0', TONE_STYLES.matches.iconBg)}>
              <Briefcase className={cn('w-4 h-4', TONE_STYLES.matches.icon)} aria-hidden />
            </span>
          </div>
          <div className="mt-2 min-h-[2.25rem]">
            <p className="text-2xl font-semibold tabular-nums leading-none text-foreground">{applicationMatches}</p>
            {matchSegments ? (
              <div className="mt-2" aria-label="Match score distribution" role="img">
                <div className="flex rounded-full overflow-hidden h-1.5 gap-px">
                  {matchSegments.strong > 0 && (
                    <div
                      className="bg-success/70 rounded-l-full"
                      style={{ flex: matchSegments.strong }}
                    />
                  )}
                  {matchSegments.partial > 0 && (
                    <div
                      className={cn('bg-warning/60', matchSegments.strong === 0 && 'rounded-l-full', matchSegments.weak === 0 && 'rounded-r-full')}
                      style={{ flex: matchSegments.partial }}
                    />
                  )}
                  {matchSegments.weak > 0 && (
                    <div
                      className="bg-destructive/40 rounded-r-full"
                      style={{ flex: matchSegments.weak }}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">
                  {t('app.dashboardPage.matchSegmentsShort', '{{strong}} strong · {{partial}} partial', { strong: matchSegments.strong, partial: matchSegments.partial })}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
                {hasJobMatchScores ? t('app.dashboardPage.strongMatches', 'Strong matches') : t('app.dashboardPage.addTargetJobToScore', 'Add a target job to score')}
              </p>
            )}
          </div>
        </button>

        {/* ── Saved Jobs ── job title chips */}
        <button
          type="button"
          className="dashboard-metrics-strip__card dashboard-metrics-strip__card--clickable rounded-2xl px-3.5 py-3 min-w-0 text-left w-full transition-colors hover:border-border/80 hover:bg-card/90 active:scale-[0.99] touch-manipulation"
          aria-label={t('app.dashboardPage.viewSavedJobsAria', 'View saved job postings')}
          onClick={() => openDialog('jobs')}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground leading-tight truncate">{t('app.dashboardStats.savedJobs', 'Saved Jobs')}</p>
            <span className={cn('dashboard-metrics-strip__icon-box flex items-center justify-center w-8 h-8 rounded-lg border shrink-0', TONE_STYLES.jobs.iconBg)}>
              <Bookmark className={cn('w-4 h-4', TONE_STYLES.jobs.icon)} aria-hidden />
            </span>
          </div>
          <div className="mt-2 min-h-[2.25rem]">
            <p className="text-2xl font-semibold tabular-nums leading-none text-foreground">
              {isSavedJobsLoading && savedJobsCount === 0 ? '…' : savedJobsCount}
            </p>
            {jobChips.length > 0 ? (
              <div className="flex flex-col gap-1 mt-2">
                {jobChips.map((title, i) => (
                  <p key={i} className="text-xs text-foreground/70 font-medium truncate leading-snug">{title}</p>
                ))}
              </div>
            ) : (
              <span className="mt-1.5 flex items-center gap-1 text-xs text-primary font-medium" aria-hidden>
                <Plus className="w-3 h-3 shrink-0" />
                {t('app.dashboardPage.importPosting', 'Import a posting')}
              </span>
            )}
          </div>
        </button>
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
      <DashboardSavedJobsDialog
        open={activeDialog === 'jobs'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onImportJob={onImportJob}
      />
      <DashboardTailoredMetricDialog
        open={activeDialog === 'tailored'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        resumes={resumes}
        tailoredThisWeek={tailoredThisWeek}
        onEditResume={onEditResume}
        onTailorResume={onTailorResume}
        tailoredIds={tailoredIds}
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
