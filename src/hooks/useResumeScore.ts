import { useState, useCallback } from 'react';
import { getSupabaseToken } from '@/lib/supabaseAuth';

import { ResumeData } from '@/types/resume';
import { toast } from 'sonner';
import { useATSScoreHistoryStore } from '@/store/atsScoreHistoryStore';
import { apiFnUrl } from '@/lib/apiFnUrl';

export interface WeakBullet {
  text: string;
  reason: 'no_action_verb' | 'no_metric' | 'both';
}

export interface ResumeHealthScore {
  overallScore: number;
  categories: {
    keywordOptimization: number;
    contentQuality: number;
    sectionStructure: number;
    parsability: number;
    contactCompleteness: number;
    lengthDensity: number;
    templateFriendliness: number;
  };
  topStrength: string;
  topImprovement: string;
  keywordGaps?: string[];
  weakBullets?: WeakBullet[];
  tenseHint?: string;
  scoredAt: string;
}

// In-memory cache keyed by resume updated_at to auto-invalidate on edits.
// Hydrated from localStorage on module load and persisted on every write so
// background scoring on a fresh dashboard mount only fires for resumes whose
// `updated_at` actually changed since last visit.
const SCORE_CACHE_STORAGE_KEY = 'wr-pcache:scoreCache';
const SCORE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SCORE_CACHE_MAX_ENTRIES = 50;

interface PersistedScoreEntry {
  k: string;
  v: ResumeHealthScore;
  t: number;
}

function hydrateScoreCacheFromStorage(): Map<string, ResumeHealthScore> {
  const map = new Map<string, ResumeHealthScore>();
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SCORE_CACHE_STORAGE_KEY) : null;
    if (!raw) return map;
    const parsed = JSON.parse(raw) as { v: 1; entries: PersistedScoreEntry[] } | null;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.entries)) return map;
    const now = Date.now();
    for (const entry of parsed.entries) {
      if (!entry?.k || !entry?.v) continue;
      if (now - (entry.t ?? 0) > SCORE_CACHE_TTL_MS) continue;
      map.set(entry.k, entry.v);
    }
  } catch {
    /* corrupt storage — start fresh */
  }
  return map;
}

const scoreCache = hydrateScoreCacheFromStorage();
// Track per-key write timestamps so we can prune by age.
const scoreCacheWriteTimes = new Map<string, number>(
  Array.from(scoreCache.keys()).map(k => [k, Date.now()] as const),
);

let scorePersistTimer: ReturnType<typeof setTimeout> | null = null;
function persistScoreCacheSoon() {
  if (scorePersistTimer) return;
  scorePersistTimer = setTimeout(() => {
    scorePersistTimer = null;
    try {
      const now = Date.now();
      const all: PersistedScoreEntry[] = [];
      for (const [k, v] of scoreCache.entries()) {
        const t = scoreCacheWriteTimes.get(k) ?? now;
        if (now - t > SCORE_CACHE_TTL_MS) continue;
        all.push({ k, v, t });
      }
      // Keep only the most recently written entries within the cap.
      const trimmed = all
        .sort((a, b) => b.t - a.t)
        .slice(0, SCORE_CACHE_MAX_ENTRIES);
      localStorage.setItem(
        SCORE_CACHE_STORAGE_KEY,
        JSON.stringify({ v: 1, entries: trimmed }),
      );
    } catch {
      /* localStorage full or disabled — skip silently */
    }
  }, 250);
}

function rememberScoreCacheWrite(key: string) {
  scoreCacheWriteTimes.set(key, Date.now());
  persistScoreCacheSoon();
}

// Track consecutive background-score failures so we can surface a
// user-visible toast after repeated silent failures (instead of just
// burying them in console warnings forever). Reset on the first
// successful score.
let backgroundFailureStreak = 0;
let lastBackgroundFailureToastAt = 0;
const BACKGROUND_FAILURE_TOAST_THRESHOLD = 3; // first toast after 3 in a row
const BACKGROUND_FAILURE_TOAST_COOLDOWN_MS = 10 * 60 * 1000; // re-toast at most every 10min

function cacheKey(resumeId: string, updatedAt: string) {
  return `${resumeId}:${updatedAt}`;
}

export function clearCachedScore(resumeId: string, updatedAt: string) {
  const key = cacheKey(resumeId, updatedAt);
  scoreCache.delete(key);
  scoreCacheWriteTimes.delete(key);
  persistScoreCacheSoon();
}

