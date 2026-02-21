
# Fix Mobile Editor Layout -- More Space for Editing

## Problem

The mobile editor stacks 6 layers of UI chrome before the user can see any form fields:

1. Header (back, resume name, Template, Chat) -- ~56px
2. Progress bar + save status -- ~48px
3. StepperNav dropdown (Contact, 0 of 5 complete) -- ~72px
4. "+ More Sections" button -- ~52px
5. Editor / Preview / ATS View tabs -- ~48px
6. Bottom action bar (Download PDF, Preview) -- ~56px

That is roughly 330px of chrome on a 667px screen, leaving only ~337px for the actual editing form -- and the form starts below the fold.

## Solution

Consolidate the chrome layers to maximize editing space:

### 1. Merge StepperNav into the tab bar
Remove the separate StepperNav dropdown and the separate Editor/Preview/ATS tabs on mobile. Instead, make the section stepper itself the primary navigation inside the editor tab. The Editor/Preview/ATS tabs move up to replace the section picker.

### 2. Inline section stepper as a horizontal scrollable pill bar
Replace the tall dropdown StepperNav on mobile with a compact horizontal scrollable row of section pills (Contact, Summary, Experience, Education, Skills, +More). This saves ~40px vs the dropdown and feels more native.

### 3. Remove redundant "+ More Sections" button
The "More Sections" button is redundant with the "+" pill in the stepper bar and the FAB. Remove the standalone button to reclaim ~52px.

### 4. Compact the progress bar
Merge the save status into the header row (next to the resume title), removing the dedicated progress bar row. Show only the percentage inline.

### 5. Make bottom action bar slimmer
Reduce the Download PDF / Preview bottom bar to a single-row icon bar (40px height instead of current ~56px).

## Technical Changes

### File: `src/components/editor/StepperNav.tsx`
- Add a new mobile layout: horizontal scrollable pill bar instead of the dropdown trigger + bottom sheet
- Each pill shows the section icon + short label (e.g., "Contact", "Summary")
- Active pill gets primary accent; completed pills get a check icon
- "+" pill at the end opens the More Sections sheet
- Approximate height: 44px (down from 72px + 52px = 124px)

### File: `src/pages/EditorPage.tsx`
- Remove the separate `Editor / Preview / ATS View` TabsList from the mobile layout
- Move the editor/preview/ATS switching to the header area (small toggle icons)
- Merge save status into the header row next to the resume title
- Remove the standalone "More Sections" rendering below StepperNav
- Compact the progress bar section -- show only the colored bar, remove the expandable details on mobile
- Reduce bottom action bar padding and height

### File: `src/components/editor/ProgressBar.tsx` (if needed)
- Ensure the compact variant is truly minimal (just the colored bar, no text)

## Expected Result

Before: ~330px of chrome, ~337px of editing space
After: ~180px of chrome, ~487px of editing space (~45% more editing room)

The user will immediately see the Contact form fields (Full Name, Email, Phone, etc.) without scrolling.

## Summary

| Change | File | Impact |
|--------|------|--------|
| Horizontal scrollable section pills | `StepperNav.tsx` | Saves ~80px |
| Remove separate Editor/Preview/ATS tabs | `EditorPage.tsx` | Saves ~48px |
| Merge save status into header | `EditorPage.tsx` | Saves ~24px |
| Compact bottom action bar | `EditorPage.tsx` | Saves ~16px |
| Remove standalone More Sections btn | `EditorPage.tsx` | Included above |

No database changes. No new dependencies.
