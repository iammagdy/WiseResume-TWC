import { ResumeData, TailorProgress, EnhancedTailorStep, EnhancedTailorProgress, SuperTailorResult } from '@/types/resume';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { extractErrorMessage } from './errorToast';
import { checkAIFallback } from './aiFallbackToast';
import { AIError, isAIError, parseAIErrorBody } from './aiErrorParser';
import {
  resumeSectionAiFnName,
  resumeSectionAiBodyProps,
} from '@/lib/resumeSectionAiFlag';

export interface TailorError extends Error {
  /** Machine-readable code propagated from the edge function's `error` field. */
  code?: 'rate_limit' | 'credits_exhausted' | 'upstream_5xx' | 'upstream_error' | 'generic' | string;
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
  "💡 Tailored resumes are significantly more likely to pass initial screening (Jobscan, 2023)",
  "📊 Studies suggest most resumes are filtered out before a recruiter sees them — keywords matter",
  "🎯 Research shows hiring managers spend roughly 6–10 seconds on an initial resume scan (The Ladders)",
  "✨ Starting bullets with strong action verbs makes achievements clearer and more impactful",
  "🔑 Including measurable results helps recruiters quickly gauge the scope of your contributions",
  "🏆 LinkedIn data shows profiles with diverse skill sets receive more recruiter outreach",
  "📈 Quantified achievements give hiring managers concrete evidence of your impact",
  "🚀 Matching keywords from the job description improves ATS compatibility (Jobscan research)",
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
  signal?: AbortSignal,
  userInstructions?: string
): Promise<SuperTailorResult> {
  // Smooth ease-out progress: ramps toward 94% over ~2 min (tailoring can take 60–90s server-side).
  const PROGRESS_CAP = 94;
  const PROGRESS_RAMP_MS = 120_000;
  const startTime = Date.now();
  const STEP_THRESHOLDS = [10, 20, 35, 50, 60, 70, 75, 80, 88]; // percentage thresholds for step transitions
  let lastStepIndex = -1;
  let lastEmittedProgress = 0; // track live value for retry resume point
  let lastReportedProgress = -1;

  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const t = Math.min(elapsed / PROGRESS_RAMP_MS, 1);
    const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
    const currentProgress = Math.min(eased * PROGRESS_CAP, PROGRESS_CAP);
    lastEmittedProgress = currentProgress; // always track live animated value for retry use

    // Determine which step we're on based on percentage thresholds
    let stepIndex = 0;
    for (let i = 0; i < STEP_THRESHOLDS.length; i++) {
      if (currentProgress >= STEP_THRESHOLDS[i]) stepIndex = i;
    }
    stepIndex = Math.min(stepIndex, ENHANCED_STEPS.length - 2);

    const step = ENHANCED_STEPS[stepIndex];
    if (stepIndex !== lastStepIndex || Math.abs(currentProgress - lastReportedProgress) >= 0.4) {
      onProgress({
        step: step.step,
        progress: currentProgress,
        message: step.message,
        funFact: step.funFact,
      } as EnhancedTailorProgress);
      lastStepIndex = stepIndex;
      lastReportedProgress = currentProgress;
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
  }, 50_000);

  const invokeOnce = async (): Promise<SuperTailorResult> => {
    const { data, error } = await appwriteFunctions.invoke<SuperTailorResult>('tailor-resume', {
      body: { resume, jobDescription, intensity, ...(userInstructions ? { userInstructions } : {}) },
    });

    if (error) {
      const raw = (error.raw && typeof error.raw === 'object') ? error.raw as Record<string, unknown> : {};
      const info = parseAIErrorBody(
        {
          code: error.code ?? raw.code ?? raw.error,
          message: error.message,
          error: raw.error,
        },
        error.status ?? 500,
      );
      throw new AIError(info);
    }

    if (!data) {
      throw new AIError(parseAIErrorBody({ code: 'invalid_ai_response', message: 'AI returned an empty response.' }, 500));
    }

    return data;
  };

  try {
    let data: SuperTailorResult;
    try {
      data = await invokeOnce();
    } catch (firstError: unknown) {
      // Only retry transient errors (not auth/credits/rate-limit)
      const code = isAIError(firstError) ? firstError.code : (firstError as TailorError).code;
      if (code === 'rate_limit' || code === 'payment_required' || code === 'unauthorized') throw firstError;

      // Auto-retry once after 4s — give transient provider overloads time to clear.
      const isUpstreamOverload =
        code === 'upstream_5xx' ||
        code === 'provider_unavailable' ||
        code === 'provider_busy' ||
        code === 'timeout' ||
        ((firstError as Error).message ?? '').toLowerCase().includes('upstream');
      onProgress({
        step: 'finalizing',
        progress: Math.max(lastEmittedProgress, 88),
        message: isUpstreamOverload
          ? '⏳ Our AI is temporarily overloaded — retrying...'
          : '🔄 Retrying — hang tight...',
        funFact: FUN_FACTS[0],
      } as EnhancedTailorProgress);

      await new Promise(r => setTimeout(r, 4000));
      if (signal?.aborted) throw firstError;
      data = await invokeOnce();
    }

    clearInterval(progressInterval);
    clearTimeout(slowTimer);

    // Track usage for Gemini free tier
    checkAIFallback(data);

    onProgress({
      step: 'complete',
      progress: 100,
      message: '🎉 Tailoring complete! Your resume is supercharged.',
    } as TailorProgress);

    return data;
  } catch (error) {
    clearInterval(progressInterval);
    clearTimeout(slowTimer);
    // Tag offline errors so callers can show a specific, calming message
    if (!navigator.onLine && error instanceof Error && !error.message.includes('offline')) {
      const e = new Error("You're offline — AI features need an internet connection. Your resume content is safe.") as TailorError;
      e.code = 'generic';
      throw e;
    }
    throw error;
  }
}

