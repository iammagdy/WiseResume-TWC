import { useCallback, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
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
  const [isSavingBeforeLeave, setIsSavingBeforeLeave] = useState(false);

  const isDirty = useCallback(() => {
    const current = JSON.stringify(resumeRef.current);
    return current !== lastSavedResumeRef.current && lastSavedResumeRef.current !== '';
  }, [resumeRef, lastSavedResumeRef]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return isDirty() && currentLocation.pathname !== nextLocation.pathname;
  });

  const proceed = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker]);

  const cancel = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  const saveAndProceed = useCallback(async () => {
    if (blocker.state !== 'blocked') return;
    setIsSavingBeforeLeave(true);
    try {
      await saveToCloud();
      blocker.proceed();
    } catch {
      // Save failed — stay on page
      blocker.reset();
    } finally {
      setIsSavingBeforeLeave(false);
    }
  }, [blocker, saveToCloud]);

  return {
    isDirty,
    isBlocked: blocker.state === 'blocked',
    isSavingBeforeLeave,
    proceed,
    cancel,
    saveAndProceed,
  };
}
