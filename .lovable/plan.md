

## Multiple Export Formats and Undo/Redo System

### Overview

Two features: (1) expand the existing export sheet with LinkedIn, Plain Text, and Shareable Link formats plus ATS-optimized PDF option, and (2) add an undo/redo system to the editor with keyboard shortcuts and enhanced version history.

---

### Part 1: Multiple Export Formats

**Current state**: `ExportOptionsSheet` already supports 5 options: Resume PDF, Word DOCX, One-Page PDF, Cover Letter PDF, and Application Package. `shareUtils.ts` has `shareAsLink` and `shareAsText` helpers. `docxGenerator.ts` handles DOCX creation.

**What changes**:

**File: `src/components/editor/ExportOptionsSheet.tsx`**

1. **Add 3 new export options** to the `exportOptions` array:
   - "PDF (ATS-Optimized)" -- black-and-white, single-column, standard fonts. Uses existing PDF generator with a new `atsMode` flag that strips colors and forces simple styling
   - "LinkedIn Profile Format" -- text-only, copy-paste ready. Opens a modal with sections (About, Experience, Education, Skills) formatted for LinkedIn character limits
   - "Plain Text (.txt)" -- pure UTF-8 text with line breaks. Uses existing `shareAsText` logic expanded to include all sections
   - "Shareable Web Link" -- uses existing `shareAsLink` from `shareUtils.ts`

2. **Update `ExportType`** in `src/types/resume.ts` to add: `'ats-pdf' | 'linkedin' | 'plain-text' | 'share-link'`

3. **ATS-Optimized PDF logic**: Add an `atsMode` parameter to `generatePDF` in `pdfGenerator.ts` that:
   - Overrides template customization to remove accent colors (force black text)
   - Forces single-column layout
   - Uses standard margins (1 inch / 72pt -- already the default)
   - Strips photo if present

4. **LinkedIn format**: New sub-sheet or modal that renders resume data into LinkedIn-compatible sections with character counters and "Copy Section" buttons per section

5. **Plain Text export**: Expand `shareAsText` to include Experience (with bullet points), Education, Skills, Certifications -- generate a `.txt` file and trigger download via `downloadFile`

6. **File naming**: Update download filename to `FirstName_LastName_Resume_2026.pdf` pattern using `contactInfo.fullName`

**File: `src/types/resume.ts`**

- Add new export types to `ExportType` union

**File: `src/lib/pdfGenerator.ts`**

- Add `atsMode?: boolean` to PDF generation options
- When `atsMode` is true: override customization to black text, no accent color, no photo, single column

**File: `src/lib/shareUtils.ts`**

- Add `generatePlainText(resume: ResumeData): string` function covering all sections
- Add `generateLinkedInFormat(resume: ResumeData): { about: string; experience: string; education: string; skills: string }` function

---

### Part 2: Undo/Redo System

**Current state**: The resume store uses Zustand with `persist` middleware. `updateResume` directly merges partial updates. `useEditorShortcuts` handles Cmd+S/P/D. `VersionHistorySheet` shows cloud-saved versions from the `resume_versions` table.

**What changes**:

**New file: `src/hooks/useUndoRedo.ts`**

A custom hook that wraps the resume store to provide undo/redo:

1. **History stack**: Maintains an array of `ResumeData` snapshots (max 50) and a pointer index
2. **Recording changes**: Debounces resume store changes (500ms). On each debounced change, pushes a snapshot to the history stack with an auto-generated description (e.g., "Updated summary", "Added skill 'React'")
3. **Change descriptions**: Compare previous and current state to generate human-readable labels:
   - Skills added/removed: "Added skill 'React'"
   - Experience changed: "Updated experience at Google"
   - Summary changed: "Updated summary (X chars changed)"
   - Contact changed: "Updated contact info"
