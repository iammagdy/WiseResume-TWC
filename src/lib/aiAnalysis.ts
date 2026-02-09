import { ResumeData, JobMatchScore, GapAnalysis } from '@/types/resume';
import { getUserGeminiKey, trackGeminiUsage, handleAIError } from './aiProvider';

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
    await handleAIError(response, 'Failed to analyze resume');
  }

  trackGeminiUsage();
  return response.json();
}
