import { ResumeData, TailorProgress, EnhancedTailorStep, EnhancedTailorProgress, SuperTailorResult } from '@/types/resume';
import { supabase } from '@/integrations/supabase/safeClient';
import { getUserGeminiKey, trackGeminiUsage } from './aiProvider';

export interface TailorResult {
  summary: string;
  skills: string[];
  experience: {
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
    achievements: string[];
  }[];
  education: {
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    gpa?: string;
  }[];
  keyChanges: string[];
}

const FUN_FACTS = [
  "💡 Tailored resumes are 3x more likely to get interviews",
  "📊 75% of resumes never pass ATS screening",
  "🎯 Hiring managers spend 7 seconds on initial resume review",
  "✨ Action verbs increase resume effectiveness by 140%",
  "🔑 Including metrics makes achievements 40% more compelling",
  "🏆 Top resumes use 11-14 unique skills on average",
  "📈 Quantified achievements get 40% more callbacks",
  "🚀 Keywords from job descriptions boost ATS scores by 60%",
];

const ENHANCED_STEPS: { step: EnhancedTailorStep; message: string; funFact: string }[] = [
  { step: 'analyzing_requirements', message: 'Deep-analyzing job requirements...', funFact: FUN_FACTS[0] },
  { step: 'detecting_industry', message: 'Detecting industry patterns...', funFact: FUN_FACTS[1] },
  { step: 'matching_experience', message: 'Matching your experience to requirements...', funFact: FUN_FACTS[2] },
  { step: 'rewriting_summary', message: 'Crafting a powerful summary...', funFact: FUN_FACTS[3] },
  { step: 'optimizing_skills', message: 'Optimizing skills for ATS...', funFact: FUN_FACTS[4] },
  { step: 'transforming_bullets', message: 'Transforming achievements with metrics...', funFact: FUN_FACTS[5] },
  { step: 'calculating_ats', message: 'Calculating ATS keyword match...', funFact: FUN_FACTS[6] },
  { step: 'generating_interview_prep', message: 'Generating interview talking points...', funFact: FUN_FACTS[7] },
  { step: 'finalizing', message: 'Finalizing your supercharged resume...', funFact: FUN_FACTS[0] },
];

export type TailorIntensity = 'light' | 'moderate' | 'aggressive';

export async function tailorResumeWithProgress(
  resume: ResumeData,
  jobDescription: string,
  onProgress: (progress: TailorProgress | EnhancedTailorProgress) => void,
  intensity: TailorIntensity = 'moderate'
): Promise<SuperTailorResult> {
  const userGeminiKey = getUserGeminiKey();
  // Enhanced progress simulation with fun facts
  let currentStepIndex = 0;
  const progressInterval = setInterval(() => {
    if (currentStepIndex < ENHANCED_STEPS.length - 1) {
      const step = ENHANCED_STEPS[currentStepIndex];
      const progressPercent = Math.min(((currentStepIndex + 1) / ENHANCED_STEPS.length) * 85, 85);
      onProgress({
        step: step.step,
        progress: progressPercent,
        message: step.message,
        funFact: step.funFact,
      } as EnhancedTailorProgress);
      currentStepIndex++;
    }
  }, 1500);

  try {
    const { data, error } = await supabase.functions.invoke('tailor-resume', {
      body: { resume, jobDescription, userGeminiKey, intensity },
    });
    clearInterval(progressInterval);

    if (error) {
      console.error('Tailor resume error:', error);
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        throw new Error('Unauthorized. Please log in again.');
      }
      throw new Error('Failed to tailor resume');
    }

    // Track usage for Gemini free tier
    trackGeminiUsage();

    onProgress({
      step: 'complete',
      progress: 100,
      message: '🎉 Tailoring complete! Your resume is supercharged.',
    } as TailorProgress);

    return data;
  } catch (error) {
    clearInterval(progressInterval);
    throw error;
  }
}

export async function tailorResume(
  resume: ResumeData,
  jobDescription: string
): Promise<TailorResult> {
  const userGeminiKey = getUserGeminiKey();

  const { data, error } = await supabase.functions.invoke('tailor-resume', {
    body: { resume, jobDescription, userGeminiKey },
  });

  if (error) {
    console.error('Tailor resume error:', error);
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      throw new Error('Unauthorized. Please log in again.');
    }
    throw new Error('Failed to tailor resume');
  }

  trackGeminiUsage();
  return data;
}

export async function parseJobUrl(url: string): Promise<{ title: string; company: string; description: string }> {
  const userGeminiKey = getUserGeminiKey();

  const { data, error } = await supabase.functions.invoke('parse-job-url', {
    body: { url, userGeminiKey },
  });

  if (error) {
    console.error('Parse job URL error:', error);
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      throw new Error('Unauthorized. Please log in again.');
    }
    throw new Error('Failed to parse job URL');
  }

  trackGeminiUsage();
  return data;
}

export async function generateCoverLetter(
  resume: ResumeData,
  jobDescription: string,
  tone: 'professional' | 'enthusiastic' | 'conversational' = 'professional'
): Promise<string> {
  const userGeminiKey = getUserGeminiKey();

  const { data, error } = await supabase.functions.invoke('generate-cover-letter', {
    body: { resume, jobDescription, tone, userGeminiKey },
  });

  if (error) {
    console.error('Cover letter error:', error);
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      throw new Error('Unauthorized. Please log in again.');
    }
    throw new Error('Failed to generate cover letter');
  }

  trackGeminiUsage();
  return data.coverLetter;
}
