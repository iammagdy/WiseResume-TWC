import { describe, it, expect } from 'vitest';
import { getSectionPreview, getSectionIcon, getSectionName } from './sectionHelpers';
import { ResumeData, SectionId } from '@/types/resume';

describe('sectionHelpers', () => {
  describe('getSectionPreview', () => {
    const mockResume: ResumeData = {
      id: '1',
      contactInfo: {
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '123-456-7890',
        location: 'Test City'
      },
      summary: '',
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      templateId: 'modern'
    };

    it('should return "No summary" when summary is empty', () => {
      expect(getSectionPreview({ ...mockResume, summary: '' }, 'summary')).toBe('No summary');
    });

    it('should correctly count words in summary', () => {
      const resume = { ...mockResume, summary: 'This is a test summary' };
      expect(getSectionPreview(resume, 'summary')).toBe('5 words');
    });

    it('should handle multiple spaces and newlines in summary', () => {
      const resume = { ...mockResume, summary: 'This   is \n a   test \t summary' };
      expect(getSectionPreview(resume, 'summary')).toBe('5 words');
    });

    it('should handle experience section', () => {
      expect(getSectionPreview({ ...mockResume, experience: [] }, 'experience')).toBe('No experience');
      expect(getSectionPreview({ ...mockResume, experience: [{ id: '1', company: 'A', position: 'B', startDate: '', endDate: '', current: false, description: '', achievements: [] }] }, 'experience')).toBe('1 position');
    });

    it('should handle education section', () => {
      expect(getSectionPreview({ ...mockResume, education: [] }, 'education')).toBe('No education');
      expect(getSectionPreview({ ...mockResume, education: [{ id: '1', institution: 'A', degree: 'B', field: 'C', startDate: '', endDate: '' }] }, 'education')).toBe('1 degree');
    });

    it('should handle skills section', () => {
      expect(getSectionPreview({ ...mockResume, skills: [] }, 'skills')).toBe('No skills');
      expect(getSectionPreview({ ...mockResume, skills: ['React'] }, 'skills')).toBe('1 skill');
    });

    it('should handle certifications section', () => {
      expect(getSectionPreview({ ...mockResume, certifications: [] }, 'certifications')).toBe('No certifications');
    });

    it('should handle undefined sections gracefully', () => {
      const partialResume = {
        ...mockResume,
        experience: undefined,
        education: undefined,
        skills: undefined,
        certifications: undefined
      } as unknown as ResumeData;

      expect(getSectionPreview(partialResume, 'experience')).toBe('No experience');
      expect(getSectionPreview(partialResume, 'education')).toBe('No education');
      expect(getSectionPreview(partialResume, 'skills')).toBe('No skills');
      expect(getSectionPreview(partialResume, 'certifications')).toBe('No certifications');
    });

    it('should return empty string for unknown section', () => {
      expect(getSectionPreview(mockResume, 'unknown' as SectionId)).toBe('');
    });
  });

  describe('getSectionIcon', () => {
    it('should return correct icon for known sections', () => {
      expect(getSectionIcon('summary')).toBe('📝');
      expect(getSectionIcon('experience')).toBe('💼');
    });

    it('should return default icon for unknown section', () => {
      expect(getSectionIcon('unknown' as SectionId)).toBe('📄');
    });
  });

  describe('getSectionName', () => {
    it('should return correct name for known sections', () => {
      expect(getSectionName('summary')).toBe('Summary');
      expect(getSectionName('experience')).toBe('Experience');
    });

    it('should return section ID as fallback for unknown section', () => {
      expect(getSectionName('unknown' as SectionId)).toBe('unknown');
    });
  });
});
