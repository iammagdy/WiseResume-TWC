

# WiseResume Structured Audit — Implementation Plan

This plan addresses all items in priority order: critical bugs, high-priority UI fixes, medium-priority flow improvements, and polish items.

---

## Phase 1: Critical Bugs

### BUG 1 — /interview page "Connection hiccup"

The interview page itself works correctly. The "Connection hiccup" comes from the ErrorBoundary catching transient chunk-loading errors (lazy import failures on slow connections). The page already has an ErrorBoundary wrapper.

**Fix:** Add an auto-retry mechanism to the ErrorBoundary specifically for chunk errors (it already retries once — increase to 2 retries with a small delay). Also add a more interview-specific fallback message when the error occurs on the interview route.

**Files:** `src/components/ErrorBoundary.tsx`

### BUG 2 — "Continue without account" does nothing

The button at line 513 of AuthPage navigates to `/upload`. This works but may feel like "nothing happens" because `/upload` is a protected route (wrapped in `ProtectedRoute`), which redirects unauthenticated users back to `/auth`.

**Fix:** Change the navigation target from `/upload` to `/dashboard`. Since `/dashboard` is also protected, we need to either:
- Route to `/` (landing page) — but that's not useful
- Implement anonymous sign-in so guests can use the app

The simplest fix that matches the user's request: use Supabase anonymous sign-in to create a temporary session, then navigate to `/dashboard`.

**However**, the constraints say "Do NOT modify authentication logic." So instead, navigate to the landing page `/` which is public, or better — since there's already an onboarding page at `/onboarding` and the user mentions that as an option, navigate there. But `/onboarding` is also protected.

**Safest fix:** Navigate to `/` (landing page) since it's the only unprotected useful route. If the user is a guest, they land on the homepage where they can explore. Alternatively, make the button text clearer: "Explore without account" and navigate to `/`.

**Files:** `src/pages/AuthPage.tsx` (line 513)

### BUG 3 — FAB overlaps QuickAction buttons

The FAB is positioned at `bottom-24 sm:bottom-20` (line 64 of FloatingCreateButton.tsx). The QuickActionChips render as a row of 3 buttons. On mobile, the FAB can overlap the rightmost chip ("Interview").

**Fix:** Increase the FAB bottom offset to `bottom-28` to clear the bottom nav bar + give more space. Also add `mb-4` (bottom margin) to the QuickActionChips container so there's breathing room before the resume list content that could overlap.

**Files:** `src/components/dashboard/FloatingCreateButton.tsx`, `src/components/dashboard/QuickActionChips.tsx`

---

## Phase 2: High-Priority UI/UX Fixes

### FIX 1 — Resume title truncation tooltip

Add `title` attribute to truncated resume titles on `ResumeListCard` and job entries on the Activity page. For mobile, wrap in a component that shows the full text in a toast or expands on long-press.

**Files:** `src/components/dashboard/ResumeListCard.tsx`, `src/pages/ApplicationsPage.tsx`

### FIX 2 — Dashboard filter row scroll fade

Add a CSS `mask-image` gradient to the right edge of the filter chip scroll container to indicate more content.

**Files:** `src/components/dashboard/ResumeFilters.tsx`

### FIX 3 — Editor header: tappable resume name

Make the `<h1>` title in the editor header tappable. On tap, open a small dialog/sheet with the full name and an inline rename input. The rename logic already exists via `updateResume.mutate`.

**Files:** `src/pages/EditorPage.tsx`

### FIX 4 — Settings page scroll overflow

The Settings page uses `flex-1 flex flex-col` containers (lines 309-310). The content div at line 326 has `space-y-8` but no explicit overflow. Since AppShell handles scrolling via the `overflow-y-auto` container, the issue may be that the settings content is inside nested flex containers that constrain height. 

**Fix:** Ensure the content div uses `overflow-y-auto` as a fallback and add `pb-20` for bottom padding to ensure all content is reachable past the bottom nav.

**Files:** `src/pages/SettingsPage.tsx`

### FIX 5 — Landing page "Why WiseResume?" overflow

The feature grid at line 474 of Index.tsx already uses `grid-cols-1 xs:grid-cols-2 lg:grid-cols-4`. Add `overflow-hidden` to the grid container.

**Files:** `src/pages/Index.tsx`

### FIX 6 — Landing page footer

Add a minimal dark footer component at the bottom of the landing page with copyright, links, and placeholder social icons.

**Files:** New file `src/components/landing/Footer.tsx`, `src/pages/Index.tsx`

---

## Phase 3: Medium-Priority Flow Improvements

### FLOW 1 — First-time onboarding after sign-up

