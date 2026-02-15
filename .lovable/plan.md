

## AI Studio Mobile Optimization - Focused Improvements

### Overview

Most of the requested optimizations (tool card sizes, header padding, credits tooltip, icon sizing) were already implemented in previous iterations. This plan addresses the remaining gaps: a sticky mobile chat input, suggestion chip layout, a duplicate UI bug, and minor refinements.

### Changes Required

**File: `src/pages/AIStudioPage.tsx`**

1. **Fix duplicate Wise AI Chat header (bug)**
   - Lines 224-241 render TWO identical chat headers (icon + "Wise AI Chat" + subtitle). Remove the duplicate block (lines 233-241) so only one header appears.

2. **Add sticky mobile chat input bar**
   - Below the main scrollable content (but above the Sheets), add a fixed-position chat input bar visible only on mobile (`md:hidden`).
   - Position: `fixed bottom-[68px]` (clears the 64px bottom nav), `z-40`, full-width with `px-4 py-2 pb-safe`.
   - Contains a text input (`h-12`, `text-base` / 16px to prevent iOS zoom, `rounded-full`, glass-input styling) with placeholder cycling through `PLACEHOLDER_EXAMPLES`.
   - A 44x44px Send button (using `Send` icon from lucide) inside the input row, disabled when empty.
   - On submit or tap: opens `AgenticChatSheet` with the typed message passed as an initial prompt (add `initialMessage` state, pass to `AgenticChatSheet`).
   - Background: solid `bg-background` with top shadow (`shadow-[0_-4px_12px_rgba(0,0,0,0.2)]`).
   - Add `pb-[140px] sm:pb-20` to the main scrollable container so content isn't hidden behind the sticky bar on mobile.

3. **Quick suggestion chips: 2-column grid on mobile**
   - Change the chips container from `flex flex-wrap gap-2` to `grid grid-cols-2 gap-2 sm:flex sm:flex-wrap` so chips display as a 2-column grid on mobile and revert to flex-wrap on larger screens.
   - Each chip: keep existing `min-h-[36px]`, add `justify-center` for grid alignment.

4. **"More AI Tools" collapsible header**
   - Increase touch target to `min-h-[48px]` and font to `text-base sm:text-sm font-semibold`.

5. **Featured Tools section header**
   - Change from `text-sm` to `text-base sm:text-sm` for better mobile readability.

### What Does NOT Change

- All AI tool functionality, API calls, and sheet behaviors
- Credit system and indicator (already has tooltip)
- Header layout (already optimized with reduced padding)
- Tool card sizes (already min-h 100px with proper icons)
- Tour modal and onboarding flow
- Resume context bar and "Change" button
- Error boundaries and lazy loading
- Desktop layouts

### Technical Notes

- The sticky input uses a simple text state; submitting sets `initialMessage` and opens `showChat`. The `AgenticChatSheet` already accepts an initial prompt mechanism (or the message can be passed via the resume store).
- The `pb-[140px]` on mobile ensures the Pro Tip section and last tool cards remain scrollable above the sticky bar.
- The duplicate header bug (lines 224-241 vs 233-241) was introduced in a prior edit where both the "cycling placeholder" version and the original static version were kept.

### Files Summary

| File | Action |
|------|--------|
| `src/pages/AIStudioPage.tsx` | Fix duplicate header, add sticky mobile input, 2-col chips, minor sizing tweaks |

