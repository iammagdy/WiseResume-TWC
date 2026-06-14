/**
 * F-1 — TailoringHubPage validation logic tests
 * Tests the hasMeaningfulChanges integration and unchanged detection
 */
import { describe, it, expect } from 'vitest';
import { hasMeaningfulChanges, normalizeText } from '@/lib/tailorMerge';
import type { ResumeData, TailorSectionId } from '@/types/resume';

const mockOriginalResume: ResumeData = {
  id: 'test-resume',
  contactInfo: {
    fullName: 'Test User',
    email: 'test@example.com',
    phone: '',
    location: '',
  },
  summary: 'Software developer with 5 years experience.',
  experience: [
    {
      id: 'exp-1',
      company: 'Tech Corp',
      position: 'Developer',
      startDate: '2020-01',
      endDate: '',
      current: true,
      description: 'Building web applications',
      achievements: ['Built React app', 'Improved performance'],
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

const allSections: TailorSectionId[] = [
  'summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards',
];

describe('TailoringHubPage F-1: Meaningful change detection', () => {
  it('detects unchanged resume (identical content)', () => {
    const result = hasMeaningfulChanges(mockOriginalResume, mockOriginalResume, allSections);
    expect(result.hasChanges).toBe(false);
    expect(result.description).toBe('No meaningful changes detected');
  });

  it('detects zero-score scenario with unchanged content', () => {
    // AI returns same content with 0/0 scores
    const unchangedTailored = { ...mockOriginalResume };
    const changeSummary = hasMeaningfulChanges(mockOriginalResume, unchangedTailored, allSections);
    
    // Should detect no changes
    expect(changeSummary.hasChanges).toBe(false);
    
    // Combined with 0/0 scores, this should trigger the guard
    const scoreBefore: number = 0;
    const scoreAfter: number = 0;
    const hasZeroScore = scoreBefore === 0 && scoreAfter === 0;
    const appearsUnchanged = !changeSummary.hasChanges || hasZeroScore;
    expect(appearsUnchanged).toBe(true);
  });

  it('allows navigation when meaningful changes exist', () => {
    const tailoredResume: ResumeData = {
      ...mockOriginalResume,
      summary: 'Rewritten summary for product manager role.',
      skills: ['Product Management', 'Agile', 'React'],
    };
    
    const changeSummary = hasMeaningfulChanges(mockOriginalResume, tailoredResume, allSections);
    expect(changeSummary.hasChanges).toBe(true);
    expect(changeSummary.summaryChanged).toBe(true);
    expect(changeSummary.skillsChanged).toBe(true);
    
    // Should NOT trigger guard
    const hasZeroScore = false;
    const appearsUnchanged = !changeSummary.hasChanges || hasZeroScore;
    expect(appearsUnchanged).toBe(false);
  });

  it('blocks navigation when only whitespace/case changed', () => {
    const tailoredResume: ResumeData = {
      ...mockOriginalResume,
      summary: '  SOFTWARE DEVELOPER WITH 5 YEARS EXPERIENCE.  ', // Only case/whitespace change
    };
    
    const changeSummary = hasMeaningfulChanges(mockOriginalResume, tailoredResume, allSections);
    expect(changeSummary.hasChanges).toBe(false);
    expect(changeSummary.summaryChanged).toBe(false);
  });

  it('detects meaningful experience bullet changes', () => {
    const tailoredResume: ResumeData = {
      ...mockOriginalResume,
      experience: [
        {
          ...mockOriginalResume.experience[0],
          achievements: ['Architected scalable React application', 'Improved performance by 50%'],
        },
      ],
    };
    
    const changeSummary = hasMeaningfulChanges(mockOriginalResume, tailoredResume, allSections);
    expect(changeSummary.hasChanges).toBe(true);
    expect(changeSummary.experienceChanged).toBe(true);
  });

  it('combines change detection with score validation', () => {
    const tailoredResume: ResumeData = {
      ...mockOriginalResume,
      summary: 'Meaningfully different summary.',
    };
    
    const changeSummary = hasMeaningfulChanges(mockOriginalResume, tailoredResume, allSections);
    const scoreBefore: number = 50;
    const scoreAfter: number = 75;
    
    // Should pass even if scores are equal but content changed
    const hasEqualScoreWithNoChanges = scoreBefore === scoreAfter && !changeSummary.hasChanges;
    // Content changed, so this should be false regardless of score comparison
    const appearsUnchanged = !changeSummary.hasChanges || hasEqualScoreWithNoChanges;
    
    expect(changeSummary.hasChanges).toBe(true);
    expect(hasEqualScoreWithNoChanges).toBe(false);
    expect(appearsUnchanged).toBe(false);
  });

  it('blocks when score improved but content unchanged (suspicious)', () => {
    // This scenario indicates the AI may have fabricated scores
    const unchangedResume = { ...mockOriginalResume };
    const changeSummary = hasMeaningfulChanges(mockOriginalResume, unchangedResume, allSections);
    
    // Score improved but content same - suspicious scenario
    const scoreBefore: number = 50;
    const scoreAfter: number = 80;
    
    // Should still block because content unchanged (score values don't matter if no content changes)
    const appearsUnchanged = !changeSummary.hasChanges; // true when no changes
    expect(changeSummary.hasChanges).toBe(false);
    expect(appearsUnchanged).toBe(true);
    expect(scoreAfter).toBeGreaterThan(scoreBefore); // Score improved suspiciously
  });
});
