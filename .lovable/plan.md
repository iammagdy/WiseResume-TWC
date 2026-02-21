
# Editor Page Improvements

## Issues Found

### 1. Performance: Remaining infinite animation loops
- **EditorPage.tsx line 1006**: Desktop "Wise AI" button has `animate-[pulse-glow_2s_ease-in-out_infinite]` CSS animation running permanently
- **EditorPage.tsx lines 1011, 1023, 1034**: Three separate `animate-pulse` notification dots running on header buttons
- **AddSectionFAB (line 1370-1372)**: First-visit pulse uses `repeat: Infinity` Framer Motion loop -- should use CSS `animate-[ping_1.5s_ease-out_4]` (run 4 times then stop, like we did for profile pulse)
- **AIFloatingButton.tsx line 118**: `animate-pulse` on the FAB overlay runs infinitely

### 2. Performance: Inline style tags re-rendered
- **EditorPage.tsx lines 1045-1056**: The `spring-enter` and `save-check-pop` keyframe `<style>` tags are inside the render tree and re-injected on every render. Should be moved to module level or a CSS file.
- **ProgressBar.tsx lines 46-56**: Same issue -- `progress-confetti-burst` and `progress-text-pulse` keyframes are inline.
- **StepperNav.tsx lines 233-243**: `stepper-confetti-burst` and `stepper-icon-pulse` keyframes inline.

### 3. UX: Mobile header is cluttered
- The header has back button, resume name, undo/redo, version history, Template button, and Chat button all competing for space. On a 375px screen this leaves the resume name truncated to nearly nothing.
- **Fix**: Hide undo/redo on xs screens (they're already `hidden xs:flex`) but the two mobile-only buttons (Template + Chat) could be consolidated into the tools sheet to free up space.

### 4. UX: Mobile Editor/Preview tabs feel disconnected
- The `TabsList` at line 1177 uses plain rounded-none styling with no visual connection to the content below. It looks like a generic switch rather than an integrated editing experience.
- **Fix**: Add a subtle bottom border highlight on the active tab and slightly better spacing to make it feel more native.

### 5. UX: Section navigation buttons (Previous/Next) are too large
- The Previous/Next buttons at lines 812-852 have `min-h-[56px]` which is taller than standard mobile nav buttons. Combined with `flex-col xs:flex-row`, they stack vertically on the smallest screens, consuming ~120px of vertical space.
- **Fix**: Reduce to `min-h-[48px]` and ensure they always sit side-by-side with `flex-row` even on xs.

### 6. UX: SectionCard tip pill is always visible
- The tip pill (e.g., "Include a professional email...") takes space even after the section is complete. Once `status === 'complete'`, the tip is no longer helpful.
- **Fix**: Hide the tip when status is `'complete'`.

### 7. UX: No visual feedback on section switch
- Each section uses `animation: 'spring-enter 0.35s ease-out'` via inline CSS style. This works but there's no exit animation, making transitions feel abrupt.
- **Fix**: This is minor and the current approach is fine for performance -- no change needed here.

### 8. Code: 1393-line monolith
- EditorPage.tsx continues to grow. The header (lines 906-1039) is 133 lines of JSX that could be a separate component.

---

## Proposed Changes

### File: `src/pages/EditorPage.tsx`

**Move inline keyframes to module level:**
- Extract the `spring-enter` and `save-check-pop` `<style>` tag (lines 1045-1056) to a `const` outside the component, injected once.

**Remove infinite animations from header buttons:**
- Line 1006: Replace `animate-[pulse-glow_2s_ease-in-out_infinite]` with a static glow (`bg-primary/10 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.3)]`)
- Lines 1011, 1034: Replace `animate-pulse` notification dots with a static dot or a CSS animation that runs 3-4 times then stops (`animate-[ping_1.5s_ease-out_3]`)
- Line 1023: Same for template button pulse dot

**Simplify section navigation buttons:**
- Change `min-h-[56px] sm:h-12` to `min-h-[48px]`
- Change `flex-col xs:flex-row` to always `flex-row` so they never stack

**Extract EditorHeader component:**
- Move lines 906-1039 into `src/components/editor/EditorHeader.tsx` to reduce file size by ~130 lines

### File: `src/components/editor/SectionCard.tsx`

**Hide tip when complete:**
- Wrap the tip pill in a condition: only render when `status !== 'complete'`

### File: `src/components/editor/ProgressBar.tsx`

**Move keyframes to module level:**
- Extract the `<style>` tag content to a module-level constant

### File: `src/components/editor/StepperNav.tsx`

**Move keyframes to module level:**
- Extract confetti and pulse keyframes to module-level injection

### File: `src/pages/EditorPage.tsx` (AddSectionFAB)

**Fix infinite pulse on FAB:**
- Replace lines 1370-1372 Framer Motion `repeat: Infinity` pulse with CSS `animate-[ping_1.5s_ease-out_4]` (runs 4 times then stops)

### File: `src/components/editor/AIFloatingButton.tsx`

**Remove remaining infinite pulse:**
- Line 118: The `animate-pulse` on the gradient overlay should be removed -- the FAB already has a shadow glow

---

## Summary

| Area | Issue | Fix |
|---|---|---|
| Header buttons | 4 infinite pulse animations | Static glow or finite CSS |
| AddSectionFAB | Infinite FM pulse loop | CSS ping x4 |
| AIFloatingButton | Infinite CSS pulse | Remove overlay |
| Inline style tags | 3 components re-inject keyframes | Module-level constants |
| Section nav buttons | Too tall, stack on xs | 48px, always flex-row |
| SectionCard tip | Shows when complete | Hide when status=complete |
| EditorPage.tsx | 1393-line monolith | Extract EditorHeader |

All changes maintain visual parity -- no features removed, just cleaner code and fewer wasted CPU cycles.
