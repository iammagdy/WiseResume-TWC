import { Experience, Education } from '@/types/resume';

export interface SkillDiff {
  added: string[];
  removed: string[];
  unchanged: string[];
}

export interface TextDiff {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

/** Canonical key for skill equality (case, spaces, punctuation insensitive). */
export function normalizeSkill(skill: string): string {
  return skill.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Compare two arrays of skills and identify additions/removals.
 * Uses normalized keys so "Node.js" vs "Node js" or spacing changes are not
 * falsely marked as removed+added pairs.
 */
export function compareSkills(original: string[], tailored: string[]): SkillDiff {
  const originalByNorm = new Map<string, string>();
  for (const skill of original) {
    const norm = normalizeSkill(skill);
    if (norm && !originalByNorm.has(norm)) originalByNorm.set(norm, skill);
  }

  const tailoredByNorm = new Map<string, string>();
  for (const skill of tailored) {
    const norm = normalizeSkill(skill);
    if (norm && !tailoredByNorm.has(norm)) tailoredByNorm.set(norm, skill);
  }

  const added: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];

  for (const [norm, display] of tailoredByNorm) {
    if (originalByNorm.has(norm)) unchanged.push(display);
    else added.push(display);
  }

  for (const [norm, display] of originalByNorm) {
    if (!tailoredByNorm.has(norm)) removed.push(display);
  }

  return { added, removed, unchanged };
}

/**
 * Simple word-level diff for text comparison
 */
export function diffText(original: string, tailored: string): TextDiff[] {
  if (original === tailored) {
    return [{ type: 'unchanged', text: tailored }];
  }

  // Handle empty strings gracefully to avoid artifacts
  if (!original && tailored) {
    return [{ type: 'added', text: tailored }];
  }
  if (original && !tailored) {
    return [{ type: 'removed', text: original }];
  }
  
  const originalWords = original.split(/\s+/);
  const tailoredWords = tailored.split(/\s+/);
  
  // Use longest common subsequence approach for better diffs
  const lcs = findLCS(originalWords, tailoredWords);
  const result: TextDiff[] = [];
  
  let origIdx = 0;
  let tailIdx = 0;
  let lcsIdx = 0;
  
  while (origIdx < originalWords.length || tailIdx < tailoredWords.length) {
    // Check if current words match LCS
    const origMatchesLCS = lcsIdx < lcs.length && origIdx < originalWords.length && 
                           originalWords[origIdx] === lcs[lcsIdx];
    const tailMatchesLCS = lcsIdx < lcs.length && tailIdx < tailoredWords.length && 
                           tailoredWords[tailIdx] === lcs[lcsIdx];
    
    if (origMatchesLCS && tailMatchesLCS) {
      // Both match - unchanged
      result.push({ type: 'unchanged', text: originalWords[origIdx] });
      origIdx++;
      tailIdx++;
      lcsIdx++;
    } else if (!origMatchesLCS && origIdx < originalWords.length) {
      // Original word not in LCS - removed
      result.push({ type: 'removed', text: originalWords[origIdx] });
      origIdx++;
    } else if (!tailMatchesLCS && tailIdx < tailoredWords.length) {
      // Tailored word not in LCS - added
      result.push({ type: 'added', text: tailoredWords[tailIdx] });
      tailIdx++;
    } else {
      break;
    }
  }
  
  // Merge consecutive same-type diffs for cleaner output
  return mergeDiffs(result);
}

/**
 * Find longest common subsequence of words
 */
function findLCS(arr1: string[], arr2: string[]): string[] {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return lcs;
}

/**
 * Merge consecutive diffs of the same type
 */
function mergeDiffs(diffs: TextDiff[]): TextDiff[] {
  if (diffs.length === 0) return diffs;
  
  const merged: TextDiff[] = [];
  let current = { ...diffs[0] };
  
  for (let i = 1; i < diffs.length; i++) {
    if (diffs[i].type === current.type) {
      current.text += ' ' + diffs[i].text;
    } else {
      merged.push(current);
      current = { ...diffs[i] };
    }
  }
  merged.push(current);
  
  return merged;
}

/**
 * Compare experience arrays and identify changes
 */
export function compareExperience(
  original: Experience[],
  tailored: { position: string; company: string; description: string; achievements: string[] }[]
): {
  position: string;
  company: string;
  descriptionDiff: TextDiff[];
  achievementsDiff: { added: string[]; removed: string[]; unchanged: string[] };
}[] {
  return tailored.map((exp, index) => {
    const origExp = original[index];
    
    return {
      position: exp.position,
      company: exp.company,
      descriptionDiff: origExp ? diffText(origExp.description, exp.description) : 
                       [{ type: 'added' as const, text: exp.description }],
      achievementsDiff: origExp ? compareSkills(origExp.achievements, exp.achievements) :
                        { added: exp.achievements, removed: [], unchanged: [] }
    };
  });
}

/**
 * Count total changes for badges
 */
export function countChanges(skillDiff: SkillDiff): { added: number; removed: number } {
  return {
    added: skillDiff.added.length,
    removed: skillDiff.removed.length
  };
}
