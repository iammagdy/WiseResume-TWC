/**
 * Shared deterministic keyword-scoring utilities.
 * Single source of truth used by both tailor-resume and validate-tailor.
 * Any bug fix or algorithmic change must be made here only.
 */

/**
 * Selectively strip common English suffixes to normalise variants.
 * e.g. "managing" → "manag", "managed" → "manag", "kubernetes" → "kubernetes"
 * Avoids false positives from substring matching (e.g. "java" inside "javascript").
 */
export function stem(word: string): string {
  const w = word.toLowerCase().trim();
  let s = w.replace(/'s$/, '');
  const suffixes = [
    'ations', 'ation', 'ments', 'ment', 'ities', 'ity', 'ness',
    'ings', 'ing', 'tion', 'ions', 'ion', 'ers', 'er', 'ies', 'es', 's', 'ed', 'ly',
  ];
  for (const suffix of suffixes) {
    if (s.length > suffix.length + 3 && s.endsWith(suffix)) {
      s = s.slice(0, s.length - suffix.length);
      break;
    }
  }
  return s;
}

/**
 * Tokenise text into normalised word tokens for keyword matching.
 * Splits on non-alphanumeric characters, lowercases all tokens.
 */
export function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 0);
}

/**
 * Counts how many times a keyword (which may be a phrase) appears in tokenised text.
 * Uses word-boundary matching on tokens to prevent substring false positives.
 * For single-word keywords: matches stemmed token.
 * For multi-word phrases: looks for all tokens appearing consecutively (sliding window).
 */
export function countKeywordInTokens(keyword: string, textTokens: string[]): number {
  const kwTokens = tokenize(keyword);
  if (kwTokens.length === 0) return 0;

  if (kwTokens.length === 1) {
    const stemmedKw = stem(kwTokens[0]);
    return textTokens.filter(t => stem(t) === stemmedKw).length;
  }

  const stemmedKwTokens = kwTokens.map(stem);
  let count = 0;
  for (let i = 0; i <= textTokens.length - stemmedKwTokens.length; i++) {
    let match = true;
    for (let j = 0; j < stemmedKwTokens.length; j++) {
      if (stem(textTokens[i + j]) !== stemmedKwTokens[j]) {
        match = false;
        break;
      }
    }
    if (match) count++;
  }
  return count;
}

/**
 * Extracts a flat text representation of the resume for keyword counting.
 */
export function resumeToText(resume: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof resume.summary === 'string') parts.push(resume.summary);
  if (Array.isArray(resume.skills)) {
    parts.push(
      (resume.skills as unknown[])
        .map((s) => (typeof s === 'string' ? s : (s as Record<string, string>)?.name || ''))
        .join(' '),
    );
  }
  if (Array.isArray(resume.experience)) {
    for (const exp of resume.experience as Record<string, unknown>[]) {
      if (typeof exp.description === 'string') parts.push(exp.description);
      if (typeof exp.position === 'string') parts.push(exp.position);
      if (Array.isArray(exp.achievements)) parts.push((exp.achievements as string[]).join(' '));
    }
  }
  if (Array.isArray(resume.education)) {
    for (const edu of resume.education as Record<string, unknown>[]) {
      const eduParts = [edu.degree, edu.field, edu.institution].filter(Boolean) as string[];
      if (eduParts.length > 0) parts.push(eduParts.join(' '));
    }
  }
  if (Array.isArray(resume.projects)) {
    for (const proj of resume.projects as Record<string, unknown>[]) {
      if (typeof proj.description === 'string') parts.push(proj.description);
      if (Array.isArray(proj.technologies)) parts.push((proj.technologies as string[]).join(' '));
    }
  }
  if (Array.isArray(resume.certifications)) {
    for (const cert of resume.certifications as Record<string, unknown>[]) {
      if (typeof cert.name === 'string') parts.push(cert.name);
    }
  }
  return parts.join(' ');
}

/**
 * Deterministic keyword scoring: returns a score (0–100) plus matched/missing lists.
 * Used by validate-tailor for Phase 1 and by tailor-resume for the gap score.
 * Score and keyword lists must NEVER come from AI — this function is the authority.
 */
export function computeDeterministicScores(
  keywords: string[],
  finalResumeText: string,
): { score: number; matched_keywords: string[]; missing_keywords: string[] } {
  if (!keywords.length) return { score: 0, matched_keywords: [], missing_keywords: [] };

  const finalTokens = tokenize(finalResumeText);
  const matched_keywords: string[] = [];
  const missing_keywords: string[] = [];

  for (const keyword of keywords) {
    if (!keyword.trim()) continue;
    if (countKeywordInTokens(keyword, finalTokens) > 0) {
      matched_keywords.push(keyword);
    } else {
      missing_keywords.push(keyword);
    }
  }

  const total = keywords.filter(k => k.trim()).length;
  const score = total > 0 ? Math.round((matched_keywords.length / total) * 100) : 0;
  return { score, matched_keywords, missing_keywords };
}