/** Drop every cached score — called on sign-out / user change. */
export function clearAllCachedScores() {
  scoreCache.clear();
  scoreCacheWriteTimes.clear();
  try {
    localStorage.removeItem(SCORE_CACHE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Strip non-content fields so identical content always produces identical requests */
function normalizeForScoring(resume: ResumeData): { content: Partial<ResumeData>; templateId?: string } {
  const { id, createdAt, updatedAt, templateId, customization, ...content } = resume;
  // Sort skills for consistent ordering
  if (content.skills) {
    content.skills = [...content.skills].sort();
  }
  return { content, templateId };
}

/** Helper: wait ms */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function invokeScoreResume(resume: ResumeData, isBackground = false): Promise<{ data: any; latencyMs: number }> {
  const { content: normalized, templateId } = normalizeForScoring(resume);
  const _start = Date.now();
  const token = await getSupabaseToken();

  if (!token) {
    // Bridge token not ready — silently skip scoring rather than showing a false session-expired error
    throw Object.assign(new Error('Scoring skipped: bridge token not available'), { isSkip: true });
  }

  const res = await fetch(apiFnUrl(`score-resume`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ resume: normalized, templateId, ...(isBackground ? { source: 'background' } : {}) }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[ScoreResume] fetch failed:', res.status, errText);
    if (res.status === 401) {
      throw Object.assign(new Error('Session expired. Please sign in again.'), { isAuth: true });
    }
    if (res.status === 429) {
      throw Object.assign(new Error('Rate limit reached. Try again shortly.'), { isRateLimit: true });
    }
    throw new Error(`Scoring failed (${res.status})`);
  }

  const data = await res.json();

  if (data?.error) {
    console.error('[ScoreResume] API body error:', data.error);
    throw new Error(data.error);
  }

  return { data, latencyMs: Date.now() - _start };
}

/**
 * Per-resume debounce of background scoring. We coalesce rapid consecutive
 * `backgroundScore` calls (e.g. from a burst of autosaves) so the heuristic
 * only runs after the user pauses. The autosave path is already throttled
 * to ~60s, but this guarantees no per-keystroke storm if any new caller
 * hooks in later.
 *
 * Returns a Promise so existing callers (e.g. DashboardPage) that
 * `await` the call and then read the cache can still rely on the
 * scoring being complete by the time the awaited promise resolves.
 */
const BACKGROUND_SCORE_DEBOUNCE_MS = 350;

interface PendingBackgroundScore {
  timer: ReturnType<typeof setTimeout>;
  resume: ResumeData;
  updatedAt: string;
  waiters: Array<() => void>;
}
const pendingDebounceEntries = new Map<string, PendingBackgroundScore>();

/**
 * Standalone debounced scorer for background use (no React state).
 *
 * Calls are debounced per `resumeId` by ~350ms — repeated calls for the
 * same resume within the window coalesce: only the latest `resume` /
 * `updatedAt` is scored, but every awaiting caller resolves once that
 * single run completes.
 */
export function backgroundScore(resumeId: string, resume: ResumeData, updatedAt: string): Promise<void> {
  return new Promise<void>((resolve) => {
    const existing = pendingDebounceEntries.get(resumeId);
    if (existing) {
      clearTimeout(existing.timer);
      existing.resume = resume;
      existing.updatedAt = updatedAt;
      existing.waiters.push(resolve);
      existing.timer = setTimeout(() => fireDebouncedScore(resumeId), BACKGROUND_SCORE_DEBOUNCE_MS);
      pendingDebounceEntries.set(resumeId, existing);
      return;
    }
    const entry: PendingBackgroundScore = {
      timer: setTimeout(() => fireDebouncedScore(resumeId), BACKGROUND_SCORE_DEBOUNCE_MS),
      resume,
      updatedAt,
      waiters: [resolve],
    };
    pendingDebounceEntries.set(resumeId, entry);
  });
}

function fireDebouncedScore(resumeId: string): void {
  const entry = pendingDebounceEntries.get(resumeId);
  if (!entry) return;
  pendingDebounceEntries.delete(resumeId);
  void runBackgroundScore(resumeId, entry.resume, entry.updatedAt).finally(() => {
    for (const w of entry.waiters) {
      try { w(); } catch { /* swallow individual waiter errors */ }
    }
  });
}

async function runBackgroundScore(resumeId: string, resume: ResumeData, updatedAt: string): Promise<void> {
  const key = cacheKey(resumeId, updatedAt);
  if (scoreCache.has(key)) return;
  try {
    const { data } = await invokeScoreResume(resume, true);
    // NOTE: deliberately do NOT recordSuccess on the AI health store —
    // score-resume is deterministic and unrelated to AI provider health.
    const score: ResumeHealthScore = { ...data, scoredAt: new Date().toISOString() };
    scoreCache.set(key, score);
    rememberScoreCacheWrite(key);
    useATSScoreHistoryStore.getState().addScore(resumeId, score);
    // Reset the failure streak so a transient blip doesn't accumulate
    // toward an unrelated future toast.
    backgroundFailureStreak = 0;
  } catch (err: unknown) {
    // score-resume is fully deterministic (no callAI). Failures here must
    // NOT poison the AI health badge — they're scoring issues, not AI
    // outages. We still log to the console for observability and, after
    // repeated consecutive failures, surface a single non-spammy toast
    // so the user knows their score may be stale.
    backgroundFailureStreak += 1;
    console.warn(
      `[backgroundScore] silenced (deterministic scoring) — streak=${backgroundFailureStreak}:`,
      err instanceof Error ? err.message : err,
    );
    const now = Date.now();
    const due = now - lastBackgroundFailureToastAt > BACKGROUND_FAILURE_TOAST_COOLDOWN_MS;
    if (backgroundFailureStreak >= BACKGROUND_FAILURE_TOAST_THRESHOLD && due) {
      lastBackgroundFailureToastAt = now;
      toast.error('Resume score may be out of date — auto-scoring is failing in the background. Tap Re-score to retry.', {
        id: 'background-scoring-degraded',
        duration: 8000,
      });
    }
  }
}

export function useResumeScore() {
  const [scoringId, setScoringId] = useState<string | null>(null);

  const getCachedScore = useCallback((resumeId: string, updatedAt: string): ResumeHealthScore | null => {
    return scoreCache.get(cacheKey(resumeId, updatedAt)) ?? null;
  }, []);

  /** Find the most recent cached score for a resume regardless of updated_at */
  const getLatestCachedScore = useCallback((resumeId: string): ResumeHealthScore | null => {
    const prefix = `${resumeId}:`;
    let latest: ResumeHealthScore | null = null;
    for (const [key, value] of scoreCache.entries()) {
      if (key.startsWith(prefix)) {
        if (!latest || value.scoredAt > latest.scoredAt) {
          latest = value;
        }
      }
    }
    return latest;
  }, []);

  const scoreResume = useCallback(async (resumeId: string, resume: ResumeData, updatedAt: string, force?: boolean): Promise<ResumeHealthScore | null> => {
    if (!force) {
      const cached = scoreCache.get(cacheKey(resumeId, updatedAt));
      if (cached) return cached;
    }

    setScoringId(resumeId);
    try {
      let result: { data: any; latencyMs: number };
      try {
        result = await invokeScoreResume(resume);
      } catch (firstErr: any) {
        if (firstErr.isAuth || firstErr.isRateLimit) throw firstErr;
        console.warn('[ScoreResume] First attempt failed, retrying in 2s…', firstErr.message);
        await delay(2000);
        result = await invokeScoreResume(resume);
      }

      // NOTE: do NOT recordSuccess on AI health — score-resume is
      // deterministic, not an AI call. Linking it artificially marked
      // the badge healthy/unhealthy based on scoring outcomes.

      const score: ResumeHealthScore = {
        ...result.data,
        scoredAt: new Date().toISOString(),
      };

      const key = cacheKey(resumeId, updatedAt);
      scoreCache.set(key, score);
      rememberScoreCacheWrite(key);
      useATSScoreHistoryStore.getState().addScore(resumeId, score);
      return score;
    } catch (err: any) {
      if (err.isSkip) {
        console.warn('[ScoreResume] Skipped: bridge token not available');
        return null;
      }
      // NOTE: do NOT recordFailure on AI health for the same reason —
      // a deterministic scoring outage shouldn't make the AI badge red.
      console.error('[ScoreResume] Final failure:', err);

      if (err.isAuth) {
        toast.error('Session expired. Please sign in again.');
      } else if (err.isRateLimit) {
        toast.error('Rate limit reached. Try again shortly.');
      } else {
        toast.error('Scoring failed. Tap Re-score to try again.');
      }
      return null;
    } finally {
      setScoringId(null);
    }
  }, []);

  return { scoreResume, getCachedScore, getLatestCachedScore, scoringId };
}
