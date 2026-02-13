

## Comprehensive Mobile Responsiveness Fixes

### Overview
This plan addresses 8 specific layout and overflow issues across the app to ensure all UI elements are fully visible and usable on screens from 320px to 1280px.

---

### Issue 1: "New Resume" FAB Button Overflow

**File: `src/components/dashboard/FloatingCreateButton.tsx`**

The FAB is positioned `fixed bottom-24 right-4` which can cause it to be cut off on small screens or overlap with the bottom tab bar inconsistently.

- Change to `fixed bottom-20 right-4 z-50` (aligns with `pb-20` content padding used for bottom nav)
- Add `pr-safe` for right safe-area on notched devices
- Ensure z-index is `z-50` (currently `z-40`, which can sit behind the bottom nav at `z-50`)

---

### Issue 2: Skills Section Tag Overflow

**File: `src/components/editor/SkillsSection.tsx`**

The skills tags container uses `flex flex-wrap gap-2` which is correct. However, the outer section may be constrained. Verify that the parent `SectionCard` and editor scroll container don't clip overflow.

- Add `overflow-hidden` on the tags container to prevent any horizontal bleed
- The existing `flex-wrap` already handles wrapping -- no scroll needed
- Ensure the "Add skill" input row stays sticky/visible

---

### Issue 3: Dashboard Resume Cards Stacking

**File: `src/pages/DashboardPage.tsx` (line 490)**

Currently uses `space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0`. This is already responsive but missing `lg:grid-cols-3` for wider screens.

- Add `lg:grid-cols-3` for desktop breakpoint
- Ensure cards have `min-w-0` to prevent overflow in grid cells

---

### Issue 4: Editor Header Elements Overflow

**File: `src/pages/EditorPage.tsx` (lines 381-439)**

The header has back button, title "Edit Resume", offline indicator, version history button, and Wise AI button all in one row. On narrow screens this can overflow.

- Add `min-w-0` to the left `flex items-center gap-3` div so the title can truncate
- Reduce gap from `gap-3` to `gap-2` on the left side
- The title already has `truncate` -- just needs the parent to allow shrinking
- Hide version history icon on very small screens: add `hidden sm:inline-flex`

---

### Issue 5: Bottom Tab Navigation Safe Area

**File: `src/components/layout/BottomTabBar.tsx`**

Already has `pb-safe` class. Verify the tab buttons meet touch targets.

- The nav already has `pb-safe` and `h-16`
- Tab buttons have `flex-1 h-full` which is correct
- Ensure the min-height of each tab button is explicitly `min-h-[48px]` (currently relies on parent `h-16`)
- Labels are already `text-[11px]` -- change to `text-[10px]` with `whitespace-nowrap` to prevent wrapping

---

### Issue 6: Progress Bar and Stats Overflow

**File: `src/components/editor/ProgressBar.tsx`**

The progress bar text "Resume XX% Complete" uses `whitespace-nowrap` already. The bar uses `flex-1` which is correct.

- Add `min-w-0` to the flex container to prevent the text from pushing the bar off-screen
- Shorten label on small screens: use responsive text or abbreviate to "XX% Complete" without "Resume" prefix on `< sm`

**File: `src/components/dashboard/DashboardStats.tsx`**

The stats row uses `flex items-center gap-4`. On very narrow screens the Score Ring (72px) + two stat blocks can overflow.

- Reduce gap from `gap-4` to `gap-3`
- Make the grid `grid-cols-2 gap-2` instead of `gap-3`
- Add `min-w-0` to the flex container

---

### Issue 7: Editor Page Content Width

**File: `src/pages/EditorPage.tsx`**

The main content area needs proper horizontal padding and max-width constraints.

- The scroll container already uses `px-4` padding
- Add `max-w-screen-lg mx-auto w-full` to the inner content wrapper for centering on large screens
- Ensure section cards are `w-full`

---

### Issue 8: StepperNav Verification

**File: `src/components/editor/StepperNav.tsx`**

Already fixed with `flex-1 min-w-0`, `w-10 h-10` circles, and `text-[10px]` labels. The opaque backgrounds are applied. This should work on 320px screens.

- Verify by reducing outer `px-2` to `px-1` if still tight on 320px
- No other changes expected

---

### Summary of File Changes

| File | Changes |
|------|---------|
| `FloatingCreateButton.tsx` | z-50, bottom-20, pr-safe |
| `SkillsSection.tsx` | Minor overflow guard on tag container |
| `DashboardPage.tsx` | Add lg:grid-cols-3, min-w-0 on grid items |
| `EditorPage.tsx` | Header gap reduction, min-w-0, hide version history on xs, max-w on content |
| `BottomTabBar.tsx` | min-h-[48px] on buttons, text-[10px] whitespace-nowrap on labels |
| `ProgressBar.tsx` | min-w-0 on flex container |
| `DashboardStats.tsx` | Reduce gaps, add min-w-0 |
| `StepperNav.tsx` | Verify only -- already fixed |

