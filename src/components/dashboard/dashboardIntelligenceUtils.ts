import { buildActivityFeedFromLog } from '@/components/dashboard/dashboardActivityLabels';
import type { ActivityFeedItem } from '@/components/dashboard/dashboardActivityLabels';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { DatabaseResume } from '@/hooks/useResumes';
import { useWorkspaceActivityStore } from '@/store/workspaceActivityStore';

export type { ActivityFeedItem };

const CATEGORY_KEYS: Record<keyof ResumeHealthScore['categories'], string> = {
  contactCompleteness: 'app.dashboardPage.categories.contactCompleteness',
  summaryCompleteness: 'app.dashboardPage.categories.summaryCompleteness',
  experienceCompleteness: 'app.dashboardPage.categories.experienceCompleteness',
  educationCompleteness: 'app.dashboardPage.categories.educationCompleteness',
  skillsCompleteness: 'app.dashboardPage.categories.skillsCompleteness',
};

const CATEGORY_DEFAULTS: Record<keyof ResumeHealthScore['categories'], string> = {
  contactCompleteness: 'Contact completeness',
  summaryCompleteness: 'Summary completeness',
  experienceCompleteness: 'Experience completeness',
  educationCompleteness: 'Education completeness',
  skillsCompleteness: 'Skills completeness',
};

export type IntelligencePrimaryAction = 'improve' | 'keywords' | 'ats' | 'tailor' | 'wise-ai';

export interface IntelligenceQuickAction {
  id: IntelligencePrimaryAction;
  label: string;
  description: string;
}

export interface IntelligenceSignals {
  badge: string;
  opportunityTitle: string;
  opportunity: string;
  primaryAction: IntelligencePrimaryAction;
  cta: string;
  showImpact: boolean;
}

export function buildIntelligenceSignals(
  healthScore: ResumeHealthScore | null | undefined,
  featuredResume: DatabaseResume | null,
  t: (key: string, variables?: Record<string, string | number>) => string,
): IntelligenceSignals {
  const title = featuredResume?.title?.trim() || t('app.dashboardPage.activeResumePlaceholder', 'your active resume');

  if (!healthScore || healthScore.overallScore <= 0) {
    return {
      badge: t('app.dashboardPage.notScanned', 'Not checked'),
      opportunityTitle: t('app.dashboardPage.runFirstScan', 'Check resume readiness'),
      opportunity: t('app.dashboardPage.notScannedDesc', '“{{title}}” has not been checked yet. Run the local check to see which core section to complete next.', { title }),
      primaryAction: 'ats',
      cta: t('app.dashboardPage.scanPortfolio', 'Check resume'),
      showImpact: true,
    };
  }

  const score = healthScore.overallScore;
  const gapCount = healthScore.keywordGaps?.length ?? 0;
  const weakestEntry = (
    Object.entries(healthScore.categories) as [keyof ResumeHealthScore['categories'], number][]
  ).reduce((min, cur) => (cur[1] < min[1] ? cur : min));

  if (gapCount >= 2) {
    const preview = healthScore.keywordGaps!.slice(0, 3).join(', ');
    return {
      badge: t('app.dashboardPage.atsScore', 'Ready {{score}}%', { score }),
      opportunityTitle: t('app.dashboardPage.keywordGapsCount', '{{count}} keyword gaps', { count: gapCount }),
      opportunity: t('app.dashboardPage.keywordGapsDesc', '“{{title}}” has {{count}} role terms to review: {{preview}}{{ellipsis}}.', { title, count: gapCount, preview, ellipsis: gapCount > 3 ? '…' : '' }),
      primaryAction: 'keywords',
      cta: t('app.dashboardPage.reviewGaps', 'Review gaps'),
      showImpact: true,
    };
  }

  if (score >= 85) {
    return {
      badge: t('app.dashboardPage.atsScore', 'Ready {{score}}%', { score }),
      opportunityTitle: t('app.dashboardPage.portfolioStrong', 'Resume is in strong shape'),
      opportunity: t('app.dashboardPage.portfolioStrongDesc', '“{{title}}” is {{score}}% ready based on section completion ({{topStrength}}). Tailor a copy for your next application to stay ahead.', { title, score, topStrength: healthScore.topStrength || '' }),
      primaryAction: 'tailor',
      cta: t('app.dashboardPage.tailorToJob', 'Tailor to job'),
      showImpact: false,
    };
  }

  const weakCount = healthScore.weakBullets?.length ?? 0;
  if (weakCount >= 2) {
    return {
      badge: t('app.dashboardPage.atsScore', 'Ready {{score}}%', { score }),
      opportunityTitle: t('app.dashboardPage.weakBulletsCount', '{{count}} bullets need stronger evidence', { count: weakCount }),
      opportunity: t('app.dashboardPage.weakBulletsDesc', '“{{title}}” has experience lines without strong action verbs or verified outcomes. Review these before applying.', { title }),
      primaryAction: 'improve',
      cta: t('app.dashboardPage.fixBullets', 'Review bullets'),
      showImpact: true,
    };
  }

  const weakestCategoryTitle = t(CATEGORY_KEYS[weakestEntry[0]], CATEGORY_DEFAULTS[weakestEntry[0]]);
  return {
    badge: t('app.dashboardPage.atsScore', 'Ready {{score}}%', { score }),
    opportunityTitle: weakestCategoryTitle,
    opportunity: healthScore.topImprovement || t('app.dashboardPage.improveCategoryDesc', 'Improve {{category}} on “{{title}}”.', { category: weakestCategoryTitle.toLowerCase(), title }),
    primaryAction: 'improve',
    cta: t('app.dashboardPage.viewFixPlan', 'View fix plan'),
    showImpact: weakestEntry[1] < 75,
  };
}

