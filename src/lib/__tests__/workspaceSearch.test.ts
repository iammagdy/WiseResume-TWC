import { describe, expect, it } from 'vitest';
import { splitByQuery } from '@/components/ui/SearchHighlight';
import { getResumeSearchParts, searchResumes, searchWorkspaceItems } from '@/lib/workspaceSearch';
import type { DatabaseResume } from '@/hooks/useResumes';

const resume = (overrides: Partial<DatabaseResume>): DatabaseResume => ({
  $id: 'r1',
  user_id: 'u1',
  title: 'Software Engineer CV',
  template: 'modern',
  summary: 'Built scalable APIs with Node.js',
  skills: JSON.stringify(['React', 'TypeScript']),
  target_job_title: 'Backend Engineer',
  target_company: 'Acme',
  $createdAt: '2026-01-01T00:00:00.000Z',
  $updatedAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

describe('splitByQuery', () => {
  it('highlights all matches case-insensitively', () => {
    expect(splitByQuery('React Engineer react', 'react')).toEqual([
      { text: 'React', match: true },
      { text: ' Engineer ', match: false },
      { text: 'react', match: true },
    ]);
  });
});

describe('workspaceSearch', () => {
  it('finds resumes by title, target job, and skills', () => {
    const results = searchResumes([resume({})], 'typescript');
    expect(results).toHaveLength(1);
    expect(results[0]?.label).toContain('Software Engineer');
  });

  it('finds workspace tools by keyword', () => {
    const results = searchWorkspaceItems('tailor');
    expect(results.some((item) => item.id === 'tailor')).toBe(true);
    expect(results.some((item) => item.id === 'tailoring-hub')).toBe(true);
  });

  it('extracts searchable resume parts', () => {
    const parts = getResumeSearchParts(resume({}));
    expect(parts).toEqual(
      expect.arrayContaining(['Software Engineer CV', 'Backend Engineer', 'Acme', 'React', 'TypeScript']),
    );
  });
});
