# WiseResume — Full UI/UX + Responsive Audit — Executive Summary

**Date:** 2026-06-22
**Scope:** Full app UI/UX, responsive/mobile, accessibility, dark/light, Project Atlas alignment.
**Method:** Read-only, evidence-based code audit (8 parallel surface audits) + `tsc`/`build`/`lint`/Playwright evidence. **No browser session was run**, so every "appears/feels" claim is marked **UNKNOWN** in the detail files and backed by a concrete code-level root cause.
**Code changed:** **NO.** This is audit-only. No fixes were applied.

---

## 1. Overall UI/UX readiness verdict

### `READY WITH WARNINGS`

The app is architecturally strong and clearly built with intent: a token-driven design system mapped to Project Atlas, a genuine desktop "workspace OS" dashboard, a flagship-grade Tailoring Hub, code-split landing, a healthy Radix overlay baseline, and honest data (no fabricated user metrics, no upgrade prompts shown to paid users on the dashboard). `tsc --noEmit` is clean (exit 0) and `npm run build` succeeds (exit 0).

It is **not** "READY" without warnings because there are a small number of real **P0/P1 correctness issues** that affect first impressions and core surfaces:

- The **resume Editor renders hardcoded-dark chrome in light mode** (near-invisible white-alpha text on light) — the primary working surface is visually broken for light-theme users. *(Independently found by two agents — high confidence.)*
- The **landing page mobile scroll feel** (the reported "sticky / bottom scroll artifact") traces to a concrete, verifiable defect (see §6).
- The **default `Dialog` and `AlertDialog` have no `max-height`/scroll**, so tall content on small screens can push the action/confirm buttons off-screen with no way to scroll — a modal-trap pattern.

None of these is a hard crash, no public page was found to crash in code, core flows complete, and the production site is already live. With the P0/P1 list below addressed, the verdict moves to READY.

---

## 2. Top 10 issues to fix first

| # | Sev | Issue | Primary evidence |
|---|-----|-------|------------------|
| 1 | P0 | **Landing mobile scroll artifact** — Lenis smooth-scroll hijacks the document scroll but Lenis's stylesheet is never imported, and native `html{scroll-behavior:smooth}` stays active for normal-motion users. | `ScrollStack.tsx:478-500`; no `lenis.css` import in `main.tsx`; `index.css:414` |
| 2 | P0 | **Editor is hardcoded dark in light mode** — `--editor-surface*` tokens are dark-only with white-alpha text; no `.light` override. | `editor-workspace.css:7-12,96-97,125-257`; `EditorPage.tsx:1197` |
| 3 | P0 | **Default `Dialog`/`AlertDialog` have no `max-h`/`overflow`** → tall modals trap the user (buttons unreachable, nothing to scroll). | `dialog.tsx:73`; `alert-dialog.tsx:34,38` |
| 4 | P1 | **Preview can paint/export the WRONG resume** from a stale Zustand store before bootstrap resolves (visible render not gated on id-match). | `PreviewPage.tsx:252,715-727` vs `:115` |
| 5 | P1 | **Tailoring Hub mobile result clipped** behind the fixed action bar (CSS source-order bug overrides the mobile padding). | `job-match-workspace.css:892-900` |
| 6 | P1 | **Premium users see "Upgrade" CTAs** on the Free/Pro pricing cards (downgrade framed as upgrade). | `PricingPage.tsx:41-45` |
| 7 | P1 | **Fabricated statistics shown as facts** in dashboard tip rotation (40% / 30% / 77% …). | `DashboardStats.tsx:209-229` |
| 8 | P1 | **z-index inversion/war** — tooltip (55) renders above modals (50); bespoke modals climb to 9998/9999; per-dialog `z-[100]` desyncs content from its overlay. | `tooltip.tsx:20` + `tailwind.config.ts:126` vs `dialog.tsx:70`; `AnimatedSplash.tsx:80` |
| 9 | P1 | **AI results not announced to screen readers** (no `aria-live`); `AIQuestionsDialog` bypasses Radix (no focus trap/Escape); ai-studio + public contact-form labels unassociated. | `AIActionBar.tsx:99-110`; `AIQuestionsDialog.tsx:42-48`; `ColdEmailSheet.tsx:200` |
| 10 | P1 | **Tailoring guardrail framed as failure** — the "No meaningful changes" path consumes a credit and offers no inline retry. | `TailoringHubPage.tsx:389-399,677-686` |

