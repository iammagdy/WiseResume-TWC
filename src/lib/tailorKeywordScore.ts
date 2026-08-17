import type { ResumeData } from '@/types/resume';
import { simulateATSParsing } from '@/lib/atsParserSimulation';

export interface KeywordMatchComparison {
  before: number;
  after: number;
}

/**
 * Deterministic keyword-overlap comparison used by tailoring previews.
 *
 * This deliberately does not call an AI provider and does not claim to model
 * an employer's ATS ranking. Both editor surfaces use this one function so the
 * same resume/job pair always produces the same displayed comparison.
 */
export function calculateTailorKeywordScores(
  originalResume: ResumeData,
  tailoredResume: ResumeData,
  jobDescription: string,
): KeywordMatchComparison | null {
  if (!jobDescription.trim()) return null;

  return {
    before: simulateATSParsing(originalResume, jobDescription).score,
    after: simulateATSParsing(tailoredResume, jobDescription).score,
  };
}
