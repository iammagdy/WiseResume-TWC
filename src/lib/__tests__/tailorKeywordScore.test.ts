import { describe, expect, it } from 'vitest';
import { calculateTailorKeywordScores } from '@/lib/tailorKeywordScore';
import type { ResumeData } from '@/types/resume';

const makeResume = (skills: string[]): ResumeData => ({
  contactInfo: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-1234',
    location: 'Cairo, Egypt',
  },
  summary: 'Software engineer building reliable web applications.',
  experience: [{
    id: 'exp-1',
    company: 'Example Co',
    position: 'Software Engineer',
    startDate: '2022-01',
    endDate: '',
    current: true,
    description: 'Built accessible web applications.',
    achievements: ['Improved application performance'],
  }],
  education: [{
    id: 'edu-1',
    institution: 'Example University',
    degree: 'BSc',
    field: 'Computer Science',
    startDate: '2018-09',
    endDate: '2022-06',
  }],
  skills,
  certifications: [],
  templateId: 'modern',
});

describe('calculateTailorKeywordScores', () => {
  it('returns no comparison when the job description is blank', () => {
    expect(calculateTailorKeywordScores(makeResume(['React']), makeResume(['React']), '   ')).toBeNull();
  });

  it('matches the deterministic parser scores for the same inputs', () => {
    const original = makeResume(['React']);
    const tailored = makeResume(['React', 'TypeScript', 'Kubernetes']);
    const jobDescription = 'React TypeScript Kubernetes engineer';

    const first = calculateTailorKeywordScores(original, tailored, jobDescription);
    const second = calculateTailorKeywordScores(original, tailored, jobDescription);

    expect(first).toEqual(second);
    expect(first).not.toBeNull();
    expect(first?.after).toBeGreaterThanOrEqual(first?.before ?? 0);
    expect(first?.before).toBeGreaterThanOrEqual(0);
    expect(first?.after).toBeLessThanOrEqual(100);
  });
});
