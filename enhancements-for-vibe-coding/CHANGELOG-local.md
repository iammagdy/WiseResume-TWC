# CHANGELOG-local.md

This is a local changelog for tracking changes made to WiseResume via Lovable AI sessions.

---

## Unreleased

- Date: 2026-03-07
- Issue ID: ISSUE-003
- Summary: Applied targeted first-time UX improvements to the resume editor. (1) Re-added the missing Edit/Preview/ATS tab strip on mobile so users can discover the live preview. (2) Renamed the stepper pill label "Work" → "Experience" for consistency with the section card heading. (3) Replaced vague SectionCard tip strings with action-oriented guidance (Contact, Summary, Experience, Education, Skills). (4) Added a dismissible first-visit onboarding banner that appears only on blank new resumes (gated by `wr-onboarding-hint-seen` in localStorage, consistent with banner-etiquette memory). (5) Added a helper hint under the Description label in expanded Experience entries, visible only while the field is empty.
- Files touched:
  - `src/pages/EditorPage.tsx` (added TabsList import; added 3-tab mobile tab strip; changed step label Work → Experience)
  - `src/components/editor/EditorSectionContent.tsx` (added useState import; added onboarding banner with localStorage gate; updated all 5 section tip strings)
  - `src/components/editor/ExperienceSection.tsx` (added description helper hint, conditionally shown when field is empty)
  - `enhancements-for-vibe-coding/CHANGELOG-local.md` (this entry)
- Notes / Constraints: No behavior changes. Autosave, preview linking, and all card actions untouched. No Radix Popper introduced. No large layout rewrites. All MEMORY.md "Do Not Touch" files respected. Banner follows the app's existing non-blocking, dismissible pattern.

---

- Date: 2026-03-07
- Issue ID: ISSUE-002
- Summary: Added "Load More" pagination to the dashboard resume list to reduce initial mount/animation cost. Each tab (My CVs, Tailored) now renders at most 10 cards on first load, with a "Load more (N)" button that reveals the next 10. Visible counts reset when search query, active tab, sort, or filters change. Tab count badges continue to reflect the full filtered set. No new dependencies added.
- Files touched:
  - `src/pages/DashboardPage.tsx` (added `PAGE_SIZE`, `visibleMyCVs`, `visibleTailored` state; reset effect; sliced render lists; Load More buttons)
  - `enhancements-for-vibe-coding/CHANGELOG-local.md` (this entry)
- Notes / Constraints: Zero behavior change to existing card actions (edit, duplicate, delete, rename, interview, selection). Stagger animation now runs over ≤10 items eliminating the 50-card simultaneous mount spike on mobile. No Radix Popper introduced. All MEMORY.md "Do Not Touch" files respected.

---

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

