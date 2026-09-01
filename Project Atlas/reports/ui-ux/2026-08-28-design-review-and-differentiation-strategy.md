# WiseResume (TWC) ΓÇö Design Review & Differentiation Strategy

**Date:** 2026-08-28
**Branch:** `design/audit-2026-08-28` (created from `main` @ `2d7a31d`)
**Scope:** Frontend + design strategy review ΓÇö flows, information architecture, visual identity, differentiation. This is a **strategy-layer audit**: it complements (and does not repeat) the technical `UI_UX_AUDIT_2026-06-22` already archived in Project Atlas.
**Method:** Read-only, code-derived review via GitHub API. No live browser session was run in this pass ΓÇö rendering, RTL feel, and mobile behavior are marked "needs live check" where relevant.

---

## 1. Executive Summary

**Verdict: architecturally excellent, strategically under-claimed.**

WiseResume is not a template AI resume builder. It is a full bilingual (AR/EN) career workspace ΓÇö editor, tailoring hub, cover/resignation letters, interview prep, job feed, application tracker, public portfolio with custom domains, QR tools, referrals, achievements, billing, plus a separate recruiter product (WiseHire) ΓÇö roughly **60 page-level files and 100+ route declarations** behind one shell. The engineering discipline is genuinely rare for a product at this stage: token-driven theming, per-page skeleton states, PWA-native touches (biometric lock, deep linking, safe-area insets), a View Transitions brand ripple, reduced-motion support everywhere, and a June 2026 audit whose three P0s I verified are **all fixed** (Lenis reset imported in `main.tsx`, light-mode editor tokens in `editor-workspace.css`, dialog `max-h` scroll traps closed in `dialog.tsx` / `alert-dialog.tsx`).

The brand also has a real asset most competitors don't: **crimson red** (`--primary: 357 71% 36%` Γëê #9E1B22) as a deliberate identity, codified in `Project Atlas/product/brand-guidelines.md` ("Crimson as identity, not decoration"). Against a sea of indigo AI tools, that is ownable.

The problems are **strategic, not craft**:

1. **The IA buries the product.** 8 sidebar items silently match 30+ destinations; Analytics, Achievements, Templates, Guides, Notifications, Upload, Referral, Help all hide inside "Dashboard" or "Settings". Users cannot form a mental model of a workspace that has this many capabilities.
2. **The dashboard displaces decisions into dialogs.** ~10 dedicated dashboard dialogs open when metrics are clicked. Numbers should act inline; dialogs are for commitment, not curiosity.
3. **The identity is under-exploited and slightly leaking.** Inter for both text and display (including **no Arabic webfont at all** ΓÇö a real gap for a bilingual-first product), hardcoded `#9E1B22` focus rings beside a token system, a stale "Indigo radial glow" comment in the hero, and a 98KB `index.css` monolith.
4. **The landing spends its motion budget on clich├⌐s.** Typewriter headline, feature ticker, aurora canvas, light rays, parallax, scroll-stack cards, and a brand ripple all compete. The typewriter and ticker are the exact defaults every resume-site template uses ΓÇö the least distinctive tools in an otherwise distinctive kit.

The differentiation path is already sitting in the codebase: **be the only bilingual-first (AR/EN, RTL-native) career pipeline workspace** ΓÇö where the product's IA mirrors the real journey (Target ΓåÆ Resume ΓåÆ Tailor ΓåÆ Apply ΓåÆ Interview ΓåÆ Offer), proof is the product itself (live resume renders, real ATS deltas), and the Arabic experience is designed, not defaulted.

---

## 2. What Was Verified as Fixed Since the June Audit

| June P0/P1 | Status | Evidence |
|---|---|---|
| Lenis stylesheet missing (landing scroll artifact) | Γ£à Fixed | `main.tsx` imports the Lenis reset; `index.css` carries `.lenis.lenis-smooth` override |
| Editor hardcoded-dark chrome in light mode | Γ£à Fixed | `editor-workspace.css` now defines light-mode `--editor-surface*` defaults with `.dark` override restoring originals |
| Dialog/AlertDialog modal-trap (no max-height) | Γ£à Fixed | `dialog.tsx`: `max-h-[calc(100dvh-2rem)] overflow-y-auto` + a `fullScreenOnMobile` bottom-sheet variant; same in `alert-dialog.tsx` |

The repo also gained (post-June) `Project Atlas/design-system/production/DESIGN_TOKENS.md` and `Project Atlas/product/brand-guidelines.md` ΓÇö design governance is maturing. The June audit's P1s (fabricated tip statistics, pricing CTA framing, a11y announcements) were not individually re-verified in this pass.

---

## 3. Current Design Flows (code-derived)

