

# Fix Settings Page Touch Scroll

## Root Cause

The SettingsPage has two nested flex containers:

```text
div.flex-1.flex-col.overflow-hidden     (line 309) -- has the fix
  div.flex-1.flex-col                   (line 310) -- MISSING overflow-hidden
    header (sticky)                     (line 312)
    div.overflow-y-auto.pb-24           (line 326) -- scroll container
```

Line 310's inner wrapper has `flex-1` but no height constraint (`overflow-hidden` or `min-h-0`). This means it can grow beyond its parent, so the `overflow-y-auto` on line 326 never actually clips -- the content just expands the container instead of scrolling. On touch devices, this makes the page feel completely unscrollable.

## Fix

Add `overflow-hidden` to line 310's inner div so the scroll container on line 326 is properly height-constrained.

```
Before: <div className="flex-1 flex flex-col">
After:  <div className="flex-1 flex flex-col overflow-hidden">
```

## What Changes

| File | Line | Change |
|---|---|---|
| `src/pages/SettingsPage.tsx` | 310 | Add `overflow-hidden` to inner wrapper div |

One class addition. No logic, props, hooks, or Supabase calls change.

## Why This Fixes It

With `overflow-hidden` on both the outer (309) and inner (310) wrappers, the flex layout properly constrains heights all the way down. The `overflow-y-auto` div on line 326 becomes the sole scroll target, and touch gestures work as expected.

