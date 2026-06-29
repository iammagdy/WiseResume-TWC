import { buildActivityFeedFromLog } from '@/components/dashboard/dashboardActivityLabels';
import type { ActivityFeedItem } from '@/components/dashboard/dashboardActivityLabels';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { DatabaseResume } from '@/hooks/useResumes';
import { useWorkspaceActivityStore } from '@/store/workspaceActivityStore';

export type { ActivityFeedItem };

const CATEGORY_KEYS: Record<keyof ResumeHealthScore['categories'], string> = {
  keywordOptimization: 'app.dashboardPage.categories.keywordOptimization',
  contentQuality: 'app.dashboardPage.categories.contentQuality',
  sectionStructure: 'app.dashboardPage.categories.sectionStructure',
  parsability: 'app.dashboardPage.categories.parsability',
  contactCompleteness: 'app.dashboardPage.categories.contactCompleteness',
  lengthDensity: 'app.dashboardPage.categories.lengthDensity',
  templateFriendliness: 'app.dashboardPage.categories.templateFriendliness',
};

const CATEGORY_DEFAULTS: Record<keyof ResumeHealthScore['categories'], string> = {
  keywordOptimization: 'Keyword match',
  contentQuality: 'Work experience impact',
  sectionStructure: 'Section structure',
  parsability: 'ATS parsability',
  contactCompleteness: 'Contact completeness',
  lengthDensity: 'Resume length',
  templateFriendliness: 'Template compatibility',
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
      badge: t('app.dashboardPage.notScanned', 'Not scanned'),
      opportunityTitle: t('app.dashboardPage.runFirstScan', 'Run your first ATS scan'),
      opportunity: t('app.dashboardPage.notScannedDesc', '“{{title}}” hasn\'t been scored yet. Scan once to unlock keyword gaps, weak bullets, and a ranked fix list.', { title }),
      primaryAction: 'ats',
      cta: t('app.dashboardPage.scanPortfolio', 'Scan portfolio'),
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
      badge: t('app.dashboardPage.atsScore', 'ATS {{score}}%', { score }),
      opportunityTitle: t('app.dashboardPage.keywordGapsCount', '{{count}} keyword gaps', { count: gapCount }),
      opportunity: t('app.dashboardPage.keywordGapsDesc', '“{{title}}” is at {{score}}% ATS. Prioritize: {{preview}}{{ellipsis}} for the fastest lift.', { title, score, preview, ellipsis: gapCount > 3 ? '…' : '' }),
      primaryAction: 'keywords',
      cta: t('app.dashboardPage.reviewGaps', 'Review gaps'),
      showImpact: true,
    };
  }

  if (score >= 85) {
    return {
      badge: t('app.dashboardPage.atsScore', 'ATS {{score}}%', { score }),
      opportunityTitle: t('app.dashboardPage.portfolioStrong', 'Portfolio is in strong shape'),
      opportunity: t('app.dashboardPage.portfolioStrongDesc', '“{{title}}” scores {{score}}% ({{topStrength}}). Tailor a copy for your next application to stay ahead.', { title, score, topStrength: healthScore.topStrength || '' }),
      primaryAction: 'tailor',
      cta: t('app.dashboardPage.tailorToJob', 'Tailor to job'),
      showImpact: false,
    };
  }

  const weakCount = healthScore.weakBullets?.length ?? 0;
  if (weakCount >= 2) {
    return {
      badge: t('app.dashboardPage.atsScore', 'ATS {{score}}%', { score }),
      opportunityTitle: t('app.dashboardPage.weakBulletsCount', '{{count}} bullets need metrics', { count: weakCount }),
      opportunity: t('app.dashboardPage.weakBulletsDesc', '“{{title}}” has experience lines without strong action verbs or numbers. Fix these first for a faster ATS lift.', { title }),
      primaryAction: 'improve',
      cta: t('app.dashboardPage.fixBullets', 'Fix bullets now'),
      showImpact: true,
    };
  }

  const weakestCategoryTitle = t(CATEGORY_KEYS[weakestEntry[0]], CATEGORY_DEFAULTS[weakestEntry[0]]);
  return {
    badge: t('app.dashboardPage.atsScore', 'ATS {{score}}%', { score }),
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
      label: unscoredCount > 0 ? t('app.dashboardPage.quickActions.atsLabelCount', 'ATS scan ({{count}} pending)', { count: unscoredCount }) : t('app.dashboardPage.quickActions.atsLabel', 'Portfolio ATS'),
      description:
        atsAverage != null
          ? t('app.dashboardPage.quickActions.atsDescCount', 'Avg {{score}}% · {{count}} resumes', { score: Math.round(atsAverage), count: resumes.length })
          : t('app.dashboardPage.quickActions.atsDesc', 'Scores and weakest areas per resume'),
    },
    {
      id: 'improve',
      label: weakCount > 0 ? t('app.dashboardPage.quickActions.improveLabelCount', 'Fix {{count}} weak bullets', { count: weakCount }) : t('app.dashboardPage.quickActions.improveLabel', 'Experience fix plan'),
      description: t('app.dashboardPage.quickActions.improveDesc', 'Category scores and bullet improvements'),
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
