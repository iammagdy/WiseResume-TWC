
# Fix: Page Break Indicator and PDF Export Mismatch

## Problem Identified

Looking at your screenshots:
- **Live Preview (dark mode)**: "Page 1 ends" indicator appears AFTER "Customer Care Supervisor / Etisalat Emirates"
- **Exported PDF (light mode)**: Page cuts BEFORE that entry, with "Corporate Mobility Operations Coordinator" text truncated/partially visible

The root cause is that the `PageBreakIndicator` and `generatePDF` function calculate break positions using **different element dimensions**.

### Why This Happens

```
┌──────────────────────────────────────────────────────────────┐
│  PageBreakIndicator                  generatePDF             │
│  ─────────────────                   ───────────             │
│  Uses: containerDimensions           Uses: getBoundingClientRect │
│        from ResizeObserver                  + scrollHeight    │
│                                                               │
│  containerWidth: 360px               sourceWidth: 612px      │
│  containerHeight: 1200px             totalHeight: 1400px     │
│                                                               │
│  Result: Different scale factors → Different break positions │
└──────────────────────────────────────────────────────────────┘
```

On mobile:
1. The preview element is responsive and may be narrower than 612px
2. ResizeObserver captures `offsetWidth` and `offsetHeight`
3. PDF generator captures potentially different `scrollHeight` and uses the template's render dimensions
4. The `findSmartBreakPositions()` function returns different results for each

---

## Solution

Ensure both the indicator and PDF generator use **the exact same dimensions source** - the actual template element's properties. 

### Key Changes

1. **`PageBreakIndicator.tsx`**: Instead of accepting separate `containerWidth`/`containerHeight` props, use the `templateRef` directly to measure dimensions (consistent with PDF generator)

2. **`PreviewPage.tsx`**: Remove the dimension tracking via ResizeObserver, since the indicator will measure directly from the template ref

3. **Add a dependency trigger**: Re-calculate breaks when the template content changes

### Before vs After

**Before (dimensions mismatch):**
```
PageBreakIndicator:
  scaleFactor = PAGE_WIDTH / containerWidth  (360px on mobile)
  sourceHeightPerPage = PAGE_HEIGHT / scaleFactor
  → Calculates breaks based on mobile preview width

generatePDF:
  scaleFactor = PAGE_WIDTH / sourceElement.offsetWidth (612px)
  sourceHeightPerPage = PAGE_HEIGHT / scaleFactor
  → Calculates breaks based on actual template width
```

**After (unified dimensions):**
```
Both use:
  scaleFactor = PAGE_WIDTH / templateElement.offsetWidth
  sourceHeightPerPage = PAGE_HEIGHT / scaleFactor
  totalHeight = templateElement.scrollHeight
  → Same break positions
```

---

## Technical Implementation

### File: `src/components/editor/PageBreakIndicator.tsx`

Change the component to directly read dimensions from the template ref:

```typescript
export function PageBreakIndicator({ 
  templateRef,
  manualBreakSections,
  className 
}: PageBreakIndicatorProps) {
  const [breaks, setBreaks] = useState<number[]>([]);

  useEffect(() => {
    const element = templateRef?.current;
    if (!element) return;

    const calculateBreaks = () => {
      // Use the SAME dimension logic as generatePDF
      const containerWidth = element.offsetWidth || PAGE_WIDTH;
      const containerHeight = element.scrollHeight || element.offsetHeight || PAGE_HEIGHT;
      
      const scaleFactor = PAGE_WIDTH / containerWidth;
      const sourceHeightPerPage = PAGE_HEIGHT / scaleFactor;

      const newBreaks = findSmartBreakPositions(
        element,
        sourceHeightPerPage,
        containerHeight,
        manualBreakSections
      );
      
      setBreaks(newBreaks);
    };

    // Calculate initially
    calculateBreaks();

    // Re-calculate when content changes
    const observer = new ResizeObserver(calculateBreaks);
    observer.observe(element);

    return () => observer.disconnect();
  }, [templateRef, manualBreakSections]);

  // ... rest of render
}
```

### File: `src/pages/PreviewPage.tsx`

Remove the separate dimension tracking:

```typescript
// REMOVE this state and effect:
// const [containerDimensions, setContainerDimensions] = useState(...)
// useEffect(() => { ... ResizeObserver ... }, []);

// SIMPLIFY the PageBreakIndicator usage:
<PageBreakIndicator
  templateRef={resumeRef}
  manualBreakSections={manualBreakSections}
/>
```

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/components/editor/PageBreakIndicator.tsx` | Remove `containerWidth`/`containerHeight` props, measure directly from `templateRef` using same logic as PDF generator |
| `src/pages/PreviewPage.tsx` | Remove dimension tracking state and effect, simplify PageBreakIndicator props |

---

## Visual Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         BEFORE (Bug)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Mobile Preview                    PDF Export                  │
│   ┌──────────────┐                  ┌──────────────┐           │
│   │ Experience   │                  │ Experience   │           │
│   │ Job 1        │                  │ Job 1        │           │
│   │ Job 2        │                  │ Job 2        │           │
│   │ Job 3        │                  │ Job 3 [CUT]  │ ← Wrong!  │
│   │──Page Break──│ ← Shows here    ├──────────────┤           │
│   │ Job 4        │                  │ Job 4        │           │
│   │ Education    │                  │ Education    │           │
│   └──────────────┘                  └──────────────┘           │
│                                                                 │
│   Different scale                   Different scale             │
│   factors used!                     factors used!               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         AFTER (Fixed)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Mobile Preview                    PDF Export                  │
│   ┌──────────────┐                  ┌──────────────┐           │
│   │ Experience   │                  │ Experience   │           │
│   │ Job 1        │                  │ Job 1        │           │
│   │ Job 2        │                  │ Job 2        │           │
│   │ Job 3        │                  │ Job 3        │           │
│   │──Page Break──│ ← Shows here    ├──────────────┤ ← Matches! │
│   │ Job 4        │                  │ Job 4        │           │
│   │ Education    │                  │ Education    │           │
│   └──────────────┘                  └──────────────┘           │
│                                                                 │
│   Same dimensions                   Same dimensions             │
│   from templateRef!                 from templateRef!           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mobile Considerations

This fix ensures:
1. Works on all screen sizes (phone, tablet, desktop)
2. Works with all 7 resume templates
3. WYSIWYG: What you see in preview is exactly what you get in PDF
4. Manual and auto page break modes both work correctly
