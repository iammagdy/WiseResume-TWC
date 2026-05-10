import { ResumeData, JobMatchScore, GapAnalysis } from '@/types/resume';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { extractErrorMessage } from './errorToast';
import { checkAIFallback } from './aiFallbackToast';

interface AnalysisResult {
  score: JobMatchScore;
  gaps: GapAnalysis;
}

export async function analyzeResume(
  resume: ResumeData,
  jobDescription: string
): Promise<AnalysisResult> {
  const { data, error } = await appwriteFunctions.invoke('analyze-resume', {
    body: { resume, jobDescription },
  });

  if (error) {
    console.error('Analyze resume error:', error);
    throw new Error(extractErrorMessage(error, data, 'Failed to analyze resume'));
  }
  if (data?.error) {
    throw new Error(data.message || data.error);
  }

  checkAIFallback(data);
  return data;
}
