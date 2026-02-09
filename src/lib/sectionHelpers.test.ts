
import { describe, it, expect } from 'vitest';
import { calculatePageNumbers, countPagesFromBreaks } from './sectionHelpers';
import { SectionId } from '@/types/resume';

describe('sectionHelpers', () => {
  describe('calculatePageNumbers', () => {
    it('should assign page 1 to all sections when no breaks exist', () => {
      const sections: SectionId[] = ['summary', 'experience', 'education'];
      const breaks: SectionId[] = [];

      const result = calculatePageNumbers(sections, breaks);

      expect(result.get('summary')).toBe(1);
      expect(result.get('experience')).toBe(1);
      expect(result.get('education')).toBe(1);
      expect(result.size).toBe(3);
    });

    it('should increment page number after a section with a break', () => {
      const sections: SectionId[] = ['summary', 'experience', 'education'];
      const breaks: SectionId[] = ['summary'];

      const result = calculatePageNumbers(sections, breaks);

      expect(result.get('summary')).toBe(1);
      expect(result.get('experience')).toBe(2);
      expect(result.get('education')).toBe(2);
    });

    it('should increment page numbers correctly with consecutive breaks', () => {
      const sections: SectionId[] = ['summary', 'experience', 'education'];
      const breaks: SectionId[] = ['summary', 'experience'];

      const result = calculatePageNumbers(sections, breaks);

      expect(result.get('summary')).toBe(1);
      expect(result.get('experience')).toBe(2);
      expect(result.get('education')).toBe(3);
    });

    it('should not create a phantom page when break is on the last section', () => {
      const sections: SectionId[] = ['summary', 'experience'];
      // Break on the last section ('experience') should be ignored for page calculation
      const breaks: SectionId[] = ['experience'];

      const result = calculatePageNumbers(sections, breaks);

      expect(result.get('summary')).toBe(1);
      expect(result.get('experience')).toBe(1);
      // It should NOT increment to page 2
    });

    it('should handle empty input gracefully', () => {
      const sections: SectionId[] = [];
      const breaks: SectionId[] = [];

      const result = calculatePageNumbers(sections, breaks);

      expect(result.size).toBe(0);
    });

    it('should ignore breaks for sections not in the list', () => {
      const sections: SectionId[] = ['summary', 'experience'];
      const breaks: SectionId[] = ['education']; // 'education' is not in sections

      const result = calculatePageNumbers(sections, breaks);

      expect(result.get('summary')).toBe(1);
      expect(result.get('experience')).toBe(1);
    });

    it('should handle breaks on sections that are not in the main list but are in break list (irrelevant breaks)', () => {
         const sections: SectionId[] = ['summary', 'experience'];
         const breaks: SectionId[] = ['summary', 'skills']; // 'skills' is not in sections

         const result = calculatePageNumbers(sections, breaks);

         expect(result.get('summary')).toBe(1);
         expect(result.get('experience')).toBe(2);
    });
  });

  describe('countPagesFromBreaks', () => {
    it('should return 1 page when no breaks exist', () => {
      const sections: SectionId[] = ['summary', 'experience'];
      const breaks: SectionId[] = [];

      expect(countPagesFromBreaks(sections, breaks)).toBe(1);
    });

    it('should count pages correctly with valid breaks', () => {
      const sections: SectionId[] = ['summary', 'experience', 'education'];
      const breaks: SectionId[] = ['summary'];

      expect(countPagesFromBreaks(sections, breaks)).toBe(2);
    });

    it('should count pages correctly with consecutive breaks', () => {
      const sections: SectionId[] = ['summary', 'experience', 'education'];
      const breaks: SectionId[] = ['summary', 'experience'];

      expect(countPagesFromBreaks(sections, breaks)).toBe(3);
    });

    it('should not count a break on the last section (phantom page prevention)', () => {
      const sections: SectionId[] = ['summary', 'experience'];
      const breaks: SectionId[] = ['experience'];

      expect(countPagesFromBreaks(sections, breaks)).toBe(1);
    });

    it('should return 1 for empty section list', () => {
      const sections: SectionId[] = [];
      const breaks: SectionId[] = [];

      expect(countPagesFromBreaks(sections, breaks)).toBe(1);
    });

     it('should ignore breaks for sections not in the list', () => {
      const sections: SectionId[] = ['summary', 'experience'];
      const breaks: SectionId[] = ['education'];

      expect(countPagesFromBreaks(sections, breaks)).toBe(1);
    });
  });
});
