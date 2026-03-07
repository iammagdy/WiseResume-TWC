# CHANGELOG-local.md

This is a local changelog for tracking changes made to WiseResume via Lovable AI sessions.

---

## Unreleased

- Date: 2026-03-07
- Issue ID: ISSUE-001 (continued)
- Summary: Extracted two JSX subcomponents from EditorPage, reducing it from ~1,178 → ~923 lines (−255 lines) with zero behavior change.
  - `EditorHeader` — the sticky header block (back button, title, undo/redo, version history, Template/Design/Live/Wise-AI buttons, mobile equivalents).
  - `EditorSectionContent` — the `renderEditorContent` useCallback converted to a proper presentational component (all section cards + prev/next nav buttons).
- Files touched:
  - `src/components/editor/EditorHeader.tsx` (created)
  - `src/components/editor/EditorSectionContent.tsx` (created)
  - `src/pages/EditorPage.tsx` (edited — removed extracted blocks, replaced with component calls, pruned imports)
  - `enhancements-for-vibe-coding/CHANGELOG-local.md` (this file)
- Notes / Constraints: No logic changed. JSX moved verbatim. All MEMORY.md "Do Not Touch" files respected. No Radix Popper components introduced. scrollContainerRef stays in EditorPage.

---

- Date: 2026-03-07
- Issue ID: ISSUE-001
- Summary: Refactored EditorPage (~1,469 → ~1,178 lines, −291 lines) by extracting three focused custom hooks with zero behavior change.
  - `useEditorHydration` — DB→Zustand hydration, ownership check, stale-resume detection.
  - `useEditorAutosave` — debounced cloud save, conflict guard, offline queue, ATS re-score throttle, keyboard-close listener, app-lifecycle background flush.
  - `useEditorSectionScores` — granular section score memos, overall score, local ATS health object, section-completion celebration toasts, confetti state.
- Files touched:
  - `src/hooks/useEditorHydration.ts` (created)
  - `src/hooks/useEditorAutosave.ts` (created)
  - `src/hooks/useEditorSectionScores.ts` (created)
  - `src/pages/EditorPage.tsx` (edited — replaced extracted blocks with hook calls, removed now-redundant imports)
- Notes / Constraints: No JSX changed. No logic changed. All MEMORY.md "Do Not Touch" files respected.

---

<!-- Add new entries below as changes are made. Copy the template for each entry. -->

<!--
Entry template:

- Date: YYYY-MM-DD
- Issue ID: ISSUE-XXX (or N/A)
- Summary:
- Files touched:
- Notes / Constraints:
-->

