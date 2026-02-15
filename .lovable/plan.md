

## Fix: "More Sections" Panel Positioning and Section Label Display

### Problem 1: FloatingPanel appears off-screen on mobile

The "More Sections" panel uses a FloatingPanel with CSS `fixed` positioning. However, ancestor elements in the Editor (like the header's `backdrop-filter` via the `glass` class) can create a new containing block in some browsers, causing the `fixed` panel to behave like `absolute` -- rendering it at the bottom of the document rather than the bottom of the viewport.

**Fix**: Convert the mobile "More Sections" from FloatingPanel to a Sheet (bottom sheet), matching the exact pattern already used for the main section selector directly above it in StepperNav. Sheets use React portals, so they always render at the document root regardless of ancestor CSS properties. The desktop FloatingPanel remains unchanged.

### Problem 2: Added section name not reflected correctly

When the user taps "Awards" from the More panel, the editor sets `activeTab = 'more'`. The StepperNav mobile dropdown trigger displays the active step's label, which is `"More"` -- not `"Awards"`. The user expects to see the actual section name.

**Fix**: Pass the active sub-section ID from EditorPage to StepperNav as a new optional prop (`activeMoreSection`). StepperNav already has a `MORE_SECTIONS` array with label mappings. When `activeStep === 'more'` and an `activeMoreSection` is set, display that section's label (e.g., "Awards") and icon instead of generic "More".

### Changes

**File: `src/components/editor/StepperNav.tsx`**

1. Add optional prop `activeMoreSection?: string | null` to the interface.
2. Replace the mobile "More Sections" FloatingPanel (lines 170-198) with a Sheet, matching the existing section selector pattern (bottom sheet with grid of section buttons).
3. In the mobile dropdown trigger (line 85), when `activeStep === 'more'` and `activeMoreSection` is set, look up the label and icon from `MORE_SECTIONS` and display them instead of "More" / Plus icon.

**File: `src/pages/EditorPage.tsx`**

4. Pass `activeMoreSection={moreSubSection}` to the StepperNav component (line 876-884).

### What stays the same

- All section IDs, data structures, and handlers (`handleMoreSectionSelect`, `setMoreSubSection`, `onMoreSectionSelect`) remain untouched
- The desktop FloatingPanel for "More Sections" is not changed
- No business logic or save/navigation behavior is modified
- The `MORE_SECTIONS` array and its labels are reused as-is
