import { describe, it, expect } from 'vitest';
import { countChanges, compareSkills, diffText, compareExperience } from './diffUtils';
import { Experience } from '@/types/resume';

describe('diffUtils', () => {
  describe('countChanges', () => {
    it('should correctly count added and removed items', () => {
      const skillDiff = {
        added: ['React', 'TypeScript'],
        removed: ['jQuery'],
        unchanged: ['HTML', 'CSS']
      };

      const result = countChanges(skillDiff);

      expect(result).toEqual({ added: 2, removed: 1 });
    });

    it('should handle empty added and removed arrays', () => {
      const skillDiff = {
        added: [],
        removed: [],
        unchanged: ['HTML', 'CSS']
      };

      const result = countChanges(skillDiff);

      expect(result).toEqual({ added: 0, removed: 0 });
    });

    it('should ignore unchanged items', () => {
      const skillDiff = {
        added: ['React'],
        removed: [],
        unchanged: ['HTML', 'CSS', 'JavaScript']
      };

      const result = countChanges(skillDiff);

      expect(result).toEqual({ added: 1, removed: 0 });
    });
  });

  describe('compareSkills', () => {
    it('should identify added skills', () => {
      const original = ['HTML', 'CSS'];
      const tailored = ['HTML', 'CSS', 'React'];

      const result = compareSkills(original, tailored);

      expect(result.added).toEqual(['React']);
      expect(result.removed).toEqual([]);
      expect(result.unchanged).toEqual(['HTML', 'CSS']);
    });

    it('should identify removed skills', () => {
      const original = ['HTML', 'CSS', 'jQuery'];
      const tailored = ['HTML', 'CSS'];

      const result = compareSkills(original, tailored);

      expect(result.added).toEqual([]);
      expect(result.removed).toEqual(['jQuery']);
      expect(result.unchanged).toEqual(['HTML', 'CSS']);
    });

    it('should handle case insensitivity correctly', () => {
      const original = ['React'];
      const tailored = ['react'];

      const result = compareSkills(original, tailored);

      expect(result.added).toEqual([]);
      expect(result.removed).toEqual([]);
      expect(result.unchanged).toEqual(['react']);
    });

    it('should handle empty arrays', () => {
      const result = compareSkills([], []);

      expect(result.added).toEqual([]);
      expect(result.removed).toEqual([]);
      expect(result.unchanged).toEqual([]);
    });

    it('should handle completely different arrays', () => {
      const original = ['Java'];
      const tailored = ['Python'];

      const result = compareSkills(original, tailored);

      expect(result.added).toEqual(['Python']);
      expect(result.removed).toEqual(['Java']);
      expect(result.unchanged).toEqual([]);
    });
  });

  describe('diffText', () => {
    it('should handle identical strings', () => {
      const text = 'Hello world';
      const result = diffText(text, text);

      expect(result).toEqual([{ type: 'unchanged', text: 'Hello world' }]);
    });

    it('should handle completely different strings', () => {
      const original = 'Hello world';
      const tailored = 'Goodbye universe';

      const result = diffText(original, tailored);

      // Expected: removed "Hello world", added "Goodbye universe"
      // or structured diff depending on implementation detail of LCS
      // LCS of ["Hello", "world"] and ["Goodbye", "universe"] is empty.
      // So it should be removed Hello, removed world, added Goodbye, added universe.
      // Or merged.

      // Let's see what mergeDiffs does.
      // It merges consecutive diffs of same type.
      // So likely: removed "Hello world", added "Goodbye universe" (order depends on implementation)

      // diffText logic:
      // while loop:
      // if (origMatchesLCS && tailMatchesLCS) -> unchanged
      // else if (!origMatchesLCS) -> removed
      // else if (!tailMatchesLCS) -> added

      // Since LCS is empty:
      // !origMatchesLCS is true -> removed "Hello"
      // !origMatchesLCS is true -> removed "world"
      // !tailMatchesLCS is true -> added "Goodbye"
      // !tailMatchesLCS is true -> added "universe"

      // So removed "Hello world", added "Goodbye universe".
      // Wait, let's trace:
      // origIdx=0 (Hello). LCS empty. removed "Hello". origIdx=1.
      // origIdx=1 (world). LCS empty. removed "world". origIdx=2.
      // origIdx=2 (>= length). loop condition: origIdx < len || tailIdx < len.
      // tailIdx=0 (Goodbye). added "Goodbye". tailIdx=1.
      // tailIdx=1 (universe). added "universe". tailIdx=2.

      // merged: removed "Hello world", added "Goodbye universe".

      expect(result).toContainEqual({ type: 'removed', text: 'Hello world' });
      expect(result).toContainEqual({ type: 'added', text: 'Goodbye universe' });
    });

    it('should identify added words', () => {
      const original = 'Hello world';
      const tailored = 'Hello beautiful world';

      const result = diffText(original, tailored);

      // LCS: Hello, world
      // unchanged "Hello"
      // added "beautiful"
      // unchanged "world"

      expect(result).toEqual([
        { type: 'unchanged', text: 'Hello' },
        { type: 'added', text: 'beautiful' },
        { type: 'unchanged', text: 'world' }
      ]);
    });

    it('should identify removed words', () => {
      const original = 'Hello beautiful world';
      const tailored = 'Hello world';

      const result = diffText(original, tailored);

      expect(result).toEqual([
        { type: 'unchanged', text: 'Hello' },
        { type: 'removed', text: 'beautiful' },
        { type: 'unchanged', text: 'world' }
      ]);
    });

    it('should handle typos (replace)', () => {
      const original = 'Hello world';
      const tailored = 'Hello word';

      const result = diffText(original, tailored);

      // LCS: Hello
      // unchanged "Hello"
      // removed "world"
      // added "word"

      expect(result).toEqual([
        { type: 'unchanged', text: 'Hello' },
        { type: 'removed', text: 'world' },
        { type: 'added', text: 'word' }
      ]);
    });
  });

  describe('compareExperience', () => {
    const mockExp: Experience = {
      id: '1',
      position: 'Developer',
      company: 'Tech Corp',
      startDate: '2020-01',
      endDate: '2021-01',
      current: false,
      description: 'Wrote code',
      achievements: ['Built app', 'Fixed bugs']
    };

    it('should compare matching experiences', () => {
      const original = [mockExp];
      const tailored = [{
        position: 'Developer',
        company: 'Tech Corp',
        description: 'Wrote clean code', // changed
        achievements: ['Built app', 'Optimized performance'] // changed
      }];

      const result = compareExperience(original, tailored);

      expect(result).toHaveLength(1);
      expect(result[0].position).toBe('Developer');

      // Description diff: unchanged "Wrote", added "clean", unchanged "code" (or similar)
      // "Wrote code" vs "Wrote clean code"
      // LCS: Wrote, code
      // unchanged "Wrote", added "clean", unchanged "code"
      expect(result[0].descriptionDiff).toEqual([
        { type: 'unchanged', text: 'Wrote' },
        { type: 'added', text: 'clean' },
        { type: 'unchanged', text: 'code' }
      ]);

      // Achievements diff
      // Original: Built app, Fixed bugs
      // Tailored: Built app, Optimized performance
      // Added: Optimized performance
      // Removed: Fixed bugs
      // Unchanged: Built app
      expect(result[0].achievementsDiff.added).toEqual(['Optimized performance']);
      expect(result[0].achievementsDiff.removed).toEqual(['Fixed bugs']);
      expect(result[0].achievementsDiff.unchanged).toEqual(['Built app']);
    });

    it('should handle new experiences', () => {
      const original: Experience[] = [];
      const tailored = [{
        position: 'New Job',
        company: 'New Co',
        description: 'New role',
        achievements: ['New achievement']
      }];

      const result = compareExperience(original, tailored);

      expect(result).toHaveLength(1);
      expect(result[0].descriptionDiff).toEqual([{ type: 'added', text: 'New role' }]);
      expect(result[0].achievementsDiff.added).toEqual(['New achievement']);
      expect(result[0].achievementsDiff.removed).toEqual([]);
    });

    it('should handle tailored having more items than original', () => {
      const original = [mockExp];
      const tailored = [
        {
          position: 'Developer',
          company: 'Tech Corp',
          description: 'Wrote code',
          achievements: ['Built app', 'Fixed bugs']
        },
        {
          position: 'Senior Developer',
          company: 'Tech Corp',
          description: 'Led team',
          achievements: ['Launched product']
        }
      ];

      const result = compareExperience(original, tailored);

      expect(result).toHaveLength(2);

      // First one matches original
      expect(result[0].descriptionDiff).toEqual([{ type: 'unchanged', text: 'Wrote code' }]);

      // Second one is new
      expect(result[1].descriptionDiff).toEqual([{ type: 'added', text: 'Led team' }]);
    });
  });
});
