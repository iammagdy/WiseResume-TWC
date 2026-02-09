import { ResumeData, JobMatchScore, GapAnalysis } from '@/types/resume';
import { getUserGeminiKey, trackGeminiUsage } from './aiProvider';

interface AnalysisResult {
  score: JobMatchScore;
  gaps: GapAnalysis;
}

export async function analyzeResume(
  resume: ResumeData,
  jobDescription: string
): Promise<AnalysisResult> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const userGeminiKey = getUserGeminiKey();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ resume, jobDescription, userGeminiKey }),
  });

  if (!response.ok) {
    const error = await response.json();
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('AI credits exhausted. Please add more credits.');
    }
    if (response.status === 401 && error.error?.includes('Invalid')) {
      throw new Error('Invalid Gemini API key. Please check your AI settings.');
    }
    throw new Error(error.error || 'Failed to analyze resume');
  }

  trackGeminiUsage();
  return response.json();
}
