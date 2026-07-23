/**
 * Tests for tailorMerge.ts ΓÇö meaningful change detection and resume merging
 * F-1: Guardrail against unchanged AI output in Tailoring Hub
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  hasMeaningfulChanges,
  buildMergedResume,
  type ChangeSummary,
} from '@/lib/tailorMerge';
import type { ResumeData, SuperTailorResult, TailorSectionId } from '@/types/resume';

const mockResume: ResumeData = {
  id: 'test-resume',
  contactInfo: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
  },
  summary: 'Experienced software engineer with 5 years in web development.',
  experience: [
    {
      id: 'exp-1',
      company: 'Tech Corp',
      position: 'Senior Developer',
      startDate: '2020-01',
      endDate: '',
      current: true,
      description: 'Leading frontend development team.',
      achievements: ['Built React app', 'Improved performance by 50%'],
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'State University',
      degree: 'BS',
      field: 'Computer Science',
      startDate: '2015-09',
      endDate: '2019-05',
    },
  ],
  skills: ['JavaScript', 'React', 'TypeScript'],
  certifications: [],
  projects: [],
  awards: [],
  templateId: 'modern',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

describe('normalizeText', () => {
  it('trims whitespace', () => {
    expect(normalizeText('  hello world  ')).toBe('hello world');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeText('hello    world')).toBe('hello world');
  });

  it('lowercases text', () => {
    expect(normalizeText('Hello World')).toBe('hello world');
  });

  it('removes punctuation', () => {
    expect(normalizeText('hello, world!')).toBe('hello world');
  });

  it('handles null/undefined', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });

  it('normalizes equivalent strings with different punctuation', () => {
    expect(normalizeText('React.js')).toBe(normalizeText('react js'));
    expect(normalizeText('AI/ML')).toBe(normalizeText('ai ml'));
  });
});

describe('hasMeaningfulChanges', () => {
  const allSections: TailorSectionId[] = [
    'summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards',
  ];

  it('returns hasChanges: false for identical resumes', () => {
    const result = hasMeaningfulChanges(mockResume, mockResume, allSections);
    expect(result.hasChanges).toBe(false);
    expect(result.changedSections).toEqual([]);
    expect(result.description).toBe('No meaningful changes detected');
  });

  it('detects summary change', () => {
    const tailored = {
      ...mockResume,
      summary: 'Senior software engineer specializing in React and TypeScript.',
    };
    const result = hasMeaningfulChanges(mockResume, tailored, allSections);
    expect(result.hasChanges).toBe(true);
    expect(result.summaryChanged).toBe(true);
    expect(result.changedSections).toContain('summary');
    expect(result.description).toContain('professional summary');
  });

  it('ignores whitespace-only summary changes', () => {
    const tailored = {
      ...mockResume,
      summary: `  ${mockResume.summary}  `,
    };
    const result = hasMeaningfulChanges(mockResume, tailored, allSections);
    expect(result.hasChanges).toBe(false);
    expect(result.summaryChanged).toBe(false);
  });

  it('ignores case-only summary changes', () => {
    const tailored = {
      ...mockResume,
      summary: mockResume.summary.toUpperCase(),
    };
    const result = hasMeaningfulChanges(mockResume, tailored, allSections);
    expect(result.hasChanges).toBe(false);
    expect(result.summaryChanged).toBe(false);
  });

  it('ignores punctuation-only summary changes', () => {
    const tailored = {
      ...mockResume,
      summary: mockResume.summary.replace(/\./g, '!'),
    };
    const result = hasMeaningfulChanges(mockResume, tailored, allSections);
    expect(result.hasChanges).toBe(false);
    expect(result.summaryChanged).toBe(false);
  });

  it('detects skills change', () => {
    const tailored = {
      ...mockResume,
      skills: ['JavaScript', 'React', 'TypeScript', 'Node.js'],
    };
    const result = hasMeaningfulChanges(mockResume, tailored, allSections);
    expect(result.hasChanges).toBe(true);
    expect(result.skillsChanged).toBe(true);
    expect(result.changedSections).toContain('skills');
    expect(result.description).toContain('skills');
  });

  it('ignores skill reordering as meaningful change', () => {
    const tailored = {
      ...mockResume,
      skills: [...mockResume.skills].reverse(),
    };
    const result = hasMeaningfulChanges(mockResume, tailored, allSections);
    expect(result.hasChanges).toBe(false);
    expect(result.skillsChanged).toBe(false);
  });

  it('ignores skill case changes', () => {
    const tailored = {
      ...mockResume,
      skills: mockResume.skills.map(s => s.toUpperCase()),
    };
    const result = hasMeaningfulChanges(mockResume, tailored, allSections);
    expect(result.hasChanges).toBe(false);
    expect(result.skillsChanged).toBe(false);
  });

  it('detects experience bullet change', () => {
    const tailored = {
      ...mockResume,
      experience: [
        {
          ...mockResume.experience[0],
          achievements: ['Built React app with TypeScript', 'Improved performance by 50%'],
        },
      ],
    };
    const result = hasMeaningfulChanges(mockResume, tailored, allSections);
    expect(result.hasChanges).toBe(true);
    expect(result.experienceChanged).toBe(true);
    expect(result.changedSections).toContain('experience');
    expect(result.description).toContain('experience');
  });

  it('detects experience position change', () => {
    const tailored = {
      ...mockResume,
      experience: [
        {
          ...mockResume.experience[0],
          position: 'Lead Developer',
        },
      ],
    };
    const result = hasMeaningfulChanges(mockResume, tailored, allSections);
    expect(result.hasChanges).toBe(true);
    expect(result.experienceChanged).toBe(true);
  });

  it('ignores experience whitespace changes', () => {
    const tailored = {
      ...mockResume,
      experience: [
        {
          ...mockResume.experience[0],
          description: `  ${mockResume.experience[0].description}  `,
        },
      ],
    };
    const result = hasMeaningfulChanges(mockResume, tailored, allSections);
    expect(result.hasChanges).toBe(false);
    expect(result.experienceChanged).toBe(false);
  });

  it('detects education change', () => {
    const tailored = {
      ...mockResume,
      education: [
        {
          ...mockResume.education[0],
          degree: 'MS',
        },
      ],
    };
    const result = hasMeaningfulChanges(mockResume, tailored, allSections);
    expect(result.hasChanges).toBe(true);
    expect(result.educationChanged).toBe(true);
    expect(result.changedSections).toContain('education');
  });

  it('respects enabledSections filter', () => {
    const tailored = {
      ...mockResume,
      summary: 'Completely different summary.',
      skills: ['Python', 'Django'],
    };
    // Only check skills, not summary
    const result = hasMeaningfulChanges(mockResume, tailored, ['skills']);
    expect(result.hasChanges).toBe(true);
    expect(result.skillsChanged).toBe(true);
    expect(result.summaryChanged).toBe(false); // Not checked
    expect(result.changedSections).toEqual(['skills']);
  });

  it('returns hasChanges: false when no sections enabled', () => {
    const tailored = {
      ...mockResume,
      summary: 'Different summary.',
    };
    const result = hasMeaningfulChanges(mockResume, tailored, []);
    expect(result.hasChanges).toBe(false);
    expect(result.changedSections).toEqual([]);
  });

  it('handles missing optional fields', () => {
    const minimalResume: ResumeData = {
      ...mockResume,
      certifications: undefined as any,
      projects: undefined as any,
      awards: undefined as any,
    };
    const result = hasMeaningfulChanges(minimalResume, minimalResume, allSections);
    expect(result.hasChanges).toBe(false);
  });

  it('detects multiple section changes', () => {
    const tailored = {
      ...mockResume,
      summary: 'New summary.',
      skills: ['Python', 'Django', 'React'],
      experience: [
        {
          ...mockResume.experience[0],
          achievements: ['New achievement'],
        },
      ],
    };
    const result = hasMeaningfulChanges(mockResume, tailored, allSections);
    expect(result.hasChanges).toBe(true);
    expect(result.summaryChanged).toBe(true);
    expect(result.skillsChanged).toBe(true);
    expect(result.experienceChanged).toBe(true);
    expect(result.changedSections).toHaveLength(3);
    expect(result.description).toContain('professional summary');
    expect(result.description).toContain('skills');
    expect(result.description).toContain('experience');
  });

  it('generates correct description for single change', () => {
    const tailored = {
      ...mockResume,
      summary: 'New summary only.',
    };
    const result = hasMeaningfulChanges(mockResume, tailored, allSections);
    expect(result.description).toBe('professional summary updated');
  });

  it('generates correct description for no changes', () => {
    const result = hasMeaningfulChanges(mockResume, mockResume, allSections);
    expect(result.description).toBe('No meaningful changes detected');
  });
});

describe('buildMergedResume', () => {
  const mockTailorResult: SuperTailorResult = {
    summary: 'Tailored summary for product manager role.',
    skills: ['Product Management', 'Agile', 'JIRA'],
    experience: [
      {
        id: 'exp-1',
        company: 'Tech Corp',
        position: 'Product Manager',
        startDate: '2020-01',
        endDate: '',
        current: true,
        description: 'Leading product development.',
        achievements: ['Launched 3 products', 'Increased revenue by 25%'],
      },
    ],
    education: [],
    projects: [],
    certifications: [],
    awards: [],
    keyChanges: ['Rewrote summary', 'Updated experience bullets'],
    sectionScores: null,
    overallScore: { before: 60, after: 85 },
    missingSkills: [],
    boostableSkills: [],
    jobParsed: { title: 'Product Manager', company: 'TechCorp', keyRequirements: [], niceToHaves: [] },
  };

  it('merges summary when enabled', () => {
    const result = buildMergedResume(mockResume, mockTailorResult, ['summary']);
    expect(result.summary).toBe(mockTailorResult.summary);
  });

  it('preserves original summary when disabled', () => {
    const result = buildMergedResume(mockResume, mockTailorResult, ['skills']);
    expect(result.summary).toBe(mockResume.summary);
  });

  it('merges skills when enabled', () => {
    const result = buildMergedResume(mockResume, mockTailorResult, ['skills']);
    expect(result.skills).toEqual([
      ...mockTailorResult.skills,
      'JavaScript',
      'React',
      'TypeScript',
    ]);
  });

  it('merges experience when enabled', () => {
    const result = buildMergedResume(mockResume, mockTailorResult, ['experience']);
    expect(result.experience[0].position).toBe('Product Manager');
    expect(result.experience[0].achievements).toEqual([
      'Launched 3 products',
      'Increased revenue by 25%',
    ]);
  });

  it('preserves original experience ID when merging', () => {
    const result = buildMergedResume(mockResume, mockTailorResult, ['experience']);
    expect(result.experience[0].id).toBe('exp-1');
  });

  it('applies rejected bullets when provided', () => {
    const rejectedBullets = new Set(['exp-1-0']); // Reject first bullet of exp-1
    const result = buildMergedResume(
      mockResume,
      {
        ...mockTailorResult,
        bulletTransformations: [
          {
            experienceId: 'exp-1',
            bulletIndex: 0,
            originalBullet: 'Built React app',
            enhancedBullet: 'Launched 3 products',
            improvement: 'Made more specific with metrics',
            metricsAdded: true,
          },
        ],
      },
      ['experience'],
      rejectedBullets
    );
    expect(result.experience[0].achievements[0]).toBe('Built React app');
  });

  it('preserves source project metadata when reordered AI projects omit or blank it', () => {
    const resumeWithProjects: ResumeData = {
      ...mockResume,
      projects: [
        {
          id: 'project-current',
          name: 'Atlas Console',
          role: 'Lead Developer',
          startDate: '2024-02',
          endDate: '',
          current: true,
          technologies: ['React', 'TypeScript'],
          description: 'Built an internal operations console.',
          url: 'https://example.com/atlas',
          githubUrl: 'https://github.com/example/atlas',
        },
        {
          id: 'project-complete',
          name: 'Signal API',
          role: 'Backend Developer',
          startDate: '2022-03',
          endDate: '2023-07',
          current: false,
          technologies: ['Node.js'],
          description: 'Built an event ingestion API.',
          url: 'https://example.com/signal',
        },
      ],
    };
    const tailoredProjects = [
      {
        id: 'project-complete',
        name: 'Signal API',
        role: 'Backend Developer',
        startDate: null,
        endDate: '',
        current: true,
        technologies: [],
        description: 'Built a resilient event ingestion API for high-volume workloads.',
        url: '',
      },
      {
        id: 'project-current',
        name: 'Atlas Console',
        role: 'Lead Developer',
        technologies: ['React', 'TypeScript', 'Accessibility'],
        description: 'Led delivery of an accessible operations console.',
      },
    ] as unknown as NonNullable<SuperTailorResult['projects']>;

    const result = buildMergedResume(
      resumeWithProjects,
      { ...mockTailorResult, projects: tailoredProjects },
      ['projects'],
    );

    expect(result.projects).toEqual([
      {
        ...resumeWithProjects.projects![0],
        technologies: ['React', 'TypeScript', 'Accessibility'],
        description: 'Led delivery of an accessible operations console.',
      },
      {
        ...resumeWithProjects.projects![1],
        description: 'Built a resilient event ingestion API for high-volume workloads.',
      },
    ]);
    expect(result.experience).toEqual(resumeWithProjects.experience);
    expect(result.education).toEqual(resumeWithProjects.education);
  });

  it('uses unique name and role fallback only when AI project IDs are absent', () => {
    const duplicateNames: ResumeData = {
      ...mockResume,
      projects: [
        {
          id: 'project-web',
          name: 'Launchpad',
          role: 'Frontend Developer',
          startDate: '2023-01',
          endDate: '2023-08',
          current: false,
          technologies: ['React'],
          description: 'Built the web application.',
        },
        {
          id: 'project-api',
          name: 'Launchpad',
          role: 'Backend Developer',
          startDate: '2023-02',
          endDate: '',
          current: true,
          technologies: ['Node.js'],
          description: 'Built the API.',
        },
      ],
    };
    const projectsWithoutIds = [
      {
        id: '',
        name: 'Launchpad',
        role: 'Backend Developer',
        description: 'Scaled the API for production traffic.',
        technologies: ['Node.js', 'PostgreSQL'],
      },
      {
        id: '',
        name: 'Launchpad',
        role: 'Frontend Developer',
        description: 'Improved the web application experience.',
        technologies: ['React', 'TypeScript'],
      },
      {
        id: 'ai-only',
        name: 'Invented Project',
        role: 'Owner',
        description: 'This must not be added.',
        technologies: ['Unknown'],
      },
    ] as unknown as NonNullable<SuperTailorResult['projects']>;

    const result = buildMergedResume(
      duplicateNames,
      { ...mockTailorResult, projects: projectsWithoutIds },
      ['projects'],
    );

    expect(result.projects).toHaveLength(2);
    expect(result.projects?.map((project) => project.id)).toEqual(['project-web', 'project-api']);
    expect(result.projects?.map((project) => project.description)).toEqual([
      'Improved the web application experience.',
      'Scaled the API for production traffic.',
    ]);
    expect(result.projects?.map((project) => [project.startDate, project.endDate, project.current])).toEqual([
      ['2023-01', '2023-08', false],
      ['2023-02', '', true],
    ]);
  });

  it('does not cross-merge ambiguous projects or append AI-only projects', () => {
    const ambiguousProjects: ResumeData = {
      ...mockResume,
      projects: [
        {
          id: 'project-a',
          name: 'Client Portal',
          role: 'Developer',
          startDate: '2021-01',
          endDate: '2021-05',
          current: false,
          technologies: ['React'],
          description: 'Original project A.',
        },
        {
          id: 'project-b',
          name: 'Client Portal',
          role: 'Developer',
          startDate: '2022-01',
          endDate: '2022-05',
          current: false,
          technologies: ['Vue'],
          description: 'Original project B.',
        },
      ],
    };
    const ambiguousAiProjects = [
      {
        id: '',
        name: 'Client Portal',
        role: 'Developer',
        description: 'Ambiguous rewrite.',
        technologies: ['Unknown'],
      },
      {
        id: 'unknown-project',
        name: 'AI-only Project',
        role: 'Developer',
        description: 'Invented rewrite.',
        technologies: ['Unknown'],
      },
    ] as unknown as NonNullable<SuperTailorResult['projects']>;

    const result = buildMergedResume(
      ambiguousProjects,
      { ...mockTailorResult, projects: ambiguousAiProjects },
      ['projects'],
    );

    expect(result.projects).toEqual(ambiguousProjects.projects);
  });

  it('does not create projects when the source resume has none', () => {
    const aiOnlyProject = [{
      id: 'ai-only',
      name: 'Invented Project',
      role: 'Developer',
      startDate: '2026-01',
      endDate: '',
      current: true,
      technologies: ['React'],
      description: 'Invented content.',
    }];

    const result = buildMergedResume(
      mockResume,
      { ...mockTailorResult, projects: aiOnlyProject },
      ['projects'],
    );

    expect(result.projects).toEqual([]);
  });
});
