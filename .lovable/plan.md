

## Fix: Editor Infinite Reload Loop and White Bar

### Root Cause (confirmed via live browser reproduction)

The "Loading..." spinner the user sees is NOT a React component -- it's the raw HTML embedded in `index.html` (line 38-44). This means **a full page hard reload** is happening. The ONLY code that calls `window.location.reload()` is in `src/lib/lazyWithRetry.ts` (line 9):

```ts
// If lazy chunk fails twice, reload the entire page
window.location.reload();
```

On a mobile network (user is on "Comet" browser), chunk loading can fail intermittently. When it does:
1. First attempt fails -- retry after 1 second
2. Second attempt fails -- `window.location.reload()`
3. Page reloads, tries to load chunk again -- fails again
4. Infinite reload loop

The "white bar" is caused by AppShell applying `pb-20` (80px bottom padding) during skeleton states before the BottomTabBar renders.

### Changes

**File 1: `src/lib/lazyWithRetry.ts`**
- Remove `window.location.reload()` entirely
- Instead, after 2 failed attempts, let the error propagate naturally to the ErrorBoundary
- The ErrorBoundary already handles chunk errors gracefully with a "Try Again" button
- This breaks the infinite reload loop permanently

```ts
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch(() => {
      // Retry once after 1 second
      return new Promise<{ default: T }>((resolve, reject) =>
        setTimeout(() => factory().then(resolve).catch(reject), 1500)
      );
      // If retry also fails, let error propagate to ErrorBoundary
      // NEVER reload the page -- that causes infinite reload loops
    })
  );
}
```

**File 2: `src/components/layout/PageSkeletons.tsx` -- EditorSkeleton**
- Add `min-h-[100dvh]` and `bg-background` to the EditorSkeleton wrapper to eliminate the white bar during loading
- Ensure it fills the entire viewport with the correct dark background

**File 3: `src/components/ui/PageLoadingSpinner.tsx`**
- This is the Suspense fallback used for NotFound -- ensure it also has proper dark background (it already does, but verify)

### Why This Fixes Everything

- **No more reload loops**: The `lazyWithRetry` no longer calls `window.location.reload()`, so even if chunks fail on flaky mobile networks, the ErrorBoundary shows a user-friendly error with a manual "Try Again" button instead of silently reloading forever
- **No white bar**: The EditorSkeleton fills the full viewport with the dark background
- **Guard logic is preserved**: The existing guard logic in EditorPage is correct and doesn't need changes
- **ErrorBoundary already handles chunk errors**: It detects "dynamically imported module" and "Failed to fetch" errors (lines 34-36) and offers a retry button

### Files Changed
- `src/lib/lazyWithRetry.ts` (remove reload, simplify)
- `src/components/layout/PageSkeletons.tsx` (fix EditorSkeleton background)

