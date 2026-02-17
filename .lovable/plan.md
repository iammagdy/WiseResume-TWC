

## Fix Black Strip Between Download Section and Bottom Tab Bar

### Root Cause

The outer container on line 477 has `pb-20` which reserves 80px of padding at the bottom for the BottomTabBar. However, the bottom actions section already sits at the bottom of the flex column and has its own `pb-safe` padding. This creates a visible black strip (the 80px padding) between the download buttons and the tab bar.

### Fix

**File: `src/pages/PreviewPage.tsx`** (line 477)

Remove `pb-20` from the outer container since the bottom actions are pinned to the bottom via flexbox (`shrink-0`) and the BottomTabBar overlays from the AppShell. Instead, the bottom actions section itself should account for the tab bar by adding `mb-20` or the actions container should include the tab bar clearance in its own padding.

The cleanest fix: change the bottom actions container (line 592) from `pb-safe` to `pb-20` so it clears the tab bar, and remove `pb-20` from the outer wrapper (line 477). This way the padding lives on the last visible element rather than creating dead space below it.

**Changes:**
1. Line 477: Remove `pb-20` from the outer div
2. Line 592: Change `pb-safe` to `pb-24` (accounts for both the tab bar height and safe area)

This eliminates the black strip by ensuring the bottom padding is part of the action bar itself rather than empty space beneath it.

