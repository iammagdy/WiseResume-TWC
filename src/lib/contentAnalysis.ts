/**
 * Shared content-analysis helpers used by useATSSuggestions and useResumeNudges.
 */

export const PASSIVE_STARTERS = [
  'responsible for', 'managed', 'helped', 'assisted',
  'was responsible', 'duties included', 'tasked with',
];

const STRONG_ACTION_VERBS = [
  'led', 'developed', 'implemented', 'increased', 'decreased', 'reduced',
  'designed', 'built', 'launched', 'created', 'achieved', 'delivered',
  'improved', 'optimized', 'automated', 'streamlined', 'negotiated',
  'spearheaded', 'orchestrated', 'drove', 'established', 'transformed',
  'pioneered', 'generated', 'secured', 'accelerated', 'mentored',
  'architected', 'scaled', 'executed',
];

export const GENERIC_SKILLS = [
  'microsoft office', 'communication', 'teamwork', 'problem solving',
  'problem-solving', 'time management', 'leadership', 'organization',
  'organizational skills', 'detail oriented', 'detail-oriented',
  'hard working', 'hard-working', 'motivated', 'self-motivated',
  'fast learner', 'quick learner',
];

/** Returns true if the description starts with a passive/weak verb phrase. */
export function hasPassiveVerbs(description: string): boolean {
  const lower = description.toLowerCase().trim();
  return PASSIVE_STARTERS.some((p) => lower.startsWith(p));
}

/** Returns true if any line starts with a strong action verb. */
export function hasActionVerbs(description: string): boolean {
  const lines = description.split(/[\n•\-;]/).filter(Boolean);
  return lines.some((line) => {
    const firstWord = line.trim().split(/\s/)[0]?.toLowerCase();
    return firstWord && STRONG_ACTION_VERBS.includes(firstWord);
  });
}

/** Returns true if the text contains at least one number. */
export function hasMetrics(description: string): boolean {
  return /\d+/.test(description);
}

/** Returns the first passive starter found, or null. */
export function findPassiveStarter(description: string): string | null {
  const lower = description.toLowerCase().trim();
  return PASSIVE_STARTERS.find((p) => lower.startsWith(p)) || null;
}

/** Returns true if description has any line (split by newlines/bullets) longer than maxLen chars. */
export function hasLongBullets(description: string, maxLen = 150): boolean {
  const lines = description.split(/[\n•]/).filter((l) => l.trim().length > 0);
  return lines.some((l) => l.trim().length > maxLen);
}
