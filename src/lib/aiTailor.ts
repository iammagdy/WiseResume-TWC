import { ResumeData, EnhancedTailorResult, TailorProgress, TailorStep } from '@/types/resume';

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

const TAILOR_STEPS: { step: TailorStep; message: string; duration: number }[] = [
  { step: 'analyzing', message: 'Analyzing job requirements...', duration: 800 },
  { step: 'matching', message: 'Matching your experience...', duration: 1000 },
  { step: 'rewriting_summary', message: 'Rewriting summary...', duration: 1200 },
  { step: 'optimizing_skills', message: 'Optimizing skills...', duration: 1000 },
  { step: 'enhancing_experience', message: 'Enhancing achievements...', duration: 1500 },
  { step: 'generating_recs', message: 'Generating recommendations...', duration: 800 },
];

export async function tailorResumeWithProgress(
  resume: ResumeData,
  jobDescription: string,
  onProgress: (progress: TailorProgress) => void
): Promise<EnhancedTailorResult> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  // Simulate progress steps while waiting for AI
  let currentStepIndex = 0;
  const progressInterval = setInterval(() => {
    if (currentStepIndex < TAILOR_STEPS.length - 1) {
      const step = TAILOR_STEPS[currentStepIndex];
      const progressPercent = Math.min(((currentStepIndex + 1) / TAILOR_STEPS.length) * 85, 85);
      onProgress({
        step: step.step,
        progress: progressPercent,
        message: step.message,
      });
      currentStepIndex++;
    }
  }, 1200);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/tailor-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ resume, jobDescription }),
    });

    clearInterval(progressInterval);

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add more credits.');
      }
      throw new Error(error.error || 'Failed to tailor resume');
    }

    onProgress({
      step: 'complete',
      progress: 100,
      message: 'Tailoring complete!',
    });

    return response.json();
  } catch (error) {
    clearInterval(progressInterval);
    throw error;
  }
}

export async function tailorResume(
  resume: ResumeData,
  jobDescription: string
): Promise<TailorResult> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/tailor-resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ resume, jobDescription }),
  });

  if (!response.ok) {
    const error = await response.json();
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('AI credits exhausted. Please add more credits.');
    }
    throw new Error(error.error || 'Failed to tailor resume');
  }

  return response.json();
}

export async function parseJobUrl(url: string): Promise<{ title: string; company: string; description: string }> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-job-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error('Failed to parse job URL');
  }

  return response.json();
}

export async function generateCoverLetter(
  resume: ResumeData,
  jobDescription: string,
  tone: 'professional' | 'enthusiastic' | 'conversational' = 'professional'
): Promise<string> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-cover-letter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ resume, jobDescription, tone }),
  });

  if (!response.ok) {
    const error = await response.json();
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('AI credits exhausted. Please add more credits.');
    }
    throw new Error(error.error || 'Failed to generate cover letter');
  }

  const data = await response.json();
  return data.coverLetter;
}
