

# Fix Tab Navigation Clipping on Mobile

## Problem

The first tab "Contact" is being clipped to show only "ontact" in the mobile view. This is happening because:

1. The `px-4` padding on a horizontally scrollable container doesn't prevent content from being clipped at the scroll boundary
2. When `overflow-x-auto` is applied, the scroll container starts at the first element, ignoring the padding
3. The base `TabsList` component uses `inline-flex` which conflicts with our `w-full` override

## Root Cause

CSS padding on a scrollable container affects the total scrollable width but doesn't prevent the first/last items from being flush with the viewport edge when scrolled to their position.

## Solution

Wrap the `TabsList` in a container div that provides the outer padding, and let the `TabsList` scroll edge-to-edge within that container. Then use `scroll-padding` or pseudo-element spacers to ensure proper inset.

### Approach: Use a wrapper with padding + internal spacers

1. Create a wrapper div with `overflow-x-auto` and the scroll styling
2. Move the `TabsList` inside without horizontal padding
3. Add spacer pseudo-elements or margin to the first/last tab triggers

### File Changes

**`src/pages/EditorPage.tsx`**

Current structure:
```tsx
<TabsList className="mt-3 w-full flex overflow-x-auto h-auto p-1 gap-1 scrollbar-hide px-4">
  <TabsTrigger>Contact</TabsTrigger>
  ...
</TabsList>
```

New structure:
```tsx
<div className="mt-3 overflow-x-auto scrollbar-hide" style={{ scrollPaddingLeft: '16px', scrollPaddingRight: '16px' }}>
  <TabsList className="w-max inline-flex h-auto p-1 gap-1 mx-4">
    <TabsTrigger>Contact</TabsTrigger>
    ...
  </TabsList>
</div>
```

Key changes:
- Outer `div` handles the horizontal scroll with `overflow-x-auto` and `scrollbar-hide`
- `TabsList` uses `w-max` to size to content width and `inline-flex` (base behavior)
- `mx-4` on `TabsList` provides left/right margin within the scrollable area
- This ensures the first tab starts 16px from the left edge and isn't clipped

### Why This Works

The `mx-4` (margin) on the `TabsList` creates space within the scrollable container that's part of the scrollable content width. Unlike padding on the scroll container itself, margin on the inner content ensures the first/last items have breathing room that's included in the scroll range.

## Expected Result

- "Contact" tab fully visible without clipping
- All tabs scrollable with proper spacing on both edges
- Tab triggers maintain their current styling and interaction

