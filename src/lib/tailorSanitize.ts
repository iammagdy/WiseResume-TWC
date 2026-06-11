import { normalizeSkill } from '@/lib/diffUtils';

function normalizeBullet(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function bulletSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.92;
  const aWords = new Set(a.split(' ').filter(Boolean));
  const bWords = new Set(b.split(' ').filter(Boolean));
  if (!aWords.size || !bWords.size) return 0;
  let overlap = 0;
  for (const w of aWords) {
    if (bWords.has(w)) overlap += 1;
  }
  return overlap / Math.max(aWords.size, bWords.size);
}

/** Drop near-duplicate achievement bullets (AI sometimes repeats the same line). */
export function dedupeAchievements(achievements: string[] | undefined): string[] {
  if (!achievements?.length) return [];
  const kept: string[] = [];
  const norms: string[] = [];

  for (const bullet of achievements) {
    const trimmed = (bullet || '').trim();
    if (!trimmed) continue;
    const norm = normalizeBullet(trimmed);
    const isDupe = norms.some((existing) => bulletSimilarity(existing, norm) >= 0.82);
    if (isDupe) continue;
    norms.push(norm);
    kept.push(trimmed);
  }

  return kept;
}

/**
 * Merge tailored skills onto the original list: job-focused order from AI first,
 * then preserve any original skills the model dropped.
 */
export function mergeSkillsForTailor(original: string[], tailored: string[]): string[] {
  const originalByNorm = new Map<string, string>();
  for (const skill of original) {
    originalByNorm.set(normalizeSkill(skill), skill);
  }

  const merged: string[] = [];
  const seen = new Set<string>();

  for (const skill of tailored) {
    const norm = normalizeSkill(skill);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    merged.push(originalByNorm.get(norm) ?? skill);
  }

  for (const skill of original) {
    const norm = normalizeSkill(skill);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    merged.push(skill);
  }

  return merged;
}
