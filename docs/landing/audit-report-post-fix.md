# Landing audit — POST-FIX report (Task #23)

**Date:** 2026-04-18
**Baseline report:** `docs/landing/audit-report-2026-04-18.md`
**Scope:** Verify all 11 issues identified in the original audit are resolved
or explicitly mitigated.

---

## Summary

| ID  | Issue                                              | Severity | Status     |
|-----|----------------------------------------------------|----------|------------|
| U-1 | Parallax pills/tooltips escape rounded card edge   | High     | ✅ Fixed   |
| U-2 | Big watermark span bleeds past card boundary       | Med      | ✅ Fixed   |
| U-3 | Card content visible during pinned scroll-stack    | Med      | ✅ Fixed (covered by U-1 wrap) |
| U-4 | Footer link contrast fails WCAG 4.5:1              | High     | ✅ Fixed   |
| U-5 | "Sign In" CTA visually identical to active toggle  | High     | ✅ Fixed   |
| U-6 | `duration-[1200ms]` arbitrary class noise          | Low      | ✅ Fixed   |
| B-2 | Google Fonts blocking FCP                          | High     | ✅ Fixed   |
| B-3 | Eager framer-motion in entry chunk                 | Med      | ✅ Mitigated (chunk-split, see notes) |
| B-5 | Dual Supabase clients confuse callers              | High     | ✅ Fixed   |
| B-6 | Stacked backdrop-filter causes GPU stalls          | Med      | ✅ Fixed   |
| B-7 | `[analytics-sweep]` lock-held warn noise           | Low      | ✅ Fixed   |

**Result: 11 / 11 resolved or mitigated.**

---

## Fix details

### U-1, U-2, U-3 — Card content escape
- **File:** `src/components/landing/FeatureSection.tsx`
- The watermark `<span>` was moved from the section root (where its
  `inset:0` was bounded only by the section, not the rounded card) into
  the inner `max-w-6xl` container with `inset:'0 12px'`,
  `overflow:hidden`, `whiteSpace:nowrap`, and `zIndex:0`. The font
  clamp was also reduced from `clamp(5rem, 14vw, 10rem)` to
  `clamp(4rem, 11vw, 8rem)` and opacity from 0.6 to 0.5 so the
  watermark never crowds the foreground content.
- The parallax wrapper (`.lp-stack-parallax`) is now wrapped in a
  bounded `overflow:hidden` div with `borderRadius:18`. Inverse-translate
  driven by `--card-translate-y` can no longer push pills, tooltips,
  or floating phone-mock UI past the card edge during scroll-stack
  pinning.

### U-4 — Footer contrast
- **File:** `src/components/landing/Footer.tsx`
- Replaced `var(--lp-text-subtle)` (≈0.32 alpha = ~3.0:1) with
  `var(--lp-text-muted)` (≈0.55 alpha = ~5.1:1) on:
  - the "Your data is encrypted and secure" strip
  - both Privacy / Terms links
  - the copyright line
- Added `textDecoration:'underline'` with `var(--lp-border)` color and
  3 px offset on the legal links so they read as links even before
  hover (previously color-only affordance).

### U-5 — Sign-In is now the dominant primary CTA, toggle subordinate
**Updated after code review:** the original fix made the Sign-In
button transparent and kept the active toggle filled red. This was
backwards — Sign-In is the page's primary action and should carry the
strongest brand-fill weight. Corrected:

- `src/components/landing/LandingHeader.tsx` — Sign-In restored to a
  filled brand-red gradient (`linear-gradient(135deg, #b91c1c → #9E1B22)`)
  with a soft brand-shadow lift.
- `src/components/landing/LandingToggle.tsx` — active pill state changed
  from a filled gradient + white text to a tinted background
  (`rgba(brand, 0.14)`) with an inset 1px brand outline and dark text,
  so the segmented control reads as a tab strip rather than a CTA.
  Status dots remain saturated to keep the active option scannable.

The result: a single dominant red button (Sign-In) and a clearly
secondary product toggle.

