import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';

import { ResumeData } from '@/types/resume';
import { toast } from 'sonner';
import { useAIHealthStore } from '@/store/aiHealthStore';
import { useATSScoreHistoryStore } from '@/store/atsScoreHistoryStore';

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
  scoredAt: string;
}

// In-memory cache keyed by resume updated_at to auto-invalidate on edits
const scoreCache = new Map<string, ResumeHealthScore>();

function cacheKey(resumeId: string, updatedAt: string) {
  return `${resumeId}:${updatedAt}`;
}

export function clearCachedScore(resumeId: string, updatedAt: string) {
  scoreCache.delete(cacheKey(resumeId, updatedAt));
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

async function invokeScoreResume(resume: ResumeData): Promise<{ data: any; latencyMs: number }> {
  const { content: normalized, templateId } = normalizeForScoring(resume);
  const _start = Date.now();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    throw Object.assign(new Error('Not authenticated. Please sign in again.'), { isAuth: true });
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hjnnamwgztlhzkeuufln.supabase.co';
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqbm5hbXdnenRsaHprZXV1ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNTE4MTcsImV4cCI6MjA4NTkyNzgxN30.cupd_dz6KHSJaBnUPQzJmQcYc38RTDVIMU5RP25xCso';

  const res = await fetch(`${supabaseUrl}/functions/v1/score-resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': anonKey,
    },
    body: JSON.stringify({ resume: normalized, templateId }),
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
 * Standalone fire-and-forget scorer for background use (no React state).
 */
export async function backgroundScore(resumeId: string, resume: ResumeData, updatedAt: string): Promise<void> {
  const key = cacheKey(resumeId, updatedAt);
  if (scoreCache.has(key)) return;
  try {
    const { data, latencyMs } = await invokeScoreResume(resume);
    useAIHealthStore.getState().recordSuccess(latencyMs);
    const score: ResumeHealthScore = { ...data, scoredAt: new Date().toISOString() };
    scoreCache.set(key, score);
    useATSScoreHistoryStore.getState().addScore(resumeId, score);
  } catch (err: unknown) {
    console.warn('[backgroundScore] silenced:', err instanceof Error ? err.message : err);
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

      useAIHealthStore.getState().recordSuccess(result.latencyMs);

      const score: ResumeHealthScore = {
        ...result.data,
        scoredAt: new Date().toISOString(),
      };

      scoreCache.set(cacheKey(resumeId, updatedAt), score);
      useATSScoreHistoryStore.getState().addScore(resumeId, score);
      return score;
    } catch (err: any) {
      useAIHealthStore.getState().recordFailure(err.isRateLimit ? 429 : err.isAuth ? 401 : 0);
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
