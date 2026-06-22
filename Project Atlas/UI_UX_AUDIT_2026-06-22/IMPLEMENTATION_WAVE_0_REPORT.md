# UI/UX Audit — Wave 0 Implementation Report

**Date:** 2026-06-22
**Controlling source:** `Project Atlas/UI_UX_AUDIT_2026-06-22/00_EXECUTIVE_SUMMARY.md`
**Scope:** A controlled, UI-only fix pass for the four highest-impact / lowest-risk items (A–D) called out in the Executive Summary + `09_FIX_PLAN_PRIORITIZED.md` "Wave 0". No backend/API/auth/AI/payment/Appwrite/route/state/deployment changes.
**Code changed:** YES (8 files, UI only). **Not committed/pushed** — awaiting owner approval for commit/PR.

---

## What was fixed

### A — Landing mobile scroll artifact (P0)
*(Exec Summary §6 / `05_LANDING_MOBILE_SCROLL_BUG.md`)*
- **Imported the official Lenis stylesheet** (`lenis/dist/lenis.css`) in `src/main.tsx`. This restores the documented document-scroller reset (`html.lenis body { height:auto }`, `[data-lenis-prevent] { overscroll-behavior:contain }`, `.lenis.lenis-stopped { overflow:clip }`) that was previously missing — the leading root cause.
- **Stopped native smooth-scroll from fighting Lenis.** Added one unlayered rule to `src/index.css`: `.lenis.lenis-smooth { scroll-behavior: auto !important; }`. The official Lenis CSS does **not** include this, and the global `@layer base html { scroll-behavior: smooth }` (index.css ~L424) was staying active for normal-motion users. Because unlayered styles beat `@layer base` styles (and `!important`), native smooth-scroll is now disabled **only while Lenis is active** (Lenis adds `lenis lenis-smooth` to `<html>` in the landing's window-scroll mode — verified `WiseResumeContent.tsx:80` `useWindowScroll`). Other pages keep native smooth-scroll.
- **Reduced the trailing mobile empty band.** `src/components/landing/ScrollStack.css`: added `@media (max-width:640px) { .scroll-stack-inner { padding-bottom: 14vh } }` (desktop stays 30vh).
- **Addressed the `100vh` mobile overshoot.** Same file: `.scroll-stack-inner` now has `min-height: 100vh; min-height: 100dvh;` (vh fallback first, dvh override for supporting browsers).
- **Not done (intentionally):** ScrollStack/Aurora were not removed or rewritten; the second progress-bar scroll listener and Aurora throttling (secondary contributors C3/C4 in report 05) were left as documented follow-ups — smallest safe fix preferred.

### B — Dialog / AlertDialog / Drawer mobile trap (P0)
*(Exec Summary top-10 #3 / `04_DIALOGS_OVERLAYS_AUDIT.md`)*
- `src/components/ui/dialog.tsx` — default (non-fullscreen) `DialogContent` branch now includes `max-h-[calc(100dvh-2rem)] overflow-y-auto` (the `fullScreenOnMobile` branch already had a bound).
- `src/components/ui/alert-dialog.tsx` — `AlertDialogContent` now includes `max-h-[calc(100dvh-2rem)] overflow-y-auto`.
- `src/components/ui/drawer.tsx` — vaul `DrawerContent` now includes `max-h-[calc(100dvh-6rem)] overflow-y-auto` (the `mt-24` top offset = 6rem).
- shadcn/Radix structure preserved; no callers were rewritten. Callers that already set their own `max-h` simply override the new baseline.

### C — Missing Tailwind `info` semantic token (P1)
*(Exec Summary top-10 #8 / `07`, `08`)*
- `tailwind.config.ts` — added `info: { DEFAULT: "hsl(var(--info))", foreground: "hsl(var(--info-foreground))" }` next to the existing `success`/`warning` entries. The `--info` / `--info-foreground` CSS vars already existed in `index.css` (`:root`, `.light`, `.dark`, `.app-theme`).
- This activates the previously-dead classes: `badge.tsx:17` (`bg-info/10 text-info hover:bg-info/15`) and `sonner.tsx:30` (`text-info`). `success`/`warning`/`destructive` and product-scoped tokens untouched.

### D — Tailoring Hub mobile result clipping (P1)
*(Exec Summary top-10 #5 / `03` Tailoring)*
- `src/components/job-match/job-match-workspace.css` — the unconditioned `.jmw-result-body--compare { padding-bottom: 1.25rem }` (which won by source order over the `@media (max-width:639px)` rule, clipping content under the fixed action bar on phones) is now scoped to `@media (min-width: 640px)`. The two media queries are mutually exclusive, so mobile keeps `4.5rem + safe-area` and desktop keeps `1.25rem`. Layout/logic otherwise unchanged.

---

## Exact files changed (8)
| File | Change |
|------|--------|
| `src/main.tsx` | `import "lenis/dist/lenis.css";` |
| `src/index.css` | Unlayered `.lenis.lenis-smooth { scroll-behavior: auto !important }` reset block |
| `src/components/landing/ScrollStack.css` | `min-height: 100dvh` fallback + `@media (max-width:640px)` reduced `padding-bottom: 14vh` |
| `src/components/ui/dialog.tsx` | Default `DialogContent`: `max-h-[calc(100dvh-2rem)] overflow-y-auto` |
| `src/components/ui/alert-dialog.tsx` | `AlertDialogContent`: `max-h-[calc(100dvh-2rem)] overflow-y-auto` |
| `src/components/ui/drawer.tsx` | `DrawerContent`: `max-h-[calc(100dvh-6rem)] overflow-y-auto` |
| `tailwind.config.ts` | Added `info` semantic color (DEFAULT + foreground) |
| `src/components/job-match/job-match-workspace.css` | Scoped desktop `padding-bottom: 1.25rem` to `@media (min-width:640px)` |

No other files touched. No backend, Appwrite function, API, auth, route, schema, AI-logic, payment, or deployment-workflow files changed.

---

## What was intentionally NOT fixed (deferred to Wave 1/2)
Per the task's deferral list — these remain open P0/P1 from the Executive Summary:
- **Editor light-mode theming refactor (P0)** — needs an owner decision (light theme vs intentionally-dark editor) before implementing; not a copy-only fix.
- **Preview wrong-resume stale-store gating (P1)** — render logic change; deferred.
- **Pricing CTA plan-rank (P1)** — behavior logic; deferred.
- **Dashboard fabricated tip statistics (P1)** — copy change; deferred (not bundled to keep this pass strictly A–D).
- **z-index system refactor (P1)** — global stacking change; deferred.
- **AI `aria-live` / Radix-bypass a11y pass (P1)** — deferred.
- **Mobile nav redesign, upload dedupe, WiseHire token cleanup** — deferred.

Secondary landing contributors from report 05 (Aurora throttle on touch-scroll, progress-bar second scroll listener) were also left as follow-ups.

---

## Validation
Commands run from repo root:
- `npx tsc --noEmit` → **PASS (exit 0)**.
- `npm run build` → **PASS (exit 0)**, "✓ built in 44.50s", `[check-no-sourcemaps] OK`. Only the pre-existing chunk-size (>500kB) advisory warnings — unchanged from the pre-edit baseline, unrelated to these edits.
- `npx eslint` on the 4 edited TS files (`main.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `drawer.tsx`) + `tailwind.config.ts` → **no new errors**. The only reported error (`tailwind.config.ts:213` `require()`) is **pre-existing** (a plugin require ~100 lines from the `info` edit) and was present in the baseline lint run; the four UI components reported zero issues.

Code-verification of the task's checklist:
- **Landing:** Lenis reset present (official CSS import + `.lenis.lenis-smooth { scroll-behavior:auto !important }`); native smooth-scroll no longer fights Lenis while active; ScrollStack mobile `padding-bottom` reduced to 14vh; `100vh` → `100dvh` (with fallback). ✅ (code-level)
- **Dialogs:** default `DialogContent`, `AlertDialogContent`, and `DrawerContent` are now height-bounded with internal scroll; existing classes/`fullScreenOnMobile` branch still work (additive). ✅ (code-level)
- **Tailwind token:** `bg-info`, `text-info`, `text-info-foreground` now compile through Tailwind; the Info badge/Sonner classes are no longer dead. ✅ (build succeeded with the new token)
- **Tailoring Hub:** mobile result body keeps `4.5rem + safe-area` bottom padding under the fixed action bar; desktop result layout unchanged (`1.25rem` now scoped to ≥640px). ✅ (code-level)

**Live-browser confirmation: NOT performed** (no dev server started — consistent with Atlas approval rules and this task's prescribed `tsc`/`build` + code-verify validation method). The on-device confirmations the audit marked UNKNOWN remain UNKNOWN — see Remaining Risks.

---

## Remaining risks
- **Scroll fix is device-confirmable, not yet device-confirmed.** The Lenis-CSS root cause and the reset are verified in code and build, but the *felt* mobile scroll behavior should be confirmed on real iOS/Android (375/390/430) — including with reduced-motion ON (Lenis is skipped; native scroll must still work). Low risk: changes are additive and match Lenis's documented contract.
- **Dialog `max-h` baseline** could, in rare cases, introduce an inner scrollbar on a dialog that previously relied on growing past the viewport. This is the intended fix (no more off-screen buttons); callers with explicit `max-h` are unaffected.
- **`14vh` mobile bottom padding** is a heuristic; verify the last ScrollStack card still fully releases before the Trust section on the shortest phones.
- No functional/logic risk for the `info` token or the tailoring CSS scoping (purely additive / media-query reorder).

---

## Recommended next wave
- **Wave 1 (needs owner decision first):** Editor light-mode theming (P0) — decide light-theme vs forced-dark editor, then implement per `07`/`09`.
- **Wave 2 (correctness, isolated):** Preview wrong-resume id-gate (P1), pricing CTA plan-rank (P1), dashboard tip-copy (P1, trivial copy).
- **Wave 3:** z-index system consolidation + bespoke-modal → Radix.
- **Wave 4:** AI `aria-live` + form-label a11y pass.
- Run the device + a11y checks in `10_TESTING_AND_VALIDATION_PLAN.md` against this Wave 0 before starting Wave 1.

**Status:** Wave 0 complete (A–D implemented, validated by tsc + build). The Executive Summary's P0/P1 risk is **reduced but not eliminated** — the landing scroll P0, the dialog-trap P0, and two P1s (info token, tailoring clip) are addressed; the remaining P0 (editor light mode) and several P1s are still open. The app is **not** declared fully READY.
