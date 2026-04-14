const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'including', 'until', 'against', 'among', 'throughout', 'despite',
  'towards', 'upon', 'concerning', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'dare', 'ought', 'used', 'that', 'this', 'these', 'those', 'it', 'its',
  'you', 'we', 'they', 'he', 'she', 'i', 'me', 'him', 'her', 'us', 'them',
  'who', 'which', 'what', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'only', 'own', 'same', 'than', 'too', 'very', 's', 't', 'just', 'don',
  'as', 'if', 'not', 'our', 'your', 'their', 'my', 'his', 'her', 'our',
  'any', 'also', 'will', 'well', 'new', 'work', 'use', 'using',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'able', 'across', 'after', 'again', 'ago', 'ahead', 'already', 'although',
  'always', 'amount', 'another', 'around', 'away', 'back', 'before',
  'between', 'come', 'day', 'even', 'ever', 'first', 'get', 'give',
  'good', 'great', 'high', 'large', 'last', 'leave', 'long', 'look',
  'make', 'many', 'much', 'next', 'often', 'part', 'people', 'place',
  'point', 'right', 'role', 'see', 'set', 'show', 'small', 'still',
  'take', 'think', 'time', 'type', 'way', 'year', 'years', 'based',
  'including', 'related', 'strong', 'key', 'required', 'experience',
  'position', 'job', 'candidate', 'team', 'company', 'business',
  'knowledge', 'ability', 'skills', 'skill', 'join', 'looking', 'seeking',
  'provide', 'support', 'ensure', 'help', 'drive', 'build', 'create',
  'develop', 'manage', 'understand', 'opportunity', 'environment',
]);

export interface ExtractedKeyword {
  word: string;
  frequency: number;
  isPhrase: boolean;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function extractPhrases(text: string): string[] {
  const phrases: string[] = [];
  const lower = text.toLowerCase();

  const patterns = [
    /\b(\w+(?:\s+\w+){1,3})\s+(?:experience|skills?|knowledge|background|proficiency|expertise)\b/gi,
    /\b(?:proficient|experienced?|skilled?|knowledgeable)\s+(?:in|with|at)\s+(\w+(?:\s+\w+){0,2})\b/gi,
    /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)\b/g,
  ];

  for (const pattern of patterns) {
    const matches = lower.matchAll(pattern);
    for (const m of matches) {
      const phrase = (m[1] || m[0]).trim();
      if (phrase.split(/\s+/).length >= 2 && phrase.length > 4) {
        phrases.push(phrase);
      }
    }
  }
  return phrases;
}

