import { describe, it, expect } from 'vitest';
import { dbToResumeData, resumeDataToDb } from '../useResumes';
import { DEFAULT_RESUME_TEMPLATE_ID } from '@/lib/defaultTemplate';
import type { ResumeData } from '@/types/resume';

// B2: WiseResume white/crimson template must be the default whenever no template
// is explicitly stored; user-selected and legacy ids must be preserved/migrated.
describe('dbToResumeData — default template (B2)', () => {
  const base = { $id: 'r1', $createdAt: '', $updatedAt: '', title: 'T' };

  it('defaults to wiseresume-classic when template is missing/empty', () => {
    expect(dbToResumeData({ ...base, template: '' }).templateId).toBe(DEFAULT_RESUME_TEMPLATE_ID);
    expect(dbToResumeData({ ...base, template: null }).templateId).toBe(DEFAULT_RESUME_TEMPLATE_ID);
    expect(dbToResumeData({ ...base }).templateId).toBe(DEFAULT_RESUME_TEMPLATE_ID);
    expect(DEFAULT_RESUME_TEMPLATE_ID).toBe('wiseresume-classic');
  });

  it('preserves an explicit user-selected template', () => {
    expect(dbToResumeData({ ...base, template: 'executive' }).templateId).toBe('executive');
    expect(dbToResumeData({ ...base, template: 'modern' }).templateId).toBe('modern');
  });

  it('migrates a known legacy template id', () => {
    // 'corporate' is a legacy alias → 'classic'
    expect(dbToResumeData({ ...base, template: 'corporate' }).templateId).toBe('classic');
  });

  it('falls back to default for an unknown template id', () => {
    expect(dbToResumeData({ ...base, template: 'does-not-exist' }).templateId).toBe(DEFAULT_RESUME_TEMPLATE_ID);
  });
});

describe('resumeDataToDb — default template (B2)', () => {
  const resume = { templateId: undefined } as unknown as ResumeData;

  it('writes the WiseResume default when no template chosen', () => {
    expect(resumeDataToDb(resume, 'u1').template).toBe(DEFAULT_RESUME_TEMPLATE_ID);
  });

  it('writes a user-selected template unchanged', () => {
    expect(resumeDataToDb({ ...resume, templateId: 'executive' } as ResumeData, 'u1').template).toBe('executive');
  });
});
