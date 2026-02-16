import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { getUserGeminiKey, trackGeminiUsage } from '@/lib/aiProvider';
import { ResumeData } from '@/types/resume';
import { toast } from 'sonner';

export interface ResumeHealthScore {
  overallScore: number;
  categories: {
    completeness: number;
    atsReadiness: number;
    impactLanguage: number;
    formatting: number;
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

/** Helper: wait ms */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function invokeScoreResume(resume: ResumeData, userGeminiKey: string | undefined) {
  // Explicitly grab token to ensure it's fresh (important for Capacitor WebView)
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    throw Object.assign(new Error('Not authenticated. Please sign in again.'), { isAuth: true });
  }

  const { data, error } = await supabase.functions.invoke('score-resume', {
    body: { resume, userGeminiKey },
  });

  if (error) {
    console.error('[ScoreResume] Edge function error:', {
      message: error.message,
      name: error.name,
      context: (error as any).context,
    });

    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      throw Object.assign(new Error('Session expired. Please sign in again.'), { isAuth: true });
    }
    if (error.message?.includes('429')) {
      throw Object.assign(new Error('Rate limit reached. Try again shortly.'), { isRateLimit: true });
    }
    throw new Error(error.message || 'Scoring request failed');
  }

  if (data?.error) {
    console.error('[ScoreResume] API body error:', data.error);
    throw new Error(data.error);
  }

  return data;
}

export function useResumeScore() {
  const [scoringId, setScoringId] = useState<string | null>(null);

  const getCachedScore = useCallback((resumeId: string, updatedAt: string): ResumeHealthScore | null => {
    return scoreCache.get(cacheKey(resumeId, updatedAt)) ?? null;
  }, []);

  const scoreResume = useCallback(async (resumeId: string, resume: ResumeData, updatedAt: string): Promise<ResumeHealthScore | null> => {
    // Check cache first
    const cached = scoreCache.get(cacheKey(resumeId, updatedAt));
    if (cached) return cached;

    setScoringId(resumeId);
    try {
      const userGeminiKey = getUserGeminiKey();

      let data: any;
      try {
        data = await invokeScoreResume(resume, userGeminiKey);
      } catch (firstErr: any) {
        // Don't retry auth or rate-limit errors
        if (firstErr.isAuth || firstErr.isRateLimit) throw firstErr;

        console.warn('[ScoreResume] First attempt failed, retrying in 2s…', firstErr.message);
        await delay(2000);
        data = await invokeScoreResume(resume, userGeminiKey);
      }

      trackGeminiUsage();

      const score: ResumeHealthScore = {
        ...data,
        scoredAt: new Date().toISOString(),
      };

      scoreCache.set(cacheKey(resumeId, updatedAt), score);
      return score;
    } catch (err: any) {
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

  return { scoreResume, getCachedScore, scoringId };
}
