import { describe, it, expect } from 'vitest';
import { getSectionPreview, getSectionIcon, getSectionName, calculatePageNumbers, countPagesFromBreaks } from './sectionHelpers';
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
      // "This", "is", "a", "test", "summary" -> 5 words
      expect(getSectionPreview(resume, 'summary')).toBe('5 words');
    });

    it('should handle experience section', () => {
      expect(getSectionPreview({ ...mockResume, experience: [] }, 'experience')).toBe('No experience');
      expect(getSectionPreview({ ...mockResume, experience: [{ id: '1', company: 'A', position: 'B', startDate: '', endDate: '', current: false, description: '', achievements: [] }] }, 'experience')).toBe('1 position');
      expect(getSectionPreview({ ...mockResume, experience: [
        { id: '1', company: 'A', position: 'B', startDate: '', endDate: '', current: false, description: '', achievements: [] },
        { id: '2', company: 'C', position: 'D', startDate: '', endDate: '', current: false, description: '', achievements: [] }
      ] }, 'experience')).toBe('2 positions');
    });

    it('should handle education section', () => {
      expect(getSectionPreview({ ...mockResume, education: [] }, 'education')).toBe('No education');
      expect(getSectionPreview({ ...mockResume, education: [{ id: '1', institution: 'A', degree: 'B', field: 'C', startDate: '', endDate: '' }] }, 'education')).toBe('1 degree');
      expect(getSectionPreview({ ...mockResume, education: [
        { id: '1', institution: 'A', degree: 'B', field: 'C', startDate: '', endDate: '' },
        { id: '2', institution: 'D', degree: 'E', field: 'F', startDate: '', endDate: '' }
      ] }, 'education')).toBe('2 degrees');
    });

    it('should handle skills section', () => {
      expect(getSectionPreview({ ...mockResume, skills: [] }, 'skills')).toBe('No skills');
      expect(getSectionPreview({ ...mockResume, skills: ['React'] }, 'skills')).toBe('1 skill');
      expect(getSectionPreview({ ...mockResume, skills: ['React', 'TypeScript'] }, 'skills')).toBe('2 skills');
    });

    it('should handle certifications section', () => {
      expect(getSectionPreview({ ...mockResume, certifications: [] }, 'certifications')).toBe('No certifications');
      expect(getSectionPreview({ ...mockResume, certifications: [{ id: '1', name: 'A', issuer: 'B', date: '' }] }, 'certifications')).toBe('1 certification');
      expect(getSectionPreview({ ...mockResume, certifications: [
        { id: '1', name: 'A', issuer: 'B', date: '' },
        { id: '2', name: 'C', issuer: 'D', date: '' }
      ] }, 'certifications')).toBe('2 certifications');
    });

    it('should handle undefined sections gracefully', () => {
      // Create a partial resume object cast to ResumeData to simulate missing properties
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
      expect(getSectionIcon('education')).toBe('🎓');
      expect(getSectionIcon('skills')).toBe('🛠️');
      expect(getSectionIcon('certifications')).toBe('📜');
    });

    it('should return default icon for unknown section', () => {
      expect(getSectionIcon('unknown' as SectionId)).toBe('📄');
    });
  });

  describe('getSectionName', () => {
    it('should return correct name for known sections', () => {
      expect(getSectionName('summary')).toBe('Summary');
      expect(getSectionName('experience')).toBe('Experience');
      expect(getSectionName('education')).toBe('Education');
      expect(getSectionName('skills')).toBe('Skills');
      expect(getSectionName('certifications')).toBe('Certifications');
    });

    it('should return section ID as fallback for unknown section', () => {
      expect(getSectionName('unknown' as SectionId)).toBe('unknown');
    });
  });

  describe('calculatePageNumbers', () => {
    const sections: SectionId[] = ['summary', 'experience', 'education', 'skills'];

    it('should assign page 1 to all sections when no breaks are present', () => {
      const pageMap = calculatePageNumbers(sections, []);
      expect(pageMap.get('summary')).toBe(1);
      expect(pageMap.get('experience')).toBe(1);
      expect(pageMap.get('education')).toBe(1);
      expect(pageMap.get('skills')).toBe(1);
    });

    it('should increment page number after a break', () => {
      const pageMap = calculatePageNumbers(sections, ['experience']);
      // summary (1), experience (1) -> BREAK -> education (2), skills (2)
      expect(pageMap.get('summary')).toBe(1);
      expect(pageMap.get('experience')).toBe(1);
      expect(pageMap.get('education')).toBe(2);
      expect(pageMap.get('skills')).toBe(2);
    });

    it('should handle multiple breaks', () => {
      const pageMap = calculatePageNumbers(sections, ['summary', 'education']);
      // summary (1) -> BREAK -> experience (2), education (2) -> BREAK -> skills (3)
      expect(pageMap.get('summary')).toBe(1);
      expect(pageMap.get('experience')).toBe(2);
      expect(pageMap.get('education')).toBe(2);
      expect(pageMap.get('skills')).toBe(3);
    });

    it('should not increment page number for break on the last section', () => {
      const pageMap = calculatePageNumbers(sections, ['skills']);
      // summary (1), experience (1), education (1), skills (1) -> BREAK (ignored as it's last)
      expect(pageMap.get('summary')).toBe(1);
      expect(pageMap.get('experience')).toBe(1);
      expect(pageMap.get('education')).toBe(1);
      expect(pageMap.get('skills')).toBe(1);
    });
  });

  describe('countPagesFromBreaks', () => {
    const sections: SectionId[] = ['summary', 'experience', 'education', 'skills'];

    it('should return 1 when no breaks are present', () => {
      expect(countPagesFromBreaks(sections, [])).toBe(1);
    });

    it('should count correct number of pages with breaks', () => {
      expect(countPagesFromBreaks(sections, ['experience'])).toBe(2);
      expect(countPagesFromBreaks(sections, ['summary', 'education'])).toBe(3);
    });

    it('should not increment page count for break on last section', () => {
      expect(countPagesFromBreaks(sections, ['skills'])).toBe(1);
    });

    it('should return 1 for empty sections list', () => {
      expect(countPagesFromBreaks([], [])).toBe(1);
    });
  });
});
