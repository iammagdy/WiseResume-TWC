import { describe, expect, it } from 'vitest';

import {
  sliceResumeForCompareSection,
  tailorSectionHasChanges,
} from '@/lib/tailorSectionSlice';
import type { ResumeData } from '@/types/resume';

const resume: ResumeData = {
  id: 'r1',
  templateId: 'modern',
  title: 'CV',
  summary: 'Original summary',
  contactInfo: {
    fullName: 'Jane',
    email: 'jane@example.com',
    phone: '1',
    location: 'Cairo',
  },
  skills: ['React', 'TypeScript'],
  experience: [
    {
      id: 'e1',
      company: 'Acme',
      position: 'Engineer',
      startDate: '2022',
      endDate: 'Present',
      current: true,
      description: 'Built apps',
      achievements: ['Shipped v1'],
    },
  ],
  education: [],
  certifications: [],
  awards: [],
  projects: [{ id: 'p1', name: 'Wise Hire', role: 'Founder', description: 'ATS tool' }],
  publications: [],
  volunteering: [],
  hobbies: [],
  references: [],
  languages: [],
};

describe('sliceResumeForCompareSection', () => {
  it('keeps only the selected section data', () => {
    const sliced = sliceResumeForCompareSection(resume, 'summary');
    expect(sliced.summary).toBe('Original summary');
    expect(sliced.skills).toEqual([]);
    expect(sliced.experience).toEqual([]);
    expect(sliced.projects).toEqual([]);
  });

  it('detects summary changes', () => {
    const tailored = { ...resume, summary: 'Tailored summary' };
    expect(tailorSectionHasChanges('summary', resume, tailored)).toBe(true);
    expect(tailorSectionHasChanges('skills', resume, tailored)).toBe(false);
  });
});
