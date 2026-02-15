

## AI Studio Mobile Optimization

### Overview

The AI Studio page already has a solid mobile layout with touch-manipulation, glass-elevated cards, and stacked tools. This plan addresses the specific gaps: suggestion chip sizing, tool card sizing, header compactness, "Working on" bar improvements, and credits tooltip.

### What's Already Done (No Changes Needed)

- Chat section: Full-width tappable card with icon, title, and suggestion chips
- Featured tools: Already stacked vertically with `min-h-[72px]` and `active:scale-[0.98]`
- More AI Tools grid: Already `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`
- Touch targets: All buttons have `touch-manipulation` and `active:scale` feedback
- Credits indicator: Already shows remaining count with Zap icon
- Bottom nav clearance: `pb-20` already applied

### Changes Required

**File 1: `src/pages/AIStudioPage.tsx`**

1. **Quick suggestion chips** (lines 196-203):
   - Increase chip sizing from `text-xs px-2.5 py-1` to `text-sm px-3 py-1.5 min-h-[36px]` for comfortable mobile tapping
   - Chips already wrap via `flex-wrap` -- no layout change needed

2. **Featured tool cards** (lines 215-238):
   - Increase `min-h` from `72px` to `min-h-[100px] sm:min-h-[72px]` on mobile
   - Increase icon from `w-6 h-6` to `w-7 h-7` (28px)
   - Increase title from `text-sm` to `text-base sm:text-sm` (16px on mobile)
   - Increase description from `text-xs` to `text-sm sm:text-xs` (14px on mobile)

3. **Secondary tool cards** (lines 269-281):
   - Increase `min-h` from `88px` to `min-h-[100px]`
   - Increase icon from `w-5 h-5` to `w-6 h-6` (24px)
   - Increase label from `text-xs` to `text-sm sm:text-xs` (~15px on mobile)
   - Increase description from `text-[10px]` to `text-xs sm:text-[10px]` (13px on mobile)

4. **Header** (lines 123-135):
   - Reduce mobile padding from `pt-6 pb-4` to `pt-4 pb-3 sm:pt-6 sm:pb-4`

5. **"Working on" bar** (lines 144-160):
   - Increase font from `text-sm` to `text-[15px] sm:text-sm` for mobile prominence
   - Add a "Change" button (navigates to `/dashboard`) next to the resume title, min-h 44px, visible only when a resume is selected

6. **Credits indicator** -- wrap the `AICreditsIndicator` in a `Tooltip` with content "AI Credits Remaining"

**File 2: `src/components/editor/ai/AICreditsIndicator.tsx`**

- No changes needed -- the tooltip will be applied at the usage site in AIStudioPage

### What Does NOT Change

- All AI tool functionality and API calls
- Sheet opening/closing logic
- Chat (AgenticChatSheet) behavior
- Resume context detection and guard logic
- Navigation and routing
- Lazy-loaded sheets and Suspense boundaries
- Error boundaries
- Haptic feedback patterns
- Desktop layouts (all changes use responsive `sm:` prefixes)

### Technical Notes

- All changes are CSS class adjustments and one small "Change" button addition
- The "Change" button reuses the existing `navigate('/dashboard')` pattern already used in the empty-state button
- Tooltip wrapping uses existing `Tooltip`/`TooltipTrigger`/`TooltipContent` from `@/components/ui/tooltip`
- No new dependencies or state variables needed (except the Tooltip imports)

