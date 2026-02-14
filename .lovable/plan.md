

## Fix: Remove Radix Tooltip from Editor Page (Maximum Update Depth)

### Root Cause

The "Maximum update depth exceeded" crash is caused by the Radix UI `Tooltip` component wrapping the "Wise AI" button in the editor header (lines 475-494 of EditorPage.tsx). Radix Tooltip uses a Popper component internally, and its `composeRefs` utility creates an infinite `setRef` loop during render.

The project's own architecture notes explicitly state: "The editor page specifically avoids Radix UI Popper components." This Tooltip violates that rule.

### Fix (1 file)

**File: `src/pages/EditorPage.tsx`**

Replace the `TooltipProvider > Tooltip > TooltipTrigger > button` wrapper (lines 475-494) with just the plain `<button>` element. The button already has an `aria-label` for accessibility, so the tooltip is redundant.

Before:
```tsx
<TooltipProvider delayDuration={300}>
  <Tooltip>
    <TooltipTrigger asChild>
      <button onClick={...} className="..." aria-label="Open Wise AI">
        ...
      </button>
    </TooltipTrigger>
    <TooltipContent side="bottom">
      Click for AI assistance
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

After:
```tsx
<button onClick={...} className="..." aria-label="Open Wise AI">
  ...
</button>
```

This also allows removing the `Tooltip`, `TooltipTrigger`, `TooltipContent`, and `TooltipProvider` imports from line 4 (if not used elsewhere in the file -- they are not).

### Why This Works

- Removes the only Radix Popper component from the editor page, eliminating the infinite `setRef` recursion
- The button already has `aria-label="Open Wise AI"` for accessibility
- On mobile (the primary target), tooltips are not useful anyway since there is no hover
- Aligns with the documented architectural decision to avoid Popper components in the editor

