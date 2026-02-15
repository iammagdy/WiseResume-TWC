

## Mobile Responsiveness Fix: Editor Navigation and Progress Bar

### Overview

Convert the horizontal stepper navigation to a mobile-friendly dropdown on screens under 768px, and optimize the progress bar layout for small screens. Desktop layout remains completely unchanged.

### Changes

**File 1: `src/components/editor/StepperNav.tsx`**

Add a mobile-specific dropdown mode that replaces the horizontal stepper on screens less than 768px:

- Import `useIsMobile` hook, `ChevronDown` icon, and the `Sheet`/`SheetContent` components
- Add local state `showSheet` to control the section picker bottom sheet
- On mobile, render a tappable row showing the current section icon, label, completion badge, and a chevron -- styled as a full-width button with 56px height
- When tapped, open a bottom sheet listing all 6 sections as full-width cards (min 56px height each) with:
  - Section icon and label
  - Green checkmark for completed sections
  - Percentage badge for in-progress sections
  - Highlighted background for the active section
- On section tap, call `onStepClick`, close the sheet, and trigger haptic feedback
- On desktop (768px+), render the existing horizontal stepper exactly as-is (no changes)
- The connecting progress line and confetti animations remain desktop-only

**File 2: `src/pages/EditorPage.tsx`**

Optimize the progress bar area for mobile screens:

- In the progress/save-status container (around line 521), add responsive classes:
  - On `<640px`: stack the progress bar and save indicator vertically, add `py-3` padding
  - Use `flex-col sm:flex-row` on the inner wrapper so text stacks on small screens
  - Reduce the "X of Y sections completed" text size slightly on mobile with `text-[11px] sm:text-xs`
- Ensure the gradient bar remains full-width at all breakpoints
- No changes to save indicator logic, confetti, or real-time updates

### What Does NOT Change

- Desktop stepper layout (768px+) -- identical behavior and appearance
- AI Assist, validation, auto-save, keyboard shortcuts
- Section switching logic, animations, and `handleTabChange`
- All sheet/modal functionality
- Navigation guards, auth checks, data persistence
- Progress bar gradient animation and confetti celebrations

### Technical Notes

- Uses existing `useIsMobile` hook (768px breakpoint) for the stepper toggle
- Uses Tailwind responsive prefixes (`sm:`) for progress bar adjustments
- Bottom sheet uses existing `Sheet` primitive (consistent with app patterns)
- Touch targets: 56px height section cards, 48px min dropdown trigger
- Haptic feedback via existing `haptics.light()` utility