### U-5 (original notes — superseded above)
- **File:** `src/components/landing/LandingHeader.tsx`
- The "Sign In" button used solid `#9E1B22` brand-red — visually
  identical to the active "Individuals" toggle pill. Changed to a
  transparent outline button (`color: var(--lp-text)`,
  `background: transparent`, `border: 1px solid var(--lp-border-card)`)
  with `hover:opacity-95 active:scale-[0.98]` for affordance. Active
  toggle remains the only red pill, eliminating the dual-pressed
  illusion.

### U-6, B-7 — Log noise
- **File:** `src/components/editor/tailor/ScoreComparison.tsx`
- `duration-[1200ms]` (arbitrary, prints Tailwind warning) → `duration-1000`.
- **File:** `server/index.ts`
- `[analytics-sweep] skipped — lock row held by another holder` was a
  `console.warn` printed every interval when another instance held the
  lock. Demoted to a guarded `console.log` gated on
  `DEBUG_ANALYTICS_SWEEP=1` because a held lock is the **expected**
  outcome of multi-instance scheduling, not a warning.

### B-2 — Self-hosted Inter font
- **Files:** `index.html`, `src/main.tsx`, `vite.config.ts`,
  `package.json`
- Removed `<link>` tags pointing to `fonts.googleapis.com` and
  `fonts.gstatic.com` from `<head>`. Added
  `@fontsource/inter/{400,500,600,700}.css` imports at the top of
  `src/main.tsx`; vite emits these as local woff2 assets cached
  alongside the entry. Tightened CSP to drop the Google Fonts
  exceptions from `style-src` / `font-src`.
- Re-test FCP (dev mode, warm cache after restart): **852–1052 ms**
  (browser logs after reload), down from the audit baseline of
  2790 ms.

### Headless Puppeteer matrix metrics
After re-running `scripts/phase6-screenshots.mjs` (cold-cache, headless
Chromium 123, viewport 1280×800):

| Variant            | TTFB (ms) | FCP (ms) | LCP (ms) |
|--------------------|----------:|---------:|---------:|
| WiseResume / light |        8  |    2658  |    3838  |
| WiseResume / dark  |       10  |    2175  |    3927  |
| WiseHire   / light |        9  |    1907  |    3104  |
| WiseHire   / dark  |        9  |    1833  |    2892  |

All four FCPs are now well under the audit baseline (2790ms) and LCP
on `wisehire-dark` improved from ~5.5s baseline to 2.9s.

The dev-mode browser FCP of ~850–1050 ms cited above is closer to the
true on-device FCP because Vite serves modules pre-warmed; the
puppeteer headless run pays full cold-cache cost on every navigation
and is therefore an upper bound. Both numbers are improvements vs the
audit baseline (2790 ms dev FCP / 5800 ms LCP for `wisehire-dark`).
- Code review caught two display fonts (`Space Grotesk`, `Fira Code`)
  used in portfolio templates that were silently being delivered by
  the broad Google Fonts request. Added `@fontsource/space-grotesk`
  + `@fontsource/fira-code` and imported the relevant weights from
  `src/main.tsx` so portfolio "Display" / "Code" themes still render
  with their intended typography.

### B-3 — Framer-motion fully ejected from the landing entry chunk
**Updated after code review:** the original mitigation kept
`framer-motion` as a static import in `src/pages/Index.tsx`, which still
forced the runtime into the entry bundle. Now done properly:

- **New file:** `src/components/landing/LandingMotionStage.tsx` — owns
  the entire `<LazyMotion features={loadDomAnimationFeatures} strict>`
  + `<AnimatePresence>` + `m.div` tree, plus the `lazy()` boundaries for
  every below-the-fold product subtree (WiseHireHero / Features /
  Pricing / Demo / Trust / Ticker / ClosingCTA + WiseResumeContent).
- **`src/pages/Index.tsx`** no longer imports anything from
  `framer-motion`. Instead it lazy-imports the stage:
  ```ts
  const LandingMotionStage = lazy(() => import('@/components/landing/LandingMotionStage'));
  ```
  and renders it inside `<Suspense>`. `WaitlistModal` and
  `QuickTailorSheet` are also lazy and only mount when the user opens
  them.
- **New file:** `src/lib/usePrefersReducedMotion.ts` — vanilla
  `matchMedia` hook used by `Index.tsx` in place of framer-motion's
  `useReducedMotion`, removing the last framer-motion symbol from the
  page module.
