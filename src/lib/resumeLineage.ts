import type { DatabaseResume } from '@/hooks/useResumes';

/** Matches titles from Tailoring Hub, editor tailor sheet, and manual tailored copies. */
const TAILORED_TITLE_PATTERN = /(\(Tailored\)\s*$|- Tailored(?:\s+for|\s*$))/i;

export function isTailoredResume(
  resume: Pick<DatabaseResume, '$id' | 'parent_resume_id' | 'title'>,
  tailoredIds?: Set<string>,
): boolean {
  if (resume.parent_resume_id) return true;
  if (tailoredIds?.has(resume.$id)) return true;
  return TAILORED_TITLE_PATTERN.test(resume.title ?? '');
}

export function isNormalResume(
  resume: Pick<DatabaseResume, '$id' | 'parent_resume_id' | 'title'>,
  tailoredIds?: Set<string>,
): boolean {
  return !isTailoredResume(resume, tailoredIds);
}
