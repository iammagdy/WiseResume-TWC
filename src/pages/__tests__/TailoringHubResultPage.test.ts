import { describe, expect, it } from 'vitest';

import { resolveTailoringResultState } from '@/pages/TailoringHubResultPage';

describe('resolveTailoringResultState', () => {
  it('returns an empty state when persisted metadata is missing or delayed', () => {
    expect(
      resolveTailoringResultState({
        locationState: null,
        tailorHistory: [],
        resumeId: 'resume-1',
      }),
    ).toEqual({});
  });

  it('uses persisted tailored resume metadata when it is available later', () => {
    expect(
      resolveTailoringResultState({
        locationState: null,
        tailorHistory: [],
        resumeId: 'resume-1',
        resumeMetadata: {
          jobTitle: 'Frontend Engineer',
          company: 'Acme',
          jobUrl: 'https://example.com/job',
          scoreBeforeAfter: { before: 55, after: 78 },
          appliedSections: ['summary', 'experience'],
          createdAt: '2026-07-21T00:00:00.000Z',
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
