import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.unmock('@/store/resumeStore');
import { hydrateResumeStoreForUser, useResumeStore } from './resumeStore';
import type { ResumeData } from '@/types/resume';
import { DEFAULT_RESUME_TEMPLATE_ID } from '@/lib/defaultTemplate';

const resume = {
  id: 'resume-1',
  title: 'Resume',
  templateId: 'classic',
  contactInfo: { fullName: 'Jane', email: '', phone: '', location: '' },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  certifications: [],
} as ResumeData;

describe('resume store template synchronization', () => {
  beforeEach(() => {
    useResumeStore.setState({ currentResume: null, selectedTemplate: 'modern' });
  });

  it('selects the resume saved template whenever a resume is loaded', () => {
    useResumeStore.getState().setCurrentResume(resume);

    expect(useResumeStore.getState().selectedTemplate).toBe('classic');
  });

  it('hydrates drafts and tailoring history from the active account namespace only', async () => {
    localStorage.clear();

    await hydrateResumeStoreForUser('user-a');
    useResumeStore.getState().setSelectedTemplate('modern');

    await hydrateResumeStoreForUser('user-b');
    expect(useResumeStore.getState().selectedTemplate).toBe(DEFAULT_RESUME_TEMPLATE_ID);
    useResumeStore.getState().setSelectedTemplate('minimal');

    await hydrateResumeStoreForUser('user-a');
    expect(useResumeStore.getState().selectedTemplate).toBe('modern');
  });
});
