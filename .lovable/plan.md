
# Add Rename Resume Feature

## Problem
Resumes default to "Test Resume" (or "Untitled Resume") even when the contact info has a real name. Users need a way to rename resumes directly from the dashboard card.

## Changes

### 1. Add "Rename" to the dropdown menu
**File: `src/components/dashboard/ResumeListCard.tsx`**

- Add a new `onRename` callback prop: `onRename?: (id: string, newTitle: string) => void`
- Add a `Pencil` (or `Type`) icon "Rename" menu item in the dropdown, placed before "Edit"
- When clicked, set local state `isRenaming = true` which swaps the title `<h3>` for a small inline `<input>` pre-filled with the current title
- On Enter or blur, call `onRename(resume.id, newTitle)` and exit rename mode
- On Escape, cancel and revert

### 2. Wire up rename in the parent
**File: `src/pages/DashboardPage.tsx`**

- Import `useResumeMutations` (already imported for delete/duplicate)
- Use `updateResume.mutateAsync({ resumeId, updates: {}, title: newTitle })` to save the new name
- Pass the handler as `onRename` to each `ResumeListCard`

### 3. Add success toast
**File: `src/hooks/useResumes.ts`**

- No changes needed -- the `updateResume` mutation already handles the DB update and cache invalidation. The parent just calls it with the new title.

## Technical Details

### Inline Rename UX
- The title text becomes an `<input>` with `autoFocus`, styled to match the current font (same `font-semibold text-foreground` classes)
- Glass-input styling on the input for consistency
- Click outside or press Enter to confirm; Escape to cancel
- `e.stopPropagation()` on the input to prevent triggering card navigation

### Dropdown Addition
A new menu item between the top of the menu and "Edit":
```
Rename   (Pencil icon)
Edit     (Edit2 icon)
Duplicate
---
Delete
```
