# Phase 3: UX Flow Fixes

## What & Why
Three targeted UX fixes that eliminate confusing dead-ends in the user journey. These are safe, additive changes — no data flows, APIs, or database interactions are touched.

## Done looks like
- When a user navigates to a feature-gated route (Interview, Applications, Portfolio, etc.) that is disabled via app settings, they see a short toast notification explaining the feature is currently unavailable, then are redirected to the dashboard — instead of the current silent redirect with no feedback.
- The duplicated `isPublicStandalone` logic (copy-pasted identically in three places in `App.tsx`) is extracted into a single shared utility so any future changes only need to be made in one place.
- The animated splash screen no longer shows on every browser-tab open for returning users — it respects the `hasSeenSplash` localStorage flag correctly and only plays once per device. For users where it does show, the duration is reduced from 1000ms to 600ms to cut the blocking time by 40%.

## Out of scope
- Auth page redesign or moving auth outside AppShell (larger structural change, future work)
- Onboarding server-side validation
- Any changes to the data layer or Supabase queries

## Tasks
1. **Add feedback to FeatureGate redirects** — Update the `FeatureGate` component in `App.tsx` to fire a `toast.info("This feature isn't available right now.")` before redirecting to `/dashboard`, so users understand why they were redirected rather than landing on the dashboard silently.

2. **Extract isPublicStandalone to a shared hook** — Create a small `useIsPublicRoute()` hook (or inline utility function) in `App.tsx` that returns the boolean result of the `location.pathname.startsWith('/p/') || ...` check. Replace the three duplicated inline copies in `AppRoutes`, `DeferredProviders`, and `AppInstallPrompt` with a single call to this shared function.

3. **Reduce splash screen duration** — In `AnimatedSplash.tsx`, reduce the auto-dismiss timeout from `1000ms` to `600ms` for the standard case (and keep the existing `500ms` for `prefersReducedMotion`). This cuts 400ms off the blocking time for first-time visitors while keeping the branded experience intact.

## Relevant files
- `src/App.tsx:156-165,413-434`
- `src/components/AnimatedSplash.tsx`