(Close runners-up: upload import always creates a new resume with no dedupe (`UploadPage.tsx:144-179`); mobile section nav hidden behind a single bottom-left FAB that overlaps the resume list (`AppMobileSidebarSheet.tsx:41-44`); `info` semantic token never wired into Tailwind so `bg-info`/`text-info` are dead classes (`tailwind.config.ts:99-106`).)

---

## 3. Mobile readiness score: **62 / 100**

Strengths: `body{overflow-x:hidden}` guard, near-universal `dvh` usage, touch-aware Lenis tuning, mobile-specific CSS throughout, no page-level horizontal scroll found in code. Deductions: the landing scroll feel (P0), nested-scroll fragility on the dashboard list, dialog/drawer/alert-dialog without `max-h` (trap risk), the single-FAB mobile nav with no persistent section indicator + FAB overlapping content, icon-only AI/send controls with no label, sub-44px touch targets in AI-studio result panels and the portfolio chat, and the AI-Studio sticky-composer/header collision.

## 4. Desktop readiness score: **76 / 100**

Strengths: the populated dashboard is a cohesive 3-column workspace OS, the editor is a true two-pane workspace, Tailoring Hub is flagship-grade, overlays meet 44px close targets. Deductions: the **light-mode editor P0**, dialog/alert-dialog max-height trap, the z-index war, and Atlas token divergences (gray cards on white, radius/H1 drift).

## 5. Project Atlas alignment score: **74 / 100**

Core token architecture matches Atlas well (product-scoped `--primary`, 0.75rem base radius, full semantic set, Inter scale, dual-brand separation at the shell). Deductions: editor hardcoded-dark chrome, `info` token never reaching Tailwind (dead classes), WiseHire `brief/*` hand-painted with `slate-900`/`blue-700` literals instead of tokens (the exact "generic SaaS / don't hardcode product color" trap Atlas forbids), gray-card-on-white vs spec white, a one-notch-off radius ladder, and a sub-spec fluid H1.

---

## 6. Landing page mobile scroll bug — root cause

**Highest-confidence root cause (verified in code):** The landing renders feature sections inside `ScrollStack` in **window-scroll mode**, which instantiates **Lenis** bound to the entire document scroll (`ScrollStack.tsx:478-500`). Lenis's **required stylesheet is never imported** anywhere (`lenis/dist/lenis.css` — no match in `main.tsx`; grep across `src` shows only the JS `import Lenis from "lenis"`), and the global native **`html { scroll-behavior: smooth }`** (`index.css:414`) stays active for normal-motion users (it is only reset under `@media (prefers-reduced-motion: reduce)` at `index.css:2216`). The result is two systems acting on the same scrollTop and the absence of Lenis's documented `html.lenis body { height:auto }` / `.lenis.lenis-smooth { scroll-behavior:auto !important }` reset, which destabilizes the document scroller and produces the "stick"/momentum feel.

**Important nuance (calibration):** On coarse (touch) pointers the code sets `syncTouch:false` (`ScrollStack.tsx:486,498`), so Lenis does **not** hijack the actual finger-drag on phones — meaning on pure touch the perceived artifact is likely **compounded** by, or even dominated by, the **secondary contributors** rather than Lenis alone:
- `.scroll-stack-inner { padding-bottom:30vh; min-height:100vh }` (`ScrollStack.css:13-14`) + the pinned-card release ramp leave a **tall near-empty band** after the last card on mobile (and `100vh` should be `100dvh`).
- A **fixed, always-animating Aurora WebGL canvas** (`AuroraBackground.tsx:25-34`) composites every frame under the hijacked scroll.
- A second `window`-scroll consumer drives the fixed progress bar (`Index.tsx:196-222,328`).
- The blinking typewriter caret `.lp-cursor` (`index-landing.css:157`) is a plausible literal reading of "sticky cursor."

**Ruled out as the artifact:** horizontal overflow from WebGL/`vw` layers (all inside `overflow:hidden`, none use `100vw`); the progress bar trapping input (`pointer-events:none`); the sticky stack header (behaves correctly).

**Live confirmation: UNKNOWN** (no browser run). The fix is laid out in `05_LANDING_MOBILE_SCROLL_BUG.md` and is low-risk/additive. See that file for the full differential diagnosis.

---

## 7. Highest-risk pages

