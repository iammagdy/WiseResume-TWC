import { databases, DATABASE_ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { sanitizeFileName } from '@/lib/sanitizeFileName';
import { tailoringMetadataFromResume } from '@/lib/tailoringResumeMetadata';

export interface TailorJobContext {
  jobTitle: string;
  company: string;
  jobDescription: string;
  jobUrl?: string | null;
}

export const COVER_LETTER_PREFILL_STORAGE_KEY = 'wr-cover-letter-prefill';
export const TAILOR_JOB_DESCRIPTION_PREFIX = 'wr-tailor-job-description';
export const TAILOR_LINKED_COVER_LETTER_PREFIX = 'wr-tailor-linked-cover-letter';

export function pickLongestJobDescription(
  ...candidates: Array<string | null | undefined>
): string {
  return candidates
    .map((value) => value?.trim() ?? '')
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0] ?? '';
}

export function saveTailorJobDescriptionForResume(
  tailoredResumeId: string,
  jobDescription: string,
): void {
  if (!tailoredResumeId || !jobDescription.trim()) return;
  try {
    sessionStorage.setItem(
      `${TAILOR_JOB_DESCRIPTION_PREFIX}:${tailoredResumeId}`,
      jobDescription,
    );
  } catch {
    // ignore quota / private mode
  }
}

export function readTailorJobDescriptionForResume(tailoredResumeId: string): string | null {
  if (!tailoredResumeId) return null;
  try {
    return sessionStorage.getItem(`${TAILOR_JOB_DESCRIPTION_PREFIX}:${tailoredResumeId}`);
  } catch {
    return null;
  }
}

export function saveLinkedCoverLetterForTailoredResume(
  tailoredResumeId: string,
  coverLetterId: string,
): void {
  if (!tailoredResumeId || !coverLetterId) return;
  try {
    sessionStorage.setItem(
      `${TAILOR_LINKED_COVER_LETTER_PREFIX}:${tailoredResumeId}`,
      coverLetterId,
    );
  } catch {
    // ignore
  }
}

export function readLinkedCoverLetterForTailoredResume(
  tailoredResumeId: string,
): string | null {
  if (!tailoredResumeId) return null;
  try {
    return sessionStorage.getItem(`${TAILOR_LINKED_COVER_LETTER_PREFIX}:${tailoredResumeId}`);
  } catch {
    return null;
  }
}

export async function fetchTailorJobContextByResumeId(
  tailoredResumeId: string,
): Promise<TailorJobContext | null> {
  if (!tailoredResumeId) return null;
  try {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.resumes, tailoredResumeId);
    const metadata = tailoringMetadataFromResume(doc as Record<string, unknown>);
    if (!metadata) return null;
    return {
      jobTitle: metadata.jobTitle?.trim() || '',
      company: metadata.company?.trim() || '',
      jobDescription: readTailorJobDescriptionForResume(tailoredResumeId) ?? '',
      jobUrl: metadata.jobUrl ?? null,
    };
  } catch {
    return null;
  }
}

export function saveCoverLetterPrefill(payload: TailorJobContext & { resumeId: string }): void {
  try {
    sessionStorage.setItem(COVER_LETTER_PREFILL_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function readCoverLetterPrefill():
  | (TailorJobContext & { resumeId?: string })
  | null {
  try {
    const raw = sessionStorage.getItem(COVER_LETTER_PREFILL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TailorJobContext & { resumeId?: string };
  } catch {
    return null;
  }
}

export function clearCoverLetterPrefill(): void {
  try {
    sessionStorage.removeItem(COVER_LETTER_PREFILL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function resolveTailorJobContext(sources: {
  jobTitle?: string;
  company?: string;
  jobDescription?: string;
  jobUrl?: string | null;
  tailoredResumeId?: string;
}): TailorJobContext {
  return {
    jobTitle: sources.jobTitle?.trim() || '',
    company: sources.company?.trim() || '',
    jobDescription: pickLongestJobDescription(
      sources.jobDescription,
      sources.tailoredResumeId
        ? readTailorJobDescriptionForResume(sources.tailoredResumeId)
        : null,
    ),
    jobUrl: sources.jobUrl ?? null,
  };
}

/** Human-readable name for the export filename field (spaces, not underscores). */
export function buildJobApplicationDisplayName(options: {
  jobTitle?: string;
  company?: string;
  fullName?: string;
  fallback?: string;
}): string {
  const { jobTitle, company, fullName, fallback = 'Resume' } = options;
  const title = jobTitle?.trim();
  const org = company?.trim();
  if (title && org) return `${title} - ${org}`;
  if (title) return title;
  if (org) return org;
  return fullName?.trim() || fallback;
}

/** Sanitized basename for the filesystem. */
export function buildJobApplicationFileName(options: {
  jobTitle?: string;
  company?: string;
  fullName?: string;
  fallback?: string;
}): string {
  const { jobTitle, company, fullName, fallback = 'Resume' } = options;
  const title = jobTitle?.trim();
  const org = company?.trim();
  if (title && org) return sanitizeFileName(`${title} - ${org}`, fallback);
  if (title) return sanitizeFileName(title, fallback);
  if (org) return sanitizeFileName(org, fallback);
  return sanitizeFileName(fullName?.trim() || fallback, fallback);
}
