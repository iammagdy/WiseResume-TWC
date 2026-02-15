

## Mobile Responsiveness Fix: Work Timeline and Skills Chips

### Overview

Optimize the work experience timeline and skills section for mobile touch interaction. Desktop layouts remain completely unchanged.

### Changes

**File 1: `src/components/editor/ExperienceTimeline.tsx`**

Hide the horizontal timeline bar on mobile and show a vertical card-based layout instead:

- Import `useIsMobile` hook
- On mobile (<768px), replace the horizontal bar visualization with a vertical list of cards:
  - Each job segment renders as a full-width rounded card showing the company name, date range label, and a colored left border (primary for jobs)
  - Gap segments render as warning-styled alert banners between job cards, with the "Explain with AI" button inline (min 44px height)
  - Year markers shown as text above/below the vertical list
- On desktop (>=768px), render the existing horizontal timeline bar exactly as-is
- The gap alert section at the bottom remains shared between both layouts (already has good mobile styling)
- No changes to data parsing, gap detection, or any logic

**File 2: `src/components/editor/SkillsSection.tsx`**

Improve touch targets and layout for skills on small screens:

- Skill input row: Add responsive classes so the input is `h-12 text-base` (already 12 on input, ensure 16px font with `text-base` to prevent iOS zoom), and the Add button is `min-h-[48px]` on mobile
- Current skills chips: Change gap from `gap-2` to `gap-2 sm:gap-2` (keep same), increase Badge `min-h` from `[44px]` to keep at 44px but add `px-3 sm:px-4` padding, and ensure the X delete area has a `min-w-[32px] min-h-[32px]` tap zone by wrapping the X icon in a span with those dimensions
- Common Skills section: Change from `flex flex-wrap` to `grid grid-cols-2 sm:flex sm:flex-wrap` so on mobile it shows as a 2-column grid with `gap-2`, each button `min-h-[44px]`
- Suggested skills (gap analysis): Same grid treatment -- `grid grid-cols-2 sm:flex sm:flex-wrap` with `gap-2`
- All changes use Tailwind responsive prefixes only; no logic changes

### What Does NOT Change

- All CRUD operations on work experiences (add, edit, delete, expand/collapse)
- AI enhancement features (InlineAIButton, AIEnhanceDialog, AIContextualNudge)
- Gap detection logic and GapExplainerSheet
- Skills add/remove/suggest logic
- Desktop layouts (>=768px) -- identical behavior and appearance
- Data persistence, auto-save, navigation guards
- Drag-to-reorder functionality (if any)
- SectionEmptyState components

### Technical Notes

- Uses existing `useIsMobile` hook (768px breakpoint) for timeline toggle
- Uses Tailwind responsive prefixes (`sm:`, `md:`) for skills adjustments
- Touch targets maintain 44px minimum per project guidelines
- Input uses `text-base` (16px) to prevent iOS auto-zoom on focus
- All animations (framer-motion) preserved on both layouts

