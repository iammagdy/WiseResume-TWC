

# AI Studio Tab Improvements

## Issues Found

### 1. Performance: Infinite animation on first visit
- **Line 322**: The Wise AI Chat button has `animate-pulse` when `isFirstVisit` is true. This is an infinite CSS animation that runs until the user dismisses the tour modal.
- **Fix**: Replace with a finite animation like `animate-[pulse_1.5s_ease-in-out_3]` that pulses 3 times then stops.

### 2. Performance: Cycling placeholder interval never pauses
- **Lines 130-133**: A `setInterval` runs every 3 seconds to cycle placeholder text, even when the page is backgrounded or the input is not visible (desktop hides the sticky input).
- **Fix**: Use `document.visibilitychange` to pause the interval when the tab is hidden, or switch to a CSS-only approach.

### 3. Performance: 12 individual `motion.div` entrance animations
- Every section (header, resume bar, chat button, 4 categories, pro tip) has its own `motion.div` with `initial/animate`. That's 8+ Framer Motion instances orchestrating on mount.
- **Fix**: Wrap in a single `motion.div` parent with `staggerChildren` or remove individual entrance animations for the category sections (they're below the fold on mobile anyway and the user won't see them animate).

### 4. UX: Tool cards are too uniform -- no visual priority
- All 14 tools look identical (same size, same glass-surface style). The most-used tools (Smart Tailor, Job Match, Enhance) don't stand out from niche tools (Resignation Letters, Company Briefing).
- **Fix**: Make the top 2-3 tools in "Resume Tools" slightly larger or add a subtle primary border/glow to featured tools. Add a "Popular" badge to the top 2 tools.

### 5. UX: Suggestion chips in the Chat button are not tappable
- The 3 suggestion chips inside the chat button (lines 335-342) are `<span>` elements inside a `<button>`. Tapping them opens the chat sheet but doesn't pre-fill the suggestion text.
- **Fix**: Convert them to individual tappable elements that pre-fill the chat with the suggestion text, so users get instant value.

### 6. UX: Pro tip is static and always the same
- The "Pro tip" at the bottom always shows the same message about pasting a job URL. After the first read it becomes visual noise.
- **Fix**: Cycle through 3-4 tips or make it dismissible (persist to localStorage).

### 7. UX: Sticky mobile input shadow is too harsh
- **Line 400**: `shadow-[0_-4px_12px_rgba(0,0,0,0.2)]` creates a heavy dark shadow above the input. On light mode this looks jarring.
- **Fix**: Soften to `shadow-[0_-2px_8px_rgba(0,0,0,0.08)]` and add a top border for structure.

### 8. UX: No recent/frequently used tools section
- Users must scan all categories every time. Power users who use Smart Tailor and Job Match daily have to scroll through the same grid.
- **Fix**: Add a "Recent" row at the top showing the last 3 tools used (tracked in localStorage). This gives returning users a one-tap shortcut.

---

## Proposed Changes

### File: `src/pages/AIStudioPage.tsx`

**Fix infinite pulse on chat button:**
- Line 322: Replace `animate-pulse` with `animate-[pulse_1.5s_ease-in-out_3]`

**Make suggestion chips actionable:**
- Convert the 3 `<span>` chips to `<button>` elements that stop propagation, pre-fill the chat with the suggestion text, and open the chat sheet

**Reduce motion.div overhead:**
- Remove individual `initial/animate` from category sections (lines 349-353) -- they're below the fold on xs screens and the staggered delay adds no perceived value. Keep the header and chat button animations.

**Soften sticky input shadow:**
- Line 400: Change to `shadow-[0_-2px_8px_rgba(0,0,0,0.08)] border-t border-border`

**Make Pro tip dismissible:**
- Add a dismiss button (X) and persist dismissal in localStorage via a useState initializer
- Rotate through 3-4 tips using a random index seeded by day

**Add "Recent Tools" row:**
- Track last 3 used tool IDs in localStorage (updated in `handleToolAction`)
- Render a horizontal scroll row above the categories showing the recently used tools as compact chips

### File: `src/components/ai/AICostBadge.tsx`

No changes needed -- this component is clean and lightweight.

---

## Summary

| Area | Issue | Fix |
|---|---|---|
| Chat button | Infinite pulse on first visit | Finite 3x pulse |
| Placeholder cycling | Runs when tab hidden | Pause on visibilitychange |
| Entrance animations | 8+ individual motion.div | Remove from below-fold sections |
| Tool cards | All look identical | Featured badge on top tools |
| Suggestion chips | Not individually tappable | Make them pre-fill chat |
| Pro tip | Static, never changes | Dismissible + rotating tips |
| Sticky input | Harsh shadow | Softer shadow + border |
| Navigation | No shortcuts for power users | Recent tools row |

All changes maintain existing functionality while improving perceived performance and making the most common actions faster to reach.
