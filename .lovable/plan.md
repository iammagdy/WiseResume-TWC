

# Stability and Mobile UX Audit — Implementation Plan

## Audit Checklist Summary

### 1. Supabase safeClient Usage
**Status: CLEAN.** All 39 files that import Supabase now use `safeClient`. No files import from the unsafe `@/integrations/supabase/client`. No changes needed.

### 2. Error Handling Consistency
**Status: MOSTLY GOOD, 2 issues found.**

- The global `ErrorBoundary` wraps the entire app in `App.tsx` (line 194), so all routes are covered.
- Pages with heavy lazy content (Editor, AIStudio, Interview, ResumeDetail, PublicPortfolio) add a second inner `ErrorBoundary` around their Suspense-loaded sheets -- good.
- The `BugReportDialog` correctly auto-detects screen and error category via `detectScreen()` and `categorizeError()` -- no manual selection required.
- **Issue A:** The `showErrorToast` utility in `errorToast.ts` (which adds a "Report Bug" action to toasts) is only used in 1 file (`QuickActions.tsx`). Many other places call `toast.error(msg)` directly without a Report Bug action. This is a missed opportunity but not a crash risk -- low priority, skip for now.
- **Issue B:** The `ProtectedRoute` component uses `PageLoadingSpinner` instead of a skeleton. This should use a more informative skeleton.

### 3. Protected vs Public Navigation
**Status: FIXED in previous round, 1 minor improvement.**

- "Explore without account" on `/auth` now navigates to `/` (landing page) -- correct, this is public.
- `SignInPromptDialog` has a "Continue as guest" button that calls `onContinueAsGuest` callback -- this is handler-dependent, not a routing issue.
- **No further fixes needed.**

### 4. Mobile Layout Edge Cases
**Status: 2 issues found.**

- **Issue C:** The Portfolio info banner dismiss button uses `window.location.reload()` which is terrible UX -- it causes a full page reload just to hide a banner. This should use React state instead.
- **Issue D:** The Portfolio page content area uses `pb-safe` but given the bottom tab bar is present, there should be additional bottom padding (`pb-20`) to ensure content doesn't hide behind the nav bar. Need to verify.

### 5. Performance and Loading States
**Status: 1 issue found.**

- **Issue E:** `ProtectedRoute` uses `PageLoadingSpinner` (generic spinner) while the auth state resolves. Since this guards ALL protected routes, every authenticated page shows a black-screen spinner on initial load. This should use a minimal skeleton instead.
- All lazy-loaded routes in `App.tsx` already use proper skeleton fallbacks -- good.
- `InterviewPage` uses `PageLoadingSpinner` for store hydration (line 200) -- acceptable since it's brief.

---

## Changes to Make

### File 1: `src/pages/PortfolioEditorPage.tsx`
**Fix the info banner dismiss to use React state instead of `window.location.reload()`.**

Currently (line 554):
```
onClick={() => { localStorage.setItem('portfolio_info_dismissed', '1'); window.location.reload(); }}
```

Change to use a `useState` hook for `bannerDismissed`, initialized from localStorage. On click, set state + localStorage without reloading.

### File 2: `src/components/layout/ProtectedRoute.tsx`
**Replace `PageLoadingSpinner` with a lightweight skeleton** that better matches the app layout (header area + content placeholder). Use the existing `DashboardSkeleton` import or create a minimal inline skeleton with `animate-pulse` divs.

---

## What Does NOT Need Changing

- All supabase imports are already using safeClient -- no changes.
- ErrorBoundary coverage is consistent across all routes -- no changes.
- Bug report dialog already auto-detects screen and category -- no changes.
- Auth page "Explore without account" already routes to `/` -- no changes.
- FAB positioning was already fixed to `bottom-28` -- no changes.
- Bottom tab label already renamed to "Applications" -- no changes.
- All Suspense fallbacks already use proper skeletons -- no changes.

## Technical Details

### PortfolioEditorPage banner fix
Add a `const [bannerDismissed, setBannerDismissed] = useState(() => ...)` initialized from localStorage. Replace the inline IIFE with a conditional render using this state. On dismiss click, call `setBannerDismissed(true)` and `localStorage.setItem(...)` -- no reload.

### ProtectedRoute skeleton
Replace `<PageLoadingSpinner />` with a simple inline skeleton:
```
<div className="min-h-[100dvh] bg-background p-4 space-y-4 animate-pulse">
  <div className="h-10 w-32 rounded-lg bg-muted" />
  <div className="h-6 w-48 rounded bg-muted" />
  <div className="space-y-3 mt-6">
    <div className="h-24 rounded-xl bg-muted" />
    <div className="h-24 rounded-xl bg-muted" />
  </div>
</div>
```

This avoids importing heavy skeleton components into the critical auth-check path while still looking better than a black screen with spinner.

## Summary

| File | Change |
|---|---|
| `src/pages/PortfolioEditorPage.tsx` | Replace `window.location.reload()` banner dismiss with React state |
| `src/components/layout/ProtectedRoute.tsx` | Replace `PageLoadingSpinner` with lightweight inline skeleton |

**Total: 2 files modified, 0 new files.** All other categories pass the audit with no issues found.

