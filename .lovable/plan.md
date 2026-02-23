

# Remove "Next Step Banners" from Editor Page

The tips/suggestions appearing at the bottom of the editor page are the **NextStepBanner** components (lines 1306-1312 in `EditorPage.tsx`). These show contextual hints like "Tap Preview to see your resume" and "Try AI Tailor" once enough sections are filled in.

## Changes

### 1. Remove NextStepBanner rendering from EditorPage
**File:** `src/pages/EditorPage.tsx`
- Delete lines 1306-1312 (the entire `NextStepBanner` block and its conditional wrapper)
- Remove the `NextStepBanner` import at line 42

That's it -- two deletions in one file. The `NextStepBanner` component file itself can stay in the codebase in case it's used elsewhere, but it will no longer appear on the editor page.

