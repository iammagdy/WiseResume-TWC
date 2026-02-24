import type { ResumeExample } from '@/types/resumeExamples';

let _cache: ResumeExample[] | null = null;

/**
 * Lazily loads resume examples from a static JSON file.
 * Data is fetched once and cached for the lifetime of the session.
 */
export async function getResumeExamples(): Promise<ResumeExample[]> {
  if (_cache) return _cache;
  const res = await fetch('/data/resumeExamples.json');
  _cache = (await res.json()) as ResumeExample[];
  return _cache;
}

/**
 * @deprecated Use `getResumeExamples()` instead. This is kept for backward compatibility
 * but will be an empty array until the async loader is called.
 */
export const resumeExamples: ResumeExample[] = [];
