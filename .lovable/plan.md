
# Add AI Tailor Prompt on Preview Page

## What It Does
Shows a dismissable "Try AI Tailor" banner at the top of the Preview page for first-time users. Once dismissed, it never appears again (persisted in settings store).

## Implementation

### File: `src/pages/PreviewPage.tsx`
- Import `NextStepBanner` from `@/components/editor/NextStepBanner`
- Add `<NextStepBanner variant="tailor" onAction={...} />` right after the ATS-Ready badge row (before the resume preview area)
- The `onAction` callback navigates to `/editor` and opens the Tailor sheet (by setting a query param or navigating directly)
- The banner auto-hides once the user dismisses it, using the existing `hasSeenTailorHint` setting in the settings store

### No new files, no store changes, no backend changes
Everything needed already exists -- the `NextStepBanner` component handles dismiss logic and the `hasSeenTailorHint` flag is already in the settings store.
