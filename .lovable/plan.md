

# Fix Empty Space Below Section Navigation in Editor

## Problem
After removing the NextStepBanner components, there's a visible empty gap (dark background) below the "Previous / Next" buttons at the bottom of the editor. This space was previously occupied by the banner tips, but now it's just dead space.

## Root Cause
The section navigation buttons (Previous / Next) inside `renderEditorContent()` have `pt-6 pb-2` spacing (line 881), and the scroll container doesn't fill the remaining viewport. The `pb-20` on the main container (for bottom tab bar clearance) adds to this gap, making it look like an empty "black bar."

## Changes

### 1. Reduce section navigation top padding
**File:** `src/pages/EditorPage.tsx` (line 881)
- Change `pt-6 pb-2` to `pt-3 pb-4` on the section navigation container
- This tightens the gap above the buttons and adds more padding below so the buttons sit closer to the content

### 2. Add bottom padding to scroll container to fill the gap
**File:** `src/pages/EditorPage.tsx` (lines 1297 and similar)
- Ensure the scroll container's `pb-4` is increased to `pb-8` so content pushes further down, reducing the visible empty area below the navigation

### 3. Clean up leftover empty lines and comments
**File:** `src/pages/EditorPage.tsx` (lines 1305-1308)
- Remove the blank lines and the "AI Studio Bar removed" comment that were left behind after the banner deletion -- just housekeeping

These are small CSS spacing tweaks. No functional changes, no component additions or removals.

