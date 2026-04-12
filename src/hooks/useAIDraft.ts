import { useState, useEffect, useCallback } from 'react';

/**
 * Persists and restores AI-generated results to localStorage.
 * Keyed by resumeId + sheetType so drafts don't cross-contaminate.
 *
 * Returns:
 *  - draft: the persisted value (or null if none)
 *  - saveDraft: call with the generated result to persist it
 *  - clearDraft: wipe the draft (e.g. on explicit new generation)
 *  - hasDraft: convenience boolean
 */
export function useAIDraft<T>(sheetType: string, resumeId: string | null | undefined) {
  const storageKey = resumeId
    ? `wise_ai_draft__${sheetType}__${resumeId}`
    : null;

  const [draft, setDraft] = useState<T | null>(() => {
    if (!storageKey) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  });

  // Re-load draft when resume changes (e.g. user switches resume)
  useEffect(() => {
    if (!storageKey) {
      setDraft(null);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      setDraft(raw ? (JSON.parse(raw) as T) : null);
    } catch {
      setDraft(null);
    }
  }, [storageKey]);

  const saveDraft = useCallback(
    (value: T) => {
      setDraft(value);
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {
        // Storage full or blocked; fail silently
      }
    },
    [storageKey]
  );

  const clearDraft = useCallback(() => {
    setDraft(null);
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
  }, [storageKey]);

  return { draft, saveDraft, clearDraft, hasDraft: draft !== null };
}
