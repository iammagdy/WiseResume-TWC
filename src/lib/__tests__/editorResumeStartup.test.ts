import { describe, expect, it, vi } from 'vitest';
import type { ResumeData } from '@/types/resume';
import {
  EditorResumeTimeoutError,
  isRequestedResumeDocumentConfirmed,
  resolveEditorResumeTarget,
  selectConfirmedEditorResume,
  withEditorResumeTimeout,
} from '@/lib/editorResumeStartup';

const storedResume = {
  id: 'resume-a',
  contactInfo: { fullName: 'Resume A', email: '', phone: '', location: '' },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  templateId: 'modern',
} as ResumeData;

describe('Editor resume startup', () => {
  it('uses a route resume ID before persisted-store hydration completes', () => {
    expect(resolveEditorResumeTarget({
      routeResumeId: 'route-resume',
      storeHydrated: false,
      currentResumeId: 'stale-resume',
      defaultResumeId: 'default-resume',
    })).toBe('route-resume');
  });

  it('waits for store hydration when the route has no resume ID', () => {
    expect(resolveEditorResumeTarget({
      routeResumeId: null,
      storeHydrated: false,
      currentResumeId: 'persisted-resume',
      defaultResumeId: 'default-resume',
    })).toBeNull();

    expect(resolveEditorResumeTarget({
      routeResumeId: null,
      storeHydrated: true,
      currentResumeId: 'persisted-resume',
      defaultResumeId: 'default-resume',
    })).toBe('persisted-resume');
  });

  it('requires both the requested document ID and authenticated owner', () => {
    expect(isRequestedResumeDocumentConfirmed(
      'resume-a',
      { $id: 'resume-a', user_id: 'user-a' },
      'user-a',
    )).toBe(true);
    expect(isRequestedResumeDocumentConfirmed(
      'resume-a',
      { $id: 'resume-b', user_id: 'user-a' },
      'user-a',
    )).toBe(false);
    expect(isRequestedResumeDocumentConfirmed(
      'resume-a',
      { $id: 'resume-a', user_id: 'user-b' },
      'user-a',
    )).toBe(false);
  });

  it('never exposes a stale stored resume as the requested resume', () => {
    expect(selectConfirmedEditorResume({
      targetResumeId: 'resume-b',
      storedResume,
      resumeDocument: { $id: 'resume-b', user_id: 'user-a' },
      userId: 'user-a',
    })).toBeNull();
  });

  it('enables the matching stored resume only after document confirmation', () => {
    expect(selectConfirmedEditorResume({
      targetResumeId: 'resume-a',
      storedResume,
      resumeDocument: undefined,
      userId: 'user-a',
    })).toBeNull();

    expect(selectConfirmedEditorResume({
      targetResumeId: 'resume-a',
      storedResume,
      resumeDocument: { $id: 'resume-a', user_id: 'user-a' },
      userId: 'user-a',
    })).toBe(storedResume);
  });

  it('bounds a document request without converting it into a missing resume', async () => {
    vi.useFakeTimers();
    const request = new Promise<never>(() => undefined);
    const result = withEditorResumeTimeout(request, 5_000);
    const rejection = expect(result).rejects.toBeInstanceOf(EditorResumeTimeoutError);

    await vi.advanceTimersByTimeAsync(5_000);
    await rejection;
    vi.useRealTimers();
  });
});
