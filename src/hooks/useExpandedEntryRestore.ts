import { useState, useCallback, useRef, useEffect } from 'react';
import { useResumeStore } from '@/store/resumeStore';
import { readEditorSession, writeEditorSession } from '@/lib/editorSession';

/**
 * Drop-in replacement for `useState<string | null>(null)` in editor section
 * components that track which entry is expanded. Persists the expanded id
 * per-resume + per-section into the editor session blob so a refresh
 * re-expands the same card.
 *
 * The first read for a (resume, section) pair pulls from
 * `editorSession.expandedBySection[section]`; later changes are written
 * back through `writeEditorSession` and the in-memory state always wins
 * for subsequent renders.
 */
export function useExpandedEntryRestore(section: string) {
  const resumeId = useResumeStore(s => s.currentResume?.id ?? null);
  // Read once on mount per resume id.
  const initialRef = useRef<{ resumeId: string | null; value: string | null }>({
    resumeId: null,
    value: null,
  });
  if (initialRef.current.resumeId !== resumeId) {
    initialRef.current = {
      resumeId,
      value: resumeId ? readEditorSession(resumeId)?.expandedBySection?.[section] ?? null : null,
    };
  }
  const [expandedId, setExpandedIdInternal] = useState<string | null>(initialRef.current.value);

  // If the resume id changes mid-mount (unusual), re-sync from storage.
  useEffect(() => {
    if (!resumeId) return;
    const fromStorage = readEditorSession(resumeId)?.expandedBySection?.[section] ?? null;
    setExpandedIdInternal(fromStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  const setExpandedId = useCallback(
    (next: string | null | ((prev: string | null) => string | null)) => {
      setExpandedIdInternal(prev => {
        const value = typeof next === 'function' ? (next as (p: string | null) => string | null)(prev) : next;
        if (resumeId) {
          writeEditorSession(resumeId, { expandedBySection: { [section]: value } });
        }
        return value;
      });
    },
    [resumeId, section],
  );

  return [expandedId, setExpandedId] as const;
}
