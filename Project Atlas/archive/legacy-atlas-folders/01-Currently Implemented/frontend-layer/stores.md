# Stores (`src/store/`)

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `src/store/`, `replit.md` (State Management).

**Canonical owner:** `src/store/` directory.

---

Zustand is used for **UI state only**. Server data lives in TanStack Query (see `hooks.md`).

| Store | Purpose |
|---|---|
| `aiEnhancingStore.ts` | Per-section AI-enhancing flags + per-bullet pending state for the editor's "Enhance with AI" buttons. Drives the spinner + disabled state on each section. |
| `aiHealthStore.ts` | Live AI health snapshot for the AI Studio status pill. |
| `atsScoreHistoryStore.ts` | In-memory history of ATS score deltas during an editor session. |
| `chatTriggerStore.ts` | "Add with AI" entry point. ExperienceSection writes a `pendingPrompt`; EditorPage reads + forwards to AgenticChatSheet. → `replit.md` (Wise AI Phase 2). |
| `contentLibraryStore.ts` | Cached snippet library state. |
| `guidesStore.ts` | Reading-progress + bookmarks for `/guides`. |
| `offlineSyncStore.ts` | Queue of pending offline mutations. Server-wins on conflict + explicit toast. → `replit.md` Security Audit. |
| `resumeStore.ts` | Active resume in editor (drafts, dirty flags, undo stack). |
| `sectionAIBridge.ts` | Cross-component bridge that lets the agentic chat dispatch `applySectionPatch` operations into whichever section is currently mounted in the editor. Stores the active section's apply callback so the chat handler can call it without prop-drilling. |
| `settingsStore.ts` | Local user preferences mirror. |
