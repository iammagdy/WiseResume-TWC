# Task #65 — Tailor Animated Demo Panel

**Last verified:** 2026-05-06
**Type:** UX enhancement
**Files touched:**
- `src/components/editor/tailor/TailorDemoPanel.tsx` (new)
- `src/pages/TailorPage.tsx`

---

## What was built

Replaced the static blurred skeleton placeholder in the Tailor page's desktop right panel with a looping animated "Before → After" demo component.

### `TailorDemoPanel`

**Location:** `src/components/editor/tailor/TailorDemoPanel.tsx`

**Animation loop (~4.85 s total):**
1. `before` (1800 ms) — "Before" badge + muted bullet in a muted card
2. `transforming` (700 ms) — Before fades/blurs; pulsing `gradient-primary` sparkle globe overlays the centre
3. `after` (1900 ms) — "After" badge + stronger bullet in a primary-tinted card
4. `resetting` (350 ms) — After fades out; example index advances; loop restarts

**Three illustrative examples cycle in order:**
- Software Engineer
- Project Manager
- Marketing Manager

**Reduced motion:** `useReducedMotion()` from framer-motion detected at mount. When true, the component skips to static `after` phase and the timer `useEffect` returns early — no animation runs.

**Progress dots:** three dots below the stage area show which example is active (wide primary dot = current).

**Unmount:** component is only rendered in the `else` branch of the `(isTailoring || tailorResult || tailorError || showAppliedCTA)` conditional in `TailorPage.tsx` — it disappears automatically when tailoring begins or results arrive.

### No regression
The `ResultsPanel` render path is unchanged. `TailorDemoPanel` is a leaf component with no state shared upward.
