

# Fix Static EditorDemo Animation

## Root Cause

In `src/components/landing/EditorDemo.tsx`, every animation `useEffect` guards with `if (!inView) return;` but **none of them list `inView` in their dependency array**:

- Line 57: `[phase, typed, prefersReducedMotion]` -- missing `inView`
- Line 64: `[phase, prefersReducedMotion]` -- missing `inView`
- Line 71: `[phase, prefersReducedMotion]` -- missing `inView`
- Line 92: `[phase, prefersReducedMotion]` -- missing `inView`
- Line 99: `[phase, startLoop, prefersReducedMotion]` -- missing `inView`

When the component first renders, `inView` is `false`, so all effects return early. When `inView` later becomes `true` (user scrolls down), React doesn't re-run those effects because `inView` isn't a dependency. The animation never starts.

## Fix

Add `inView` to the dependency array of all 5 animation effects (lines 57, 64, 71, 92, 99).

## Changes

| File | What |
|------|------|
| `src/components/landing/EditorDemo.tsx` | Add `inView` to dependency arrays on lines 57, 64, 71, 92, 99 |

No new files. No new dependencies. No database changes.

