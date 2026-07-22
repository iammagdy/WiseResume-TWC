import type { ResumeData } from '@/types/resume';

export const EDITOR_RESUME_REQUEST_TIMEOUT_MS = 5_000;
export const EDITOR_RESUME_SLOW_NOTICE_MS = 2_500;

interface ResumeDocumentIdentity {
  $id?: string;
  id?: string;
  user_id?: string;
}

interface ResolveEditorResumeTargetOptions {
  routeResumeId: string | null;
  storeHydrated: boolean;
  currentResumeId: string | null;
  defaultResumeId: string | null | undefined;
}

interface SelectConfirmedEditorResumeOptions {
  targetResumeId: string | null;
  storedResume: ResumeData | null;
  resumeDocument: ResumeDocumentIdentity | null | undefined;
  userId: string | null | undefined;
}

export class EditorResumeTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Resume request exceeded ${timeoutMs}ms`);
    this.name = 'EditorResumeTimeoutError';
  }
}

export function isEditorResumeTimeoutError(error: unknown): error is EditorResumeTimeoutError {
  return error instanceof Error && error.name === 'EditorResumeTimeoutError';
}

export async function withEditorResumeTimeout<T>(
  request: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new EditorResumeTimeoutError(timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([request, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function resolveEditorResumeTarget({
  routeResumeId,
  storeHydrated,
  currentResumeId,
  defaultResumeId,
}: ResolveEditorResumeTargetOptions): string | null {
  if (routeResumeId) return routeResumeId;
  if (!storeHydrated) return null;
  return currentResumeId ?? defaultResumeId ?? null;
}

export function isRequestedResumeDocumentConfirmed(
  targetResumeId: string | null,
  resumeDocument: ResumeDocumentIdentity | null | undefined,
  userId: string | null | undefined,
): boolean {
  if (!targetResumeId || !resumeDocument || !userId) return false;
  const documentId = resumeDocument.$id ?? resumeDocument.id;
  return documentId === targetResumeId && resumeDocument.user_id === userId;
}

export function selectConfirmedEditorResume({
  targetResumeId,
  storedResume,
  resumeDocument,
  userId,
}: SelectConfirmedEditorResumeOptions): ResumeData | null {
  if (storedResume?.id !== targetResumeId) return null;
  if (!isRequestedResumeDocumentConfirmed(targetResumeId, resumeDocument, userId)) return null;
  return storedResume;
}
