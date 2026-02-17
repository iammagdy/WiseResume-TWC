import { ResumeData, JobMatchScore, GapAnalysis } from '@/types/resume';
import { supabase } from '@/integrations/supabase/safeClient';
import { trackGeminiUsage } from './aiProvider';

interface AnalysisResult {
  score: JobMatchScore;
  gaps: GapAnalysis;
}

export async function analyzeResume(
  resume: ResumeData,
  jobDescription: string
): Promise<AnalysisResult> {
  const { data, error } = await supabase.functions.invoke('analyze-resume', {
    body: { resume, jobDescription },
  });

  if (error) {
    console.error('Analyze resume error:', error);
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      throw new Error('Unauthorized. Please log in again.');
    }
    throw new Error('Failed to analyze resume');
  }

  trackGeminiUsage();
  return data;
}
