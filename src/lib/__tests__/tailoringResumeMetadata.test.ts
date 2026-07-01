import { describe, expect, it } from 'vitest';
import {
  buildTailoringCustomization,
  historyFromTailoredResume,
} from '@/lib/tailoringResumeMetadata';

describe('tailoring resume metadata', () => {
  it('preserves existing customization while storing compact history metadata', () => {
    const result = buildTailoringCustomization(
      { fontScale: 0.95 },
      {
        sourceResumeId: 'source-1',
        jobTitle: 'Senior QA Engineer',
        company: 'Example Co',
        jobUrl: null,
        scoreBeforeAfter: { before: 50, after: 85 },
        appliedSections: ['summary', 'skills'],
        intensity: 'moderate',
        createdAt: '2026-07-02T00:00:00.000Z',
      },
    );

    expect(result.fontScale).toBe(0.95);
    expect(result.tailoring).toEqual(expect.objectContaining({
      sourceResumeId: 'source-1',
      jobTitle: 'Senior QA Engineer',
      scoreBeforeAfter: { before: 50, after: 85 },
    }));
  });

  it('maps persisted resume metadata into a history entry', () => {
    const history = historyFromTailoredResume({
      $id: 'tailored-1',
      $createdAt: '2026-07-02T00:00:00.000Z',
      customization: JSON.stringify({
        tailoring: {
          sourceResumeId: 'source-1',
          jobTitle: 'Senior QA Engineer',
          company: 'Example Co',
          jobUrl: null,
          scoreBeforeAfter: { before: 50, after: 85 },
          appliedSections: ['summary', 'skills'],
          intensity: 'moderate',
          createdAt: '2026-07-02T00:00:00.000Z',
        },
      }),
    });

    expect(history).toEqual({
      id: 'resume:tailored-1',
      jobTitle: 'Senior QA Engineer',
      company: 'Example Co',
      jobDescription: '',
      jobUrl: null,
      tailoredResumeId: 'tailored-1',
      scoreBeforeAfter: { before: 50, after: 85 },
      appliedSections: ['summary', 'skills'],
      createdAt: '2026-07-02T00:00:00.000Z',
    });
  });

  it('ignores ordinary resumes without tailoring metadata', () => {
    expect(historyFromTailoredResume({
      $id: 'resume-1',
      $createdAt: '2026-07-02T00:00:00.000Z',
      customization: JSON.stringify({ fontScale: 1 }),
    })).toBeNull();
  });
});
