

## Fix Dashboard Resume Card Layout and Floating Button

### Problems Identified

1. **Chevron button off-screen**: In `ResumeGroup.tsx`, the expand/collapse button uses `absolute left-0 -translate-x-full` which places it completely outside the visible area on mobile.

2. **Overlapping badges**: The "3 tailored versions" and "Compare" badges at the bottom of the card overlap with the ATS score bar because they use `absolute -bottom-2` positioning which collides with the score breakdown area.

3. **Floating button too wide on mobile**: The "New Resume" FAB shows full text on all screen sizes. On mobile it should be a compact circle with just the `+` icon, and tapping it should open a radial/popup menu with options.

---

### Fix 1: Move Chevron Inside the Card

**File: `src/components/dashboard/ResumeGroup.tsx`**

- Remove the `absolute left-0 -translate-x-full` chevron button that sits outside the card
- Instead, place the expand/collapse toggle **inline** within the tailored count badge at the bottom of the card
- Make the "X tailored versions" badge itself act as the toggle (it already has `onClick={toggleExpand}`)
- Add the chevron icon inside the badge so users see a clear expand/collapse indicator
- Remove the separate floating chevron button entirely

### Fix 2: Fix Badge Overlap with ATS Score

**File: `src/components/dashboard/ResumeGroup.tsx`**

- Change the tailored versions badge from `absolute -bottom-2` to a **static element** placed below the card content
- Use a flex row with proper spacing (`mt-2`) instead of absolute positioning
- This prevents the badge from overlapping the ATS score bar or progress indicators

### Fix 3: Compact FAB with Popup Menu on Mobile

**File: `src/components/dashboard/FloatingCreateButton.tsx`**

- On mobile (below `sm` breakpoint): render as a 56x56 circle with only the `+` icon, no text
- On desktop: keep current pill shape with "New Resume" text
- On tap (mobile): open a small popup menu above the button with 3 circular action buttons:
  - "New Resume" (FileText icon) -- opens CreateResumeDialog
  - "Tailor Resume" (GitBranch icon) -- navigates to AI Studio tailor flow
  - "Analyze Job" (Target icon) -- navigates to job analysis
- Each menu item is a 48px circle with icon + small label below
- Menu dismisses on outside tap or selection
- Wire actions: "New Resume" calls existing `onClick`, "Tailor Resume" navigates to `/ai-studio`, "Analyze Job" navigates to `/applications`

**File: `src/pages/DashboardPage.tsx`**

- Update `FloatingCreateButton` usage to pass a `navigate` function for the new menu actions
- Add `onTailor` and `onAnalyzeJob` callbacks

---

### Technical Details

**ResumeGroup badge layout change (before vs after)**:

Before: Badge uses `absolute -bottom-2 left-1/2 -translate-x-1/2` causing overlap with content below.

After: Badge is a static `div` with `mt-2 flex items-center justify-center gap-1.5` placed inside the normal document flow, pushing content down naturally.

**FloatingCreateButton mobile menu**: Uses `AnimatePresence` + `motion.div` for a small popup that appears above the FAB. Each option is a `button` with `min-w-[48px] min-h-[48px]` touch target. The popup uses a backdrop overlay for dismissal.

### Files Summary

| File | Action |
|------|--------|
| `src/components/dashboard/ResumeGroup.tsx` | Remove off-screen chevron, make badge inline, fix overlap |
| `src/components/dashboard/FloatingCreateButton.tsx` | Icon-only on mobile, add popup menu with 3 actions |
| `src/pages/DashboardPage.tsx` | Pass new callbacks to FloatingCreateButton |

### Implementation Order

1. `ResumeGroup.tsx` (fix chevron + badge positioning)
2. `FloatingCreateButton.tsx` (compact mobile FAB + popup menu)
3. `DashboardPage.tsx` (wire new callbacks)