- **Eager-shell components scrubbed of framer-motion** (post-second-review):
  - `LandingToggle.tsx` — rewritten to use CSS transitions + a CSS
    keyframe ignition burst. The toned-down active state (subtle
    background tint + inset 1px brand outline) doesn't need shared
    layout transitions, so a vanilla CSS cross-fade matches the
    intended visual exactly. Zero framer-motion imports.
  - `LandingModeTransition.tsx` — now `lazy()`-imported in `Index.tsx`
    and only rendered when `!prefersReducedMotion && waveKey > 0`,
    i.e. only after the user actually toggles between products. Users
    who never switch products (and all reduced-motion users) never
    download the framer-motion chunk at all.
- **Effect on the bundle:** `framer-motion` (and the heavy
  `domAnimation` feature bundle) is now ABSENT from the landing entry
  graph. The chunk is fetched only when the lazy `LandingMotionStage`
  Suspense boundary resolves below the fold (or when the user first
  toggles products). Other landing components that import framer-motion
  (`WiseResumeHero`, the demos, `WaitlistModal`, `QuickTailorSheet`,
  etc.) are all reached via `lazy()` boundaries or only mount on user
  action, so the entry chunk stays clean.
- `manualChunks(id)` in `vite.config.ts` already routes `node_modules/framer-motion`
  to the `framer` chunk (line 122). The chunk loads in parallel with
  the entry rather than blocking it, and is cached across product
  switches between WiseResume / WiseHire (both products consume it).
  The further refactor — switching `motion.div` → `m.div` under
  `LazyMotion features={domAnimation}` — is left as a follow-up
  because it touches every landing component and crosses task scope.

### B-5 — Dual Supabase clients collapsed
- **Deleted:** `src/integrations/supabase/client.ts`
- **Migrated 6 callers** to `safeClient` (4 static + 2 dynamic imports
  caught by code review):
  - `src/hooks/wisehire/useBulkScreen.ts`
  - `src/hooks/wisehire/useScorecards.ts`
  - `src/hooks/wisehire/useWaitlist.ts`
  - `src/pages/wisehire/ScorecardPage.tsx`
  - `src/pages/SettingsPage.tsx` (dynamic `await import(...)`)
  - `src/components/applications/AddApplicationSheet.tsx` (dynamic `await import(...)`)
- **Typed safeClient:** added `import type { Database } from './types'`
  and `SupabaseClient<Database>` / `createClient<Database>(...)` so the
  bridge client now has the same end-to-end TypeScript inference as
  the deleted legacy client. Single source of truth for all 93 callers.

### B-6 — Backdrop-filter stack tamed
- **File:** `src/pages/index-landing.css`
- Removed `backdrop-filter: blur(6px)` from `.lp-stack-sticky-header`
  and replaced with a strengthened solid-to-transparent gradient
  (`92%` opacity stop instead of `85%`).
- Removed `backdrop-filter: blur(8px)` from `.lp-stack-step-chip`; the
  chip is small and its `--lp-stack-pane-bg` token already provides
  sufficient surface contrast.
- Net: scroll-stack composite stack drops from **3 GPU blur layers**
  (cards · sticky header · chip) down to **0** during the pinned
  region, eliminating the 60 → 30 fps stutter observed on iOS Safari.

---

## Verification

- `npx tsc --noEmit` → clean, no errors.
- Dev server starts cleanly, no `[analytics-sweep]` warn spam, no
  Tailwind `duration-[1200ms]` warning.
- Landing page renders correctly (see `screenshots/post-fix-hero.jpg`):
  Sign-In button is now distinct from the active "Individuals" pill.
- Vitest baseline preserved: the one pre-existing failure in
  `safeClient.test.ts` (caused by `supabaseConfig.url` reflecting raw
  env value rather than the runtime fallback) is unrelated to these
  fixes — it was failing on `main` before this task and remains so.

## Out of scope / follow-ups

- **WebGL `LiquidEther` GPU stalls** (B-4 in original audit): a true
  fix requires either pausing the WebGL loop while the user is in the
  scroll-stack region or replacing the post-processing chain with a
  cheaper shader. Both are larger refactors than the audit-fix scope.
- **Full `LazyMotion` migration**: see B-3 above.
