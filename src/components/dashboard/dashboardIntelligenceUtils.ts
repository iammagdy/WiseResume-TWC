import { buildActivityFeedFromLog } from '@/components/dashboard/dashboardActivityLabels';
import type { ActivityFeedItem } from '@/components/dashboard/dashboardActivityLabels';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { DatabaseResume } from '@/hooks/useResumes';
import { useWorkspaceActivityStore } from '@/store/workspaceActivityStore';

export type { ActivityFeedItem };

const CATEGORY_TITLES: Record<keyof ResumeHealthScore['categories'], string> = {
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
): IntelligenceSignals {
  const title = featuredResume?.title?.trim() || 'your active resume';

  if (!healthScore || healthScore.overallScore <= 0) {
    return {
      badge: 'Not scanned',
      opportunityTitle: 'Run your first ATS scan',
      opportunity: `“${title}” hasn't been scored yet. Scan once to unlock keyword gaps, weak bullets, and a ranked fix list.`,
      primaryAction: 'ats',
      cta: 'Scan portfolio',
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
      badge: `ATS ${score}%`,
      opportunityTitle: `${gapCount} keyword gaps`,
      opportunity: `“${title}” is at ${score}% ATS. Prioritize: ${preview}${gapCount > 3 ? '…' : ''} for the fastest lift.`,
      primaryAction: 'keywords',
      cta: 'Review gaps',
      showImpact: true,
    };
  }

  if (score >= 85) {
    return {
      badge: `ATS ${score}%`,
      opportunityTitle: 'Portfolio is in strong shape',
      opportunity: `“${title}” scores ${score}% (${healthScore.topStrength}). Tailor a copy for your next application to stay ahead.`,
      primaryAction: 'tailor',
      cta: 'Tailor to job',
      showImpact: false,
    };
  }

  const weakCount = healthScore.weakBullets?.length ?? 0;
  if (weakCount >= 2) {
    return {
      badge: `ATS ${score}%`,
      opportunityTitle: `${weakCount} bullets need metrics`,
      opportunity: `“${title}” has experience lines without strong action verbs or numbers. Fix these first for a faster ATS lift.`,
      primaryAction: 'improve',
      cta: 'Fix bullets now',
      showImpact: true,
    };
  }

  return {
    badge: `ATS ${score}%`,
    opportunityTitle: CATEGORY_TITLES[weakestEntry[0]],
    opportunity: healthScore.topImprovement || `Improve ${CATEGORY_TITLES[weakestEntry[0]].toLowerCase()} on “${title}”.`,
    primaryAction: 'improve',
    cta: 'View fix plan',
    showImpact: weakestEntry[1] < 75,
  };
}

export function buildIntelligenceQuickActions(
  signals: IntelligenceSignals,
  healthScore: ResumeHealthScore | null | undefined,
  healthScores: Record<string, ResumeHealthScore>,
  resumes: DatabaseResume[],
  atsAverage: number | null,
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
      label: 'Import job posting',
      description: 'Paste a listing URL to start tailoring',
    },
    {
      id: 'keywords',
      label: gapTotal > 0 ? `Keyword gaps (${gapTotal})` : 'Keyword gaps',
      description: gapTotal > 0 ? 'Terms missing across your resumes' : 'Scan for missing role keywords',
    },
    {
      id: 'ats',
      label: unscoredCount > 0 ? `ATS scan (${unscoredCount} pending)` : 'Portfolio ATS',
      description:
        atsAverage != null
          ? `Avg ${Math.round(atsAverage)}% · ${resumes.length} resume${resumes.length !== 1 ? 's' : ''}`
          : 'Scores and weakest areas per resume',
    },
    {
      id: 'improve',
      label: weakCount > 0 ? `Fix ${weakCount} weak bullets` : 'Experience fix plan',
      description: 'Category scores and bullet improvements',
    },
    {
      id: 'wise-ai',
      label: 'Ask Wise AI',
      description: 'Rewrite bullets or match a job description',
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
