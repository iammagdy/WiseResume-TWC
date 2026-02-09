import { ResumeData } from '@/types/resume';
import { checkAIRateLimit } from './rateLimiter';

export interface NextRole {
  title: string;
  matchScore: number;
  requiredSkills: string[];
  existingSkills: string[];
  timeToReady: string;
  description: string;
}

export interface SkillGap {
  skill: string;
  priority: 'critical' | 'important' | 'nice-to-have';
  forRoles: string[];
  suggestion: string;
}

export interface IndustryAlternative {
  industry: string;
  role: string;
  transferableSkills: string[];
  newSkillsNeeded: string[];
  salaryComparison: 'higher' | 'similar' | 'lower';
}

export interface ActionStep {
  step: number;
  action: string;
  timeframe: string;
  impact: 'high' | 'medium' | 'low';
}

export interface CareerPathResult {
  currentLevel: string;
  yearsExperience: number;
  primaryField: string;
  nextRoles: NextRole[];
  skillGaps: SkillGap[];
  industryAlternatives: IndustryAlternative[];
  actionPlan: ActionStep[];
}

export async function analyzeCareerPath(
  resume: ResumeData
): Promise<CareerPathResult> {
  const rateCheck = checkAIRateLimit('careerPath');
  if (!rateCheck.allowed) {
    throw new Error(`Too many requests. Please wait ${rateCheck.waitSeconds}s.`);
  }

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/career-path-advisor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ resume }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('AI credits exhausted.');
    }
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Failed to analyze career path');
  }

  return response.json();
}
