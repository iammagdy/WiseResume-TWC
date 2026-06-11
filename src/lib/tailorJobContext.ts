import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { sanitizeFileName } from '@/lib/sanitizeFileName';

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
    const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.tailor_history, [
      Query.equal('tailored_resume_id', [tailoredResumeId]),
      Query.limit(1),
    ]);
    const doc = res.documents[0];
    if (!doc) return null;
    return parseTailorJobContextFromAppwriteDoc(doc as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function parseTailorJobContextFromAppwriteDoc(
  doc: Record<string, unknown>,
): TailorJobContext {
  return {
    jobTitle: String(doc.job_title ?? '').trim(),
    company: String(doc.company ?? '').trim(),
    jobDescription: String(doc.job_description ?? '').trim(),
    jobUrl: (doc.job_url as string | null | undefined) ?? null,
  };
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
  appwriteDoc?: Record<string, unknown> | null;
}): TailorJobContext {
  const fromAppwrite = sources.appwriteDoc
    ? parseTailorJobContextFromAppwriteDoc(sources.appwriteDoc)
    : null;
  return {
    jobTitle: sources.jobTitle?.trim() || fromAppwrite?.jobTitle || '',
    company: sources.company?.trim() || fromAppwrite?.company || '',
    jobDescription: pickLongestJobDescription(
      sources.jobDescription,
      sources.tailoredResumeId
        ? readTailorJobDescriptionForResume(sources.tailoredResumeId)
        : null,
      fromAppwrite?.jobDescription,
    ),
    jobUrl: sources.jobUrl ?? fromAppwrite?.jobUrl ?? null,
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
