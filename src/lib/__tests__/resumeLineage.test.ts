import { describe, expect, it } from 'vitest';
import { isNormalResume, isTailoredResume } from '@/lib/resumeLineage';
import type { DatabaseResume } from '@/hooks/useResumes';

const base = (overrides: Partial<DatabaseResume>): DatabaseResume => ({
  $id: 'resume-1',
  user_id: 'user-1',
  title: 'My Resume',
  template: 'modern',
  $createdAt: '2026-01-01T00:00:00.000Z',
  $updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('resumeLineage', () => {
  it('detects parent-linked tailored resumes', () => {
    const resume = base({ parent_resume_id: 'master-1' });
    expect(isTailoredResume(resume)).toBe(true);
    expect(isNormalResume(resume)).toBe(false);
  });

  it('detects tailored resumes from history ids', () => {
    const resume = base({ $id: 'tailored-1' });
    expect(isTailoredResume(resume, new Set(['tailored-1']))).toBe(true);
  });

  it('detects tailored resumes from title patterns', () => {
    expect(isTailoredResume(base({ title: 'Jane Doe — Engineer @ Acme (Tailored)' }))).toBe(true);
    expect(isTailoredResume(base({ title: 'Jane Doe - Tailored for Engineer @ Acme' }))).toBe(true);
    expect(isTailoredResume(base({ title: 'Jane Doe - Tailored' }))).toBe(true);
  });

  it('treats plain resumes as normal', () => {
    const resume = base({});
    expect(isNormalResume(resume)).toBe(true);
    expect(isTailoredResume(resume)).toBe(false);
  });
});