### 3.1 Acquisition ΓåÆ Activation
```
/ (or /ar) ΓÇö Landing
  Γö£ΓöÇ Hero: typewriter headline "Stand out as a {role}" ┬╖ brand CTA ┬╖ trust badges
  Γö£ΓöÇ ScrollStack: "15+ AI tools" pinned header + stacked feature cards (step counter chip)
  Γö£ΓöÇ TrustSection ΓåÆ Footer
  ΓööΓöÇ CTA "Get Started Free" ΓåÆ /auth?mode=signup
        Γö£ΓöÇ /auth/callback ┬╖ /auth/verify-email ┬╖ /auth/reset-password
        ΓööΓöÇ /onboarding (51KB wizard, skeleton state defined)
              ΓööΓöÇ /dashboard (OnboardingChecklist + "start in under two minutes" hero)
```
Two-product landing: `/` = jobseeker (crimson), `/enterprises` = WiseHire (blue). The toggle uses the View Transitions API with a ripple originating from the button, defers the heavy re-render past the first ripple frame, and swaps favicon/OG tags per brand. This is the single most distinctive interaction in the product today.

### 3.2 Core Resume Loop (the money path)
```
/dashboard ΓöÇΓöÇΓû║ /tailoring-hub ΓöÇΓöÇΓû║ /tailoring-hub/result/:resumeId
     Γöé                (or /tailor/:resumeId direct)
     Γö£ΓöÇΓû║ /upload (PDF/DOCX import) ΓöÇΓû║ /editor
     Γö£ΓöÇΓû║ /editor (96KB page, two-pane workspace, immersive shell)
     Γöé        ΓööΓöÇ AI actionBar ┬╖ AIQuestionsDialog ┬╖ page-break setup ┬╖ export
     Γö£ΓöÇΓû║ /preview/:id (44KB, PDF/DOCX export, share)
     ΓööΓöÇΓû║ /share/:token ┬╖ /l/:linkId ┬╖ /qr-code (share surface)
```

### 3.3 Job-side Loop
```
/jobs (remote jobs feed, 45KB) ΓöÇΓû║ /job/:id
      Γö£ΓöÇ AnalyzeJobSheet ┬╖ SetTargetJobSheet (dashboard also hosts these)
      ΓööΓöÇ tailor ΓöÇΓû║ /applications (tracker board) ΓöÇΓû║ /application/:id
```

### 3.4 Support Surfaces
- **AI Studio** `/ai-studio/:tool` (30KB) + `/career` advisor + `/interview` (40KB coach, public `/interview/report/:token`)
- **Letters**: cover letters (`/cover-letters` + new/edit), resignation letters (same trio)
- **Presence**: `/portfolio` editor (85KB) ΓåÆ public `/p/:username`, custom-domain rendering via hostname detection, password gate, Turnstile contact form
- **Growth**: `/referral`, `/achievements`, `/subscription`, `/pricing`, `/waitlist`, `/whats-new`
- **Recruiter**: `/wisehire/*` ΓÇö 15 routes behind `WiseHireGuard` (briefs, pipeline, bulk-screen, scorecards, talent pool, masking, clients, roles) ΓÇö README marks this "secondary/deprioritized"
- **Bilingual**: every public route has an `/ar/*` mirror; `LocaleProvider` + `LocaleAccountSync`; RTL arrow flips implemented at icon level (`rotate(180deg)`)

### 3.5 Shell Behavior
`AppShell` runs a workspace layout (sidebar ΓëÑlg, mobile bottom-nav surfaces) with "immersive" mode for `/editor`, `/preview`, `/tailor*` and the dashboard (hidden chrome, scroll container swap), swipe-back on mobile, `?` shortcut sheet, command palette, offline/slow-connection banners, guest-save banner, and an import-job FAB.

---

## 4. What's Genuinely Working (keep and amplify)

1. **Token-driven theming** ΓÇö product-scoped `--primary` (crimson vs WiseHire blue) at the shell (`data-product`), full semantic palette incl. success/warning/info, soft shadow ladder, named z-index scale in the Tailwind config.
2. **State coverage discipline** ΓÇö 22 named page skeletons in `PageSkeletons.tsx`; every route wrapped in Suspense with a matched skeleton; public portfolio even has its own route-level skeleton with pre-warmed React Query keys.
3. **Motion restraint where it counts** ΓÇö `MotionConfig reducedMotion`, reduced-motion variants throughout landing, desktop-only parallax gating, haptics as feedback on web.
4. **PWA-native respect** ΓÇö splash only in standalone PWA mode (explicitly *not* web), biometric lock, safe-area spacing tokens, deep linking, shake-to-report.
5. **Honest data stance** ΓÇö June audit confirmed no fabricated metrics on the dashboard and no upgrade prompts to paid users; keep this as a brand principle.
6. **The crimson identity + brand guidelines** ΓÇö a documented brand with a distinctive primary is an asset competitors can't clone quickly.

---

## 5. Design Issues (prioritized)

