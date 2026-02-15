

## Dashboard Mobile Optimization

### Overview

The dashboard already has responsive foundations (single-column on mobile via `space-y-4`, 44px menu touch targets, swipe gestures). This plan addresses the specific requests: simplifying the stats section, improving resume card progress bars, and ensuring single-column layout on tablet.

### What's Already Done (No Changes Needed)

- Resume cards: swipe gestures, 44px three-dot menu, haptic feedback
- Search input: h-12 (48px), text-base (16px), rounded-full
- Floating Create Button: 56px FAB with pulse animation
- Pull-to-refresh, skeleton loading states
- Mobile: already `space-y-4` vertical stack (single column)

### Changes Required

**File 1: `src/components/dashboard/DashboardStats.tsx`**

Simplify the stats section per spec:
- Remove the `ScoreRing` (72px AVG ring) entirely from the stats row
- Remove the "Top Score" stat tile with Award icon
- Replace the current stats grid with a simpler inline layout:
  - Desktop (>=768px): Single row -- greeting on left, "X Resumes" and "Best: Y%" as inline badges on the right
  - Mobile (<640px): Greeting on its own line, then a compact "X Resumes | Best: Y%" line below
- Keep the greeting, streak badge, and motivational subtitle (empty state) unchanged
- Remove imports for `ScoreRing`, `Award`, `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent` (no longer needed)

**File 2: `src/components/dashboard/ResumeListCard.tsx`**

Improve resume card progress bar and text sizing:
- Change progress bar height from `h-1.5` to `h-2` (8px) for better mobile visibility
- Change completion percentage font from `text-xs` to `text-sm` (~14px) for readability
- Change resume title from `text-base sm:text-sm` to `text-lg sm:text-base` (18px on mobile)
- Change "No target job set" text to ensure no awkward wrapping: keep `text-sm` (14px) and add `whitespace-nowrap`
- Change AI suggestion text from `text-xs` to `text-sm` (14px), and add `line-clamp-2` for max 2 lines with ellipsis
- Change "Edited X ago" from `text-xs` to `text-[13px]` for the requested 13px minimum
- Change card min-height from `min-h-[120px]` to `min-h-[180px] sm:min-h-[120px]` for mobile comfort
- Add `text-[13px]` to the tailored versions badge for readability

**File 3: `src/pages/DashboardPage.tsx`**

Fix resume grid for tablet single-column:
- Change the grid from `md:grid md:grid-cols-2 lg:grid-cols-3` to `lg:grid lg:grid-cols-2 xl:grid-cols-3` so tablet (640-1023px) stays single-column and only desktop (>=1024px) goes to 2 columns

### What Does NOT Change

- All resume CRUD operations (click, rename, duplicate, delete)
- Swipe gesture logic and confirmation dialogs
- Search functionality
- Floating Create Button
- ResumeGroup hierarchy and tailored version display
- Health score calculation and background scoring
- Onboarding flow
- LinkedIn import
- All data loading, saving, and API calls

### Technical Notes

- Removing the ScoreRing from DashboardStats does NOT remove it from ResumeListCard -- each card still shows its individual score ring
- The "Best: Y%" stat replaces both the AVG ring and Top Score tile, reducing visual clutter
- Grid breakpoint change from `md:` to `lg:` shifts the 2-column threshold from 768px to 1024px, making tablet single-column
- Progress bar `h-2` (8px) matches the minimum height requested in the spec
- `line-clamp-2` uses `-webkit-line-clamp` which is well-supported in all modern browsers

