import { describe, expect, it } from 'vitest';

import { resolveTailoringResultState } from '@/pages/TailoringHubResultPage';

describe('resolveTailoringResultState', () => {
  it('returns an empty state when tailor_history is missing or delayed', () => {
    expect(
      resolveTailoringResultState({
        locationState: null,
        tailorHistory: [],
        resumeId: 'resume-1',
        appwriteEntry: null,
      }),
    ).toEqual({});
  });

  it('uses persisted appwrite history when it is available later', () => {
    expect(
      resolveTailoringResultState({
        locationState: null,
        tailorHistory: [],
        resumeId: 'resume-1',
        appwriteEntry: {
          job_title: 'Frontend Engineer',
          company: 'Acme',
          job_url: 'https://example.com/job',
          score_before: 55,
          score_after: 78,
          applied_sections: '["summary","experience"]',
        },
      }),
    ).toEqual({
      jobTitle: 'Frontend Engineer',
      company: 'Acme',
      jobUrl: 'https://example.com/job',
      scoreBeforeAfter: { before: 55, after: 78 },
      appliedSections: ['summary', 'experience'],
    });
  });
});
