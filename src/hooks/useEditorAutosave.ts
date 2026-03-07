import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { backgroundScore } from '@/hooks/useResumeScore';
import type { ResumeData } from '@/types/resume';
import type { AuthContextType } from '@/contexts/AuthContext';

interface UpdateResumeMutation {
  mutateAsync: (args: { resumeId: string; updates: ResumeData }) => Promise<{ updated_at?: string } | void>;
}

interface DatabaseResumeLike {
  updated_at?: string | null;
  [key: string]: unknown;
}

interface UseEditorAutosaveOptions {
  user: User | null;
  currentResumeId: string | null;
  resumeRef: React.MutableRefObject<ResumeData | null>;
  lastSavedResumeRef: React.MutableRefObject<string>;
  setIsSaving: (v: boolean) => void;
  setLastSavedAt: (d: Date) => void;
  updateResume: UpdateResumeMutation;
  resumeFromDb: DatabaseResumeLike | null | undefined;
  localLoadedAtRef: React.MutableRefObject<string | null>;
  isSavingRef: React.MutableRefObject<boolean>;
  addPendingChange: (resumeId: string, updates: ResumeData) => void;
}

/**
 * Encapsulates the entire auto-save pipeline:
 *  - Debounced 3-second cloud write
 *  - Pre-save conflict guard
 *  - Offline queue fallback
 *  - Throttled ATS background re-score
 *  - keyboard-close event listener
 *  - App lifecycle (background flush)
 */
export function useEditorAutosave({
  user,
  currentResumeId,
  resumeRef,
  lastSavedResumeRef,
  setIsSaving,
  setLastSavedAt,
  updateResume,
  resumeFromDb,
  localLoadedAtRef,
  isSavingRef,
  addPendingChange,
}: UseEditorAutosaveOptions): { saveToCloud: () => Promise<void> } {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScoreTimeRef = useRef<number>(0);
  // Keep a stable ref to resumeFromDb so the saveToCloud callback never stales
  const resumeFromDbRef = useRef(resumeFromDb);
  resumeFromDbRef.current = resumeFromDb;

  const saveToCloud = useCallback(async () => {
    const resume = resumeRef.current;
    if (!user || !currentResumeId || !resume) return;

    const currentResumeJson = JSON.stringify(resume);
    if (currentResumeJson === lastSavedResumeRef.current) return;

    // Pre-save online conflict guard:
    // If another device has saved since we loaded, silently refresh baseline
    const serverUpdatedAt = resumeFromDbRef.current?.updated_at;
    const sessionLoadedAt = localLoadedAtRef.current;
    if (serverUpdatedAt && sessionLoadedAt && Date.parse(serverUpdatedAt as string) > Date.parse(sessionLoadedAt)) {
      localLoadedAtRef.current = serverUpdatedAt as string;
    }

    setIsSaving(true);
    isSavingRef.current = true;
    try {
      const result = await updateResume.mutateAsync({
        resumeId: currentResumeId,
        updates: resume,
      });
      lastSavedResumeRef.current = currentResumeJson;
      setLastSavedAt(new Date());
      // Update baseline from the authoritative mutation response timestamp
      if ((result as { updated_at?: string })?.updated_at) {
        localLoadedAtRef.current = (result as { updated_at: string }).updated_at;
      } else if (resumeFromDbRef.current?.updated_at) {
        localLoadedAtRef.current = resumeFromDbRef.current.updated_at as string;
      }

      // Throttled background ATS re-score (max once per 60s)
      if (currentResumeId && resume && Date.now() - lastScoreTimeRef.current > 60_000) {
        lastScoreTimeRef.current = Date.now();
        const rid = currentResumeId;
        const snap = resume;
        const contentHash = btoa(unescape(encodeURIComponent(JSON.stringify(snap)))).slice(0, 64);
        const scheduleScore = () => backgroundScore(rid, snap, contentHash);
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(scheduleScore);
        } else {
          setTimeout(scheduleScore, 200);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '';
      const isNetworkError =
        !navigator.onLine ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError');
      const isAuthError =
        errorMessage.includes('401') ||
        errorMessage.toLowerCase().includes('unauthorized') ||
        errorMessage.toLowerCase().includes('jwt expired') ||
        errorMessage.toLowerCase().includes('invalid jwt');

      if (isNetworkError && currentResumeId) {
        addPendingChange(currentResumeId, resume);
      } else if (isAuthError) {
        toast.warning('Session expired — your changes are saved locally. Please sign back in.', { duration: 5000 });
      } else {
        console.error('Auto-save failed:', error);
        toast.warning('Auto-save failed — your changes are safe locally and will retry.', { duration: 4000 });
      }
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [user, currentResumeId, resumeRef, lastSavedResumeRef, updateResume, setIsSaving, setLastSavedAt, localLoadedAtRef, isSavingRef, addPendingChange]);

  // Track real local edit time (skip hydration write)
  const hydrationDoneRef = useRef(false);
  const lastLocalEditAtRef = useRef<number>(0);
  useEffect(() => {
    const resume = resumeRef.current;
    if (!resume) return;
    if (!hydrationDoneRef.current) {
      hydrationDoneRef.current = true;
      return;
    }
    lastLocalEditAtRef.current = Date.now();
  });

  // Debounced auto-save effect — depends on the resume snapshot via resumeRef
  const currentResumeSnapshot = resumeRef.current;
  useEffect(() => {
    if (!user || !currentResumeId || !resumeRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToCloud();
    }, 3000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentResumeSnapshot, user, currentResumeId, saveToCloud]);

  // Cleanup save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Draft save on keyboard close
  useEffect(() => {
    const handleKbClose = () => saveToCloud();
    window.addEventListener('keyboard-close', handleKbClose);
    return () => window.removeEventListener('keyboard-close', handleKbClose);
  }, [saveToCloud]);

  // Flush cloud save immediately when app goes to background
  useAppLifecycle({
    onBackground: useCallback(() => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      saveToCloud();
    }, [saveToCloud]),
  });

  return { saveToCloud };
}
