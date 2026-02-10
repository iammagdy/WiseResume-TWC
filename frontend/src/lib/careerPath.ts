import { ResumeData } from '@/types/resume';
import { checkAIRateLimit } from './rateLimiter';
import { supabase } from '@/integrations/supabase/safeClient';
import { getUserGeminiKey, trackGeminiUsage } from './aiProvider';

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

  const userGeminiKey = getUserGeminiKey();

  const { data, error } = await supabase.functions.invoke('career-path-advisor', {
    body: { resume, userGeminiKey },
  });

  if (error) {
    console.error('Career path error:', error);
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      throw new Error('Unauthorized. Please log in again.');
    }
    throw new Error('Failed to analyze career path');
  }

  trackGeminiUsage();
  return data;
}
