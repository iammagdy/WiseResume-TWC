
# Fix: Black Bar Above Bottom Tab Bar in Editor (Mobile)

## Root Cause

The "black bar" is caused by a **color mismatch** between the editor scroll container and the section cards:

- The scroll container inherits `bg-background` which is `hsl(240 20% 4%)` -- nearly pure black
- The `SectionCard` uses `glass-card` which has `background: hsl(var(--card) / 0.5)` -- a **50% transparent** overlay on top of the black background
- When the Contact section (or any short section) doesn't fill the vertical space, the remaining area shows the dark `bg-background` underneath -- creating a visible black gap between the last card and the bottom tab bar

The previous fix used `flex-1` to stretch the card, but that only stretches the semi-transparent glass-card over the black background -- the visual result is still a dark area.

## Solution

Two-part fix:

1. **Change the scroll container background** from `bg-background` (black) to `bg-card` so the area behind and around section cards matches the card color instead of contrasting with it.

2. **Remove the unnecessary `flex-1 flex flex-col` stretching** from the section wrappers and SectionCard -- these were added as the previous fix attempt but they force short sections to stretch unnaturally and don't solve the visual problem. The background color fix is the correct approach.

## Changes

### 1. `src/pages/EditorPage.tsx`

- **Line 1214**: Change `editor-scroll-container` class to include `bg-card` instead of inheriting `bg-background`
- **Lines 800-838**: Remove `flex-1 flex flex-col` from each section wrapper div -- these are no longer needed since the background color match eliminates the visual gap
- **Line 1218**: Remove the extra `flex-1 flex flex-col` wrapper around `renderEditorContent()`
- **Line 1211**: Change the Tabs `bg-background` to `bg-card` for consistency

### 2. `src/components/editor/SectionCard.tsx`

- **Line 19**: Remove `flex-1` from the outer div -- the card should size to its content naturally, not stretch to fill available space
- Keep `flex flex-col` for internal layout

## Why This Works

By making the scroll container's background `bg-card` (the same hue as the glass-card overlay), the entire editor area appears as one consistent color. Short sections like Contact will naturally end where their content ends, and the remaining space below will be the same card color -- no dark gap.

## Files Modified
1. `src/pages/EditorPage.tsx` -- background color fix + remove flex stretching
2. `src/components/editor/SectionCard.tsx` -- remove flex-1 from outer div
