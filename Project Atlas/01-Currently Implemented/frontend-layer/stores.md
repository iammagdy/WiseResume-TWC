# Stores (`src/store/`)

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:** `src/store/`, `replit.md` (State Management).

**Canonical owner:** `src/store/` directory.

---

Zustand is used for **UI state only**. Server data lives in TanStack Query (see `hooks.md`).

| Store | Purpose |
|---|---|
| `aiHealthStore.ts` | Live AI health snapshot for the AI Studio status pill. |
| `atsScoreHistoryStore.ts` | In-memory history of ATS score deltas during an editor session. |
| `chatTriggerStore.ts` | "Add with AI" entry point. ExperienceSection writes a `pendingPrompt`; EditorPage reads + forwards to AgenticChatSheet. → `replit.md` (Wise AI Phase 2). |
| `contentLibraryStore.ts` | Cached snippet library state. |
| `guidesStore.ts` | Reading-progress + bookmarks for `/guides`. |
| `offlineSyncStore.ts` | Queue of pending offline mutations. Server-wins on conflict + explicit toast. → `replit.md` Security Audit. |
| `resumeStore.ts` | Active resume in editor (drafts, dirty flags, undo stack). |
| `settingsStore.ts` | Local user preferences mirror. |
