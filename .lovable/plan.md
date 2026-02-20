

# "What's New" Auto-Popup Dialog

## Overview
A dialog that automatically appears once when a returning user opens the app after an update. It shows only the latest changelog entry (not the full history), then marks the version as seen so it never reappears until the next update.

## How It Works

1. On app load (for authenticated users only), fetch `/changelog.json`
2. Compare the latest version against `localStorage` key `lastSeenChangelog`
3. If they differ, show the "What's New" dialog with just the latest entry
4. On dismiss, write the version to `localStorage` (reusing the existing `lastSeenChangelog` key so it stays in sync with the Settings badge)

## Files to Create / Modify

### 1. New: `src/components/WhatsNewDialog.tsx`
- A standalone dialog component that:
  - Fetches changelog data on mount
  - Checks `lastSeenChangelog` in localStorage
  - If a new version exists, auto-opens a Dialog showing the latest entry's summary and items (same visual style as the Settings changelog but limited to one entry)
  - On close, calls `markSeen()` from `useChangelogBadge` to update localStorage and clear the badge dot in Settings simultaneously
  - Includes a "Got it" button and a small "View full changelog" link that navigates to `/settings`
  - Only renders after a short delay (~1.5s) so it doesn't compete with the splash screen

### 2. Modified: `src/App.tsx`
- Import and render `<WhatsNewDialog />` inside `AppRoutes`, after the `<Routes>` block
- Gate it behind authentication: only render when the user is logged in (check `useAuth()` context or place it inside the `ProtectedRoute` area)

### 3. Modified: `src/hooks/useChangelogBadge.ts`
- Export the shared `getChangelog()` helper so `WhatsNewDialog` can reuse it without a duplicate fetch
- No logic changes, just make the function exportable

## Technical Details

- **No new localStorage keys** -- reuses `lastSeenChangelog` so the Settings badge and the auto-popup stay perfectly in sync
- **No duplicate fetches** -- the module-level `cachedFetch` in `useChangelogBadge.ts` ensures only one network request regardless of how many consumers call `getChangelog()`
- **Splash-safe** -- the dialog waits 1.5 seconds before checking, so it never overlaps the animated splash on first launch
- **One-shot** -- closing the dialog (via X, "Got it", or overlay click) marks the version seen immediately

