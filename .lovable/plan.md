
# Fix Critical UI Overlap Issues

## Problem Analysis

Based on the screenshot and code analysis, I identified a critical z-index stacking issue where the **AI Studio floating bar overlaps the "Preview & Export" button** on the Editor page.

### Root Cause
Looking at the code in `EditorPage.tsx`:

```text
Line 290-307: Bottom Action Bar with "Preview & Export" button
  - class: "shrink-0 p-4 glass border-t border-border z-30"
  - Position: Part of flex column (not fixed)

Line 309-319: AI Studio Bar (AIAssistantBar component)
  - Position: "fixed bottom-20 left-4 right-4 z-40"
  - This is AFTER the action bar in the DOM but uses fixed positioning
```

The AI Studio bar is positioned with `fixed bottom-20` (80px from bottom), but the "Preview & Export" button is a flex child at the bottom of the page. When the content is short or on certain screen sizes, the AI Studio bar overlaps the button.

### Additional Issues Found

1. **Editor page bottom padding**: The main content area doesn't account for the AI Studio bar height
2. **Z-index hierarchy**: The AI Studio bar (z-40) is higher than the action bar (z-30), causing it to visually overlap
3. **Missing safe spacing**: No dedicated space reserved for the floating AI bar

## Solution

Restructure the Editor page layout to properly stack all bottom elements:

1. **Move the AI Studio bar ABOVE the action bar** in the visual stack
2. **Add proper bottom padding** to account for both fixed elements
3. **Adjust the AI Studio bar positioning** to sit above the bottom action bar
4. **Ensure proper z-index hierarchy** across all fixed elements

## Technical Changes

### File: `src/pages/EditorPage.tsx`

**Change 1: Add margin/padding to content area**
The scrollable content area needs extra bottom padding to prevent content from being hidden behind the floating elements.

- Line 270: Change `pb-4` to `pb-48` (add ~192px bottom padding for AI bar + action bar)

**Change 2: Restructure bottom section layout**
Wrap both the action bar and AI Studio bar in a proper stacking container where:
- AI Studio bar sits at the top of this fixed footer area
- Action button sits below it
- Both are visible without overlap

New structure:
```text
<div className="shrink-0 z-40">
  <!-- AI Studio Bar (positioned relative, not fixed) -->
  <AIAssistantBar ... />
  
  <!-- Action Button -->
  <motion.div className="p-4 glass border-t">
    <Button>Preview & Export</Button>
  </motion.div>
</div>
```

### File: `src/components/editor/AIAssistantBar.tsx`

**Change: Remove fixed positioning**
Convert from `fixed bottom-20` to relative/static positioning so it flows naturally in the flex container.

- Line 87-90: Change from `fixed bottom-20 left-4 right-4 z-40` to relative positioning within the parent flex container

## Visual Result After Fix

```text
+---------------------------+
|      Header (sticky)      |
+---------------------------+
|     Progress Bar          |
+---------------------------+
|      Tab Bar              |
+---------------------------+
|                           |
|    Scrollable Content     |
|    (with extra padding)   |
|                           |
+---------------------------+
|  AI Studio Bar (glass)    |  <-- Now properly stacked
+---------------------------+
|  Preview & Export Button  |  <-- Fully visible below AI bar
+---------------------------+
|    Bottom Tab Bar         |
+---------------------------+
```

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/EditorPage.tsx` | Restructure bottom section, add proper padding |
| `src/components/editor/AIAssistantBar.tsx` | Change from fixed to relative positioning |

## Additional UI Polish

While fixing this issue, I'll also:

1. **Add subtle separator** between AI bar and action button
2. **Ensure touch targets remain 44px+** for accessibility
3. **Smooth the transition animation** when AI bar expands
4. **Test the layout** accounts for safe areas on notched devices

This fix ensures the UI elements stack correctly without overlap on all screen sizes.
