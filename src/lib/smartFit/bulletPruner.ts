import type { ResumeData } from '@/types/resume';
import type { BulletDropProposal, ScoredSentence } from './types';

/**
 * Given the scored sentence list, propose specific bullets to drop.
 *
 * Strategy: only consider sentences that are a *whole* achievement (so we
 * never drop a fragment of a multi-sentence bullet), prefer the
 * lowest-information bullets (highest score in older roles), and never
 * leave a role with zero bullets — every experience keeps at least one.
 */
export function proposeBulletDrops(
  resume: ResumeData,
  scored: ScoredSentence[],
  /** How much character savings we still need (rough proxy for vertical space). */
  charsNeeded: number,
): BulletDropProposal[] {
  if (charsNeeded <= 0) return [];

  // Group all achievement-sentences by `experienceId:achievementIndex` so we
  // only treat *whole* achievements as droppable (multi-sentence bullets are
  // not split across drops — apply-or-keep, never partial).
  const byBullet = new Map<string, ScoredSentence[]>();
  for (const s of scored) {
    if (s.location.kind !== 'experience-achievement') continue;
    const key = `${s.location.experienceId}::${s.location.achievementIndex}`;
    const arr = byBullet.get(key) ?? [];
    arr.push(s);
    byBullet.set(key, arr);
  }

  // For each bullet, compute aggregate score (sum of sentence scores) and
  // total character length.
  interface BulletAgg {
    experienceId: string;
    achievementIndex: number;
    text: string;
    chars: number;
    score: number;
  }
  const aggs: BulletAgg[] = [];
  for (const [, sentences] of byBullet) {
    const exp = resume.experience?.find(
      e => sentences[0].location.kind === 'experience-achievement'
        && e.id === sentences[0].location.experienceId,
    );
    if (!exp) continue;
    const loc = sentences[0].location;
    if (loc.kind !== 'experience-achievement') continue;
    const text = exp.achievements?.[loc.achievementIndex] ?? '';
    if (!text) continue;
    aggs.push({
      experienceId: loc.experienceId,
      achievementIndex: loc.achievementIndex,
      text,
      chars: text.length,
      score: sentences.reduce((sum, s) => sum + s.score, 0),
    });
  }

  // Track how many bullets each role would have after drops, never below 1.
  const remainingBullets = new Map<string, number>();
  for (const exp of resume.experience ?? []) {
    remainingBullets.set(exp.id, exp.achievements?.length ?? 0);
  }

  // Highest-score (= best to drop) first.
  aggs.sort((a, b) => b.score - a.score);

  const out: BulletDropProposal[] = [];
  let saved = 0;
  for (const a of aggs) {
    if (saved >= charsNeeded) break;
    const remaining = remainingBullets.get(a.experienceId) ?? 0;
    if (remaining <= 1) continue;
    out.push({
      id: `drop:${a.experienceId}:${a.achievementIndex}`,
      experienceId: a.experienceId,
      achievementIndex: a.achievementIndex,
      text: a.text,
      reason: buildReason(a),
    });
    remainingBullets.set(a.experienceId, remaining - 1);
    saved += a.chars;
  }
  return out;
}

function buildReason(a: { text: string; chars: number; score: number }): string {
  if (a.chars > 200) {
    return `Longest bullet in this role (${a.chars} chars) — dropping recovers the most space.`;
  }
  if (a.score > 100) {
    return 'Lowest signal-to-length ratio in an older role.';
  }
  return 'Lowest-impact bullet in this role.';
}
