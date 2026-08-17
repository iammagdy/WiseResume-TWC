import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: () => ({ showAIEnhancementTips: true }),
}));

import { useResumeNudges } from '@/hooks/useResumeNudges';
import type { ResumeData } from '@/types/resume';

function makeResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    contactInfo: {
      fullName: 'Jane Candidate',
      email: 'jane@example.com',
      phone: '+20 100 000 0000',
      location: 'Cairo',
      linkedin: 'https://www.linkedin.com/in/jane-candidate',
    },
    summary: 'Product leader who builds clear, reliable customer experiences across cross-functional teams.',
    experience: [
      {
        id: 'exp-1',
        company: 'Example Co',
        position: 'Product Manager',
        startDate: '2022-01',
        endDate: '',
        current: true,
        description: 'Led product launches and improved customer onboarding workflows.',
        achievements: [],
      },
    ],
    education: [
      {
        id: 'edu-1',
        institution: 'Cairo University',
        degree: 'BSc',
        field: 'Computer Science',
        startDate: '2017-09',
        endDate: '2021-06',
      },
    ],
    skills: ['Product Strategy', 'User Research', 'Roadmapping'],
    certifications: [],
    templateId: 'modern',
    ...overrides,
  };
}

describe('useResumeNudges evidence-first recommendations', () => {
  it('does not promise that AI will invent missing metrics', () => {
    const { result } = renderHook(() => useResumeNudges({ resume: makeResume() }));

    const sectionNudge = result.current.nudges.find((nudge) => nudge.trigger === 'no_metrics');
    expect(sectionNudge).toMatchObject({
      message: 'Strengthen outcomes with verified evidence.',
      actionLabel: 'Review Evidence',
      action: 'add_metrics',
    });
    expect(`${sectionNudge?.message} ${sectionNudge?.actionLabel}`).not.toMatch(/AI can add|quantifiable metrics/i);

    const entryNudge = result.current.getNudgesForExperience('exp-1')[0];
    expect(entryNudge).toMatchObject({
      message: 'Add a verified outcome or metric',
      actionLabel: 'Review',
      action: 'add_metrics',
    });
  });

  it('keeps priority ordering and dismisses section and entry nudges independently', () => {
    const resume = makeResume({ summary: '' });
    const { result } = renderHook(() => useResumeNudges({ resume }));

    expect(result.current.nudges[0]).toMatchObject({ trigger: 'empty_summary', priority: 'high' });
    expect(result.current.nudges.some((nudge) => nudge.trigger === 'no_metrics')).toBe(true);

    act(() => result.current.dismissNudge('no_metrics'));
    expect(result.current.nudges.some((nudge) => nudge.trigger === 'no_metrics')).toBe(false);
    expect(result.current.getNudgesForExperience('exp-1')).toHaveLength(1);

    act(() => result.current.dismissNudge('no_metrics_exp-1'));
    expect(result.current.getNudgesForExperience('exp-1')).toHaveLength(0);
  });
});
