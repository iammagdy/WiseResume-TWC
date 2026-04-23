import { ResumeData, Experience, Education } from '@/types/resume';
import { RedFlag } from '@/types/aiStudio';

interface TargetContent {
  section: 'summary' | 'experience' | 'education' | 'skills' | 'contact';
  id?: string;
  content: string | Experience | Education | string[];
  fuzzyConfidence?: number;
}

export interface ApplyFixResult {
  target: TargetContent;
  confidence: number;
}

/** Compute Levenshtein distance between two strings (normalized). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Compute a fuzzy similarity score between 0 and 1.
 * Uses substring containment first, then Levenshtein on shorter quotes.
 */
function fuzzyScore(haystack: string, needle: string): number {
  if (!needle || needle === 'N/A') return 0;
  const h = haystack.toLowerCase().replace(/\s+/g, ' ').trim();
  const n = needle.toLowerCase().replace(/\s+/g, ' ').trim();
  if (h.includes(n)) return 1.0;
  // Sliding window: find best Levenshtein similarity for needle-length window
  if (n.length < 10) return 0;
  const windowSize = Math.min(n.length + Math.floor(n.length * 0.3), h.length);
  if (windowSize > h.length) {
    const dist = levenshtein(h, n);
    const maxLen = Math.max(h.length, n.length);
    return Math.max(0, 1 - dist / maxLen);
  }
  let bestScore = 0;
  for (let i = 0; i <= h.length - n.length; i++) {
    const window = h.slice(i, i + windowSize);
    const dist = levenshtein(window, n);
    const score = Math.max(0, 1 - dist / Math.max(window.length, n.length));
    if (score > bestScore) bestScore = score;
    if (bestScore >= 0.85) break;
  }
  return bestScore;
}

const FUZZY_THRESHOLD = 0.5;

export function findTargetContent(resume: ResumeData, redFlag: RedFlag): TargetContent | null {
  const { fixType, quote } = redFlag;

  // 1. Summary
  if (fixType === 'summary') {
    return {
      section: 'summary',
      content: resume.summary,
    };
  }

  // 2. Skills
  if (fixType === 'skills') {
    return {
      section: 'skills',
      content: resume.skills,
    };
  }

  // 3. Experience
  if (fixType === 'experience') {
    if (!quote || quote === 'N/A' || quote.length < 5) {
      return null;
    }

    let bestJob: Experience | null = null;
    let bestScore = 0;

    for (const exp of resume.experience) {
      const combinedText = [
        exp.description || '',
        ...(exp.achievements || []),
        ...(exp.responsibilities || []),
        `${exp.position} at ${exp.company}`,
      ].join(' ');
      const score = fuzzyScore(combinedText, quote);
      if (score > bestScore) {
        bestScore = score;
        bestJob = exp;
      }
    }

    if (bestJob && bestScore >= FUZZY_THRESHOLD) {
      return {
        section: 'experience',
        id: bestJob.id,
        content: bestJob,
      };
    }
    return null;
  }

  // 4. Education
  if (fixType === 'education') {
    if (!quote || quote === 'N/A' || quote.length < 5) {
      if (resume.education.length > 0) {
        return { section: 'education', id: resume.education[0].id, content: resume.education[0], fuzzyConfidence: 0.3 };
      }
      return null;
    }

    let bestEdu: Education | null = null;
    let bestScore = 0;

    for (const edu of resume.education) {
      const combinedText = `${edu.degree} ${edu.field} ${edu.institution}`;
      const score = fuzzyScore(combinedText, quote);
      if (score > bestScore) {
        bestScore = score;
        bestEdu = edu;
      }
    }

    if (bestEdu) {
      return {
        section: 'education',
        id: bestEdu.id,
        content: bestEdu,
      };
    }
  }

  // 5. Contact (Explicitly handled elsewhere, but for completeness)
  if (fixType === 'contact') {
    return null;
  }

  return null;
}
