import { parseDbJson } from '@/hooks/useResumes';

/** Minimum number of skills a resume needs to count toward portfolio completion. */
export const PORTFOLIO_SKILL_THRESHOLD = 3;

export interface ResumeCompletionInputs {
  skillsCount: number;
  experienceCount: number;
  hasSkills: boolean;
  hasExperience: boolean;
}

/**
 * Derive the resume-backed portfolio completion signals from a raw Appwrite
 * resume document.
 *
 * IMPORTANT: `skills` and `experience` arrive from Appwrite as JSON-encoded
 * STRINGS (resumeDataToDb stores them via JSON.stringify). They MUST be parsed
 * before any Array.isArray / length check — calling Array.isArray on the raw
 * string is always false, which previously made the completion bar report
 * "Skills" and "Work experience" as missing even on fully-populated resumes.
 * parseDbJson tolerates strings, already-parsed arrays, and null/undefined.
 */
export function deriveResumeCompletion(
  resume: { skills?: unknown; experience?: unknown } | null | undefined,
): ResumeCompletionInputs {
  const skills = parseDbJson<unknown[]>(resume?.skills, []);
  const experience = parseDbJson<unknown[]>(resume?.experience, []);
  const skillsCount = Array.isArray(skills) ? skills.length : 0;
  const experienceCount = Array.isArray(experience) ? experience.length : 0;
  return {
    skillsCount,
    experienceCount,
    hasSkills: skillsCount >= PORTFOLIO_SKILL_THRESHOLD,
    hasExperience: experienceCount >= 1,
  };
}
