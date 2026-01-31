
# Visual Page Break Indicators for Resume Preview

## Overview

Add visual indicators in the preview to show users exactly where their resume content will be split across pages when exported to PDF. This helps users optimize their resume layout before downloading.

## Current State

- **PreviewPage**: Renders the resume template in a single scrollable container
- **PDF Generator**: Uses `sourceHeightPerPage = PAGE_HEIGHT / scaleFactor ≈ 782px` to determine page breaks
- **No visual feedback**: Users can't see where page breaks will occur until after PDF export

## Design Approach

Create a visual overlay system that shows dashed lines at each page boundary:

```
┌─────────────────────────────┐
│                             │
│   Resume Content Page 1     │
│                             │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤ ← "Page 1 ends here"
│                             │
│   Resume Content Page 2     │
│                             │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤ ← "Page 2 ends here"
│                             │
│   Remaining Content         │
│                             │
└─────────────────────────────┘
```

## Implementation Details

### New Component: `PageBreakIndicator.tsx`

Create a component that renders page break lines as an overlay:

**Props:**
- `containerHeight`: Total height of the resume container
- `pageHeight`: Height of one page (calculated from scale factor)

**Logic:**
```typescript
// Calculate page break positions
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const sourceWidth = containerRef.width || 612;
const scaleFactor = PAGE_WIDTH / sourceWidth;
const sourceHeightPerPage = PAGE_HEIGHT / scaleFactor;

// Generate break positions: 782px, 1564px, 2346px, etc.
const breaks = [];
let position = sourceHeightPerPage;
while (position < totalHeight) {
  breaks.push(position);
  position += sourceHeightPerPage;
}
```

**Rendering:**
- Absolute positioned dashed lines at each break point
- Semi-transparent background bar with "Page X ends here" label
- Subtle animation on scroll to draw attention

### File Changes

| File | Action | Changes |
|------|--------|---------|
| `src/components/editor/PageBreakIndicator.tsx` | Create | New component for page break overlays |
| `src/pages/PreviewPage.tsx` | Modify | Add PageBreakIndicator with ResizeObserver for dynamic height |

### PreviewPage Integration

1. **Track container dimensions** using a ResizeObserver to get real-time height
2. **Calculate page breaks** using the same formula as pdfGenerator.ts
3. **Render indicators** as absolute positioned elements inside the preview container
4. **Hide indicators during PDF generation** so they don't appear in the export

### Visual Design

**Page Break Line:**
```tsx
<div className="absolute left-0 right-0 flex items-center gap-2">
  <div className="flex-1 border-t-2 border-dashed border-orange-400/60" />
  <span className="px-2 py-0.5 text-xs text-orange-600 bg-orange-100 rounded-full">
    Page {pageNum} ends
  </span>
  <div className="flex-1 border-t-2 border-dashed border-orange-400/60" />
</div>
```

**Styling:**
- Orange/amber color to stand out from content without being intrusive
- Dashed border for "cut here" visual metaphor
- Small pill badge with page number
- Semi-transparent so content underneath is visible

### Calculations (matching pdfGenerator.ts)

```typescript
// Constants (same as PDF generator)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

// Calculate where breaks occur in the preview
function calculatePageBreaks(containerWidth: number, containerHeight: number) {
  const scaleFactor = PAGE_WIDTH / containerWidth;
  const sourceHeightPerPage = PAGE_HEIGHT / scaleFactor;
  
  const breaks: number[] = [];
  let position = sourceHeightPerPage;
  
  while (position < containerHeight) {
    breaks.push(position);
    position += sourceHeightPerPage;
  }
  
  return breaks;
}
```

### Hide During Export

Add a data attribute or class to hide indicators during PDF capture:

```tsx
<PageBreakIndicator 
  className="print:hidden [data-capturing='true']_&:hidden"
  breaks={pageBreaks} 
/>
```

In PreviewPage, set `data-capturing="true"` on the container before PDF generation.

## Summary of Changes

1. **Create PageBreakIndicator component** - Renders dashed lines with page labels
2. **Add ResizeObserver** - Track resume container height in real-time
3. **Calculate break positions** - Using same math as PDF generator
4. **Position absolutely** - Overlay on top of resume content
5. **Hide during export** - Ensure indicators don't appear in downloaded PDF
6. **Responsive to templates** - Recalculate when template changes or content updates
