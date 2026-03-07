# CHANGELOG-local.md

This is a local changelog for tracking changes made to WiseResume via Lovable AI sessions.

---

## Unreleased

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

