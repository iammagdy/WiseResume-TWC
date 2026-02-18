
## Mobile Flow Blockers and Confusing Interactions Fix

### Issue 1: AI Intro Tooltip "Got It!" button unreachable on mobile (CRITICAL BLOCKER)

**Screen:** Editor (`/editor`) -- first visit
**How to reproduce:** Open a resume in the editor for the first time. The AI intro tooltip appears as a full-screen overlay. On 640px height viewports, the "Got It!" button at the bottom of the card is completely hidden behind the PWA install banner (z-40 at bottom-[11.5rem]). The backdrop click to dismiss is also intercepted by the install banner.

**Root cause:** The tooltip card uses `p-6 pt-8` with `mb-6` spacing between sections, making the card too tall. The "Got It!" button and hint text end up behind the install banner overlay.

**Fix:** Increase the tooltip's z-index from `z-50` to `z-[60]` so it renders above the install banner. Also make the card scrollable on very short viewports by adding `max-h-[calc(100dvh-6rem)] overflow-y-auto` to the card container.

**File:** `src/components/editor/AIIntroTooltip.tsx` (lines 19 and 27)

---

### Issue 2: Install banner dismiss button below 44px touch target (MEDIUM)

**Screen:** All screens where the install banner appears
**How to reproduce:** Try to tap the small X button on the install banner. The button is `p-1` (~28px effective area).

**Fix:** Increase the dismiss button padding from `p-1` to `p-2` and add `min-w-[44px] min-h-[44px] flex items-center justify-center` for reliable thumb targeting.

**File:** `src/components/pwa/InstallPrompt.tsx` (line 76)

---

### Issue 3: "Mark as Applied" button below 44px touch target (LOW)

**Screen:** Applications page, Activity Timeline
**How to reproduce:** In the Activity Timeline, the "Mark as Applied" button has `min-h-[28px]` -- well below the 44px standard.

**Fix:** Change `min-h-[28px]` to `min-h-[44px]` on the button.

**File:** `src/components/applications/ActivityTimeline.tsx` (line 162)

---

### Technical Changes Summary

| File | Change | Impact |
|------|--------|--------|
| `src/components/editor/AIIntroTooltip.tsx` | Increase z-index to z-[60], add max-height + overflow to card | Fixes blocked "Got It!" button |
| `src/components/pwa/InstallPrompt.tsx` | Increase dismiss X button padding to meet 44px | Touch target compliance |
| `src/components/applications/ActivityTimeline.tsx` | Change min-h-[28px] to min-h-[44px] | Touch target compliance |

Total: 3 files, 3 surgical line changes. No logic changes, no component removals, desktop unaffected.