### P0-1 ┬╖ Information architecture buries the workspace
`appSidebarNav.ts` defines 8 items, but their `match` arrays silently absorb ~30 routes:
- **Dashboard** swallows `/notifications`, `/templates`, `/examples`, `/guides`, `/onboarding`, `/analytics`, `/achievements`
- **Settings** swallows `/profile`, `/upload`, `/subscription`, `/referral`, `/help`
- **Editor** swallows `/preview`, `/resume/:id`
- **AI Tools** swallows `/tailor` (while **Tailoring Hub** is a separate sibling item ΓÇö one capability, two nav homes)
- **Activity** (applications) is a vague label with a chart icon for what is actually a tracker

Consequences: feature discovery collapses ("I didn't know it did that"), Analytics/Achievements ΓÇö the product's stickiness engines ΓÇö are unreachable by navigation, and the sidebar stops meaning anything. **This is the single biggest design problem.**

### P0-2 ┬╖ Dashboard displaces action into dialogs
`src/components/dashboard/` holds **~10 metric-linked dialogs** (`DashboardApplicationMatchesDialog`, `DashboardAtsPortfolioDialog`, `DashboardImproveQuickDialog`, `DashboardMissingKeywordsDialog`, `DashboardSavedJobsDialog`, `DashboardTailoredMetricDialog`) plus sheets (`AnalyzeJobSheet`, `SetTargetJobSheet`, `VersionCompareSheet`) and three overlapping hero variants (`DashboardHero`, `DashboardSpotlightHero`, `DashboardIntelligencePanel`). The pattern teaches users: *numbers are read-only; to do anything, open a modal.* On mobile this stacks with the June audit's dialog-trap history. Decisions should happen in context: a low ATS score should expand in place with the missing keywords and a one-tap "Tailor now".

### P0-3 ┬╖ Identity under-exploited + small leaks
- **No Arabic webfont.** `tailwind.config.ts` sets `sans: ["Inter", "system-ui", "sans-serif"]` ΓÇö for a bilingual-first product, Arabic body text falls back to system fonts, so the brand's typography effectively doesn't exist in Arabic. (Needs live check for how landing CSS overrides handle AR, but no Arabic family is declared anywhere in the app token layer.)
- **Inter as display face** ΓÇö the display personality of the product is currently "default".
- **Hardcoded `#9E1B22`** in hero focus rings (`WiseResumeHero.tsx`, 2├ù) beside a tokenized system; stale "Indigo radial glow" comment in the same file hints at a past palette.
- **98KB `src/index.css`** + separate 44KB `index-landing.css` ΓÇö token sprawl makes the system hard to audit; plus `src/context/` and `src/contexts/` both exist (two homes for context providers).

### P1-4 ┬╖ Landing motion budget spent on clich├⌐s
Currently stacked: typewriter headline + blinking caret, marquee feature ticker, WebGL aurora canvas, light rays, scroll parallax glow, ScrollStack pinned cards, scroll progress bar, View-Transitions ripple. The typewriter and ticker are the two most templated devices in resume-site land ΓÇö the ironic choice for a product whose pitch is "stand out". They also carry measurable cost (June audit: aurora composites every frame; typewriter caret reads as "sticky cursor" on mobile). **Keep** ScrollStack (genuinely good long-form demo), the step-counter chip, and the ripple. **Retire** typewriter + ticker; replace the headline animation with the product itself (see ┬º6).

### P1-5 ┬╖ Proof strategy is generic
Trust badges are the default trio ("Free to start / No credit card / AI-powered"). The strongest possible proof ΓÇö a live, editable resume preview and a real before/after ATS keyword delta ΓÇö is absent from the landing. The demos in ScrollStack approximate this, but the hero shows text, not product.

### P1-6 ┬╖ Feature-gate UX is a dead end
`FeatureGate` renders a lock icon + "back to dashboard". A gated feature (interview coach, cover letters, portfolio, AI studio) is a monetization moment: show what the feature does, what the plan includes, and a one-tap path to `/pricing` with the specific feature pre-selected.

