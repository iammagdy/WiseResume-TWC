
# Completing the Portfolio Enhancements

Three specific gaps remain from the approved plan, all purely additive with no risk to existing functionality.

## Gap 1 — Skills Section: Apply `skillWave` + `skillPill` animations

**Current state (lines 1264–1288):**
The Skills section uses `variants={fadeUp}` on the `motion.section` and renders plain `<span>` elements for each pill. This means all pills appear at once with no wave effect.

**Fix:** Change the section from parent-stagger `fadeUp` to `whileInView` + `skillWave`, and wrap each skill pill in `motion.span` with `skillPill` variant. The `skillWave` variant already exists at line 47-50 and `skillPill` at line 51-54.

**Changes:**
- Line 1266: change `motion.section variants={fadeUp}` → add `whileInView="visible" initial="hidden" viewport={{ once: true, margin: '-60px' }}`
- Line 1268: change `<div className="flex flex-wrap gap-2">` → `<motion.div variants={skillWave} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex flex-wrap gap-2">`
- Line 1270: change `<span key={i} ...>` → `<motion.span key={i} variants={skillPill} ...>`
- Line 1277: close with `</motion.span>` and line 1279: close `</motion.div>`

## Gap 2 — ChatWidget: Render it in the page JSX

**Current state:** The `ChatWidget` component is fully implemented (lines 132–328) with the floating button, animated chat panel, message bubbles, typing indicator, and suggestion chips. But it is **never mounted** — it does not appear anywhere in the returned JSX of `PublicPortfolioContent`.

**Fix:** Add `<ChatWidget>` just before the closing `</div>` of `#portfolio-content` (around line 1336), inside the root div. It must sit outside the `motion.div` wrapper so the `fixed` positioning works correctly (a `fixed` child inside a `motion.div` that has CSS transforms can have stacking issues).

**Placement:** After line 1335 (`</motion.div>`), before line 1336 (`</div>`):
```tsx
<ChatWidget
  profile={profile}
  resume={resume}
  accentColor={accentColor}
  pStyle={pStyle}
/>
```

## Gap 3 — `supabase/config.toml`: Add `ask-portfolio` entry

**Current state:** The `ask-portfolio` edge function (fully written at `supabase/functions/ask-portfolio/index.ts`) has no entry in `config.toml`. This means JWT verification defaults to the Supabase signing-keys check, which will reject all unauthenticated calls from visitors who have no auth token.

**Fix:** Add the following at the end of `config.toml`:
```toml
[functions.ask-portfolio]
verify_jwt = false
```

Also add `og-image` and `portfolio-meta` which were created in the previous session but also missing:
```toml
[functions.og-image]
verify_jwt = false

[functions.portfolio-meta]
verify_jwt = false

[functions.resolve-short-link]
verify_jwt = false
```

## Files Changed

| File | Lines | Change |
|---|---|---|
| `src/pages/PublicPortfolioPage.tsx` | 1266–1288 | Skills: `skillWave` wrapper + `motion.span` per pill |
| `src/pages/PublicPortfolioPage.tsx` | 1335 (after) | Add `<ChatWidget .../>` before `</div>` |
| `supabase/config.toml` | end of file | Add 4 missing function entries |

All three changes are purely additive — no existing logic is removed or altered.
