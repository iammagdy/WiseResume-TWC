

# Fix Duplicate Buttons and Career Card Display Issues

## Issue 1: Duplicate "Preview" / "View Live" Buttons

Two buttons perform the exact same action (open portfolio URL in new tab):
- **"Preview"** button in the hero card (line 619)
- **"View Live"** button in the floating pill at the bottom (line 1208-1215)

### Fix
Remove the **"Preview"** button from the hero card's quick actions grid (lines 618-626). The floating "View Live" pill already serves this purpose and is always visible. This leaves only the "Career Card" button in the hero card, which can become a full-width button instead of a 2-column grid.

**File: `src/pages/PortfolioEditorPage.tsx`**
- Remove the `grid grid-cols-2` container with Preview + Career Card buttons (lines 617-626)
- Replace with a single full-width "Career Card" button
- The floating pill already provides "View Live" functionality, so no loss of access

## Issue 2: Career Card Preview Display on Desktop/iPad

The Career Card preview renders the 1200x630 card using `transform: scale()` with `transformOrigin: 'top left'`, but the wrapper container lacks `overflow: hidden`. On wider viewports, the card appears left-aligned within its container, and gradient/glow effects bleed outside the rounded border.

### Fix
**File: `src/components/portfolio/CareerCardSheet.tsx`**

1. Add `overflow-hidden` to the preview wrapper div (line 532) to clip the 3D tilt effects and gradient bleeds within the rounded border
2. The existing `max-w-2xl mx-auto` centering and `aspectRatio: '1200/630'` are correct -- the issue is purely the missing overflow clipping

## Issue 3: LinkedIn Button Layout Asymmetry

On desktop, the LinkedIn button sits alone on the left in a `grid grid-cols-2` layout when Web Share API is unavailable (desktop browsers), leaving an awkward half-width button. On mobile where `navigator.share` exists, both LinkedIn and Share buttons appear correctly.

### Fix
**File: `src/components/portfolio/CareerCardSheet.tsx`**
- Make the LinkedIn button full-width when Share is not available (most desktop browsers)
- Keep the 2-column grid only when both buttons are shown

## Suggested Enhancements for Career Card

These are improvements we can add in the future:
- **Copy to clipboard**: Add a "Copy Image" button that copies the card to clipboard for quick pasting
- **Custom accent override**: Let users pick a different accent color specifically for the Career Card
- **Animated preview**: Add a subtle entrance animation when switching variants instead of the current instant flip

---

## Technical Summary

| File | Change |
|---|---|
| `src/pages/PortfolioEditorPage.tsx` | Remove duplicate Preview button from hero card; make Career Card button full-width |
| `src/components/portfolio/CareerCardSheet.tsx` | Add `overflow-hidden` to preview wrapper; fix LinkedIn button layout on desktop |

