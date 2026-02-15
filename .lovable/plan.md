

## Mobile Optimization: Skills Section and Preview Panel (Incremental)

### Overview

Both the Skills section and Preview panel are already heavily mobile-optimized. This plan covers the small remaining gaps to match the full specification.

### What's Already Done (No Changes Needed)

- **Skills chips**: Already `min-h-[44px]` with `touch-manipulation active:scale-95` and `text-sm` (14px)
- **Remove X button**: Already `min-w-[32px] min-h-[32px]` touch area wrapping the 16px icon
- **Add skill input**: Already `h-12 text-base` (48px, 16px font -- prevents iOS zoom)
- **Add button**: Already `h-12 min-h-[48px]`
- **Common skills**: Already `grid grid-cols-2 sm:flex sm:flex-wrap` with `min-h-[44px]` and `touch-manipulation`
- **Suggested skills**: Already same grid/touch pattern
- **Preview on mobile**: Already uses `LivePreviewSheet` -- a Vaul `Drawer` at `h-[95dvh]` with swipe-down-to-close
- **Zoom controls**: Already present with 50/75/100/125% buttons
- **PDF download**: Already in toolbar with spinner state
- **Section visibility toggles**: Already implemented
- **Close button**: Already present with `min-w-[36px] min-h-[36px]`

### Changes Required

**File 1: `src/components/editor/SkillsSection.tsx`**

Minor spacing and touch refinements:
- Change outer container from `space-y-4` to `space-y-5` for consistent 20px vertical spacing (matches Contact and Summary sections)
- Increase the X button touch area from `min-w-[32px] min-h-[32px]` to `min-w-[36px] min-h-[36px]` for a more comfortable removal target

**File 2: `src/components/editor/LivePreviewPanel.tsx`**

Mobile toolbar touch target improvements:
- Increase zoom button `min-h` from `36px` to `40px` to match the spec
- Increase section toggle and close buttons from `min-w-[36px] min-h-[36px]` to `min-w-[44px] min-h-[44px]` to meet the 44px mobile standard
- Add safe-area top padding to the toolbar on mobile: `pt-[env(safe-area-inset-top)]` so notched phones don't obscure controls
- Make section visibility toggle chips `min-h-[36px]` (up from 32px) for easier tapping

### What Does NOT Change

- All skill add/remove/reorder logic
- AI skill suggestions and gap analysis features
- Auto-save behavior
- Preview Drawer component and its swipe-down-to-close behavior
- Zoom calculation and resume rendering
- PDF generation pipeline
- Desktop layouts for both components
- Template rendering and section filtering
- All other editor sections and pages

### Technical Notes

- All changes are CSS class adjustments only -- no logic or data flow modifications
- The Drawer component from Vaul already provides swipe-down-to-close, backdrop overlay, and smooth animations -- no custom implementation needed
- Safe-area padding uses the CSS `env()` function which gracefully falls back to 0 on non-notched devices
- The zoom buttons remain functional at all sizes; `min-h-[40px]` with `min-w-[40px]` is comfortable for thumb tapping
