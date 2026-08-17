import { describe, expect, it } from 'vitest';
import {
  buildIntelligenceQuickActions,
  buildIntelligenceSignals,
} from '@/components/dashboard/dashboardIntelligenceUtils';
import type { ResumeHealthScore } from '@/hooks/useResumeScore';
import type { DatabaseResume } from '@/hooks/useResumes';

const t = (
  key: string,
  fallbackOrVariables?: string | Record<string, string | number>,
  maybeVariables?: Record<string, string | number>,
) => {
  if (typeof fallbackOrVariables !== 'string') return key;
  const variables = maybeVariables ?? {};
  return fallbackOrVariables.replace(
    /\{\{(\w+)\}\}/g,
    (_match, name: string) => String(variables[name] ?? `{{${name}}}`),
  );
};

function makeScore(overrides: Partial<ResumeHealthScore> = {}): ResumeHealthScore {
  return {
    scoreBasis: 'resume-completeness-v1',
    overallScore: 72,
    categories: {
      contactCompleteness: 100,
      summaryCompleteness: 70,
      experienceCompleteness: 60,
      educationCompleteness: 80,
      skillsCompleteness: 50,
    },
    topStrength: 'Contact information is complete',
    topImprovement: 'Add relevant skills',
    scoredAt: '2026-08-17T00:00:00.000Z',
    ...overrides,
  };
}

function makeResume(id = 'resume-1'): DatabaseResume {
  return {
    $id: id,
    user_id: 'user-1',
    title: 'Product Resume',
    template: 'modern',
    $createdAt: '2026-08-16T00:00:00.000Z',
    $updatedAt: '2026-08-17T00:00:00.000Z',
  };
}

describe('dashboard intelligence truthfulness', () => {
  it('describes the unscored action as a resume check, not a portfolio check', () => {
    const signals = buildIntelligenceSignals(null, makeResume(), t);
    expect(signals.cta).toBe('Check resume');
    expect(signals.opportunity).toContain('local check');
  });

  it('explains a high score as section-based resume readiness', () => {
    const signals = buildIntelligenceSignals(
      makeScore({ overallScore: 91 }),
      makeResume(),
      t,
    );

    expect(signals.opportunityTitle).toBe('Resume is in strong shape');
    expect(signals.opportunity).toContain('based on section completion');
    expect(`${signals.badge} ${signals.opportunityTitle} ${signals.opportunity}`).not.toMatch(/ATS score|portfolio is/i);
  });

  it('asks for stronger evidence without claiming missing numbers can be generated', () => {
    const signals = buildIntelligenceSignals(
      makeScore({
        weakBullets: [
          { text: 'Worked on launches', reason: 'both' },
          { text: 'Responsible for reports', reason: 'both' },
        ],
      }),
      makeResume(),
      t,
    );

    expect(signals.opportunityTitle).toBe('2 bullets need stronger evidence');
    expect(signals.opportunity).toContain('verified outcomes');
    expect(signals.cta).toBe('Review bullets');
  });

  it('labels the score tool as resume readiness', () => {
    const resume = makeResume();
    const score = makeScore({ overallScore: 91 });
    const signals = buildIntelligenceSignals(score, resume, t);
    const actions = buildIntelligenceQuickActions(
      signals,
      score,
      { [resume.$id]: score },
      [resume],
      91,
      t,
    );

    expect(actions.find((action) => action.id === 'ats')?.label).toBe('Resume readiness');
  });
});
