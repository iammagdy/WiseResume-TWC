import { ResumeData, TailorProgress, EnhancedTailorStep, EnhancedTailorProgress, SuperTailorResult } from '@/types/resume';
import { supabase } from '@/integrations/supabase/safeClient';
import { trackGeminiUsage } from './aiProvider';

export interface TailorError extends Error {
  code?: 'rate_limit' | 'credits_exhausted' | 'generic';
}

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
  intensity: TailorIntensity = 'moderate',
  signal?: AbortSignal
): Promise<SuperTailorResult> {
  // Smooth ease-out progress: fast start, slows toward 85%
  const startTime = Date.now();
  const STEP_THRESHOLDS = [10, 20, 35, 50, 60, 70, 75, 80]; // percentage thresholds for step transitions
  let lastStepIndex = -1;

  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const t = Math.min(elapsed / 30000, 1); // 30s expected max
    const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
    const currentProgress = Math.min(eased * 85, 85);

    // Determine which step we're on based on percentage thresholds
    let stepIndex = 0;
    for (let i = 0; i < STEP_THRESHOLDS.length; i++) {
      if (currentProgress >= STEP_THRESHOLDS[i]) stepIndex = i;
    }
    stepIndex = Math.min(stepIndex, ENHANCED_STEPS.length - 2);

    if (stepIndex !== lastStepIndex || true) {
      const step = ENHANCED_STEPS[stepIndex];
      onProgress({
        step: step.step,
        progress: currentProgress,
        message: step.message,
        funFact: step.funFact,
      } as EnhancedTailorProgress);
      lastStepIndex = stepIndex;
    }
  }, 200);

  // Show slow-request toast after 25s
  let slowToastShown = false;
  const slowTimer = setTimeout(() => {
    if (!slowToastShown) {
      slowToastShown = true;
      // Import toast dynamically to avoid circular deps
      import('sonner').then(({ toast }) => {
        toast.info('This is taking longer than usual. Hang tight…');
      });
    }
  }, 25_000);

  try {
    const { data, error } = await supabase.functions.invoke('tailor-resume', {
      body: { resume, jobDescription, intensity },
      ...(signal ? { options: { signal } } : {}),
    } as any);
    clearInterval(progressInterval);
    clearTimeout(slowTimer);

    if (error) {
      console.error('Tailor resume error:', error);
      const msg = error.message || '';
      if (msg.includes('401') || msg.includes('Unauthorized')) {
        throw new Error('Unauthorized. Please log in again.');
      }
      if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
        const e = new Error('Our AI servers are experiencing high demand. Please try again in a moment or use your own Gemini API key for uninterrupted access.');
        (e as TailorError).code = 'rate_limit';
        throw e;
      }
      if (msg.includes('402') || msg.toLowerCase().includes('credits')) {
        const e = new Error('Your AI credits have been used up for today. Add your own Gemini API key for unlimited access.');
        (e as TailorError).code = 'credits_exhausted';
        throw e;
      }
      // Check for timeout errors
      if (msg.toLowerCase().includes('timed out') || msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('timeout') || msg.includes('408')) {
        const e = new Error('The request timed out. Please try again — or try a shorter job description.');
        (e as TailorError).code = 'generic';
        throw e;
      }
      const e = new Error(msg || 'Failed to tailor resume');
      (e as TailorError).code = 'generic';
      throw e;
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
    clearTimeout(slowTimer);
    throw error;
  }
}

export async function tailorResume(
  resume: ResumeData,
  jobDescription: string
): Promise<TailorResult> {
  const { data, error } = await supabase.functions.invoke('tailor-resume', {
    body: { resume, jobDescription },
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
  const { data, error } = await supabase.functions.invoke('parse-job-url', {
    body: { url },
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
  tone: 'professional' | 'enthusiastic' | 'conversational' = 'professional',
  signal?: AbortSignal
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-cover-letter', {
    body: { resume, jobDescription, tone },
    ...(signal ? { options: { signal } } : {}),
  } as any);

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
