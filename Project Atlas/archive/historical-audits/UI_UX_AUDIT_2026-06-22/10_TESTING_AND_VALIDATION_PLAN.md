# 10 — Testing & Validation Plan

How to verify each fix. **No tests were created in this audit** (per instructions); recommendations below are targeted and should be added with the corresponding fix PR.

## Baseline gates (must stay green)
- `npx tsc --noEmit` — currently **PASS (exit 0)**. Must remain clean.
- `npm run build` — currently **PASS (exit 0)** (chunk-size warnings only; see 11).
- `npm run lint` — currently **492 errors / 296 warnings**, but **all in non-UI-source** (`tests/`, `vite.config.ts`, `scripts/`): `@typescript-eslint/no-require-imports`, `no-explicit-any`, `prefer-const`. **This is pre-existing noise — do not treat as a blocker for UI work.** A UI fix must not *increase* the count in `src/`.
- Source-hash gate / `git diff --check` per Atlas DEPLOYMENT_GUIDE before any deploy.

## Existing Playwright suite (151 tests, 27 files)
Relevant UI specs already present (run with the dev server or against prod, auth required):
- `27-antigravity-auth-flows.spec.ts` — Login/redirect (185), Editor & AI actions (210), Upload & Tailoring Hub (300), Portfolio password (391), Settings & Logout (518).
- `25-antigravity-live-qa.spec.ts`, `26-antigravity-auth-qa.spec.ts` — auth + dashboard structure.
- `npx playwright test --list` confirmed all 151 enumerate cleanly.

## Browser verification this audit could NOT do (must be run before sign-off)
Because no browser was run, the following are **UNKNOWN** and should be confirmed live at 375 / 390 / 430 / 768 / 1024 / 1440 / 1920, in **both** light and dark:
1. The landing scroll feel on real iOS/Android (the headline bug).
2. Exact contrast ratios for `--lp-text-subtle`, `muted-foreground/60` placeholders, warning badge on dark.
3. Whether tall dialogs/alert-dialogs actually trap on a small phone.
4. The light-mode editor appearance.

---

## Per-fix validation

### Wave 0
- **0.1 Landing scroll:** Real phone (375/390/430). Scroll top→bottom and reverse rapidly; confirm no "stick" at reversals and no large empty band after the last feature card. Confirm `<html>` carries `lenis lenis-smooth` and computed `scroll-behavior` is `auto` while Lenis is active. Re-test with reduced-motion ON (Lenis is skipped — must still scroll natively). Recommend a Playwright check asserting no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`) and that page height is finite/expected.
- **0.2 Dialog trap:** Open a long dialog and a long AlertDialog at 375×667; confirm the body scrolls and footer buttons are reachable. Regression: dialogs that already set `max-h` are unchanged.
- **0.3 `info` token:** Render `<Badge variant="info">` and an info toast; confirm tinted bg + colored text in both themes.
- **0.4 Tailoring clip:** 390px result page; confirm the last export link + footer clear the fixed bar; desktop (≥640px) padding unchanged.

### Wave 1 (editor theming)
- Toggle light/dark on `/editor`; confirm nav rail, section headers, preview toolbar, chips are legible and on-theme in **both**. Spot-check contrast ≥4.5:1 for text. Verify no white-alpha text remains on light surfaces.

### Wave 2 (correctness)
- **2.1:** Store holding resume A → hard-navigate `/preview?id=B`; confirm a skeleton (not A) shows until B loads, and no export fires against A. 
- **2.2:** Import the same PDF twice; confirm one resume or an explicit "Open existing/Create copy"; double-click continue → only one create.
- **2.3:** Stub/login premium → `/pricing`; Free/Pro cards show "Included"/disabled, not "Upgrade".
- **2.4:** Trigger the guardrail with a short JD; confirm a recoverable warning with one-tap retry + credit note; guardrail still blocks no-op output.
- **2.5:** No fabricated percentage appears as a fact in tip cards.

### Wave 3 (z-index/overlays)
- Hover a tooltip-bearing control with a Dialog open → tooltip under the dialog. Open the four `z-[100]` dialogs with the workspace drawer/chat present → no bleed-through. Keyboard-test `AIQuestionsDialog`/`HiredCelebrationModal` → Escape closes, focus trapped + restored. Regression-test toast (70), keyboard toolbar (60), ai-dialog (65), splash/consent.

### Wave 4 (a11y)
- Screen-reader (NVDA/VoiceOver): AI generate → "busy" then "results ready"; ai-studio/contact fields read their labels; clicking a label focuses its input; contact-form error/success announced. Keyboard: visible focus ring on contact inputs; portfolio chat send reads "Send message"; measure rendered button heights ≥44px at 375px. Run axe-core on key pages and record violations.

### Wave 5 (mobile/responsive)
- 390px: identify + reach the current section without opening the sheet (if a tab bar is added); FAB doesn't overlap the last resume row; AI-Studio composer fully visible (not under the header); preview last lines clear the action bar; mobile primary button behavior matches its label. Editor: field tops align; nav rail stays expanded across section changes; year select reachable quickly.

### Wave 6 (tokens)
- WiseHire brief surfaces follow the blue primary on product/theme switch. Dark input distinguishable from page + border. Visual diff of radius/H1/card changes against the Atlas previews (`Project Atlas/design-system/production/preview/*.html`).

---

## Recommended new test coverage (add with fixes, not now)
- **Playwright responsive smoke:** loop the public landing + key authed pages over the 8 viewports asserting `scrollWidth <= innerWidth` (no horizontal overflow) and that primary CTAs are in-viewport. Catches regressions of the scroll/overflow class.
- **Playwright overlay test:** open Dialog/AlertDialog/Drawer with tall content at 375×667 and assert the primary button is within the viewport and the body is scrollable.
- **Vitest token test:** assert `info`/`success`/`warning`/`error` resolve to a non-empty computed color (guards the dead-class regression).
- **Storybook/visual regression** (if adopted) for editor light vs dark and the overlay primitives.
- Note: `AIStudioPage` has known pre-existing failing unit tests (unrelated to UI) — do not conflate with UI work.
