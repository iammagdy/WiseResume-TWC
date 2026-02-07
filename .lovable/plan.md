

# Fix Page Break Feature: Smart Detection + Section-Based Manual Selection

## Problem Summary

The current page break feature has several issues:

1. **Shows on Single-Page CVs**: The indicator displays even when the CV content fits on one page
2. **Poor Multi-Page Detection**: The automatic break detection doesn't work reliably
3. **Truncated Content in Manual Mode**: When using manual selection, content appears cut off
4. **Confusing Manual UI**: The PageBreakSheet shows checkboxes for sections but doesn't clearly visualize where breaks will occur

---

## Root Cause Analysis

After reviewing the code, I identified these specific problems:

### Issue 1: Single-Page CVs Still Show Breaks
The `PageBreakIndicator` component calculates breaks based on `sourceHeightPerPage` but doesn't check if the **total content height is less than one page**. If `breaks.length === 0`, it correctly hides, but the calculation can produce false positives due to margin/padding measurements.

### Issue 2: Detection Accuracy
The `findSmartBreakPositions` function in `pdfGenerator.ts` uses DOM measurements that can be affected by:
- CSS transforms/animations during preview
- Margin collapsing differences between browser and calculation
- The `ResizeObserver` in `PageBreakIndicator` may fire before layout is stable

### Issue 3: Manual Mode UX
The `PageBreakSheet` component shows a simple checkbox list of sections. Users don't see:
- A visual preview of where breaks will actually occur
- Which page number each section will appear on
- Clear feedback about their selections

---

## Solution Design

### Fix 1: Add Single-Page Detection Guard

Add explicit check to hide page break indicators when content fits on one page:

```typescript
// In PageBreakIndicator.tsx
const calculateBreaks = () => {
  const containerHeight = element.scrollHeight || element.offsetHeight;
  const scaleFactor = PAGE_WIDTH / containerWidth;
  const sourceHeightPerPage = PRINTABLE_HEIGHT / scaleFactor;
  
  // NEW: Don't show any breaks if content fits on one page
  if (containerHeight <= sourceHeightPerPage) {
    setBreaks([]);
    return;
  }
  
  // Continue with existing break calculation...
};
```

### Fix 2: Improve Break Calculation Accuracy

Stabilize measurements by:
1. Adding debounce to ResizeObserver callback
2. Using `requestAnimationFrame` to ensure layout is complete
3. Adding small buffer (5%) to single-page threshold

### Fix 3: Enhanced Manual Selection UI

Redesign `PageBreakSheet` to show:
1. **Visual Section List**: Each section shown as a card with its name and estimated page position
2. **Clear Break Visualization**: When a section is checked, show "Page 1 ends here" indicator between cards
3. **Live Page Count**: Display "Your resume will be X pages" based on selections

```text
┌────────────────────────────────────┐
│  Page Break Settings               │
│                                    │
│  Your resume will be: 2 pages      │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 📝 Summary          [Page 1] │  │
│  │    "Software engineer with..." │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 💼 Experience    ☑️ Break    │  │
│  │    3 positions               │  │
│  └──────────────────────────────┘  │
│  ⬇️ Page 1 ends here               │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 🎓 Education       [Page 2] │  │
│  │    2 degrees                 │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 🛠️ Skills          [Page 2] │  │
│  │    12 skills                 │  │
│  └──────────────────────────────┘  │
│                                    │
│  [Apply]                           │
└────────────────────────────────────┘
```

---

## Implementation Plan

### Step 1: Fix Single-Page Guard in PageBreakIndicator

**File: `src/components/editor/PageBreakIndicator.tsx`**

- Add explicit single-page height check before calculating breaks
- Add debounce to prevent excessive recalculations
- Use `requestAnimationFrame` for stable measurements
- Export `PRINTABLE_HEIGHT` and `PAGE_WIDTH` constants for reuse

### Step 2: Add Page Count Estimation Helper

**File: `src/lib/pdfGenerator.ts`**

Add new exported function:
```typescript
export function estimatePageCount(
  sourceElement: HTMLElement,
  manualBreakSections?: string[],
  templateConfig?: TemplateConfig
): number {
  // Returns estimated number of pages
  // For single-page templates, always returns 1
  // For others, calculates based on content height + manual breaks
}
```

### Step 3: Redesign PageBreakSheet with Visual Sections

**File: `src/components/editor/PageBreakSheet.tsx`**

Completely redesign the manual selection interface:

1. **Section Cards**: Show each CV section as a visual card with:
   - Icon based on section type
   - Section name
   - Brief content preview (e.g., "3 jobs listed")
   - Current page number indicator
   - Checkbox to add break after this section

2. **Live Preview**: When user toggles a break:
   - Show visual divider between cards
   - Update page numbers in real-time
   - Display total page count at top

3. **Smart Recommendations**: 
   - If resume is already 1 page, show message "Your resume fits on one page!"
   - If selecting too many breaks would create mostly empty pages, show warning

### Step 4: Add Section Content Preview Helper

**File: `src/lib/sectionHelpers.ts`** (new file)

Create helper functions:
```typescript
export function getSectionPreview(resume: ResumeData, sectionId: SectionId): string {
  // Returns brief description like "3 positions" or "12 skills"
}

export function getSectionIcon(sectionId: SectionId): string {
  // Returns emoji or icon name
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/editor/PageBreakIndicator.tsx` | Modify | Add single-page guard, debounce, stable measurements |
| `src/components/editor/PageBreakSheet.tsx` | Rewrite | New visual section-based UI with live page count |
| `src/lib/pdfGenerator.ts` | Modify | Add `estimatePageCount` export function |
| `src/lib/sectionHelpers.ts` | Create | Section preview and icon helpers |

---

## Technical Details

### Constants Alignment
Both `PageBreakIndicator` and `pdfGenerator` will use shared constants:
```typescript
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const FOOTER_RESERVED_PT = 44;
const PRINTABLE_HEIGHT = PAGE_HEIGHT - FOOTER_RESERVED_PT;
```

### Single-Page Detection Logic
```typescript
const isSinglePage = containerHeight <= sourceHeightPerPage * 1.05; // 5% buffer
if (isSinglePage && !manualBreakSections?.length) {
  setBreaks([]);
  return;
}
```

### Section Preview Data Structure
```typescript
interface SectionPreviewData {
  id: SectionId;
  name: string;
  icon: string;
  preview: string; // "3 positions", "12 skills", etc.
  hasBreakAfter: boolean;
  pageNumber: number;
}
```

---

## Expected User Experience After Fix

1. **Single-page CV**: No page break indicators shown at all
2. **Multi-page CV (Auto mode)**: Orange dashed lines show where automatic breaks occur
3. **Multi-page CV (Manual mode)**: 
   - User taps "Page breaks" button
   - Sheet shows visual list of all CV sections
   - Each section shows its name, content preview, and current page
   - User can toggle "break after" for any section
   - Page numbers update live as user makes selections
   - Blue break indicators shown between selected sections in preview

---

## Mobile UX Considerations

- Section cards will have 72px minimum height for touch targets
- `active:scale-[0.98]` feedback on toggle
- Smooth animation when break indicators appear/disappear
- `pb-safe` padding in sheet footer

