import { useState, useCallback, useEffect, useRef } from 'react';
import { ResumeData } from '@/types/resume';
import { toast } from 'sonner';
import { useATSScoreHistoryStore } from '@/store/atsScoreHistoryStore';
import {
  calcContactScore,
  calcSummaryScore,
  calcExperienceScore,
  calcEducationScore,
  calcSkillsScore,
} from '@/lib/resumeCompletionRules';

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

/**
 * Build a full ResumeHealthScore locally — no network call, no AI.
 * score-resume was always deterministic; this replaces the Appwrite edge
 * function call that was (a) routed through ai-gateway producing wrong
 * response shapes, and (b) unnecessary since all signals are local.
 */
function buildLocalResumeScore(resume: ResumeData): ResumeHealthScore {
  // Defensive guard: if resume is null/undefined (e.g. race condition or
  // corrupt dbToResumeData output), return a zero score rather than throwing.
  // This prevents runBackgroundScore from accumulating backgroundFailureStreak
  // and showing the "score may be out of date" toast for a non-AI failure.
  if (!resume) {
    return {
      overallScore: 0,
      categories: {
        contactCompleteness: 0, contentQuality: 0, sectionStructure: 0,
        parsability: 0, keywordOptimization: 0, lengthDensity: 0, templateFriendliness: 85,
      },
      topStrength: 'No resume data available',
      topImprovement: 'Add your contact information and a professional summary',
      scoredAt: new Date().toISOString(),
    };
  }

  const contactScore    = calcContactScore(resume.contactInfo    ?? { fullName: '', email: '', phone: '', location: '' });
  const summaryScore    = calcSummaryScore(resume.summary        ?? '');
  const experienceScore = calcExperienceScore(resume.experience  ?? []);
  const educationScore  = calcEducationScore(resume.education    ?? []);
  const skillsScore     = calcSkillsScore(resume.skills          ?? []);

  const overall = Math.round(
    (contactScore + summaryScore + experienceScore + educationScore + skillsScore) / 5,
  );

  const categories = {
    contactCompleteness:  contactScore,
    contentQuality:       Math.round((summaryScore + experienceScore) / 2),
    sectionStructure:     Math.round((educationScore + skillsScore) / 2),
    parsability:          Math.min(100, overall + 5),
    keywordOptimization:  skillsScore,
    lengthDensity:        summaryScore,
    templateFriendliness: 85,
  };

  const sectionScores: Record<string, number> = {
    contact: contactScore, summary: summaryScore, experience: experienceScore,
    education: educationScore, skills: skillsScore,
  };
  const sorted = Object.entries(sectionScores).sort((a, b) => b[1] - a[1]);
  const [bestKey]  = sorted[0];
  const [worstKey] = sorted[sorted.length - 1];

  const STRENGTHS: Record<string, string> = {
    contact:    'Contact information is complete',
    summary:    'Professional summary is well-written',
    experience: 'Work experience section is detailed',
    education:  'Education section is complete',
    skills:     'Strong skills list',
  };
  const IMPROVEMENTS: Record<string, string> = {
    contact:    'Add missing contact details (phone, LinkedIn, location)',
    summary:    'Write a compelling professional summary (2–4 sentences)',
    experience: 'Add more work experience with bullet points and metrics',
    education:  'Complete your education section with degree and graduation date',
    skills:     'Add at least 5–10 relevant skills',
  };

  return {
    overallScore:   overall,
    categories,
    topStrength:    STRENGTHS[bestKey]     ?? 'Well-structured resume',
    topImprovement: IMPROVEMENTS[worstKey] ?? 'Continue improving your resume',
    scoredAt:       new Date().toISOString(),
  };
}

async function invokeScoreResume(resume: ResumeData, _isBackground = false): Promise<{ data: ResumeHealthScore; latencyMs: number }> {
  const _start = Date.now();
  const data = buildLocalResumeScore(resume);
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

    // A "skip" means the bridge token wasn't ready yet — this is expected
    // on first mount and should not count as a real failure or trigger a toast.
    const errObj = err as Error & { isSkip?: boolean; isNetworkError?: boolean; isConfigError?: boolean };
    if (errObj.isSkip) {
      console.debug('[backgroundScore] skipped — bridge token not ready yet');
      return;
    }

    // Transient network errors (offline, DNS failure, etc.) should not accumulate
    // toward the failure streak — they are device-level and unrelated to the
    // scoring infrastructure. Log clearly so production logs are actionable.
    if (errObj.isNetworkError) {
      console.warn('[backgroundScore] transient network error — not counting toward failure streak:', errObj.message);
      return;
    }

    // Configuration errors (missing env vars on the server) are permanent and
    // should surface loudly so they are caught in production logs quickly.
    if (errObj.isConfigError) {
      console.error('[backgroundScore] server configuration error — scoring will not work until resolved:', errObj.message);
    }

    backgroundFailureStreak += 1;
    const errMessage = err instanceof Error ? err.message : String(err);
    console.warn(
      `[backgroundScore] failed (deterministic scoring) — streak=${backgroundFailureStreak}:`,
      errMessage,
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
  const scoreRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (scoreRetryTimerRef.current) {
        clearTimeout(scoreRetryTimerRef.current);
        scoreRetryTimerRef.current = null;
      }
    };
  }, []);

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
        await new Promise<void>(resolve => { scoreRetryTimerRef.current = setTimeout(resolve, 2000); });
        scoreRetryTimerRef.current = null;
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
