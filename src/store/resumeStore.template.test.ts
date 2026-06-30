import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.unmock('@/store/resumeStore');
import { useResumeStore } from './resumeStore';
import type { ResumeData } from '@/types/resume';

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
});
