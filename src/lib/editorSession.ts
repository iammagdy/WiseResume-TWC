/**
 * Per-resume editor UI session state, persisted to sessionStorage so a
 * page refresh restores the user back to the exact tab/scroll/dialog
 * they were last looking at. Keyed by resume id and TTL'd so a stale
 * session from days ago doesn't auto-open anything.
 *
 * Storage shape (sessionStorage key `wr-editor-session`):
 *   {
 *     [resumeId]: {
 *       activeTab: string,
 *       scrollByTab: { [tabId]: number },
 *       moreSubSection: string | null,
 *       openSheet: EditorSheetId | null,
 *       updatedAt: number   // ms epoch
 *     }
 *   }
 */

const STORAGE_KEY = 'wr-editor-session';
export const EDITOR_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export type EditorSheetId =
  | 'tailor'
  | 'recruiterSim'
  | 'aiDetector'
  | 'linkedIn'
  | 'onePage'
  | 'chat'
  | 'careerPath'
  | 'versionHistory'
  | 'contentLibrary'
  | 'customize'
  | 'jobAnalysis'
  | 'templates'
  | 'profileImport'
  | 'atsScan'
  | 'snapshots'
  | 'keywordHighlighter'
  | 'shareSheet';

export const VALID_EDITOR_SHEET_IDS = new Set<EditorSheetId>([
  'tailor', 'recruiterSim', 'aiDetector', 'linkedIn', 'onePage',
  'chat', 'careerPath', 'versionHistory', 'contentLibrary', 'customize',
  'jobAnalysis', 'templates', 'profileImport', 'atsScan', 'snapshots',
  'keywordHighlighter', 'shareSheet',
]);

export function isValidEditorSheetId(id: unknown): id is EditorSheetId {
  return typeof id === 'string' && VALID_EDITOR_SHEET_IDS.has(id as EditorSheetId);
}

export interface EditorSession {
  activeTab: string;
  scrollByTab: Record<string, number>;
  moreSubSection: string | null;
  openSheet: EditorSheetId | null;
  /**
   * Per-section expanded entry id (e.g. which Experience / Education /
   * Project card was open). Section components write through
   * `useExpandedEntryRestore` so a refresh re-expands the same entry.
   */
  expandedBySection: Record<string, string | null>;
  updatedAt: number;
}

type StoredMap = Record<string, EditorSession>;

function safeRead(): StoredMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function safeWrite(map: StoredMap) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* sessionStorage full or disabled */
  }
}

export function readEditorSession(resumeId: string): EditorSession | null {
  if (!resumeId) return null;
  const map = safeRead();
  const entry = map[resumeId];
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > EDITOR_SESSION_TTL_MS) {
    delete map[resumeId];
    safeWrite(map);
    return null;
  }
  return entry;
}

export function writeEditorSession(
  resumeId: string,
  patch: Partial<Omit<EditorSession, 'updatedAt'>>,
) {
  if (!resumeId) return;
  const map = safeRead();
  const existing = map[resumeId] ?? {
    activeTab: 'contact',
    scrollByTab: {},
    moreSubSection: null,
    openSheet: null,
    expandedBySection: {},
    updatedAt: Date.now(),
  };
  const merged: EditorSession = {
    ...existing,
    ...patch,
    scrollByTab: { ...existing.scrollByTab, ...(patch.scrollByTab ?? {}) },
    expandedBySection: {
      ...(existing.expandedBySection ?? {}),
      ...(patch.expandedBySection ?? {}),
    },
    updatedAt: Date.now(),
  };
  map[resumeId] = merged;
  // Cap at 20 most-recent resumes so sessionStorage can't grow unbounded.
  const ids = Object.keys(map);
  if (ids.length > 20) {
    const sorted = ids
      .map(id => [id, map[id].updatedAt] as const)
      .sort((a, b) => b[1] - a[1]);
    const keep = new Set(sorted.slice(0, 20).map(([id]) => id));
    for (const id of ids) if (!keep.has(id)) delete map[id];
  }
  safeWrite(map);
}

export function clearEditorSession(resumeId: string) {
  const map = safeRead();
  if (resumeId in map) {
    delete map[resumeId];
    safeWrite(map);
  }
}

export function clearAllEditorSessions() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
