import { describe, expect, it } from 'vitest';

import { buildMergedResume } from '@/lib/tailorMerge';
import type { ResumeData, SuperTailorResult } from '@/types/resume';

const baseResume: ResumeData = {
  id: 'resume-1',
  templateId: 'modern',
  title: 'Base Resume',
  summary: 'Original summary',
  contactInfo: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '123',
    location: 'Cairo',
  },
  skills: ['React'],
  experience: [
    {
      id: 'exp-1',
      company: 'Acme',
      position: 'Engineer',
      startDate: '2022',
      endDate: 'Present',
      current: true,
      description: 'Built features',
      achievements: ['Built dashboard'],
    },
    {
      id: 'exp-2',
      company: 'Globex',
      position: 'Senior Engineer',
      startDate: '2020',
      endDate: '2022',
      current: false,
      description: 'Led migrations',
      achievements: ['Improved performance'],
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'Ain Shams',
      degree: 'BSc',
      field: 'CS',
      startDate: '2016',
      endDate: '2020',
    },
  ],
  certifications: [],
  awards: [],
  projects: [],
  publications: [],
  volunteering: [],
  hobbies: [],
  references: [],
  languages: [],
};

function makeTailorResult(overrides: Partial<SuperTailorResult>): SuperTailorResult {
  return {
    summary: 'Tailored summary',
    skills: ['React', 'TypeScript'],
    experience: baseResume.experience,
    education: baseResume.education,
    certifications: [],
    awards: [],
    projects: [],
    keyChanges: [],
    sectionScores: null,
    overallScore: { before: 55, after: 78 },
    missingSkills: [],
    boostableSkills: [],
    jobParsed: { title: 'Frontend Engineer', company: 'Acme', keyRequirements: [], niceToHaves: [] },
    atsAnalysis: {
      criticalKeywords: [],
      stuffingWarnings: [],
      originalKeywordDensity: 0,
      optimizedKeywordDensity: 0,
    },
    interviewTalkingPoints: [],
    bulletTransformations: [],
    strengthsAnalysis: [],
    ...overrides,
  };
}

describe('buildMergedResume', () => {
  it('applies tailored experience changes when AI preserves ids', () => {
    const result = makeTailorResult({
      experience: [
        {
          ...baseResume.experience[0],
          description: 'Built measurable features',
          achievements: ['Raised activation by 18%'],
        },
        baseResume.experience[1],
      ],
    });

    const merged = buildMergedResume(baseResume, result, ['experience']);

    expect(merged.experience[0].id).toBe('exp-1');
    expect(merged.experience[0].achievements).toEqual(['Raised activation by 18%']);
    expect(merged.experience[1]).toEqual(baseResume.experience[1]);
  });

  it('applies tailored experience changes when AI omits ids but company and position still match', () => {
    const result = makeTailorResult({
      experience: [
        {
          ...baseResume.experience[0],
          id: '',
          description: 'Built measurable features',
          achievements: ['Raised activation by 18%'],
        },
        {
          ...baseResume.experience[1],
          id: '',
          description: 'Led major migrations',
          achievements: ['Reduced bundle size by 22%'],
        },
      ],
    });

    const merged = buildMergedResume(baseResume, result, ['experience']);

    expect(merged.experience[0].id).toBe('exp-1');
    expect(merged.experience[0].description).toBe('Built measurable features');
    expect(merged.experience[1].id).toBe('exp-2');
    expect(merged.experience[1].achievements).toEqual(['Reduced bundle size by 22%']);
  });

  it('merges skills so originals the AI dropped are kept', () => {
    const resumeWithSkills: ResumeData = {
      ...baseResume,
      skills: ['React', 'Python', 'Docker'],
    };
    const result = makeTailorResult({
      skills: ['Customer Service', 'React'],
    });

    const merged = buildMergedResume(resumeWithSkills, result, ['skills']);

    expect(merged.skills).toEqual(['Customer Service', 'React', 'Python', 'Docker']);
  });

  it('dedupes near-duplicate experience bullets', () => {
    const resumeWithExp: ResumeData = {
      ...baseResume,
      experience: [
        {
          id: 'exp-1',
          company: 'Acme',
          position: 'Lead',
          startDate: '2024',
          endDate: 'Present',
          current: true,
          description: 'Led team',
          achievements: ['Original bullet'],
        },
      ],
    };
    const result = makeTailorResult({
      experience: [
        {
          ...resumeWithExp.experience[0],
          achievements: [
            'Improved customer satisfaction ratings by 25% through effective team leadership',
            'Improved customer satisfaction ratings by 20% through effective team leadership',
            'Managed 14 representatives',
          ],
        },
      ],
    });

    const merged = buildMergedResume(resumeWithExp, result, ['experience']);
    expect(merged.experience[0].achievements).toHaveLength(2);
  });

  it('preserves original projects when AI returns a partial projects list', () => {
    const resumeWithProjects: ResumeData = {
      ...baseResume,
      projects: [
        {
          id: 'proj-1',
          name: 'Wise Quran',
          role: 'Founder',
          startDate: '2022',
          endDate: 'Present',
          technologies: ['Angular'],
          description: 'Original project one',
        },
        {
          id: 'proj-2',
          name: 'Wise Hire',
          role: 'Founder',
          startDate: '2023',
          endDate: 'Present',
          technologies: ['React'],
          description: 'Original project two',
        },
      ],
    };

    const result = makeTailorResult({
      projects: [
        {
          id: 'proj-1',
          name: 'Wise Quran',
          role: 'Founder',
          startDate: '2022',
          endDate: 'Present',
          technologies: ['Angular', 'Ionic'],
          description: 'Tailored project one with ATS keywords',
        },
      ],
    });

    const merged = buildMergedResume(resumeWithProjects, result, ['projects']);

    expect(merged.projects).toHaveLength(2);
    expect(merged.projects?.[0].description).toContain('Tailored');
    expect(merged.projects?.[1].name).toBe('Wise Hire');
    expect(merged.projects?.[1].description).toBe('Original project two');
  });
});
