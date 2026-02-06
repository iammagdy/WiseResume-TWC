

# Fix Mobile Home Page UI Issues

## Problem Analysis

Based on the screenshot, the home page has several layout issues on mobile:

1. **Double Nested Grid Bug**: The AI Actions section has a redundant nested grid structure causing cards to display incorrectly
2. **Logo Not Centered**: The AppLogo component centers itself, but the header container doesn't center it in the viewport
3. **Poor Spacing**: Sections feel cramped with inconsistent vertical rhythm
4. **Card Layout Issues**: Action cards appear squeezed with truncated text

## Root Cause

In `src/pages/Index.tsx` lines 133-150:
```tsx
<div className="grid grid-cols-2 gap-3">  {/* Outer grid */}
  <Suspense fallback={<ActionCardsGridSkeleton />}>
    <div className="grid grid-cols-2 gap-3">  {/* DUPLICATE inner grid! */}
      <ActionCard ... />
      <ActionCard ... />
    </div>
  </Suspense>
</div>
```

This creates a 2-column grid where the first column contains another 2-column grid, resulting in cards being squashed into 25% of the available width instead of 50%.

## Solution

### 1. Fix Double Nested Grid

Remove the outer `grid grid-cols-2 gap-3` wrapper since the inner div already handles the grid layout.

**Before:**
```tsx
<div className="grid grid-cols-2 gap-3">
  <Suspense fallback={<ActionCardsGridSkeleton />}>
    <div className="grid grid-cols-2 gap-3">
      <ActionCard ... />
      <ActionCard ... />
    </div>
  </Suspense>
</div>
```

**After:**
```tsx
<Suspense fallback={<ActionCardsGridSkeleton />}>
  <div className="grid grid-cols-2 gap-3">
    <ActionCard ... />
    <ActionCard ... />
  </div>
</Suspense>
```

### 2. Center the Logo

Update the header to center the AppLogo properly:

**Before:**
```tsx
<header className="pt-safe pt-6 pb-4 px-4">
  <AppLogo size="md" />
</header>
```

**After:**
```tsx
<header className="pt-safe pt-6 pb-6 px-4 flex flex-col items-center">
  <AppLogo size="md" />
</header>
```

### 3. Improve Section Spacing

Add better vertical rhythm with increased margins and padding:
- Increase header bottom padding from `pb-4` to `pb-6`
- Use consistent `mb-8` for section spacing
- Add subtle visual separation between sections

### 4. Improve Action Card Layout

Update the ActionCard title to use "Tailor Resume" instead of just "Tailor" for clarity (already correct in the code, issue was the grid)

## Files to Modify

### `src/pages/Index.tsx`

1. Remove duplicate grid wrapper around ActionCards (lines 133 and 150)
2. Center the logo in the header
3. Improve section spacing
4. Simplify the Suspense structure for action cards

## Expected Result

- Action cards display side-by-side at proper 50% width each
- Description text fully visible without truncation
- Logo centered at top of page
- Consistent spacing throughout the dashboard
- Clean, professional mobile layout

