
# Smart Page Breaks - Avoid Cutting Through Content

## Problem

The PDF export cuts through content blocks (job entries, education items, skill sections) because it slices at fixed pixel intervals without considering the actual content structure.

**Current behavior:**
```
Page 1: Header + Summary + Experience (cut mid-job-entry) ✗
Page 2: ...rest of job entry (awkward continuation) ✗
```

**Desired behavior:**
```
Page 1: Header + Summary + Complete job entries that fit ✓
Page 2: Next complete job entries (clean break) ✓
```

## Solution Approach

Implement **content-aware page breaking** that:
1. Identifies all "unbreakable" content blocks in the resume
2. Calculates where fixed breaks would naturally fall
3. Adjusts break positions to occur between blocks, not through them

## Technical Implementation

### Strategy: DOM-based Block Detection

Before capturing with html2canvas, scan the template for content blocks and their positions:

```typescript
// Find all unbreakable sections
const blocks = sourceElement.querySelectorAll('[data-break-avoid], section, .experience-item, .education-item');

// Get their bounding boxes relative to the template
blocks.forEach(block => {
  const rect = block.getBoundingClientRect();
  // Store top/bottom positions
});
```

### Algorithm: Smart Break Positioning

```
For each natural page break position:
  1. Find all content blocks that span across the break
  2. If a block is being cut:
     a. Option A: Move break UP to just before the block starts
     b. Option B: Move break DOWN to just after the block ends
  3. Choose the option that wastes less space
  4. Ensure minimum content per page (avoid nearly-empty pages)
```

### Visual Diagram

```
┌─────────────────────────────┐
│ Header                      │
│ Summary                     │
│ ─────────────────────────── │
│ Job 1 - Position            │
│   Company, Dates            │
│   Description...            │
│ ─────────────────────────── │
│ Job 2 - Position            │  ← Natural break falls HERE (mid-job)
│   Company, Dates            │
│   Description...            │
├─────────────────────────────┤
│ Job 3 - Position            │
└─────────────────────────────┘

        ↓ SMART ADJUSTMENT ↓

┌─────────────────────────────┐
│ Header                      │
│ Summary                     │
│ ─────────────────────────── │
│ Job 1 - Position            │
│   Company, Dates            │
│   Description...            │
├─────────────────────────────┤  ← Break moved UP (before Job 2)
│ Job 2 - Position            │
│   Company, Dates            │
│   Description...            │
│ ─────────────────────────── │
│ Job 3 - Position            │
└─────────────────────────────┘
```

## File Changes

| File | Action | Changes |
|------|---------|---------|
| `src/lib/pdfGenerator.ts` | Modify | Add smart break detection algorithm, adjust page slicing |
| `src/components/templates/*.tsx` | Modify | Add `data-break-avoid` attributes to unbreakable sections |
| `src/components/editor/PageBreakIndicator.tsx` | Modify | Show smart break positions instead of fixed intervals |

## Detailed Implementation

### 1. Template Markup (All Templates)

Add `data-break-avoid` to content blocks that shouldn't be split:

```tsx
// Experience item
<div key={exp.id} data-break-avoid className="...">
  <h3>{exp.position}</h3>
  <p>{exp.company}</p>
  <p>{exp.description}</p>
</div>

// Education item  
<div key={edu.id} data-break-avoid className="...">
  <h3>{edu.degree}</h3>
  <p>{edu.institution}</p>
</div>

// Section headers (keep with first item)
<section data-break-avoid className="mb-6">
  <h2>Experience</h2>
  {/* first experience item inline or grouped */}
</section>
```

### 2. Smart Break Calculator (pdfGenerator.ts)