1. **Resume Editor** (`/editor`) — P0 light-mode dark chrome; wrong-resume preview window; field-height inconsistency; icon-only AI control; auto-collapsing nav rail. The most-used surface carries the most defects.
2. **Landing** (`/`, `/enterprises`) — the mobile scroll feel; first impression for every new user.
3. **Preview/Export** (`/preview`) — wrong-resume paint/export risk; content behind the action bar; mobile quick-PDF buried.
4. **Tailoring Hub result** (`/tailoring-hub/result/...`) — mobile content clipped behind fixed bar; guardrail framed as failure.
5. **Any tall dialog/alert-dialog on a small phone** — modal-trap risk from missing `max-h`.

## 8. Quick wins (low risk, high impact)

- Import `lenis/dist/lenis.css` (or add the `html.lenis` reset) and disable native smooth-scroll while Lenis is active — addresses the headline bug. *(05)*
- Add `max-h-[calc(100dvh-2rem)] overflow-y-auto` to the default `DialogContent` and `AlertDialogContent` bases — closes the modal-trap class globally. *(04)*
- Reorder the two `.jmw-result-body--compare` rules (or scope the desktop one in `min-width:640px`) — fixes mobile tailoring clip. *(03/04)*
- Add `info` to `tailwind.config.ts` colors — un-breaks every Info badge/toast. *(07/08)*
- Add `role="alert"` / `aria-live` to AI loading+result regions and the public contact form; add `aria-label` + 44px to the portfolio chat send button. *(06)*
- Plan-rank the pricing CTA so premium users don't see "Upgrade." *(03)*
- Rephrase the dashboard tip statistics to non-fabricated copy. *(03)*

## 9. Full-refactor candidates

- **Editor theming** (`editor-workspace.css`) — re-derive `--editor-*` from semantic tokens (or commit to a forced-dark editor); this is a token-system refactor, not a patch.
- **Global z-index system** — migrate all Radix overlays + bespoke modals onto the named `zIndex` scale; retire `z-[100]`/`z-[9998]`/`z-[9999]` literals and the `z-[54]` drawer.
- **Bespoke modals → Radix** — `AIQuestionsDialog`, `HiredCelebrationModal`, and other hand-rolled overlays should adopt Radix `Dialog` for focus-trap/Escape/a11y for free.
- **AI-Studio / public form a11y** — standardize on `form-field.tsx` (label+`aria-invalid`+`aria-describedby`) instead of ad-hoc `<Label>`/`<Input>`.

## 10. Nature of the work

This is **mostly responsive + visual-polish + targeted bug-fix**, **not** a full visual refactor. The design system, layouts, and component architecture are sound. The bulk is: one theming refactor (editor light mode), a handful of CSS/overflow/z-index corrections, a11y wiring on the AI + public-form surfaces, and copy/logic fixes (pricing CTA, tip stats, guardrail framing). Estimated split: ~40% responsive/CSS fixes, ~25% targeted bug fixes (preview id-gate, upload dedupe, dialog max-h), ~20% a11y, ~15% visual/token polish.

---

## Report index

| File | Contents |
|------|----------|
| `00_EXECUTIVE_SUMMARY.md` | This document |
| `01_ROUTE_INVENTORY.md` | Full route map (from `AppInterior.tsx`) |
| `02_RESPONSIVE_AUDIT.md` | Viewport-by-viewport responsive findings |
| `03_PAGE_BY_PAGE_FINDINGS.md` | Dashboard, Editor, Upload, Preview, Tailoring, AI Studio, Portfolio, Settings, Auth, Pricing, Onboarding |
| `04_DIALOGS_OVERLAYS_AUDIT.md` | Radix overlays + risky-pattern scan |
| `05_LANDING_MOBILE_SCROLL_BUG.md` | Full differential diagnosis of the scroll artifact |
| `06_ACCESSIBILITY_AUDIT.md` | A11y findings + quick wins |
| `07_DARK_LIGHT_MODE_AUDIT.md` | Theme correctness |
| `08_PROJECT_ATLAS_ALIGNMENT.md` | Token/spec divergences + alignment score |
| `09_FIX_PLAN_PRIORITIZED.md` | Prioritized, sequenced fix plan |
| `10_TESTING_AND_VALIDATION_PLAN.md` | How to verify each fix |
| `11_EVIDENCE_LOG.md` | Commands run, build/lint/test output, method + limitations |