export function extractKeywords(jobDescription: string, topN = 30): ExtractedKeyword[] {
  const freqMap: Map<string, number> = new Map();

  const words = tokenize(jobDescription);
  for (const w of words) {
    if (w.length < 3) continue;
    freqMap.set(w, (freqMap.get(w) || 0) + 1);
  }

  const phrases = extractPhrases(jobDescription);
  for (const phrase of phrases) {
    freqMap.set(phrase, (freqMap.get(phrase) || 0) + 2);
  }

  const sorted = Array.from(freqMap.entries())
    .filter(([, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);

  return sorted.map(([word, frequency]) => ({
    word,
    frequency,
    isPhrase: word.includes(' '),
  }));
}

export function checkKeywordsInResume(
  keywords: ExtractedKeyword[],
  resumeText: string,
): { present: string[]; missing: string[] } {
  const lower = resumeText.toLowerCase();
  const present: string[] = [];
  const missing: string[] = [];

  for (const kw of keywords) {
    if (lower.includes(kw.word.toLowerCase())) {
      present.push(kw.word);
    } else {
      missing.push(kw.word);
    }
  }

  return { present, missing };
}

/**
 * Splits text into segments with keyword match metadata for inline highlighting.
 * Uses a single forward cursor so each character is emitted exactly once.
 * Returns an array of {text, type} objects safe for React rendering.
 */
export function segmentTextForHighlight(
  text: string,
  presentKeywords: string[],
  missingKeywords: string[],
): Array<{ text: string; type: 'normal' | 'present' | 'missing' }> {
  if (!text || (presentKeywords.length === 0 && missingKeywords.length === 0)) {
    return [{ text, type: 'normal' }];
  }

  const allKeywords = [
    ...presentKeywords.map(k => ({ word: k, type: 'present' as const })),
    ...missingKeywords.map(k => ({ word: k, type: 'missing' as const })),
  ].sort((a, b) => b.word.length - a.word.length); // longest-first for greedy matching

  const segments: Array<{ text: string; type: 'normal' | 'present' | 'missing' }> = [];
  const lower = text.toLowerCase();
  let cursor = 0;

  while (cursor < text.length) {
    // Find the earliest keyword match at or after cursor position
    let earliest = -1;
    let earliestKw: { word: string; type: 'present' | 'missing' } | null = null;

    for (const kw of allKeywords) {
      const idx = lower.indexOf(kw.word.toLowerCase(), cursor);
      if (idx !== -1 && (earliest === -1 || idx < earliest)) {
        earliest = idx;
        earliestKw = kw;
      }
    }

    if (earliest === -1) {
      // No more keywords — emit the rest as normal text and stop
      segments.push({ text: text.slice(cursor), type: 'normal' });
      break;
    }

    // Emit any normal text that appears before this keyword
    if (earliest > cursor) {
      segments.push({ text: text.slice(cursor, earliest), type: 'normal' });
    }

    // Emit the keyword span
    segments.push({ text: text.slice(earliest, earliest + earliestKw!.word.length), type: earliestKw!.type });
    cursor = earliest + earliestKw!.word.length;
  }

  return segments.filter(s => s.text.length > 0);
}

export interface SectionCoverage {
  section: string;
  matchingKeywords: string[];
  coveragePercent: number;
}

/** Returns keyword coverage broken down by resume section (Summary, Skills, Experience, Education). */
export function checkKeywordsPerSection(
  keywords: ExtractedKeyword[],
  resume: {
    summary?: string | null;
    skills?: (string | { name?: string })[];
    experience?: Array<{
      position?: string;
      company?: string;
      description?: string;
      achievements?: string[];
    }>;
    education?: Array<{
      degree?: string;
      field?: string;
      institution?: string;
    }>;
  },
): SectionCoverage[] {
  const allWords = keywords.map(k => k.word.toLowerCase());

  function matchingInText(text: string): string[] {
    const lower = text.toLowerCase();
    return allWords.filter(kw => lower.includes(kw));
  }

  function matchingInTextArr(text: string): string[] {
    return [...new Set(matchingInText(text))];
  }

  const sections: SectionCoverage[] = [];

  // Summary
  if (resume.summary) {
    const matching = matchingInTextArr(resume.summary);
    sections.push({ section: 'Summary', matchingKeywords: matching, coveragePercent: Math.round((matching.length / allWords.length) * 100) });
  }

  // Skills
  if (resume.skills && resume.skills.length > 0) {
    const text = resume.skills.map(s => {
      if (typeof s === 'string') return s;
      if (s && typeof s === 'object' && 'name' in s) return String((s as { name?: unknown }).name || '');
      return '';
    }).join(' ');
    const matching = matchingInTextArr(text);
    sections.push({ section: 'Skills', matchingKeywords: matching, coveragePercent: Math.round((matching.length / allWords.length) * 100) });
  }

  // Experience
  if (resume.experience && resume.experience.length > 0) {
    const text = resume.experience.map(exp => [
      exp.position || '', exp.company || '', exp.description || '', ...(exp.achievements || []),
    ].join(' ')).join(' ');
    const matching = matchingInTextArr(text);
    sections.push({ section: 'Experience', matchingKeywords: matching, coveragePercent: Math.round((matching.length / allWords.length) * 100) });
  }

  // Education
  if (resume.education && resume.education.length > 0) {
    const text = resume.education.map(edu => [
      edu.degree || '', edu.field || '', edu.institution || '',
    ].join(' ')).join(' ');
    const matching = matchingInTextArr(text);
    sections.push({ section: 'Education', matchingKeywords: matching, coveragePercent: Math.round((matching.length / allWords.length) * 100) });
  }

  return sections;
}

export function buildResumeTextFromData(resume: {
  summary?: string | null;
  skills?: (string | { name?: string })[];
  experience?: Array<{
    position?: string;
    company?: string;
    description?: string;
    achievements?: string[];
  }>;
  education?: Array<{
    degree?: string;
    field?: string;
    institution?: string;
  }>;
}): string {
  const parts: string[] = [];

  if (resume.summary) parts.push(resume.summary);

  if (resume.skills) {
    for (const s of resume.skills) {
      if (typeof s === 'string') parts.push(s);
      else if (s && typeof s === 'object' && 'name' in s) parts.push(String((s as { name?: unknown }).name || ''));
    }
  }

  if (resume.experience) {
    for (const exp of resume.experience) {
      if (exp.position) parts.push(exp.position);
      if (exp.company) parts.push(exp.company);
      if (exp.description) parts.push(exp.description);
      if (exp.achievements) parts.push(...exp.achievements);
    }
  }

  if (resume.education) {
    for (const edu of resume.education) {
      if (edu.degree) parts.push(edu.degree);
      if (edu.field) parts.push(edu.field);
      if (edu.institution) parts.push(edu.institution);
    }
  }

  return parts.join(' ');
}