export interface ParsedJobData {
  title: string;
  company: string;
  description: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  salaryRange?: { min: number | null; max: number | null; currency: string } | null;
  workMode?: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  mustHaveSkills?: string[];
  niceToHaveSkills?: string[];
  yearsExperience?: string | null;
  companyCultureSignals?: string[];
  benefits?: string[];
  applicationDeadline?: string | null;
  redFlags?: string[];
}

export async function parseJobUrl(url: string): Promise<ParsedJobData> {
  const { data, error } = await appwriteFunctions.invoke('parse-job', {
    body: { action: 'url', url },
  });
  if (error) throw new Error(extractErrorMessage(error, data, 'Failed to parse job URL'));
  if (data?.error) throw new Error(data.error || 'Failed to parse job URL');
  return data as ParsedJobData;
}

export async function parseJobText(text: string): Promise<ParsedJobData> {
  const { data, error } = await appwriteFunctions.invoke('parse-job', {
    body: { action: 'text', text },
  });
  if (error) {
    console.error('Parse job text error:', error);
    throw new Error(extractErrorMessage(error, data, 'Failed to analyze job description'));
  }
  if (data?.error) throw new Error(data.message || data.error);
  return data as ParsedJobData;
}

export async function generateCoverLetter(
  resume: ResumeData,
  jobDescription: string,
  tone: 'professional' | 'enthusiastic' | 'conversational' = 'professional',
  signal?: AbortSignal
): Promise<string> {
  const { data, error } = await appwriteFunctions.invoke('generate-cover-letter', {
    body: { resume, jobDescription, tone },
    ...(signal ? { options: { signal } } : {}),
  } as any);

  if (error) {
    console.error('Cover letter error:', error);
    throw new Error(extractErrorMessage(error, data, 'Failed to generate cover letter'));
  }
  if (data?.error) {
    throw new Error(data.message || data.error);
  }

  return data.coverLetter;
}

// Note: tailorResumeWithProgress no longer tracks per-provider usage; the
// user-visible "complete" progress callback fires immediately after tracking.

export interface TailorSectionResult {
  rewrittenContent: string | string[];
  changes: { description: string; type: string; impact: string }[];
  keywordsAdded: string[];
  improvementSummary: string;
}

export async function tailorSection(params: {
  section: string;
  currentContent: string | string[];
  jobDescription: string;
  jobKeywords?: string[];
  userInstructions?: string;
  intensity?: string;
  projectItems?: Array<{ name: string; description: string; technologies?: string[]; role?: string }>;
}): Promise<TailorSectionResult> {
  const { data, error } = await appwriteFunctions.invoke<TailorSectionResult>(
    resumeSectionAiFnName('tailor-section'),
    {
      body: {
        ...resumeSectionAiBodyProps('tailor-section'),
        ...params,
      },
    },
  );

  if (error) throw new Error(error.message || 'Failed to regenerate section');

  const rawData = data as unknown as Record<string, unknown>;
  if (rawData?.error) throw new Error(String(rawData.error));

  return data!;
}
