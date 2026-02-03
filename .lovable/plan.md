

# Fix: Manual Page Breaks Not Reflecting in Live Preview

## Problem Identified

When users switch to manual mode and select sections to break after (e.g., "break after Experience"), the live preview:
1. **May not update immediately** - the page break lines don't refresh when settings change
2. **Doesn't show true page boundaries** - only shows dashed indicator lines, not a visual "this is page 1, this is page 2" separation

The user expects: when they set "break after Summary", the preview should clearly show that Summary ends Page 1, and Experience starts Page 2.

---

## Root Causes

### 1. Stale Reference in useEffect
The `PageBreakIndicator` component has this effect:
```typescript
useEffect(() => {
  // ... calculate breaks
}, [templateRef, manualBreakSections]);
```

The problem: `templateRef` is a stable `RefObject` - its identity never changes. The effect correctly depends on `manualBreakSections`, but the `ResizeObserver` may interfere with recalculation timing.

### 2. No Visual Page Separation in Preview
Currently, the preview shows:
- A dashed line with "Page 1 ends" label
- But content continues flowing below it

Users expect:
- A clear visual boundary showing "End of Page 1"
- A gap or separator before "Page 2" content
- Visual feedback that the break is being respected

### 3. Missing Dependency Trigger
The `ResizeObserver` callback (`calculateBreaks`) is created once and doesn't have access to the latest `manualBreakSections` due to closure capture.

---

## Solution

### 1. Fix useEffect Dependencies and Re-calculation
Add proper triggering when manual break sections change by:
- Creating a unique key based on `manualBreakSections`
- Using `useCallback` for the calculation function to ensure fresh closures

### 2. Add Visual Page Boundaries in Preview
Enhance the `PageBreakIndicator` to show:
- A more prominent visual separator for manual breaks
- "Page 1 ends here" with visual page boundary styling
- A subtle page number indicator for each page region

### 3. Immediate Recalculation on Settings Change
Ensure the observer callback always has access to current `manualBreakSections` by using refs or recreating the observer when settings change.

---

## Implementation Plan

### File: `src/components/editor/PageBreakIndicator.tsx`

**Changes:**
1. Use a `key` based on `manualBreakSections.join(',')` to force re-render when sections change
2. Wrap `calculateBreaks` in `useCallback` with proper dependencies
3. Recreate the `ResizeObserver` when `manualBreakSections` changes
4. Add enhanced visual styling for manual mode:
   - Solid divider line with gradient fade effect
   - "End of Page X" badge with page icon
   - Subtle page region background tint (optional)

```typescript
// Add a key trigger for manual break changes
const breakKey = useMemo(() => 
  manualBreakSections?.join(',') || 'auto', 
  [manualBreakSections]
);

useEffect(() => {
  const element = templateRef?.current;
  if (!element) return;

  const calculateBreaks = () => {
    // ... calculation logic using current manualBreakSections
  };

  calculateBreaks();
  
  const observer = new ResizeObserver(calculateBreaks);
  observer.observe(element);

  return () => observer.disconnect();
}, [templateRef, breakKey]); // Use breakKey instead of manualBreakSections directly
```

**Enhanced Visual for Manual Breaks:**
```tsx
{isManualMode && (
  <div className="absolute left-0 right-0 z-10" style={{ top: `${breakPosition}px` }}>
    {/* Page boundary line */}
    <div className="h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
    
    {/* Page end badge */}
    <div className="flex justify-center -mt-3">
      <span className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full shadow-lg">
        📄 Page {index + 1} ends here
      </span>
    </div>
    
    {/* Visual separator space */}
    <div className="h-4 bg-gradient-to-b from-blue-50/50 to-transparent" />
  </div>
)}
```

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/components/editor/PageBreakIndicator.tsx` | Fix useEffect closure, add visual page boundaries for manual mode |

---

## Technical Details

### The Closure Problem
```typescript
// BEFORE (problematic):
useEffect(() => {
  const calculateBreaks = () => {
    // Uses manualBreakSections from closure
    findSmartBreakPositions(..., manualBreakSections);
  };
  
  // Observer created once with stale closure
  const observer = new ResizeObserver(calculateBreaks);
}, [templateRef, manualBreakSections]); // manualBreakSections change doesn't recreate observer

// AFTER (fixed):
const breakKey = manualBreakSections?.join(',') || 'auto';

useEffect(() => {
  const calculateBreaks = () => {
    // Now uses fresh manualBreakSections because effect re-runs on breakKey change
    findSmartBreakPositions(..., manualBreakSections);
  };
  
  calculateBreaks(); // Immediate calculation
  
  const observer = new ResizeObserver(calculateBreaks);
  observer.observe(element);
  
  return () => observer.disconnect(); // Cleanup old observer
}, [templateRef, breakKey]); // breakKey changes → effect re-runs → new observer
```

---

## Expected Result

1. **Immediate feedback**: When user selects "break after Summary" in the sheet, the preview instantly shows the page break at the correct position
2. **Clear visual boundary**: Manual breaks show a prominent "Page 1 ends here" separator instead of just a dashed line
3. **WYSIWYG**: What users see in preview exactly matches what they get in the downloaded PDF
4. **Professional feel**: Visual page boundaries make the app feel like a premium document editor