An onboarding system already exists (`OnboardingCarousel` in DashboardPage). It checks `profiles.onboarding_completed` and shows a fullscreen carousel. The existing onboarding already covers goal selection and template choice. No new implementation needed — just verify the existing flow works. If it needs the 3 specific steps mentioned, we update `OnboardingCarousel`.

**Action:** Verify existing onboarding covers the requested steps. If not, update `OnboardingCarousel` to match.

**Files:** `src/components/onboarding/OnboardingCarousel.tsx` (if updates needed)

### FLOW 2 — Improved empty state on Dashboard

An `EmptyState` component already exists at `src/components/dashboard/EmptyState.tsx` and is rendered when `resumes.length === 0`. It already has icon, heading, subtext, and CTA buttons. The existing implementation matches the request.

**Action:** Verify existing empty state matches. Minor text tweaks if needed.

**Files:** `src/components/dashboard/EmptyState.tsx`

### FLOW 3 — Activity tab label/route mismatch

The tab is labeled "Activity" but routes to `/applications`. Since the page shows job applications and saved jobs, rename the label to "Applications" for accuracy.

**Files:** `src/components/layout/BottomTabBar.tsx`

### FLOW 4 — "AI Online" badge tappable

Make the `AIHealthBadge` in the dashboard header tappable. On tap, navigate to `/settings` (where AI settings exist).

**Files:** `src/components/ai/AIHealthBadge.tsx`

### FLOW 5 — Portfolio info banner for new users

Add a dismissible info banner at the top of the Portfolio page when portfolio strength is low or not configured.

**Files:** `src/pages/PortfolioEditorPage.tsx`

---

## Phase 4: Polish & Performance

### POLISH 1 — Replace loading spinners with skeleton UI

Page-specific skeletons already exist (`DashboardSkeleton`, `EditorSkeleton`, etc.) and are used in App.tsx Suspense fallbacks. The `PageLoadingSpinner` is only used for a few routes. Replace remaining `PageLoadingSpinner` usages with appropriate skeletons.

**Files:** `src/App.tsx`

### POLISH 2 — Swipe-to-reveal on resume cards

`ResumeListCard` already implements swipe gestures (left to delete, right to duplicate) using framer-motion drag. This is already built per the summary. No changes needed.

### POLISH 3 — Interview error auto-retry

Add a countdown auto-retry to the ErrorBoundary when on the interview route. Show "Retrying in 5...4...3..." before auto-reloading.

**Files:** `src/components/ErrorBoundary.tsx`

### POLISH 4 — Trust badges visual weight

Enhance the trust bar on the landing page (line 359 of Index.tsx) with star SVGs, avatar circles, and a green-dot badge.

**Files:** `src/pages/Index.tsx`

### POLISH 5 — AI Studio full resume name

In AIStudioPage, find the "Working on:" context row and remove truncation / allow wrapping.

**Files:** `src/pages/AIStudioPage.tsx`

---

## Summary of All File Changes

| File | Changes |
|---|---|
| `src/components/ErrorBoundary.tsx` | Increase chunk retry attempts; add auto-retry countdown for interview route |
| `src/pages/AuthPage.tsx` | Change "Continue without account" to navigate to `/` |
| `src/components/dashboard/FloatingCreateButton.tsx` | Increase bottom offset to `bottom-28` |
| `src/components/dashboard/QuickActionChips.tsx` | Add bottom padding for FAB clearance |
| `src/components/dashboard/ResumeListCard.tsx` | Add `title` attribute on truncated name |
| `src/pages/ApplicationsPage.tsx` | Add `title` attribute on truncated job titles |
| `src/components/dashboard/ResumeFilters.tsx` | Add right-side CSS mask-image fade gradient |
| `src/pages/EditorPage.tsx` | Make header title tappable for rename sheet |
| `src/pages/SettingsPage.tsx` | Fix scroll container with `pb-20` and overflow fallback |
| `src/pages/Index.tsx` | Add `overflow-hidden` to feature grid; enhance trust badges; add Footer |
| `src/components/landing/Footer.tsx` | New: minimal dark footer component |
| `src/components/layout/BottomTabBar.tsx` | Rename "Activity" label to "Applications" |
| `src/components/ai/AIHealthBadge.tsx` | Make tappable, navigate to settings |
| `src/pages/PortfolioEditorPage.tsx` | Add dismissible info banner for new users |
| `src/App.tsx` | Replace remaining `PageLoadingSpinner` with proper skeletons |
| `src/pages/AIStudioPage.tsx` | Remove truncation on "Working on:" resume name |

**Total: 16 files modified, 1 new file created.**

