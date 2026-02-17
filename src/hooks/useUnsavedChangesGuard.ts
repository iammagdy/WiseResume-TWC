import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ResumeData } from '@/types/resume';

interface UseUnsavedChangesGuardOptions {
  resumeRef: React.MutableRefObject<ResumeData | null>;
  lastSavedResumeRef: React.MutableRefObject<string>;
  saveToCloud: () => Promise<void>;
}

export function useUnsavedChangesGuard({
  resumeRef,
  lastSavedResumeRef,
  saveToCloud,
}: UseUnsavedChangesGuardOptions) {
  const navigate = useNavigate();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [isSavingBeforeLeave, setIsSavingBeforeLeave] = useState(false);

  const isDirty = useCallback(() => {
    const current = JSON.stringify(resumeRef.current);
    return current !== lastSavedResumeRef.current && lastSavedResumeRef.current !== '';
  }, [resumeRef, lastSavedResumeRef]);

  // Intercept navigation: if dirty, store path and show dialog instead
  const interceptNavigate = useCallback((path: string) => {
    if (isDirty()) {
      setPendingPath(path);
    } else {
      navigate(path);
    }
  }, [isDirty, navigate]);

  const proceed = useCallback(() => {
    const path = pendingPath;
    setPendingPath(null);
    if (path) navigate(path);
  }, [pendingPath, navigate]);

  const cancel = useCallback(() => {
    setPendingPath(null);
  }, []);

  const saveAndProceed = useCallback(async () => {
    if (!pendingPath) return;
    setIsSavingBeforeLeave(true);
    try {
      await saveToCloud();
      const path = pendingPath;
      setPendingPath(null);
      navigate(path);
    } catch {
      // Save failed — stay on page
      setPendingPath(null);
    } finally {
      setIsSavingBeforeLeave(false);
    }
  }, [pendingPath, saveToCloud, navigate]);

  return {
    isDirty,
    isBlocked: pendingPath !== null,
    isSavingBeforeLeave,
    proceed,
    cancel,
    saveAndProceed,
    interceptNavigate,
  };
}