export function buildIntelligenceQuickActions(
  signals: IntelligenceSignals,
  healthScore: ResumeHealthScore | null | undefined,
  healthScores: Record<string, ResumeHealthScore>,
  resumes: DatabaseResume[],
  atsAverage: number | null,
  t: (key: string, variables?: Record<string, string | number>) => string,
): IntelligenceQuickAction[] {
  const primary = signals.primaryAction;
  const gapTotal = resumes.reduce(
    (n, r) => n + (healthScores[r.$id]?.keywordGaps?.length ?? 0),
    0,
  );
  const unscoredCount = resumes.filter((r) => (healthScores[r.$id]?.overallScore ?? 0) <= 0).length;
  const weakCount = healthScore?.weakBullets?.length ?? 0;

  const catalog: IntelligenceQuickAction[] = [
    {
      id: 'tailor',
      label: t('app.dashboardPage.quickActions.tailorLabel', 'Import job posting'),
      description: t('app.dashboardPage.quickActions.tailorDesc', 'Paste a listing URL to start tailoring'),
    },
    {
      id: 'keywords',
      label: gapTotal > 0 ? t('app.dashboardPage.quickActions.keywordsLabelCount', 'Keyword gaps ({{count}})', { count: gapTotal }) : t('app.dashboardPage.quickActions.keywordsLabel', 'Keyword gaps'),
      description: gapTotal > 0 ? t('app.dashboardPage.quickActions.keywordsDescCount', 'Terms missing across your resumes') : t('app.dashboardPage.quickActions.keywordsDesc', 'Scan for missing role keywords'),
    },
    {
      id: 'ats',
      label: unscoredCount > 0 ? t('app.dashboardPage.quickActions.atsLabelCount', 'Readiness check ({{count}} pending)', { count: unscoredCount }) : t('app.dashboardPage.quickActions.atsLabel', 'Resume readiness'),
      description:
        atsAverage != null
          ? t('app.dashboardPage.quickActions.atsDescCount', 'Avg {{score}}% · {{count}} resumes', { score: Math.round(atsAverage), count: resumes.length })
          : t('app.dashboardPage.quickActions.atsDesc', 'Scores and weakest areas per resume'),
    },
    {
      id: 'improve',
      label: weakCount > 0 ? t('app.dashboardPage.quickActions.improveLabelCount', 'Review {{count}} weak bullets', { count: weakCount }) : t('app.dashboardPage.quickActions.improveLabel', 'Experience review plan'),
      description: t('app.dashboardPage.quickActions.improveDesc', 'Category readiness and evidence-based bullet improvements'),
    },
    {
      id: 'wise-ai',
      label: t('app.dashboardPage.quickActions.wiseAiLabel', 'Ask Wise AI'),
      description: t('app.dashboardPage.quickActions.wiseAiDesc', 'Rewrite bullets or match a job description'),
    },
  ];

  const ordered = catalog.filter((item) => item.id !== primary);

  // Prioritize tools most relevant to current state (excluding primary)
  const priority: IntelligencePrimaryAction[] =
    primary === 'ats'
      ? ['tailor', 'keywords', 'improve', 'wise-ai']
      : primary === 'keywords'
        ? ['tailor', 'improve', 'ats', 'wise-ai']
        : primary === 'tailor'
          ? ['keywords', 'ats', 'improve', 'wise-ai']
          : ['tailor', 'keywords', 'ats', 'wise-ai'];

  const sorted = [...ordered].sort(
    (a, b) => priority.indexOf(a.id) - priority.indexOf(b.id),
  );

  return sorted.slice(0, 3);
}

export function buildIntelligenceActivity(limit = 6): ActivityFeedItem[] {
  const events = useWorkspaceActivityStore.getState().getRecent(limit);
  return buildActivityFeedFromLog(events, limit);
}
