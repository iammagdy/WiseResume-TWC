

## Mobile Optimization: Work Experience Cards and AI Assist Button

### Overview

The Work Experience section already has accordion-style cards and the timeline already renders vertically on mobile. The AI Assist button already has 44px touch targets. This plan covers the remaining gaps: larger card headers, full-width action buttons, move up/down reordering, and converting the AI Assist dropdown to a bottom sheet on mobile.

### What's Already Done (No Changes Needed)

- ExperienceTimeline: Already renders vertical cards on mobile with gap detection banners and "Explain with AI" buttons (44px targets)
- ExperienceSection: Already uses accordion expand/collapse pattern with chevron icons
- InlineAIButton: Already has 44px min-height, sparkle icon, loading spinner, and context-specific actions per section
- Input fields: Already h-12 (48px) with 16px font
- Gap detection: Already shows warning banners with AI explain button
- All CRUD, validation, auto-save, and AI features fully functional

### Changes Required

**File 1: `src/components/editor/ExperienceSection.tsx`**

Mobile card header enhancements:
- Increase card header `min-h` from `72px` to `80px` on mobile (keep 72px on desktop via `min-h-[80px] sm:min-h-[72px]`)
- Increase job title font from `text-sm` to `text-base sm:text-sm` and add `font-semibold` (already there) for 16px on mobile
- Make the "Add" button full-width on mobile: `w-full sm:w-auto min-h-[56px] sm:min-h-0`
- Add "Move Up" / "Move Down" buttons in expanded card footer on mobile (hidden on desktop via `sm:hidden`). These rearrange the experience array in the store. Disabled when at top/bottom of list respectively. Each button min-h-[44px]
- Make Delete button full-width on mobile with min-h-[44px], side-by-side with a reorder group

Expanded card footer layout on mobile:
```
[Move Up] [Move Down]    <- row 1, sm:hidden
[Delete Experience]      <- row 2, full-width on mobile
```

**File 2: `src/components/editor/InlineAIButton.tsx`**

Convert popup menu to bottom sheet on mobile:
- Import `useIsMobile` and `Sheet`/`SheetContent` from UI components
- On mobile (`isMobile`): Replace the absolute-positioned dropdown with a `Sheet` (side="bottom") that opens on button tap
- Each action item in the sheet: `min-h-[64px]`, full-width, with icon (20px), label, and a short description text below the label
- On desktop: Keep the current dropdown popup behavior exactly as is
- Add subtle pulse animation on the button when section first loads (CSS `animate-pulse` for 2 cycles, then stop via a timeout state)

Action descriptions for the bottom sheet (experience section example):
- "Improve Bullets" -- "Rewrite with stronger action verbs"
- "Add Metrics" -- "Quantify achievements with numbers"
- "ATS Optimize" -- "Align keywords with job requirements"

**File 3: `src/components/editor/SectionCard.tsx`**

No changes needed -- the action slot already renders the AI Assist button in the header. The existing layout handles mobile well.

### What Does NOT Change

- ExperienceTimeline component -- already mobile-optimized with vertical cards
- Gap detection algorithm, "Explain with AI" flow
- All AI enhancement features (Improve Bullets, Add Metrics, ATS Optimize)
- Data CRUD operations, auto-save, validation
- Desktop horizontal timeline and stepper
- All other section components
- Drag-drop (not currently implemented, so move up/down buttons serve as the reordering mechanism)
- AIEnhanceDialog, GapExplainerSheet
- SectionAIAction component

### Technical Notes

- Move up/down uses simple array index swapping in `updateResume({ experience: reorderedArray })` -- triggers auto-save like any other edit
- The Sheet component for AI actions on mobile reuses the existing `Sheet`/`SheetContent` from `@/components/ui/sheet` -- same pattern used throughout the app
- Pulse animation uses a `useEffect` with `setTimeout` to set `showPulse = false` after 2 seconds, preventing continuous animation
- Bottom sheet for AI actions includes `AIProviderFooter` at the bottom, same as the current dropdown
- All changes are CSS/conditional rendering only -- no business logic modifications

