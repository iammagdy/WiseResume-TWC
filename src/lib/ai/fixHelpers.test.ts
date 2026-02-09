import { describe, it, expect } from 'vitest';
import { findTargetContent } from './fixHelpers';
import { ResumeData } from '@/types/resume';
import { RedFlag } from '@/types/aiStudio';

// Mock resume data
const mockResume: ResumeData = {
  contactInfo: { fullName: 'John Doe', email: 'john@example.com', phone: '123', location: 'City' },
  summary: 'Experienced software engineer with a focus on React.',
  experience: [
    {
      id: 'job-1',
      company: 'Tech Corp',
      position: 'Senior Developer',
      startDate: '2020',
      endDate: 'Present',
      current: true,
      description: 'Built scalable web apps using React and Node.js.',
      achievements: ['Increased performance by 50%', 'Mentored juniors'],
    },
    {
      id: 'job-2',
      company: 'Old Corp',
      position: 'Junior Developer',
      startDate: '2018',
      endDate: '2020',
      current: false,
      description: 'Maintained legacy code.',
      achievements: [],
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'University of Tech',
      degree: 'BS',
      field: 'Computer Science',
      startDate: '2014',
      endDate: '2018',
    },
  ],
  skills: ['React', 'TypeScript', 'Node.js'],
  certifications: [],
  templateId: 'modern',
};

describe('findTargetContent', () => {
  it('should return summary when fixType is summary', () => {
    const redFlag = {
      issue: 'Weak summary',
      severity: 'medium',
      quote: 'Experienced software engineer',
      fix: 'Rewrite it',
      fixType: 'summary',
    } as any;

    const result = findTargetContent(mockResume, redFlag);
    expect(result).toEqual({
      section: 'summary',
      content: mockResume.summary,
    });
  });

  it('should return skills when fixType is skills', () => {
    const redFlag = {
      issue: 'Missing skills',
      severity: 'low',
      quote: 'N/A',
      fix: 'Add Python',
      fixType: 'skills',
    } as any;

    const result = findTargetContent(mockResume, redFlag);
    expect(result).toEqual({
      section: 'skills',
      content: mockResume.skills,
    });
  });

  it('should find experience by description match', () => {
    const redFlag = {
      issue: 'Vague description',
      severity: 'medium',
      quote: 'scalable web apps',
      fix: 'Add metrics',
      fixType: 'experience',
    } as any;

    const result = findTargetContent(mockResume, redFlag);
    expect(result).toEqual({
      section: 'experience',
      id: 'job-1',
      content: mockResume.experience[0],
    });
  });

  it('should find experience by achievement match', () => {
    const redFlag = {
      issue: 'Unquantified achievement',
      severity: 'medium',
      quote: 'Mentored juniors',
      fix: 'How many?',
      fixType: 'experience',
    } as any;

    const result = findTargetContent(mockResume, redFlag);
    expect(result).toEqual({
      section: 'experience',
      id: 'job-1',
      content: mockResume.experience[0],
    });
  });

  it('should handle fuzzy matching in experience', () => {
    const redFlag = {
      issue: 'Typo',
      severity: 'low',
      quote: 'maintained legacy', // Lowercase
      fix: 'Fix typo',
      fixType: 'experience',
    } as any;

    const result = findTargetContent(mockResume, redFlag);
    expect(result).toEqual({
      section: 'experience',
      id: 'job-2',
      content: mockResume.experience[1],
    });
  });

  it('should return null for experience if quote not found', () => {
    const redFlag = {
      issue: 'Unknown issue',
      severity: 'medium',
      quote: 'Non-existent text',
      fix: 'Fix it',
      fixType: 'experience',
    } as any;

    const result = findTargetContent(mockResume, redFlag);
    expect(result).toBeNull();
  });

  it('should return null for experience if quote is N/A', () => {
    const redFlag = {
      issue: 'General issue',
      severity: 'medium',
      quote: 'N/A',
      fix: 'Fix it',
      fixType: 'experience',
    } as any;

    const result = findTargetContent(mockResume, redFlag);
    expect(result).toBeNull();
  });

  it('should find education by institution match', () => {
    const redFlag = {
      issue: 'Format issue',
      severity: 'low',
      quote: 'University of Tech',
      fix: 'Fix format',
      fixType: 'education',
    } as any;

    const result = findTargetContent(mockResume, redFlag);
    expect(result).toEqual({
      section: 'education',
      id: 'edu-1',
      content: mockResume.education[0],
    });
  });

  it('should return null for contact fixes', () => {
    const redFlag = {
      issue: 'Missing phone',
      severity: 'high',
      quote: 'N/A',
      fix: 'Add phone',
      fixType: 'contact',
    } as any;

    const result = findTargetContent(mockResume, redFlag);
    expect(result).toBeNull();
  });
});
