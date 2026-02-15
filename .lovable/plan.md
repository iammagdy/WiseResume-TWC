

## Mobile Optimization: Section Navigation and Form Fields (Incremental)

### Overview

Most requested optimizations are already in place. This plan covers the remaining gaps to bring the mobile experience to full spec.

### What's Already Done (No Changes Needed)

- StepperNav: Mobile dropdown button (56px) with bottom sheet -- already implemented
- Input height: h-12 (48px) -- already set
- Font size: text-[16px] on inputs -- already prevents iOS zoom
- Clear button touch targets: min-w-[48px] min-h-[48px] -- already set
- Labels: text-sm font-semibold (14px, weight 600) -- already set
- Textarea: min-h-[120px] on mobile -- already set
- Section padding: px-3 sm:px-4 -- already responsive

### Changes Required

**File 1: `src/components/editor/StepperNav.tsx`**

Mobile bottom sheet section rows:
- Change `min-h-[56px]` to `min-h-[64px]` on each section button in the bottom sheet (line 107) for easier tapping
- Add completion percentage to the trigger button for all sections (not just in-progress): show "100%" with a green badge when completed, and the current score when in-progress
- Show percentage in trigger subtitle: change "Step X of Y" to include "X of Y complete" count

**File 2: `src/components/editor/ProgressBar.tsx`**

Small screen abbreviation:
- On screens under 375px, abbreviate "Resume 90% Complete" to just the percentage and a shorter label using a responsive class or `useIsMobile`-style approach. Use a CSS `hidden`/`inline` swap at a custom breakpoint for the word "Resume" and "Complete"

**File 3: `src/components/ui/form-field.tsx`**

Form field spacing improvements:
- Change outer container from `space-y-2 sm:space-y-1.5` to `space-y-2` consistently (remove the sm: tightening for more breathing room on all sizes)
- Add `leading-relaxed` (line-height 1.625) to Textarea for comfortable mobile reading
- Ensure character counter stays below the input on mobile by keeping the current layout (it's already in a flex row below the input)

**File 4: `src/components/editor/ContactSection.tsx`**

Increase spacing between form field groups:
- Change `space-y-4` to `space-y-5` for slightly more breathing room between fields on all screens

**File 5: `src/components/editor/SummarySection.tsx`** (and other section files if similar)

Same spacing adjustment:
- Change `space-y-4` (or whatever the current gap is) to `space-y-5` for consistent field spacing

**File 6: `src/components/ui/textarea.tsx`**

Add line-height for comfortable reading:
- Add `leading-relaxed` to the textarea base classes so multi-line text has 1.625 line-height

### What Does NOT Change

- Desktop horizontal stepper -- completely untouched
- All data persistence, auto-save, validation logic
- AI features, keyboard shortcuts, section completion celebrations
- All other pages and navigation
- Input component (already at correct height and font size)
- Clear button sizing (already 48px targets)

### Technical Notes

- StepperNav bottom sheet row height increase from 56px to 64px adds ~48px total across 6 sections, well within sheet height
- ProgressBar abbreviation uses Tailwind responsive utilities with a custom `@media (max-width: 374px)` or `min-[375px]:` prefix to swap text content
- `leading-relaxed` on textarea sets `line-height: 1.625` which improves multi-line readability without changing layout
- `space-y-5` (20px) vs `space-y-4` (16px) matches the requested 20px minimum between fields

