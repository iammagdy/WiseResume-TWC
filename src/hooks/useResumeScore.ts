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
      const { data, error } = await supabase.functions.invoke('score-resume', {
        body: { resume, userGeminiKey },
      });

      if (error) {
        console.error('Score resume error:', error);
        if (error.message?.includes('429')) {
          toast.error('Rate limit reached. Try again shortly.');
        } else {
          toast.error('Scoring failed. Tap Re-score to try again.');
        }
        return null;
      }

      // Check for error in response body (e.g. AI parse failure)
      if (data?.error) {
        console.error('Score resume API error:', data.error);
        toast.error('Scoring failed. Tap Re-score to try again.');
        return null;
      }

      trackGeminiUsage();

      const score: ResumeHealthScore = {
        ...data,
        scoredAt: new Date().toISOString(),
      };

      scoreCache.set(cacheKey(resumeId, updatedAt), score);
      return score;
    } catch (err) {
      console.error('Score resume failed:', err);
      return null;
    } finally {
      setScoringId(null);
    }
  }, []);

  return { scoreResume, getCachedScore, scoringId };
}
