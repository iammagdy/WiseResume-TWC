

# Polished Skeleton Loading Across All Pages

## Current State

The app already has strong skeleton infrastructure:
- Route-level Suspense fallbacks for all tabbed pages using `PageSkeletons.tsx`
- Landing page lazy sections with `LandingSkeletons.tsx`
- Dashboard data loading uses `SkeletonCardList`
- Shimmer-based `Skeleton` component with smooth animation

## Gaps Found

| Page | Issue |
|------|-------|
| Settings | Uses plain "Loading..." text instead of `SettingsSkeleton` |
| Auth | `Suspense fallback={null}` -- no skeleton |
| NotFound | `Suspense fallback={null}` -- no skeleton |
| Preview template area | Lazy templates have no inline loading state |

## Changes

### 1. Fix SettingsPage loading state (src/pages/SettingsPage.tsx)

Replace the generic "Loading..." div (lines 173-179) with the existing `SettingsSkeleton` component that's already built but unused here.

```text
Before: <div className="animate-pulse text-muted-foreground">Loading...</div>
After:  <SettingsSkeleton /> (imported from PageSkeletons)
```

### 2. Add Auth page skeleton (src/components/layout/PageSkeletons.tsx)

Add an `AuthSkeleton` that mirrors the auth form layout -- back button, heading, two input fields, a button, social buttons, and toggle link.

### 3. Update App.tsx route fallbacks

- Auth route: change `fallback={null}` to `fallback={<AuthSkeleton />}`
- NotFound route: change `fallback={null}` to `fallback={<PageLoadingSpinner />}` (already exists, lightweight)

### 4. Add Preview template loading skeleton (src/pages/PreviewPage.tsx)

Wrap the lazy-loaded template rendering in a `Suspense` with a resume-shaped skeleton placeholder (A4-ratio card with shimmer) so users see a document outline while the template JS loads.

### 5. Add AuthSkeleton to PageSkeletons.tsx

New skeleton matching the auth page structure:
- Back arrow placeholder
- Title and subtitle placeholders
- Two input field placeholders
- Primary button placeholder
- Divider with "or" placeholder
- Two social button placeholders
- Toggle link placeholder

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| `src/pages/SettingsPage.tsx` | Import `SettingsSkeleton`, replace loading fallback |
| `src/components/layout/PageSkeletons.tsx` | Add `AuthSkeleton` export |
| `src/App.tsx` | Update Auth and NotFound Suspense fallbacks |
| `src/pages/PreviewPage.tsx` | Add Suspense wrapper around template render with skeleton |

All changes use existing patterns (CSS `animate-pulse`, `bg-muted` rounded divs) and existing components (`Skeleton`, `PageLoadingSpinner`) -- no new dependencies needed.

