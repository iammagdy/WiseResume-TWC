

# Add Preview Prompt Banner on Editor Page

## What It Does
Shows the existing "Looking good! Tap Preview to see your resume." banner on the Editor page for first-time users who have completed their contact and experience sections. Once dismissed, it never appears again (persisted via the existing `hasSeenPreviewHint` flag).

## Implementation

### File: `src/pages/EditorPage.tsx`
This is already implemented! The Editor page already includes the `NextStepBanner` with variant `"preview"` at line ~230:

```tsx
{sectionStatus.contact && sectionStatus.experience && (
  <NextStepBanner variant="preview" onAction={() => navigate('/preview')} />
)}
```

The banner appears when both the contact and experience sections are filled in, and navigates to `/preview` on action. The `hasSeenPreviewHint` flag in the settings store handles persistence.

### No changes needed
Everything is already in place -- the `NextStepBanner` component supports the `"preview"` variant, the settings store has `hasSeenPreviewHint`, and the Editor page renders it conditionally.

