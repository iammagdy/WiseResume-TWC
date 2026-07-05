# WiseResume — Full Application UI/UX, Responsive, Accessibility & Interaction Audit

**Date:** 2026-06-26
**Branch/commit audited:** `main` @ `ff22e245` (latest; includes PR #129 + #130)
**Mode:** AUDIT ONLY — no app code changed, no deploys, no commits beyond report files
**Auditor:** Cascade
**Source of truth:** `Project Atlas/`, `DESIGN.md`, `PRODUCT.md`

---

## 1. Executive Summary

WiseResume is built on a **strong shared-primitive foundation**. The core `Button`, `Dialog`, and `AppShell` components encode the design system's hard rules correctly — 44px touch targets, `focus-visible` rings, semantic z-index, scroll restoration, skip-to-content, and `100dvh` layout. Because most surfaces compose these primitives, baseline accessibility and responsiveness are good across the app by inheritance.

The findings are therefore **not foundational failures** but **systemic consistency drift** against the design system, concentrated in three areas:

1. **Motion** — `type: 'spring'` easing is used in **43 places across 27 files**, directly violating the DESIGN.md "ease-out only, no spring" rule. Several of these are not gated on reduced-motion.
2. **Color tokens** — WiseHire landing/demo surfaces **hardcode `#3B82F6` / `#1D4ED8`** instead of `var(--lp-eyebrow)` / `var(--lp-brand)`, and `EnterprisePage` hardcodes button colors inline. This violates the token rule that powers the WiseResume↔WiseHire product switch.
3. **Anti-patterns** — `border-left` colored stripes appear on app-UI cards (`TailorPage`, `NotificationsPage`, WiseHire `BriefOutput`), and one `z-[9999]` exists in `AnimatedSplash`.

**No P0 issues were found. Broad testing is NOT blocked.** The issues are P2/P3 polish-and-consistency items that should be addressed before a polished public launch but do not prevent QA or user trust.

A methodology caveat applies: no dev server was running and protected routes require authentication (no safe QA account available), so this pass is **static code inspection**. Visual/pixel and live-interaction findings (exact mobile overflow, keyboard-open states, real screen-reader behavior) are flagged as **Needs manual/browser verification**.

### Audit Health Score (impeccable rubric)

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3 / 4 | Strong primitives (skip link, focus rings, 44px, Radix focus traps); icon-only button labels + reduced-motion gating need verification |
| 2 | Performance | 3 / 4 | Route-level lazy loading + `lazyWithRetry`, idle prefetch, deferred providers; heavy editor/portfolio surfaces unverified live |
| 3 | Responsive | 3 / 4 | `100dvh`, mobile-fit dialogs, bottom-nav system; exact overflow at 320–375px needs browser verification |
| 4 | Theming | 3 / 4 | Cool neutrals correct, no warm/cream bg; WiseHire landing hardcodes blue hex instead of tokens |
| 5 | Anti-Patterns | 2 / 4 | Spring easing (systemic), `border-left` stripes on app cards, one `z-[9999]` |
| **Total** | | **14 / 20** | **Good — address weak dimensions (Anti-Patterns, token drift) before polished launch** |

---

## 2. Final Verdict

### **PASS WITH WARNINGS**

- No P0. No data-loss, security, payment, or trust-breaking UI issues found in static inspection.
- Broad testing is **not blocked**.
- Systemic motion (spring), landing color-token drift, and border-left anti-patterns should be remediated in scoped passes before a polished public launch.

---

## 3. Scope & Methodology

**Methodology used:**
- Repo safety verification (`git fetch/status/rev-parse/log`) — on latest `main` `ff22e245`.
- Route inventory extracted from `src/AppInterior.tsx` (authoritative router).
- Static inspection of shared primitives: `components/ui/button.tsx`, `components/ui/dialog.tsx`, `components/layout/AppShell.tsx`.
- Systemic anti-pattern greps across `src/` for: spring easing, `z-index 999/9999`, warm/cream bg tokens, hardcoded landing hex, `border-left` stripes.
- Targeted reads of high-risk areas (`AIStudioPage`, `UploadPage`, `OnboardingPage`, `TailorPage`, WiseHire `EnterprisePage`).
- `npx tsc --noEmit` → **0 errors**. Full test suite (prior task, same commit) → **673 passed, 0 failed**.

**Not performed (and why):**
- **No browser/Playwright run** — no dev server running; protected routes (`/dashboard`, `/editor`, `/preview`, `/portfolio`, all `/wisehire/*`) require auth with no safe QA account. Live visual capture would only cover public routes and risks nothing useful for the protected core.
- **No screenshots** captured — see §19.

**Confidence model:** code-grounded findings (spring, hardcoded hex, border-left, z-index, primitive quality) are **high confidence**. Pixel-level mobile overflow, keyboard-open behavior, and real AT output are **medium confidence / needs verification**.

---

## 4. Route Inventory Audited

Extracted from `src/AppInterior.tsx`. **~85 routes** across 5 groups.

**A. Public / unauthenticated (15):** `/`, `/enterprises`, `/pricing`, `/whats-new`, `/waitlist`, `/enterprise`, `/privacy-policy`, `/terms-of-service`, `/auth`, `/sign-in`, `/auth/callback`, `/auth/verify-email`, `/auth/reset-password`, `*` (NotFound). *(Note: `/sign-in` is an alias of `/auth`.)*

**B. Core WiseResume protected (under `ProtectedRoute → JobSeekerRoute → AppShell`) (~40):** `/dashboard`, `/upload`, `/editor`, `/preview`, `/settings`, `/interview`†, `/applications`†, `/onboarding`, `/profile`, `/templates`, `/resume/:id`, `/job/:id`, `/application/:id`†, `/notifications`, `/portfolio`†, `/cover-letters`†, `/cover-letter/new`†, `/cover-letter/edit/:id`†, `/cover-letter`→redirect, `/examples`, `/career`†, `/resignation-letters`, `/resignation-letter/new`, `/resignation-letter/edit/:id`, `/guides`, `/guides/:slug`, `/ai-studio`†, `/ai-studio/:tool`†, `/help`, `/analytics`, `/subscription`, `/referral`, `/achievements`, `/qr-code`, `/qr-batch`, `/qr-scan`, `/search`, `/tailoring`→redirect, `/tailor`, `/tailor/:resumeId`, `/tailoring-hub`, `/tailoring-hub/result/:resumeId`, `/tailor/result/:resumeId`. († = `FeatureGate`-wrapped; disabled flag → toast + redirect to `/dashboard`.)

**C. Public share/output (7):** `/invite/:code`, `/share/:token`, `/share/brief/:shareToken`, `/share/scorecard/:shareToken`, `/interview/report/:token`, `/p/:username`, `/l/:linkId`. Plus **custom-domain portfolio** wrapper (`CustomDomainPortfolioWrapper`).

**D. Admin/dev (3):** `/devkit` (AdminRoute), `/store-screenshots`, `/screenshots-gallery` (ProtectedRoute).

**E. WiseHire (under `WiseHireGuard`) (~20):** `/wisehire/signup`, `/wisehire/signup-early-access/:code`, `/wisehire/terms-of-service`, `/wisehire/privacy-policy`, `/wisehire/dashboard`, `/wisehire/onboarding`, `/wisehire/subscription`, `/wisehire/settings`, `/wisehire/jd-writer`, `/wisehire/briefs`, `/wisehire/briefs/:briefId`, `/wisehire/pipeline`, `/wisehire/bulk-screen`, `/wisehire/scorecards/:candidateId`, `/wisehire/talent-pool`, `/wisehire/analytics`, `/wisehire/mask-cvs`, `/wisehire/clients`, `/wisehire/scorecard-templates`, `/wisehire/roles`.

**Global UX systems present:** `ConsentBanner`, `AnnouncementBanner`, `BroadcastBanner`, `MaintenanceCountdown`, `ActingAsBanner` (impersonation), `SuspendedScreen`, `MaintenanceScreen`, `BiometricLockScreen`, `CommandPalette` (deferred), `BugReportDialog`, `OfflineBanner`, `SlowConnectionBanner`, `GuestSaveBanner`, swipe-back, scroll restoration, skip-to-content.

---

## 5. Top 20 Highest-Impact Findings

| # | ID | Title | Severity | Type |
|---|----|-------|----------|------|
| 1 | M1 | `type:'spring'` easing in 27 files / 43 occurrences | P2 | Design-system / Motion |
| 2 | M3 | Spring/scale entrances not gated on reduced-motion (Onboarding, Upload steps, celebration modal) | P2 | Accessibility / Motion |
| 3 | C1 | WiseHire landing/demo hardcode `#3B82F6`/`#1D4ED8` instead of `--lp-*` tokens | P2 | Design-system / Theming |
| 4 | AP1 | `border-left` colored stripes on app-UI cards (TailorPage, NotificationsPage, BriefOutput) | P2 | Anti-pattern |
| 5 | C3 | `EnterprisePage` hardcodes `#1D4ED8` button backgrounds inline | P2 | Design-system |
| 6 | A1 | Icon-only button accessible-label coverage unverified app-wide | P2 | Accessibility (verify) |
| 7 | R1 | Exact mobile overflow at 320–375px unverified on dense pages (Editor, Tailoring Hub, Analytics, WiseHire pipeline) | P2 | Responsive (verify) |
| 8 | A2 | `aria-live` coverage for AI generation / score readouts unverified | P2 | Accessibility (verify) |
| 9 | AP2 | `z-[9999]` in `AnimatedSplash.tsx:80` violates semantic z-index scale | P3 | Anti-pattern |
| 10 | C2 | `WiseResumeHero` hardcodes `#9E1B22` background (focus ring is permitted) | P3 | Design-system |
| 11 | M2 | AppShell page transition uses `easeInOut 0.15` not ease-out-quart | P3 | Motion |
| 12 | IA1 | `/tailor`, `/tailoring-hub`, `/tailoring` coexist — naming clarity risk | P2 | IA / Navigation |
| 13 | O1 | Output/result states (export, AI results) honesty + retry paths need live verification | P2 | Product/AI (verify) |
| 14 | E1 | Empty/loading/error premium quality varies; needs per-page live verification | P2 | States (verify) |
| 15 | T1 | Dark-mode contrast on hardcoded-hex WiseHire surfaces unverified | P2 | Theming (verify) |
| 16 | A3 | Keyboard-open form states (mobile) unverified | P2 | Accessibility (verify) |
| 17 | P1 | Heavy surfaces (editor, analytics charts, portfolio) layout-shift/perf unverified live | P3 | Performance (verify) |
| 18 | AP3 | Glassmorphism (`backdrop-filter: blur`) used in ChatWidget/portfolio — verify purposeful | P3 | Anti-pattern (verify) |
| 19 | O2 | Resume templates use `border-left` — **by design** (output styling), not an app-card violation | Info | Not-a-bug note |
| 20 | M4 | `floating-panel.tsx` + `pull-to-refresh.tsx` primitives carry spring; fixing source fixes consumers | P2 | Motion (systemic) |

---

## 6. Page-by-Page Findings

> Static inspection. Pages composing the shared primitives inherit good touch/focus/dialog behavior. Page-specific code-grounded findings are listed; everything visual/interactive is tagged **(verify)**.

**`/` Index (landing):** Strong motion discipline in `WiseResumeHero` (correct `ease: [0.22,1,0.36,1]`, `duration: 0.18`, reduced-motion gating on hover/tap). Hardcodes `#9E1B22` background (C2). Aurora layer present. **(verify)** hero copy overflow at 320px.

**`/enterprise` + WiseHire landing demos:** Systemic hardcoded blue hex (C1, C3) and spring easing (M1) across `EnterprisePage`, `WiseHirePricing`, `WiseHireFeatures`, `WiseHireDemoSection`, `JDDemo`, `PipelineDemo`, `OfferTrackerDemo`, `BulkScreeningDemo`, `TalentPoolDemo`. These are the densest concentration of token/motion drift.

**`/pricing`:** **(verify)** — not deeply read; check plan-card hierarchy, no hero-metric cliché, mobile stacking.

**`/auth`, `/sign-in`, `/auth/*`:** `SlideCaptcha` uses spring (M1). `AuthVerifyEmailPage` uses spring (M1). **(verify)** form labels/validation placement, keyboard-open.

**`/dashboard`:** Already received a stronger refactor (per brief). `EmptyState`, `ResumeListCard`, `HiredCelebrationModal` use spring (M1/M3). **(verify)** live.

**`/upload`:** `UploadPage` drag affordance + `UploadProgressSteps` + `UploadErrorRecovery` use spring scale-from-0, **not visibly reduced-motion gated** (M3). High-risk area per brief. **(verify)** error recovery copy/next-action.

**`/editor`, `/preview`:** Immersive workspace (overflow hidden), `AIFloatingButton` spring (M1). **(verify)** — highest-value manual pass: control reachability on mobile, export actions, keyboard toolbar, panel z-index stack.

**`/onboarding`:** `OnboardingPage` uses spring at lines 677, 1063 with `scale:0.7→1` / `scale:0→1` — **reduced-motion gating not evident** (M3). Gradient blur halos present. **(verify)** step flow, skip path.

**`/tailor`, `/tailoring-hub`, `/tailoring-hub/result`:** `TailorPage` uses `border-2 border-l-4 border-l-primary` reveal cards (AP1). Three tailoring routes coexist (IA1). **(verify)** before/after clarity, AI honesty, no-change guardrail UI (confirmed present in prior work).

**`/ai-studio`, `/ai-studio/:tool`:** Workspace IA is clean (primary/secondary workflows, recent tools, deep-link sheets). Tour `Dialog` (`AIStudioTourModal`) uses spring (M1). Cost badges present (good AI-cost transparency). Sheets gated behind feature flag + plan wall.

**`/notifications`:** `border-l-2 border-l-primary` on unread items (AP1). Swipe-to-dismiss motion present.

**`/portfolio` + public portfolio (`/p/:username`):** `ChatWidget` uses spring + glassmorphism `backdrop-filter: blur(16px)` (M1, AP3); `PortfolioHistorySheet`, `portfolio/editor/shared` spring. **(verify)** public render, contact form (ties to F13 Turnstile).

**WiseHire pages (`/wisehire/*`):** `BriefOutput` `border-l-4 border-blue-500` (AP1); `briefPdfExport.ts` `border-left:3px #1d4ed8` (export HTML — acceptable, print artifact); `ScorecardView` `border-l-2 border-muted` (low). **(verify)** pipeline/bulk-screen density at mobile.

**Resume templates (`components/templates/*`):** `border-left` used in Banking/Brutalist/Creative/Developer/DevOps/Healthcare/Marketing — **this is intentional resume-document styling, NOT an app-card anti-pattern** (O2). Do not "fix" these.

---

## 7. Button / CTA Audit

**Systemic baseline — `components/ui/button.tsx` (PASS):**
- All sizes enforce `min-h-[44px]` (and `min-w-[44px]` for `icon`). ✅
- `focus-visible:ring-2 focus-visible:ring-primary ring-offset-2`. ✅
- `active:scale-[0.97]`, `touch-manipulation`, `transition-all duration-200`. ✅
- `disabled:pointer-events-none disabled:opacity-50`. ✅
- Variants: default/destructive/outline/secondary/ghost/link — clear hierarchy. ✅

| Aspect | Status | Notes |
|--------|--------|-------|
| Primary dominance | Pass (primitive) | `default` = `bg-primary` + shadow; clear |
| Destructive | Pass | dedicated variant; **confirm confirmation dialogs on delete (verify)** |
| Loading state | Verify | per-call; not enforced by primitive |
| Icon-only labels | **Verify (A1)** | primitive doesn't force `aria-label`; audit each icon button |
| Disabled/focus/active | Pass | enforced in primitive |
| AI buttons overpromise | Verify | AI-cost badges seen in AI Studio (good signal) |
| Landing CTAs | Mixed | `WiseResumeHero` correct motion; WiseHire CTAs use spring + hardcoded hex |

---

## 8. Forms / Input Audit

Static inspection only — **most form-level findings require live verification (A3).**

| Surface | Code-grounded note | Verify |
|---------|--------------------|--------|
| Auth forms | `SlideCaptcha` spring motion | labels, validation placement, keyboard-open |
| Resume editor fields | composes primitives | autosave feedback, long-content, tab order |
| Upload inputs | drag + progress + error components exist | file feedback, reduced-motion (M3) |
| Job description / Tailoring | large textareas | resize, paste, char handling |
| Settings | `ProfileImportSheet` spring | toggles, destructive confirms |
| Portfolio / contact form | ties to Turnstile (F13) | "Security check required" path |
| Cover/resignation letters | dedicated pages | required/optional clarity |
| WiseHire forms | JD writer, roles, scorecards | validation, mobile keyboard |

**Recommendation:** dedicated `/impeccable harden` + `/impeccable clarify` pass on forms after live verification.

---

## 9. Dialog / Sheet / Popover / Toast Audit

**Systemic baseline — `components/ui/dialog.tsx` (PASS):**
- `z-50` overlay + content (semantic, within scale). ✅
- Radix → focus trap, Escape close, outside-click handled. ✅
- `aria-describedby` opt-out handled (no console spam). ✅
- Close button: `min-w-[44px] min-h-[44px]`, `focus:ring-2`, `<span class="sr-only">Close</span>`. ✅
- `fullScreenOnMobile` option + `max-h-[calc(100dvh-2rem)] overflow-y-auto` → mobile fit. ✅
- Toasts via `sonner` (`Toaster` mounted in `AppInterior`). ✅

| Aspect | Status | Notes |
|--------|--------|-------|
| z-index layering | Pass | semantic scale defined in DESIGN.md (`editor-shell 40 → toast 70`); dialog `z-50` |
| Focus trap / Escape | Pass | Radix |
| Mobile fit | Pass | fullScreenOnMobile + dvh max-h |
| Sheet motion | Mixed | several sheets use spring (M1) |
| Stacked modals | **Verify** | plan wall + tour + tool sheets could co-occur |
| Toast timing/wording | **Verify** | sonner defaults; review copy |

---

## 10. Output / Result Screen Audit

All **(verify)** — require live/auth or sample data:

| Output | Code-grounded | Verify |
|--------|---------------|--------|
| Resume preview | `/preview` immersive | render fidelity, mobile readability |
| Designed/ATS PDF, DOCX export | export libs present | success/error/retry, print accuracy |
| Tailoring Hub result | result page + no-change guardrail (confirmed prior) | before/after, honesty |
| Cover/resignation letter result | dedicated pages | confidence, edit/retry |
| AI Studio outputs | sheets + cost badges | generating/failed states, aria-live (A2) |
| Interview report (`/interview/report/:token`) | public route | shareable, mobile |
| Public portfolio / share | public | contact form, ChatWidget |
| WiseHire briefs/scorecards | output components | PDF export HTML OK |
| QR / analytics | dedicated pages | empty/loading, chart perf |

---

## 11. Empty / Loading / Error State Audit

**Loading (PASS, systemic):** Rich route-level skeleton system in `PageSkeletons` (Dashboard/Editor/Settings/Preview/Upload/Interview/Auth/Detail/Share/AIStudio/Profile/Templates/CoverLetters/Onboarding/Analytics/Achievements/Landing, etc.) wired to every lazy route via `Suspense`. ✅

**Error (PASS, systemic):** `RouteEB` wraps every route in route-scoped `ErrorBoundary` with reset (rehydrates resume store). Global: `OfflineBanner`, `SlowConnectionBanner`, `SuspendedScreen`, `MaintenanceScreen`. ✅

**Empty (verify):** `dashboard/EmptyState`, `editor/SectionEmptyState` exist and use spring (M3). Per-page premium quality and "next action" clarity need live verification (E1).

---

## 12. Mobile / Responsive Findings

**PASS (systemic):** `100dvh` shell, `overflow-hidden` immersive workspaces, bottom-nav `TAB_ROUTES` system, swipe-back, `fullScreenOnMobile` dialogs, `max-h-[calc(100dvh-2rem)]`, 44px targets in primitives, `touch-manipulation`, safe-area handling referenced in DESIGN.md (`--lp-safe-top`).

**Needs browser verification (R1)** at 320 / 360 / 375 / 390 / 414 / 430 / 768 / 1024 / 1280 / 1440:
- Dense pages: Editor controls, Tailoring Hub, Analytics charts, WiseHire pipeline/bulk-screen — horizontal overflow + clipped controls.
- Hero copy balance at 320–375px on landing.
- Sticky bottom bars not covering content on editor/preview.
- Keyboard-open form states (A3).

---

## 13. Accessibility Findings

**PASS (systemic):** skip-to-content link (`focus:z-[100]`), `focus-visible` rings in button/dialog primitives, 44px targets, Radix focus traps, `sr-only` close labels, `aria-describedby` discipline, `useReducedMotion`-aware `MotionConfig` at app root.

**Findings:**
- **A1 (P2, verify):** Icon-only buttons not built on the primitive may lack `aria-label` — needs an app-wide pass.
- **A2 (P2, verify):** `aria-live` for AI generation progress and score readouts — DESIGN.md requires `aria-live="polite"` on async value regions; coverage unverified.
- **M3 (P2):** Reduced-motion gating missing on several spring/scale entrances (Onboarding, Upload steps, celebration modal) despite root `MotionConfig` — inline `transition` objects may still animate scale on reduced-motion if not gated.
- **A3 (P2, verify):** Keyboard-open mobile form behavior.

---

## 14. Dark / Light Theme Findings

**PASS (systemic):** Theme applied at root via `useSettingsStore` (`light`/`dark`/`system` with `matchMedia`). Cool neutrals confirmed; **no warm/cream/beige bg tokens found** (grep clean) — a key AI-slop tell is absent. ✅

**Findings:**
- **C1/C3 (P2):** WiseHire surfaces hardcode blue hex → dark-mode contrast of those literals unverified (T1).
- **Product separation:** WiseResume crimson vs WiseHire blue is architecturally separated (`data-product="wiseresume"`, `--lp-*` token layer), but hardcoded hex in WiseHire demos weakens the token guarantee.

---

## 15. Project Atlas / Design-System Alignment

| Rule (DESIGN.md) | Status | Evidence |
|------------------|--------|----------|
| Cool neutrals, no warm/cream bg | ✅ Pass | grep clean |
| 44px touch targets | ✅ Pass | button/dialog primitives |
| Focus ring on all interactive | ✅ Pass (primitives) | button/dialog; verify non-primitive |
| Ease-out only, **no spring** | ❌ Fail | 43× `type:'spring'` (M1) |
| Button 0.18s / section 0.45s ease-out-quart | ⚠️ Partial | hero correct; AppShell 0.15 easeInOut (M2) |
| No `border-left` color stripe | ❌ Fail (app UI) | TailorPage, NotificationsPage, BriefOutput (AP1) |
| No `z-index 999/9999` | ❌ Fail (1×) | AnimatedSplash `z-[9999]` (AP2) |
| Landing uses `--lp-*` tokens, no hardcoded hex | ❌ Fail | WiseHire demos + Enterprise + hero (C1/C2/C3) |
| Reduced-motion gating on loops | ⚠️ Partial | root MotionConfig good; inline entrances ungated (M3) |
| No gradient text (except 1 hero) | ✅ Pass (verify) | not observed outside permitted |

---

## 16. Product / AI UX Findings

**Positives (code-grounded):** AI Studio shows **AI-cost badges** (`AICostBadge`) — honest credit signaling. Tailoring has a confirmed **"no meaningful changes" honesty guardrail** with retry/edit recovery (verified in prior work). AI tool sheets are plan-walled and feature-flagged.

**Verify:** generation progress clarity + `aria-live` (A2), failed-AI states, before/after storytelling on tailoring/enhance outputs, retry/refine affordances on each AI sheet.

---

## 17. WiseResume Priority Fixes (recommended order)

1. **M1/M3 — Motion pass:** replace `type:'spring'` with ease-out-quart `[0.22,1,0.36,1]` (button 0.18 / section 0.45); gate all scale entrances on `useReducedMotion`. Fix the two primitives (`floating-panel.tsx`, `pull-to-refresh.tsx`) first — cascades to consumers (M4). → `/impeccable animate`
2. **AP1 — Remove border-left stripes** on `TailorPage`, `NotificationsPage` (full border / bg tint / leading icon). → `/impeccable layout`
3. **A1/A2/A3 — Accessibility verification pass** (icon labels, aria-live, keyboard-open) after a live run. → `/impeccable harden`
4. **AP2 — Replace `z-[9999]`** in `AnimatedSplash` with a top-of-scale token. → `/impeccable polish`
5. **R1 — Responsive verification** of dense pages at 320–430px. → `/impeccable adapt`

---

## 18. WiseHire — Separate Findings

WiseHire is lower priority but part of app routes. Concentrated, **self-contained** drift:
- **C1/C3 (P2):** Pervasive hardcoded `#3B82F6`/`#1D4ED8` across landing/demo components and `EnterprisePage` — should use `var(--lp-eyebrow)`/`var(--lp-brand)`.
- **M1 (P2):** Spring easing on `EnterprisePage` CTAs and demos.
- **AP1 (P2):** `BriefOutput` border-left stripe (app UI). `briefPdfExport.ts` border-left is in **exported print HTML** — acceptable, leave.
- All WiseHire pages are guarded by `WiseHireGuard`; product color separation is architecturally intact but undermined by hardcoded hex.
- **Verify:** pipeline/bulk-screen/talent-pool table→card transforms on mobile; dark-mode contrast of blue literals (T1).

**Recommendation:** a single scoped WiseHire token+motion pass, isolated from WiseResume.

---

## 19. Screenshots Index

**None captured.** No dev server was running and protected routes require authentication (no safe QA account). Per audit rules, no destructive or auth-bypassing actions were taken. A follow-up live pass with a QA account is recommended to capture: editor, upload, tailoring-hub, onboarding, pricing, dashboard, and WiseHire pipeline at the 10 target breakpoints.

---

## 20. Recommended Phased Remediation Plan

**Phase 1 — Systemic motion (P2):** spring→ease-out-quart + reduced-motion gating; start with `floating-panel.tsx` + `pull-to-refresh.tsx`, then page-level (Onboarding, Upload, Dashboard, AI Studio tour, ChatWidget). Single scoped PR. `/impeccable animate`

**Phase 2 — Anti-patterns (P2/P3):** remove app-UI border-left stripes (TailorPage, NotificationsPage, BriefOutput); replace `z-[9999]`. `/impeccable layout` → `/impeccable polish`

**Phase 3 — WiseHire tokenization (P2):** hardcoded hex → `--lp-*` tokens across WiseHire landing/demos + EnterprisePage. Isolated PR. `/impeccable colorize`

**Phase 4 — Live verification + a11y (P2):** dev server + QA account; verify R1/A1/A2/A3/E1/O1/T1 at 10 breakpoints, capture screenshots, then `/impeccable harden` + `/impeccable adapt`.

**Phase 5 — Final polish:** `/impeccable polish` and re-run `/impeccable audit` to confirm score improvement.

Keep phases as **separate scoped PRs** (not one big pass) — motion, anti-patterns, and WiseHire color are independent and individually reviewable; live-verification findings will add a second wave.

---

## 21. What NOT to Touch

- **Resume templates' `border-left`** (Banking/Brutalist/Creative/Developer/DevOps/Healthcare/Marketing) — intentional document styling, not app cards (O2).
- **`briefPdfExport.ts` border-left** — exported print HTML, not app UI.
- **Backend / API / auth / routing / state / AI logic** — out of scope.
- **Appwrite functions** and deploy — out of scope; no `target=all`.
- **Security/honesty guardrails** (tailoring no-change guard, Turnstile, plan walls) — preserve.
- **Untracked/dirty files** noted in safety check (`.impeccable/`, `reports/auto-fit-template-audit.md`, prior audit docs) — leave.
- **Working WiseResume↔WiseHire token architecture** (`data-product`, `--lp-*`) — extend, don't rewrite.

---

## 22. Validation Checklist for the Future Fix Pass

- [ ] `grep` `type:'spring'` returns **0** in `src/` (excluding none — all replaced).
- [ ] All scale/entrance animations gated on `useReducedMotion()`.
- [ ] `grep` `z-[9999]` / `z-index:9999` returns **0**.
- [ ] No `border-l-[2-9]` colored stripe in app-UI components (templates excluded).
- [ ] WiseHire landing/demos: no hardcoded `#3B82F6`/`#1D4ED8` — `--lp-*` only.
- [ ] Icon-only buttons all have `aria-label` or `sr-only` text.
- [ ] `aria-live="polite"` on AI/score async regions.
- [ ] No horizontal overflow at 320/360/375/390/414/430px on Editor, Tailoring Hub, Analytics, WiseHire pipeline.
- [ ] `npx tsc --noEmit` = 0 errors; full suite green.
- [ ] Run `node .claude/skills/impeccable/scripts/detect.mjs --json <changed files>` → 0 findings.
- [ ] Re-run `/impeccable audit` → score ≥ 18/20.

---

*End of report. Audit-only: no application code modified, no deploys, no commits beyond this report and the findings matrix.*
