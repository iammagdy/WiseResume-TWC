
# ResumeDetailPage Navigation Audit — All Buttons Verified + Missing Actions Added

## Audit Results

Every button on `ResumeDetailPage` was traced line-by-line.

### Buttons That Are Correct (No Changes Needed)

| Button | Behavior | Store Loaded? | Verdict |
|---|---|---|---|
| Edit (sticky bar + actions) | `setCurrentResume` + `setCurrentResumeId` + `setSelectedTemplate` → `/editor` | Yes | Correct |
| Preview | Same as Edit → `/preview` | Yes | Correct |
| Download / PDF | Generates PDF inline using hidden off-screen template, no navigation | N/A | Correct |
| Share | `createShare.mutate` → copies link to clipboard, no navigation | N/A | Correct |
| Duplicate | `duplicateResume.mutate` → on success `/dashboard` | N/A | Correct |
| Delete | `deleteResume.mutate` → on success `/dashboard` | N/A | Correct |
| Improve Score | Opens `AIEnhanceSheet` inline — sheet's `onOpenChange(open=true)` sets all three store values | Yes (on open) | Correct |
| Re-score | `clearCachedScore` + `scoreResume` inline, no navigation | N/A | Correct |
| "View Original Resume" link | Navigates to `/resume/:parentId` — that page self-hydrates via `useResume(id)` | N/A | Correct |

### The Real Problem — Tailor and Interview Are Completely Missing

The user asked specifically about **Tailor** and **Interview** buttons. Neither exists anywhere on `ResumeDetailPage`. Both are available from `ResumeListCard`'s actions sheet on the Dashboard, but a user who lands on the Resume Detail page has no way to:

- Launch the **AI Tailor** flow (opens `TailorSheet` or navigates to `/editor?openTailor=1`)
- Start a **Practice Interview** session for this specific resume

This is a **missing feature gap**, not a broken navigation — the buttons simply aren't there at all.

---

## What We'll Fix

Add two new actions to the "More Actions" grid on `ResumeDetailPage`:

### 1. Tailor Action
- Label: "Tailor"
- Icon: `GitBranch`
- Behavior: Load resume into store (`setCurrentResume`, `setCurrentResumeId`, `setSelectedTemplate`), then navigate to `/editor?openTailor=1`
- This mirrors what `ResumeListCard`'s actions sheet does for its "Tailor" flow

### 2. Interview Action
- Label: "Interview"
- Icon: `Mic`
- Behavior: Load resume into store (`setCurrentResume`, `setCurrentResumeId`), then navigate to `/interview`
- This exactly mirrors the `handleInterview` pattern from `DashboardPage` (lines 248–256)

### Updated "More Actions" Grid

The current grid shows: Share, Duplicate, Delete

After the fix it will show: **Tailor, Interview, Share, Duplicate, Delete** — a 2+3 layout (or 3+2 depending on grid config).

---

## Technical Details

**File changed:** `src/pages/ResumeDetailPage.tsx` only

Changes:
1. Add `Mic` to the lucide-react import (already has `GitBranch`)
2. Add `handleTailor` function that sets store and navigates to `/editor?openTailor=1`
3. Add `handleInterview` function that sets store and navigates to `/interview`
4. Add both to the `actions` array so they appear in the "More Actions" grid
5. Update the grid filter to include the new actions (currently filters `['Edit', 'Preview', 'Download']` — the new ones will pass through automatically)

No new imports needed beyond `Mic` from lucide-react. No database changes. No edge functions.

The `Mic` icon import is the only new addition — `GitBranch` is already imported at line 4.
