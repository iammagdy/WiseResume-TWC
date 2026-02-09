import { describe, it, expect } from 'vitest';
import { compareSkills, diffText, compareExperience, countChanges, SkillDiff, TextDiff } from './diffUtils';

describe('diffUtils', () => {
  describe('compareSkills', () => {
    it('should correctly identify added and removed skills', () => {
      const original = ['React', 'TypeScript'];
      const tailored = ['React', 'Node.js'];

      const result = compareSkills(original, tailored);

      expect(result.added).toEqual(['Node.js']);
      expect(result.removed).toEqual(['TypeScript']);
      expect(result.unchanged).toEqual(['React']);
    });

    it('should handle case insensitivity', () => {
      const original = ['React'];
      const tailored = ['react'];

      const result = compareSkills(original, tailored);

      expect(result.added).toEqual([]);
      expect(result.removed).toEqual([]);
      expect(result.unchanged).toEqual(['react']);
    });

    it('should handle special characters', () => {
      const original = ['C++', '.NET'];
      const tailored = ['C++', 'C#', '.NET'];

      const result = compareSkills(original, tailored);

      expect(result.added).toEqual(['C#']);
      expect(result.removed).toEqual([]);
      expect(result.unchanged).toEqual(['C++', '.NET']);
    });

    it('should handle empty arrays', () => {
      const original: string[] = [];
      const tailored = ['React'];

      const result = compareSkills(original, tailored);

      expect(result.added).toEqual(['React']);
      expect(result.removed).toEqual([]);
      expect(result.unchanged).toEqual([]);

      const result2 = compareSkills(['React'], []);
      expect(result2.added).toEqual([]);
      expect(result2.removed).toEqual(['React']);
      expect(result2.unchanged).toEqual([]);
    });

    it('should handle duplicates in input', () => {
      const original = ['React', 'React'];
      const tailored = ['React'];

      const result = compareSkills(original, tailored);

      // Depending on implementation, duplicates might appear in unchanged
      // The current implementation iterates over tailored for unchanged, so 1 'React' -> 1 unchanged
      expect(result.unchanged).toHaveLength(1);
      expect(result.unchanged).toContain('React');

      // If original has duplicates, and tailored has one, logic says:
      // tailored element exists in original set -> unchanged.
      // original element exists in tailored set -> not removed.
      expect(result.removed).toEqual([]);
      expect(result.added).toEqual([]);
    });
  });

  describe('diffText', () => {
    it('should handle identical strings', () => {
      const text = 'Hello world';
      const result = diffText(text, text);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'unchanged', text: 'Hello world' });
    });

    it('should handle completely different strings', () => {
      const original = 'Hello world';
      const tailored = 'Goodbye space';

      const result = diffText(original, tailored);

      // Expected: removed 'Hello world', added 'Goodbye space'
      // The implementation splits by space.
      // "Hello world" -> ["Hello", "world"]
      // "Goodbye space" -> ["Goodbye", "space"]
      // LCS is empty.
      // "Hello" removed, "Goodbye" added. "world" removed, "space" added.
      // mergedDiffs merges consecutive same types.

      // Let's see how the implementation handles it.
      // It iterates and adds.
      // It might interleave removed/added or group them.
      // Since LCS is empty, it will remove original words then add tailored words or vice versa depending on the loop.

      // The loop:
      // while (origIdx < originalWords.length || tailIdx < tailoredWords.length)
      // origMatchesLCS is false. tailMatchesLCS is false.
      // elseif (!origMatchesLCS && origIdx < originalWords.length) -> removes original word.
      // loop continues.

      // So it will remove all original words, then add all tailored words?
      // Wait, let's trace:
      // 1. orig "Hello" != LCS. remove "Hello". origIdx++.
      // 2. orig "world" != LCS. remove "world". origIdx++.
      // 3. origIdx == len.
      // 4. tail "Goodbye" != LCS. add "Goodbye". tailIdx++.
      // 5. tail "space" != LCS. add "space". tailIdx++.

      // Merged: removed "Hello world", added "Goodbye space".

      // Wait, is that how mergeDiffs works?
      // remove "Hello", remove "world" -> remove "Hello world".
      // add "Goodbye", add "space" -> add "Goodbye space".

      expect(result).toEqual([
        { type: 'removed', text: 'Hello world' },
        { type: 'added', text: 'Goodbye space' }
      ]);
    });

    it('should handle insertions', () => {
      const original = 'Hello world';
      const tailored = 'Hello beautiful world';

      const result = diffText(original, tailored);

      // LCS: Hello, world
      // 1. Hello match. Unchanged "Hello".
      // 2. orig "world" vs tail "beautiful". "world" is in LCS (next match). "beautiful" is not.
      // Wait, the loop:
      // lcsIdx points to "Hello".
      // orig "Hello" == lcs[0]. tail "Hello" == lcs[0]. -> Unchanged "Hello". lcsIdx++, origIdx++, tailIdx++.

      // lcsIdx points to "world".
      // orig "world" == lcs[1]. YES.
      // tail "beautiful" == lcs[1]. NO.

      // if (origMatchesLCS && tailMatchesLCS) -> false.
      // else if (!origMatchesLCS && origIdx < length) -> false (orig matches LCS).
      // else if (!tailMatchesLCS && tailIdx < length) -> true. Added "beautiful". tailIdx++.

      // Next iter:
      // lcsIdx points to "world".
      // orig "world". tail "world".
      // match. Unchanged "world".

      expect(result).toEqual([
        { type: 'unchanged', text: 'Hello' },
        { type: 'added', text: 'beautiful' },
        { type: 'unchanged', text: 'world' }
      ]);
    });

    it('should handle deletions', () => {
      const original = 'Hello beautiful world';
      const tailored = 'Hello world';

      const result = diffText(original, tailored);

      expect(result).toEqual([
        { type: 'unchanged', text: 'Hello' },
        { type: 'removed', text: 'beautiful' },
        { type: 'unchanged', text: 'world' }
      ]);
    });

    it('should handle replacements', () => {
      const original = 'Hello old world';
      const tailored = 'Hello new world';

      const result = diffText(original, tailored);

      expect(result).toEqual([
        { type: 'unchanged', text: 'Hello' },
        { type: 'removed', text: 'old' },
        { type: 'added', text: 'new' },
        { type: 'unchanged', text: 'world' }
      ]);
    });

    it('should handle empty strings', () => {
      // Test empty original
      const result1 = diffText('', 'Hello');
      expect(result1).toHaveLength(1);
      expect(result1[0]).toEqual({ type: 'added', text: 'Hello' });

      // Test empty tailored
      const result2 = diffText('Hello', '');
      expect(result2).toHaveLength(1);
      expect(result2[0]).toEqual({ type: 'removed', text: 'Hello' });
    });

    it('should handle multiple spaces', () => {
      const original = 'Hello  world';
      const tailored = 'Hello world';

      const result = diffText(original, tailored);

      // split(/\s+/) treats multiple spaces as one delimiter
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'unchanged', text: 'Hello world' });
    });
  });

  describe('compareExperience', () => {
    it('should handle matching experiences', () => {
      const original = [{
        id: '1',
        position: 'Developer',
        company: 'Tech Corp',
        location: 'Remote',
        startDate: '2020',
        endDate: 'Present',
        description: 'Built cool stuff',
        achievements: ['Launched app']
      }];

      const tailored = [{
        position: 'Developer',
        company: 'Tech Corp',
        description: 'Built cool stuff',
        achievements: ['Launched app']
      }];

      const result = compareExperience(original, tailored);

      expect(result).toHaveLength(1);
      expect(result[0].descriptionDiff).toHaveLength(1);
      expect(result[0].descriptionDiff[0].type).toBe('unchanged');
      expect(result[0].achievementsDiff.added).toEqual([]);
      expect(result[0].achievementsDiff.removed).toEqual([]);
    });

    it('should handle new experiences', () => {
      const original: any[] = [];
      const tailored = [{
        position: 'Developer',
        company: 'Tech Corp',
        description: 'Built cool stuff',
        achievements: ['Launched app']
      }];

      const result = compareExperience(original, tailored);

      expect(result).toHaveLength(1);
      // New experience -> all description added
      expect(result[0].descriptionDiff).toHaveLength(1);
      expect(result[0].descriptionDiff[0].type).toBe('added');
      // All achievements added
      expect(result[0].achievementsDiff.added).toEqual(['Launched app']);
    });

    it('should handle partial updates', () => {
      const original = [{
        id: '1',
        position: 'Developer',
        company: 'Tech Corp',
        location: 'Remote',
        startDate: '2020',
        endDate: 'Present',
        description: 'Built stuff',
        achievements: ['Old achievement']
      }];

      const tailored = [{
        position: 'Senior Developer', // Title change handled by caller matching? No, compareExperience assumes index matching based on implementation: tailored.map((exp, index) => original[index])
        company: 'Tech Corp',
        description: 'Built amazing stuff',
        achievements: ['New achievement']
      }];

      const result = compareExperience(original, tailored);

      expect(result).toHaveLength(1);
      // Description diff: "stuff" -> "amazing stuff" (roughly)
      // "Built stuff" vs "Built amazing stuff"
      // "Built" unchanged. "amazing" added. "stuff" unchanged.

      expect(result[0].descriptionDiff).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'unchanged', text: 'Built' }),
        expect.objectContaining({ type: 'added', text: 'amazing' }),
        expect.objectContaining({ type: 'unchanged', text: 'stuff' })
      ]));

      expect(result[0].achievementsDiff.added).toEqual(['New achievement']);
      expect(result[0].achievementsDiff.removed).toEqual(['Old achievement']);
    });
  });

  describe('countChanges', () => {
    it('should count added and removed skills correctly', () => {
      const skillDiff: SkillDiff = {
        added: ['A', 'B'],
        removed: ['C'],
        unchanged: ['D']
      };

      const result = countChanges(skillDiff);

      expect(result.added).toBe(2);
      expect(result.removed).toBe(1);
    });

    it('should return zeros for empty diff', () => {
      const skillDiff: SkillDiff = {
        added: [],
        removed: [],
        unchanged: []
      };

      const result = countChanges(skillDiff);

      expect(result.added).toBe(0);
      expect(result.removed).toBe(0);
    });
  });
});