### P2-7 ┬╖ Smaller items
- `Activity` naming + `BarChart3` icon mismatch (it's a pipeline tracker).
- WiseHire toggle on the jobseeker landing adds B2B complexity to the C2C first impression (measure; consider demoting to footer).
- Editorial surfaces (Guides/Examples) inherit app chrome; a reading-mode layout would lift content quality perception.
- `PrivacyPage`/`TermsPage` are 152ΓÇô156 byte redirect stubs while `LocalizedLegalPage` exists ΓÇö confirm legal routes resolve to real content.

---

## 6. Differentiation Strategy ΓÇö how WiseResume becomes "very unique"

### 6.1 Claim: **The bilingual-first career workspace.**
Nobody in the resume space (Zety, Novoresume, Rezi, Teal, Enhancv) treats Arabic as a first-class citizen. WiseResume already ships `/ar/*` mirrors, RTL icon flips, and localized legal pages ΓÇö but "supports Arabic" and "designed for Arabic" are different products. Concretely:
- Pair a distinctive **Arabic companion face** to the display font (e.g. IBM Plex Sans Arabic / Readex Pro class) and declare it in the token layer so AR rendering is brand, not system fallback.
- RTL-native components (mirrored progress, score rings, stepper) instead of rotated arrows.
- Bilingual resume templates as a **flagship feature** (mixed AR/EN CVs are the actual market reality in MENA) ΓÇö this alone is a moat.
- Localized ATS guidance: keyword norms differ per market; "ATS score" that understands both markets is a claim no competitor can copy quickly.

### 6.2 Structure: **Make the Career Pipeline the spine.**
The pieces exist (`ApplicationTrackerPage`, `CareerMilestonesRow`, `DashboardNextActionCard`, `WhatsNextCard`, `HiredCelebrationModal`). Assemble them into one visible journey ΓÇö **Target ΓåÆ Resume ΓåÆ Tailored ΓåÆ Applied ΓåÆ Interview ΓåÆ Offer** ΓÇö as a persistent progress spine (dashboard hero v2 + sidebar badge counts). The dashboard stops being a metric museum and becomes a *next-best-action engine*; every metric resolves to the single recommended action. This reframes 15+ tools from "a grid of features" into "the system that gets you hired" ΓÇö the story the landing's step-counter chip already tells accidentally.

### 6.3 Proof: **Show the product, not the promise.**
- Hero: a live (or recorded-real) resume render reacting in the hero slot ΓÇö replace the typewriter with the artifact it pretends to describe.
- Tailor flow: animate the actual ATS delta with the matched/missing keywords highlighted inline ΓÇö no dialog between the number and the action.
- Trust section: replace generic badges with product truths (bilingual output shown, export formats shown, real workflow screenshot strip).

### 6.4 Signature: **Name and protect the ripple.**
The View Transitions brand/theme ripple is memorable and technically ahead of most production sites. Make it *the* signature: use it for every mode/theme/language switch, document it in brand guidelines, and stop adding competing ambient animation (aurora + light rays can reduce to one).

### 6.5 Craft: **Typography as the fastest identity upgrade.**
Keep Inter for UI body if desired, but give display a distinctive face (a characterful grotesque or an editorial serif pairing for the landing), tabular numerals for scores/metrics, and the Arabic companion family. One font decision changes every screen more than any color tweak could ΓÇö and it's the cheapest "designed by a human" signal available.

---

## 7. Roadmap

**Week 1 ΓÇö quick wins (high leverage, low risk)**
1. Declare Arabic font families in the token layer; audit AR rendering on landing + editor.
2. Replace hardcoded `#9E1B22` with `hsl(var(--primary))`; fix the stale glow comment.
3. Rename `Activity` ΓåÆ `Applications`; give the tracker a pipeline icon.
4. Retire the typewriter headline and feature ticker; promote a live resume render into the hero slot.
5. Inline-action the top 3 dashboard dialogs (Missing Keywords, ATS Portfolio, Improve Quick) as expandable cards.

**Weeks 2ΓÇô4 ΓÇö structural**
6. IA restructure: promote Analytics, Achievements, Templates, Notifications out of "Dashboard" match-purgatory into a visible Discover/Hub group (or a dashboard "More" grid with cards); move Upload/Referral/Help out of Settings.
7. Merge Tailor/AI-Tools overlap: one "Tailoring" home; `/tailor` becomes an entry variant, not a second nav identity.
8. Build the Pipeline spine (dashboard hero v2) from existing tracker + milestones components.
9. Split `index.css` into token / base / component layers; unify `context/` + `contexts/`.

**Quarter ΓÇö signature**
10. Bilingual template library + localized ATS scoring (the moat).
11. Landing proof system: real renders, real deltas, real workflow strip.
12. Motion budget spec: one ambient layer per surface; ripple as the only global transition.

---

## 8. Verification Notes & Limitations

- **Verified in code:** routes, nav maps, token values, component inventories, June-audit fix status, landing composition, shell behavior.
- **Not verified (no live session in this pass):** actual rendering (dark/light editor, RTL layout quality, mobile scroll feel post-fix), runtime perf of the aurora/scroll-stack on mid-range devices, WiseHire toggle conversion impact. A browser-session pass on `wiseresume.app` (desktop + mobile + AR locale) is the recommended next step before implementation.
- All file paths cited are relative to repo root on `main` @ `2d7a31d`; this review was committed to `design/audit-2026-08-28`.

---

*Prepared as a strategy-layer complement to the archived technical audit (June 2026). No code was modified; the branch exists as the working base for the implementation rounds that follow.*
