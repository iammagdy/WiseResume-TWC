import { useState, useCallback } from 'react';
import type { EditorSheetId } from '@/lib/editorSession';

export interface UseEditorSheetsReturn {
  current: EditorSheetId | null;
  open: (id: EditorSheetId) => void;
  close: () => void;
  closeAll: () => void;
  is: (id: EditorSheetId) => boolean;
}

export function useEditorSheets(): UseEditorSheetsReturn {
  const [current, setCurrent] = useState<EditorSheetId | null>(null);

  const open = useCallback((id: EditorSheetId) => setCurrent(id), []);
  const close = useCallback(() => setCurrent(null), []);
  const closeAll = useCallback(() => setCurrent(null), []);
  const is = useCallback((id: EditorSheetId) => current === id, [current]);

  return { current, open, close, closeAll, is };
}