```typescript
interface ContentBlock {
  top: number;
  bottom: number;
  element: HTMLElement;
}

function findSmartBreakPositions(
  sourceElement: HTMLElement,
  sourceHeightPerPage: number,
  totalHeight: number
): number[] {
  // 1. Get all unbreakable blocks
  const blockElements = sourceElement.querySelectorAll('[data-break-avoid]');
  const blocks: ContentBlock[] = [];
  
  const containerRect = sourceElement.getBoundingClientRect();
  
  blockElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    blocks.push({
      top: rect.top - containerRect.top,
      bottom: rect.bottom - containerRect.top,
      element: el as HTMLElement,
    });
  });
  
  // 2. Calculate natural break positions
  const naturalBreaks: number[] = [];
  let pos = sourceHeightPerPage;
  while (pos < totalHeight) {
    naturalBreaks.push(pos);
    pos += sourceHeightPerPage;
  }
  
  // 3. Adjust each break to avoid cutting blocks
  const smartBreaks: number[] = [];
  let cumulativeOffset = 0;
  
  for (const naturalBreak of naturalBreaks) {
    const adjustedBreak = naturalBreak + cumulativeOffset;
    
    // Find block being cut by this break
    const cuttingBlock = blocks.find(
      b => b.top < adjustedBreak && b.bottom > adjustedBreak
    );
    
    if (cuttingBlock) {
      // Option A: Break before block
      const breakBefore = cuttingBlock.top - 8; // 8px padding
      const wastedSpaceBefore = adjustedBreak - breakBefore;
      
      // Option B: Break after block  
      const breakAfter = cuttingBlock.bottom + 8;
      const extraContentAfter = breakAfter - adjustedBreak;
      
      // Choose option that wastes less space (with limit)
      const maxWaste = sourceHeightPerPage * 0.25; // Max 25% waste
      
      if (wastedSpaceBefore <= extraContentAfter && wastedSpaceBefore < maxWaste) {
        smartBreaks.push(breakBefore);
        cumulativeOffset += (breakBefore - adjustedBreak);
      } else if (extraContentAfter < maxWaste) {
        smartBreaks.push(breakAfter);
        cumulativeOffset += (breakAfter - adjustedBreak);
      } else {
        // Block is too large, must cut through it
        smartBreaks.push(adjustedBreak);
      }
    } else {
      smartBreaks.push(adjustedBreak);
    }
  }
  
  return smartBreaks;
}
```

### 3. Updated PDF Generation Flow

```typescript
export async function generatePDF(...) {
  // ... existing setup ...
  
  // Calculate smart break positions
  const smartBreaks = findSmartBreakPositions(
    sourceElement, 
    sourceHeightPerPage, 
    totalHeight
  );
  
  // Number of pages based on smart breaks
  const numPages = smartBreaks.length + 1;
  
  // Process pages using smart break positions
  for (let pageNum = 0; pageNum < numPages; pageNum++) {
    const pageStart = pageNum === 0 ? 0 : smartBreaks[pageNum - 1];
    const pageEnd = pageNum === numPages - 1 ? totalHeight : smartBreaks[pageNum];
    const pageHeight = pageEnd - pageStart;
    
    // Slice canvas from pageStart to pageEnd
    // ... rest of existing logic with variable page heights ...
  }
}
```

### 4. Update PageBreakIndicator

Pass smart break positions instead of calculating fixed ones:

```typescript
// Option A: Calculate in indicator (simpler)
export function PageBreakIndicator({ 
  containerWidth, 
  containerHeight,
  templateRef,  // NEW: ref to template element
  className 
}: PageBreakIndicatorProps) {
  const breaks = useMemo(() => {
    if (!templateRef?.current) {
      // Fallback to fixed breaks
      return calculateFixedBreaks(containerWidth, containerHeight);
    }
    return findSmartBreakPositions(templateRef.current, ...);
  }, [templateRef, containerWidth, containerHeight]);
  
  // ... render breaks ...
}
```

## Templates to Update

All 7 templates need `data-break-avoid` attributes:

1. **ModernTemplate.tsx** - Experience items, education items, skills section
2. **ClassicTemplate.tsx** - Same pattern
3. **MinimalTemplate.tsx** - Same pattern
4. **ProfessionalTemplate.tsx** - Same pattern
5. **DeveloperTemplate.tsx** - Same pattern
6. **CreativeTemplate.tsx** - Same pattern
7. **ExecutiveTemplate.tsx** - Same pattern

## Edge Cases Handled

1. **Block larger than page height**: Accept the cut (can't avoid)
2. **Nearly empty pages**: Set minimum content threshold (e.g., 20%)
3. **Section headers**: Group header with first item to avoid orphaned headers
4. **Cascading adjustments**: Each break adjustment affects subsequent breaks

## Testing Plan

1. Create resume with many experience entries spanning 2-3 pages
2. Verify page break indicators show smart positions
3. Download PDF and confirm no content is cut mid-block
4. Test with different templates
5. Test edge case: single very long entry that can't avoid being cut

## Summary

- Add `data-break-avoid` markers to template content blocks
- Implement smart break algorithm that scans DOM for block boundaries
- Adjust page slices to break between content, not through it
- Update PageBreakIndicator to show accurate smart positions
