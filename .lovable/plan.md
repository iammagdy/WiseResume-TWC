

## Mobile Export/Preview Flow -- 3 Issues Found

### Issue 1: Bottom action bar secondary buttons below 44px touch target (HIGH)

**Screen:** Preview page (`/preview`) -- bottom action bar
**Problem:** The secondary row buttons (Edit, Interview, Share, and iOS Save) use `h-9` (36px) -- below the 44px mobile standard. On small phones, users rushing to tap "Share" or "Interview" will misfire. These are critical actions in the final export flow.

**Fix:** Change `h-9 sm:h-10` to `h-11 sm:h-11` (44px) on all secondary action buttons.

**File:** `src/pages/PreviewPage.tsx` lines 631, 641, 653, 661
**Change:** Replace `h-9 sm:h-10` with `h-11 sm:h-11` on the 4 secondary buttons.

---

### Issue 2: Bottom action bar lacks safe-area padding on notched devices (HIGH)

**Screen:** Preview page (`/preview`) -- bottom action bar
**Problem:** The bottom action bar uses `pb-[4px]` with no `pb-safe` utility. On devices with a home indicator (iPhone with notch, newer Android gesture-nav phones), the bottom row of buttons sits directly under the home indicator, making them hard or impossible to tap. The app uses `pb-safe` consistently elsewhere (BottomTabBar, sheets) but the Preview page's custom bottom bar omits it.

**Fix:** Replace `pb-[4px]` with `pb-safe` in the bottom action bar container, and add a minimum fallback padding.

**File:** `src/pages/PreviewPage.tsx` line 592
**Change:** Replace `pb-[4px] pt-0 mb-0 mt-0` with `pb-[max(8px,env(safe-area-inset-bottom))] pt-1`.

---

### Issue 3: Template switcher chips below 44px touch target (MEDIUM)

**Screen:** Preview page (`/preview`) -- template quick switcher row
**Problem:** Template name chips use `min-h-[32px]` -- 12px below the 44px standard. Since there are 30 templates and users scroll horizontally to find the right one, misfire taps switch templates accidentally. This is the only place where users pick their template in the preview flow.

**Fix:** Change `min-h-[32px]` to `min-h-[44px]` on the template selector buttons.

**File:** `src/pages/PreviewPage.tsx` line 509
**Change:** Replace `min-h-[32px]` with `min-h-[44px]` in the template button className.

---

### Technical Changes Summary

| File | Line(s) | Change | Impact |
|------|---------|--------|--------|
| `src/pages/PreviewPage.tsx` | 509 | Template chip `min-h-[32px]` to `min-h-[44px]` | Touch target compliance |
| `src/pages/PreviewPage.tsx` | 592 | Bottom bar `pb-[4px] pt-0` to `pb-[max(8px,env(safe-area-inset-bottom))] pt-1` | Safe area on notched devices |
| `src/pages/PreviewPage.tsx` | 631, 641, 653, 661 | Secondary buttons `h-9 sm:h-10` to `h-11 sm:h-11` | Touch target compliance |

Total: 1 file, 6 line changes. No logic changes, no export flow changes, desktop unaffected.
