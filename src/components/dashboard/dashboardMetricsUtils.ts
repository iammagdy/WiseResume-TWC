import type { ResumeHealthScore } from '@/hooks/useResumeScore';
import type { ScoreHistoryEntry } from '@/store/atsScoreHistoryStore';
import { isTailoredResume } from '@/lib/resumeLineage';

const SEVEN_DAYS_MS = 7 * 86_400_000;

/** Mean ATS % across resumes that have a scored result (> 0). */
export function computeCurrentAtsAverage(
  healthScores: Record<string, ResumeHealthScore>,
  activeResumeIds: string[],
): number | null {
  if (activeResumeIds.length === 0) return null;
  const scores = activeResumeIds
    .map((id) => healthScores[id]?.overallScore)
    .filter((s): s is number => typeof s === 'number' && s > 0);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function sortedEntries(entries: ScoreHistoryEntry[]): ScoreHistoryEntry[] {
  return [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

/** Latest known score per active resume at or before `asOfMs`. */
function portfolioAverageAt(
  history: Record<string, ScoreHistoryEntry[]>,
  activeResumeIds: string[],
  asOfMs: number,
): number | null {
  const scores: number[] = [];
  for (const id of activeResumeIds) {
    const entries = sortedEntries(history[id] ?? []).filter(
      (e) => new Date(e.timestamp).getTime() <= asOfMs,
    );
    if (entries.length === 0) continue;
    scores.push(entries[entries.length - 1].score);
  }
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export interface PortfolioAtsChartPoint {
  score: number;
  index: number;
}

/**
 * Portfolio ATS average after each scoring event (active resumes only).
 * Fixed-scale bar chart data — not min/max normalized.
 */
export function buildPortfolioAtsChartSeries(
  history: Record<string, ScoreHistoryEntry[]>,
  activeResumeIds: string[],
  currentAvg: number | null,
): PortfolioAtsChartPoint[] | null {
  if (activeResumeIds.length === 0) return null;

  const events: { t: number; resumeId: string; score: number }[] = [];
  for (const id of activeResumeIds) {
    for (const e of history[id] ?? []) {
      events.push({
        t: new Date(e.timestamp).getTime(),
        resumeId: id,
        score: e.score,
      });
    }
  }

  const latestByResume: Record<string, number> = {};
  const averages: number[] = [];

  if (events.length >= 1) {
    events.sort((a, b) => a.t - b.t);
    for (const ev of events) {
      latestByResume[ev.resumeId] = ev.score;
      const vals = Object.values(latestByResume);
      averages.push(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length));
    }
  }

  const deduped = averages.filter((v, i) => i === 0 || v !== averages[i - 1]);
  let series = deduped.slice(-7).map((score, index) => ({ score, index }));

  if (currentAvg != null && currentAvg > 0) {
    const last = series[series.length - 1];
    if (!last || last.score !== currentAvg) {
      series = [...series, { score: currentAvg, index: series.length }].slice(-8);
    }
  } else if (series.length === 0) {
    return null;
  }

  return series.length >= 2 ? series.map((p, i) => ({ score: p.score, index: i })) : null;
}

/**
 * Change in portfolio ATS average vs 7 days ago (percentage points).
 * Requires historical portfolio average at that date.
 */
export function computePortfolioAtsDelta(
  history: Record<string, ScoreHistoryEntry[]>,
  activeResumeIds: string[],
  currentAvg: number | null,
): number | null {
  if (currentAvg == null || activeResumeIds.length === 0) return null;

  const weekAgo = Date.now() - SEVEN_DAYS_MS;
  const priorAvg = portfolioAverageAt(history, activeResumeIds, weekAgo);
  if (priorAvg == null) return null;

  const delta = currentAvg - priorAvg;
  return delta === 0 ? null : delta;
}

export function countTailoredResumesThisWeek(
  resumes: { $id: string; parent_resume_id?: string | null; title?: string | null; $createdAt?: string; $updatedAt?: string }[],
  tailoredIds?: Set<string>,
): number {
  const weekAgo = Date.now() - SEVEN_DAYS_MS;
  return resumes.filter((r) => {
    if (!isTailoredResume(r, tailoredIds)) return false;
    const t = new Date(r.$createdAt || r.$updatedAt || 0).getTime();
    return t >= weekAgo;
  }).length;
}

/** Total missing keywords summed across scored resumes (live ATS keywordGaps). */
export function computeTotalMissingKeywords(
  healthScores: Record<string, ResumeHealthScore>,
  activeResumeIds: string[],
): number {
  let total = 0;
  for (const id of activeResumeIds) {
    const gaps = healthScores[id]?.keywordGaps;
    if (gaps?.length) total += gaps.length;
  }
  return total;
}

/** Resumes with a stored job match score ≥ 70% (from tailor / target job on the CV). */
export function computeApplicationStrongMatches(
  resumes: { job_match_score?: number }[],
): number {
  return resumes.filter(
    (r) => typeof r.job_match_score === 'number' && r.job_match_score >= 70,
  ).length;
}

export function countResumesWithJobMatchScore(resumes: { job_match_score?: number }[]): number {
  return resumes.filter((r) => typeof r.job_match_score === 'number').length;
}
