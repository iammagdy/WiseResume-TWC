/**
 * EditorSaveContext
 *
 * Provides access to the editor's save functionality for child components.
 * This allows sections like SummarySection to trigger immediate saves on blur,
 * preventing data loss when users edit and quickly navigate away.
 */

import React, { createContext, useContext, useCallback, useRef } from 'react';

interface EditorSaveContextValue {
  /** Trigger an immediate cloud save (flushes any pending debounced save) */
  flushSave: () => Promise<void>;
  /** Whether a save is currently in progress */
  isSaving: boolean;
  /** Register the save function from the parent component */
  registerSaveFunction: (saveFn: () => Promise<void>) => void;
}

const EditorSaveContext = createContext<EditorSaveContextValue | null>(null);

export function EditorSaveProvider({ children }: { children: React.ReactNode }) {
  const saveFnRef = useRef<(() => Promise<void>) | null>(null);
  const isSavingRef = useRef(false);

  const registerSaveFunction = useCallback((saveFn: () => Promise<void>) => {
    saveFnRef.current = saveFn;
  }, []);

  const flushSave = useCallback(async () => {
    if (saveFnRef.current) {
      isSavingRef.current = true;
      try {
        await saveFnRef.current();
      } finally {
        isSavingRef.current = false;
      }
    }
  }, []);

  const value: EditorSaveContextValue = {
    flushSave,
    get isSaving() { return isSavingRef.current; },
    registerSaveFunction,
  };

  return (
    <EditorSaveContext.Provider value={value}>
      {children}
    </EditorSaveContext.Provider>
  );
}

export function useEditorSave(): EditorSaveContextValue {
  const context = useContext(EditorSaveContext);
  if (!context) {
    throw new Error('useEditorSave must be used within EditorSaveProvider');
  }
  return context;
}

export function useOptionalEditorSave(): EditorSaveContextValue | null {
  return useContext(EditorSaveContext);
}