4. **Undo**: Moves pointer back, calls `setCurrentResume` with previous snapshot
5. **Redo**: Moves pointer forward, calls `setCurrentResume` with next snapshot
6. **State**: `canUndo`, `canRedo`, `undoDescription`, `redoDescription`
7. **Storage**: `useState` only (cleared on page refresh). Not persisted to localStorage to keep the store lean
8. **New-change-after-undo**: If user makes a new change after undoing, the redo stack is discarded (standard behavior)

**File: `src/hooks/useEditorShortcuts.ts`**

- Add `onUndo` and `onRedo` callbacks
- Handle `Cmd/Ctrl+Z` for undo
- Handle `Cmd/Ctrl+Shift+Z` and `Cmd/Ctrl+Y` for redo
- Remove conflict with existing `Cmd+S` (no overlap)

**File: `src/pages/EditorPage.tsx`**

1. **Wire up `useUndoRedo`**: Initialize with current resume, pass undo/redo to shortcuts hook
2. **Undo/Redo buttons**: Add two icon buttons (`Undo2`, `Redo2` from lucide) in the editor header toolbar, next to the save indicator
   - Size: 36x36px desktop, 32x32px mobile
   - Disabled state with reduced opacity when `!canUndo` / `!canRedo`
   - Tooltip (on desktop) showing what will be undone/redone
3. **Toast feedback**: On undo/redo, show brief toast: "Undo: Added skill 'React'" (200ms duration)

**File: `src/components/editor/VersionHistorySheet.tsx`**

Enhanced with:

1. **"Create Checkpoint" button** at the top -- saves current state to `resume_versions` table with a user-provided name via a small input prompt
2. **Auto-checkpoint labels**: When versions have `change_summary`, show it. Add visual distinction for AI-triggered checkpoints (sparkle icon) vs manual (pin icon)
3. **Compare button**: Each version gets a "Compare" button that opens the existing `VersionCompareSheet` (from dashboard) with the selected version vs. current state
4. **Visual timeline**: Add a thin vertical line connecting version entries for timeline feel, with timestamp formatting improved (show "Today, 7:05 AM" instead of "2 hours ago" for same-day entries)

---

### What Does NOT Change

- All existing PDF generation logic and quality
- Current export options (Resume, DOCX, One-Page, Cover Letter, Package) remain
- Data saving, auto-save, and offline sync
- Mobile preview and editor behavior
- Template rendering
- Version history database schema (uses existing `resume_versions` table)
- Share functionality

---

### Files Summary

| File | Action |
|------|--------|
| `src/types/resume.ts` | Add new `ExportType` values |
| `src/components/editor/ExportOptionsSheet.tsx` | Add ATS PDF, LinkedIn, Plain Text, Share Link options |
| `src/lib/pdfGenerator.ts` | Add `atsMode` flag for black-and-white ATS export |
| `src/lib/shareUtils.ts` | Add `generatePlainText` and `generateLinkedInFormat` |
| `src/hooks/useUndoRedo.ts` | New -- undo/redo history stack with change descriptions |
| `src/hooks/useEditorShortcuts.ts` | Add Cmd+Z / Cmd+Shift+Z handlers |
| `src/pages/EditorPage.tsx` | Wire undo/redo buttons and hook |
| `src/components/editor/VersionHistorySheet.tsx` | Add checkpoint button, compare action, timeline UI |

### Implementation Order

1. `src/types/resume.ts` (add export types)
2. `src/lib/shareUtils.ts` (plain text + LinkedIn generators)
3. `src/lib/pdfGenerator.ts` (ATS mode)
4. `src/components/editor/ExportOptionsSheet.tsx` (new format options)
5. `src/hooks/useUndoRedo.ts` (new hook)
6. `src/hooks/useEditorShortcuts.ts` (add undo/redo shortcuts)
7. `src/pages/EditorPage.tsx` (wire everything)
8. `src/components/editor/VersionHistorySheet.tsx` (enhanced UI)

