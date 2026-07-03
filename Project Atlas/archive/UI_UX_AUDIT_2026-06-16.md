# WiseResume UI/UX Audit

**Date:** 2026-06-16  
**Auditor:** Cursor agent (read-only — no code/deploy changes)  
**Design source of truth:** `Project Atlas/design-system/production/`  
**Visual reference:** `Project Atlas/design-system/visual-reference/`  
**Production URL:** https://wiseresume.app

---

## 1. Executive summary

| Item | Result |
|------|--------|
| **Overall UI/UX status** | **MIXED** |
| **Visually cohesive?** | **Partially** — dashboard/app shell and editor/tailoring workspaces feel premium; AI Studio, upload, pricing, and legacy surfaces diverge |
| **Matches Project Atlas?** | **Partially** — crimson tokens exist but are diluted by rainbow KPI colors, amber “premium” styling, portfolio `#e84545` accent, and hardcoded gradients |
| **Routes/pages covered** | **52** primary surfaces inventoried; **38** static code audit; **8** production HTTP shell check; **14** auth-gated (not runtime-verified) |

### Biggest strengths

1. **Workspace-first app shell** — sidebar + top bar + main stage (`AppWorkspaceLayout`, `AppShell`) with token-backed surfaces and glass chrome.
2. **Dashboard intelligence rail** — contextual “recommended next step” pattern aligns with Atlas AI UX rules.
3. **Editor + Tailoring Hub premium CSS** — dedicated workspace systems (`editor-workspace.css`, `job-match-workspace.css`) with strong AI progress states.
4. **Touch/safe-area baseline** — `min-h-[44px]`, `touch-manipulation`, safe-area padding widely applied.
5. **Public portfolio a11y highlights** — skip link, password gate before skeleton, pop-up-blocked fallback.

### Biggest weaknesses

1. **Brand dilution** — rainbow metric strip, amber Pro styling, multiple competing crimson CTAs per screen.
2. **Mobile AI discoverability** — editor hides primary “Improve with AI” on xs; AI Studio lacks prompt composer.
3. **Broken Settings About/Changelog** — state opens nothing (`SettingsPage.tsx`).
4. **Tailoring Result mobile** — score/export below fold; mojibake in loading copy.
5. **Cross-surface visual dialects** — dashboard OS vs editor OS vs AI Studio dark gradient vs upload generic cards.

### Top 5 fixes to prioritize

| # | Fix | Priority | Effort |
|---|-----|----------|--------|
| 1 | Wire Settings About + Changelog dialogs (or navigate to `/whats-new`) | P0 | S |
| 2 | Fix Tailoring Result mojibake + surface score/export on mobile | P0 | S–M |
| 3 | Expose mobile editor primary AI CTA; reduce duplicate mobile nav chrome | P1 | M |
| 4 | Unify dashboard metrics to crimson/neutral palette (remove rainbow KPI hues) | P1 | M |
| 5 | Add AI Studio prompt/composer bar (use existing placeholder state) | P1 | M |

---

## 2. Route inventory

**Legend:** `visual` = production HTTP 200 shell or code + prior smoke; `static` = code-only; `auth` = requires login; `n/a` = internal/dev.

### 1. Public / marketing

| Route | Page | Audit method |
|-------|------|--------------|
| `/` | `Index.tsx` | static |
| `/enterprises` | `Index.tsx` | static |
| `/pricing` | `PricingPage.tsx` | visual (shell) + static |
| `/whats-new` | `WhatsNewPage.tsx` | static |
| `/waitlist` | `WaitlistPage.tsx` | static |
| `/enterprise` | `EnterprisePage.tsx` | static |
| `/privacy-policy` | `PrivacyPage.tsx` | static |
| `/terms-of-service` | `TermsPage.tsx` | static |

### 2. Auth / onboarding

| Route | Page | Audit method |
|-------|------|--------------|
| `/auth`, `/sign-in` | `AuthPage.tsx` | visual (shell) + static |
| `/auth/callback` | `AuthCallbackPage.tsx` | static |
| `/auth/verify-email` | `AuthVerifyEmailPage.tsx` | static |
| `/auth/reset-password` | `AuthResetPasswordPage.tsx` | static |
| `/onboarding` | `OnboardingPage.tsx` | auth + static |

### 3. Core app shell

| Surface | Files | Audit method |
|---------|-------|--------------|
| App shell | `AppShell.tsx`, `AppWorkspaceLayout.tsx`, sidebar/topbar | static |

### 4. Dashboard

| Route | Page | Audit method |
|-------|------|--------------|
| `/dashboard` | `DashboardPage.tsx` | visual (shell) + static |

### 5. Resume editor

| Route | Page | Audit method |
|-------|------|--------------|
| `/editor` | `EditorPage.tsx` | auth + static |

### 6. Upload / import

| Route | Page | Audit method |
|-------|------|--------------|
| `/upload` | `UploadPage.tsx` | auth + static |

### 7. Tailoring Hub

| Route | Page | Audit method |
|-------|------|--------------|
| `/tailoring-hub` | `TailoringHubPage.tsx` | visual (shell) + static |
| `/tailor`, `/tailor/:resumeId` | `TailorPage.tsx` | static (legacy path) |

### 8. Tailoring result

| Route | Page | Audit method |
|-------|------|--------------|
| `/tailoring-hub/result/:resumeId` | `TailoringHubResultPage.tsx` | auth + static |
| `/tailor/result/:resumeId` | `TailoringHubResultPage.tsx` | auth + static |

### 9. AI Studio / AI tools

| Route | Page | Audit method |
|-------|------|--------------|
| `/ai-studio`, `/ai-studio/:tool` | `AIStudioPage.tsx` | visual (shell) + static |
| `/career` | `CareerPage.tsx` | auth + static |

### 10. Portfolio

| Route | Page | Audit method |
|-------|------|--------------|
| `/portfolio` | `PortfolioEditorPage.tsx` | visual (shell) + static |
| `/p/:username` | `PublicPortfolioPage.tsx` | visual (`/p/demo` 200) + static |

### 11. Settings / account / billing

| Route | Page | Audit method |
|-------|------|--------------|
| `/settings` | `SettingsPage.tsx` | visual (shell) + static |
| `/profile` | `ProfilePage.tsx` | auth + static |
| `/subscription` | `SubscriptionPage.tsx` | auth + static |

### 12. Templates / preview / export

| Route | Page | Audit method |
|-------|------|--------------|
| `/templates` | `TemplatesPage.tsx` | visual (shell) + static |
| `/preview` | `PreviewPage.tsx` | auth + static |
| `/resume/:id` | `ResumeDetailPage.tsx` | auth + static |

### 13. Applications / notifications / analytics

| Route | Page | Audit method |
|-------|------|--------------|
| `/applications` | `ApplicationsPage.tsx` | auth + static |
| `/application/:id` | `ApplicationTrackerPage.tsx` | auth + static |
| `/notifications` | `NotificationsPage.tsx` | auth + static |
| `/analytics` | `AnalyticsPage.tsx` | auth + static |
| `/job/:id` | `JobDetailPage.tsx` | auth + static |

### 14. DevKit / admin

| Route | Page | Audit method |
|-------|------|--------------|
| `/devkit` | `DevToolsPage.tsx` | auth (admin) + static |

### 15. WiseHire (shared codebase)

| Routes | Count | Audit method |
|--------|-------|--------------|
| `/wisehire/*` | 16 routes | static (out of WiseResume candidate scope; blue product identity per Atlas) |

### 16. Share / misc

| Route | Page | Audit method |
|-------|------|--------------|
| `/share/:token` | `SharePage.tsx` | static |
| `/help`, `/guides`, `/examples` | various | static |
| `*` | `NotFound.tsx` | static |

---

## 3. Page-by-page audit (WiseResume core)

### Dashboard + app shell

**Impression:** Strongest alignment with Atlas workspace direction — feels like a productivity OS, not a marketing page.

| | Detail |
|---|--------|
| **Works** | Sidebar layout, intelligence panel, resume list cards, token-backed glass surfaces, Framer stagger |
| **Weak** | Rainbow KPI colors (`DashboardMetricsStrip.tsx` amber/rose/violet/sky); decorative emoji in toolbar (Atlas rule #5); multiple crimson CTAs; amber Pro badges vs crimson brand |
| **Mobile** | Dead bottom tab padding (`AppShell.tsx`); intelligence rail below fold; “New Resume” hidden `sm:`; discovery footer desktop-only |
| **A11y** | Skip link present; 44px targets; 10–11px labels borderline |
| **Fix** | Crimson-neutral metrics; remove emoji; collapse CTAs; fix mobile padding; surface intelligence higher on mobile |
| **Priority / effort** | P1 / M |

### Navigation / app shell

| | Detail |
|---|--------|
| **Works** | `data-product="wiseresume"` crimson primary; collapse sidebar; workspace top bar |
| **Weak** | Orphan `BottomTabBar`, `MobileTopBar`, `DesktopNav` (unused); hardcoded `hsl(340,68%,52%)` gradients |
| **Mobile** | Floating hamburger may overlap content |
| **Fix** | Remove or wire legacy nav; tokenize gradient stops |
| **Priority / effort** | P2 / S–M |

### Editor

**Impression:** Premium on desktop; fragmented and chrome-heavy on mobile.

| | Detail |
|---|--------|
| **Works** | Resizable split, nav rail, paper preview, section AI actions, autosave/offline chips, mobile Edit/Preview/ATS tabs |
| **Weak** | Primary AI CTA `hidden sm:inline-flex` (`EditorHeader.tsx`); duplicate top+bottom section nav; up to 4 stacked banners; orphaned `AIAssistantBar` / `AIFloatingButton` |
| **Mobile** | AI tools behind ATS tab; ~120px+ chrome before content |
| **A11y** | Generally good focus on header controls |
| **Fix** | Mobile AI CTA; banner stack collapse; wire suggestions sheet on mobile |
| **Priority / effort** | P0–P1 / M |

### Tailoring Hub

**Impression:** Strong transformation story on desktop; long mobile scroll.

| | Detail |
|---|--------|
| **Works** | `jmw-*` premium studio CSS; 3-step pills; `JobMatchProgressStage`; actionable tailor errors; saved jobs integration |
| **Weak** | Single-column mobile stacks job input far from match analysis/history |
| **Mobile** | Sticky footer helps but value proof is late |
| **Fix** | Collapse steps on mobile; sticky match summary |
| **Priority / effort** | P2 / M |

### Tailoring Result

**Impression:** Good desktop compare/export; mobile undermines “success moment.”

| | Detail |
|---|--------|
| **Works** | Success eyebrow, compare grid, export panel (desktop), F-1 warning/success states |
| **Weak** | Mojibake `Loadingâ€¦` (`TailoringHubResultPage.tsx:374,421); score delta `hidden sm:flex`; export after full compare scroll on mobile |
| **Mobile** | High — users may miss scores and export |
| **Fix** | UTF-8 fix; mobile score strip; sticky export bar |
| **Priority / effort** | P0 / S–M |

### AI Studio

**Impression:** Useful catalog; not yet an AI workspace.

| | Detail |
|---|--------|
| **Works** | Workflow cards, resume context bar, recent tools chips, credit badges |
| **Weak** | No prompt/composer rendered despite placeholder state; hardcoded dark gradient vs dashboard tokens; tour state unused |
| **Mobile** | Page header `lg:hidden` only — desktop relies on shell |
| **Fix** | Add composer bar; align background tokens; first-run tour |
| **Priority / effort** | P1 / M |

### Upload / import

| | Detail |
|---|--------|
| **Works** | Multi-phase flow, progress steps, error recovery, OCR dialog |
| **Weak** | Mobile lacks desktop hero eyebrow/headline; generic `bg-card` vs workspace OS |
| **Mobile** | Functional but utilitarian |
| **Fix** | Compact mobile hero; token alignment |
| **Priority / effort** | P2 / S |

### Portfolio editor

| | Detail |
|---|--------|
| **Works** | Draft/live model, autosave, completion score, preview panel device tabs (good a11y), SaveBar |
| **Weak** | 5-tab cognitive load; tiny mobile preview iframe (220×396); `PortfolioTabStrip` missing full tab ARIA pattern |
| **Mobile** | Long scroll; horizontal tab overflow without hint |
| **Fix** | Tab a11y; larger mobile preview modal; progress indicator |
| **Priority / effort** | P1–P2 / M |

### Public portfolio

| | Detail |
|---|--------|
| **Works** | Skip link, password gate, interest CTA, print fallback, lazy sections |
| **Weak** | Password input placeholder-only; `#e84545` vs brand `#9E1B22`; motion without reduced-motion on entry |
| **Mobile** | Chat widget + header + CTA density |
| **Fix** | Labels; motion guard; document intentional accent |
| **Priority / effort** | P1 / S |

### Onboarding

| | Detail |
|---|--------|
| **Works** | Polished welcome, multi-path ingestion, review sheet, celebration |
| **Weak** | No step progress; Atlas doc describes different 6-step wizard; skip prominent |
| **Mobile** | LinkedIn panel height animation vs sticky footer |
| **Fix** | Step indicator; reduced-motion; Atlas doc sync |
| **Priority / effort** | P2 / M |

### Auth

| | Detail |
|---|--------|
| **Works** | Glass card, offline banner, verification routing |
| **Weak** | Placeholder-only fields (no labels); `?plan=` from Pricing not handled; dead `claim-account` view |
| **Mobile** | Forgot password link small touch target |
| **Fix** | Labels; plan intent persistence |
| **Priority / effort** | P1 / S |

### Settings

| | Detail |
|---|--------|
| **Works** | Section structure, profile hero, row pattern, privacy section |
| **Weak** | **About/Changelog state never renders dialogs** (`changelogOpen`, `aboutDialogOpen` unused in JSX) |
| **A11y** | Toggle labels not programmatically bound to Switch |
| **Fix** | Render dialogs or route to `/whats-new` |
| **Priority / effort** | P0 / S |

### Templates

| | Detail |
|---|--------|
| **Works** | Filter chips 44px, preview sheet, ATS badges, advisor |
| **Weak** | 2-col grid on mobile may be small; no filter empty state; chips lack `aria-pressed` |
| **Priority / effort** | P2 / S |

### Preview / export

| | Detail |
|---|--------|
| **Works** | Export hub, iOS Save to Files, page count, guest hint |
| **Weak** | Dense bottom bar (4–5 actions) on mobile; generic “Preview” title |
| **Priority / effort** | P2 / M |

### Pricing

| | Detail |
|---|--------|
| **Works** | Simple 3-tier, static background (no WebGL), plan labels |
| **Weak** | FAQ defined but not rendered; inconsistent CTA components; Pro/Premium “current plan” still clickable |
| **Priority / effort** | P2 / S |

### DevKit

| | Detail |
|---|--------|
| **Note** | Admin surface — functional density over brand polish; acceptable for internal use |
| **Audit** | static only |

---

## 4. Cross-app design consistency

| Element | Status | Notes |
|---------|--------|-------|
| App shell | ✅ Strong | Workspace sidebar model |
| Navigation | ⚠️ Mixed | Legacy nav files orphaned |
| Cards | ⚠️ Mixed | Dashboard glass vs upload plain cards |
| Buttons | ⚠️ Mixed | Multiple gradient CTAs; `PricingButton` inconsistency |
| Forms | ❌ Weak | Placeholder-only labels in auth/onboarding/gate |
| Typography | ✅ Good | Eyebrow → title → body hierarchy in workspace |
| Spacing | ⚠️ Mixed | Editor banner stack; mobile chrome |
| Colors | ❌ Weak | Rainbow KPIs, amber Pro, portfolio accent |
| Shadows | ✅ Good | Inset card shadows in dashboard CSS |
| Badges | ⚠️ Mixed | Plan badges OK; ATS/tool rainbow icons |
| Dialogs/sheets | ⚠️ Mixed | Settings broken; `Suspense fallback={null}` flashes |
| Toasts | ✅ OK | Sonner used consistently |
| AI states | ✅ Strong | Tailoring progress, intelligence rail |
| Empty/loading | ⚠️ Mixed | Good skeletons; some null fallbacks |

---

## 5. Project Atlas alignment

### Aligned

- Crimson `--primary` token on WiseResume product surfaces
- Workspace-first dashboard/editor/tailoring direction
- Mobile touch targets and safe-area patterns (Atlas `MOBILE_RULES.md`)
- Public portfolio `pf-*` isolation (per Atlas)
- Pricing static background (per Atlas runtime note)
- AI contextual copy in intelligence panel (Atlas §9)

### Not aligned

- Rainbow dashboard metrics (not crimson-first)
- Decorative emoji (`DashboardWorkspaceToolbar.tsx`)
- Multiple primary CTAs per section (Atlas rule #2)
- AI Studio / Upload visual dialects
- Portfolio `#e84545` vs token `#9E1B22`
- Atlas page cards stale (onboarding, auth, settings vs shipped UX)

### Full visual refactor candidates

- `AIStudioPage.tsx` — needs workspace OS treatment + composer
- `UploadPage.tsx` — align with onboarding/workspace hero system
- `PricingPage.tsx` — FAQ, comparison, premium layout
- `ApplicationsPage.tsx` / tracker surfaces — not deeply audited; likely older patterns
- WiseHire routes — separate blue identity (intentional)

### Polish-only candidates

- Dashboard metrics palette
- Settings dialogs
- Tailoring Result mobile + encoding
- Auth form labels
- Templates filter empty state
- Remove orphan nav components

---

## 6. Mobile UX audit

### Biggest mobile issues

1. Editor: hidden AI CTA + duplicate nav + banner stack
2. Tailoring Result: hidden scores, export below fold
3. Dashboard: intelligence below fold; dead bottom padding
4. Preview: overcrowded bottom action bar
5. Portfolio editor: tiny preview iframe; tab overflow

### Highest-risk routes on mobile

| Route | Risk |
|-------|------|
| `/editor` | High |
| `/tailoring-hub/result/:id` | High |
| `/dashboard` | Medium |
| `/preview` | Medium |
| `/portfolio` | Medium |
| `/ai-studio` | Medium |

### Recommended mobile fixes (no backend)

- Sticky mobile export bar on Tailoring Result
- Single mobile command row in editor (merge nav)
- Collapse dashboard metrics to 2×2 grid with crimson accent on primary KPI only
- Preview: overflow menu for secondary actions
- Portfolio: full-screen preview sheet on mobile

---

## 7. AI-native UX audit

### Feels intelligent

- Dashboard intelligence rail (contextual next step)
- Tailoring `JobMatchProgressStage` (phased AI progress)
- Editor section AI actions with diff/review patterns
- AI Studio resume context bar
- Tailoring F-1 unchanged-output guard (honest AI feedback)

### Feels generic / decorative

- AI Studio card grid without composer
- Rainbow tool icons in mobile tools sheet
- Orphan floating AI button / assistant bar (unused)
- ATS badge on preview without explanation link

### Recommendations

- One persistent “Ask WiseResume” composer in AI Studio (reuse placeholder rotation)
- Surface AI credit cost before action on mobile editor (not only in sheets)
- Unify AI progress component across tailor, parse, section enhance
- Show “what changed” summary on dashboard after tailor (activation loop)

---

## 8. Accessibility audit

| Issue | Severity | Location |
|-------|----------|----------|
| Settings About/Changelog broken | High | `SettingsPage.tsx` |
| Form fields placeholder-only | High | `AuthPage.tsx`, onboarding manual, public password gate |
| Portfolio tab strip incomplete ARIA | Medium | `PortfolioTabStrip.tsx` |
| Filter chips missing `aria-pressed` | Low | `TemplatesPage.tsx` |
| Toggle label not bound to Switch | Medium | `SettingsRow.tsx` |
| Motion without `prefers-reduced-motion` | Medium | Onboarding, public portfolio entry |
| 10–11px dashboard labels | Low | Metrics, intelligence eyebrow |

### Quick wins

- Add `<label htmlFor>` on auth fields
- Render Settings dialogs
- Mirror `PortfolioPreviewPanel` tab pattern on `PortfolioTabStrip`
- `prefers-reduced-motion` guards on onboarding animations

---

## 9. Prioritized issue table

| P | Area | Issue | User impact | Evidence | Recommended fix | Effort |
|---|------|-------|-------------|----------|-----------------|--------|
| P0 | Settings | About/Changelog open nothing | Trust/support broken | `SettingsPage.tsx:98-99` | Render Dialog or navigate | S |
| P0 | Tailoring Result | Mojibake in loading text | Looks broken/unprofessional | `TailoringHubResultPage.tsx:374,421` | Fix UTF-8 strings | S |
| P0 | Editor mobile | Primary AI CTA hidden on xs | AI discovery failure | `EditorHeader.tsx` | Show mobile CTA | S |
| P1 | Dashboard | Rainbow KPI colors | Off-brand, generic SaaS | `DashboardMetricsStrip.tsx:36-56` | Crimson/neutral palette | M |
| P1 | Dashboard | Multiple competing CTAs | Confusing hierarchy | Top bar + intelligence + cards | One primary per section | M |
| P1 | AI Studio | No prompt composer | Not AI-native | `AIStudioPage.tsx` | Add input bar | M |
| P1 | Auth | `?plan=` ignored from Pricing | Broken upgrade funnel | `AuthPage.tsx`, `PricingPage.tsx` | Persist plan intent | S |
| P1 | Auth | No field labels | a11y / clarity | `AuthPage.tsx` | Add labels | S |
| P1 | Tailoring Result mobile | Score/export hidden/low | Weak success moment | `TailoringHubResultPage.tsx` | Sticky mobile bar | M |
| P1 | Portfolio tabs | Incomplete tab ARIA | Keyboard/a11y | `PortfolioTabStrip.tsx` | Full tab pattern | S |
| P2 | App shell | Dead bottom tab padding | Wasted mobile space | `AppShell.tsx:142` | Remove padding | S |
| P2 | Editor | Duplicate mobile nav rows | Cramped viewport | `EditorPage.tsx` | Merge nav | M |
| P2 | Upload | No mobile hero | Weak first impression | `UploadPage.tsx` | Compact hero | S |
| P2 | Pricing | FAQ not rendered | Missing trust content | `PricingPage.tsx` | Show FAQ section | S |
| P2 | Onboarding | No step progress | Disorientation | `OnboardingPage.tsx` | Step indicator | M |
| P2 | Dashboard | Emoji in toolbar | Atlas violation | `DashboardWorkspaceToolbar.tsx` | Remove emoji | S |
| P3 | Nav | Orphan BottomTabBar | Confusion for devs | unused files | Delete or document | S |
| P3 | AI Studio | Hardcoded dark gradient | Visual inconsistency | `AIStudioPage.tsx:418` | Token background | S |
| P3 | Preview | Dense mobile bottom bar | Mis-taps | `PreviewPage.tsx` | Overflow menu | M |

---

## 10. Recommended implementation roadmap

### Phase 1 — Before public push / TestSprite full UX rerun

- Fix Settings About/Changelog (P0)
- Fix Tailoring Result encoding + mobile score/export (P0)
- Mobile editor AI CTA (P0)
- Auth form labels + `?plan=` handling (P1)
- Remove dashboard toolbar emoji (P2 quick)

### Phase 2 — High-impact premium polish

- Dashboard metrics crimson/neutral redesign
- CTA hierarchy pass (dashboard, editor header)
- AI Studio composer bar
- Portfolio tab a11y + mobile preview sheet
- Upload mobile hero alignment

### Phase 3 — Full visual refactors

- AI Studio workspace OS alignment
- Upload/import workspace alignment
- Pricing page premium layout + FAQ
- Applications/tracker visual pass

### Phase 4 — Later cleanup

- Remove orphan nav components
- Test expectation drift (`tailorMerge`, `usePublicPortfolio` tests)
- Atlas page card documentation refresh
- WiseHire surfaces (separate product pass)

---

## 11. Owner-friendly summary

**What looks good:** The dashboard and app shell finally feel like a serious AI career workspace — not a generic template. The editor and Tailoring Hub have real premium polish on desktop. AI progress during tailoring is a standout. Public portfolio has thoughtful details (skip link, password gate, print fallback).

**What still needs work:** The app is not one visual language yet. Dashboard metrics use rainbow colors that don’t match WiseResume crimson. Mobile editor and Tailoring Result hide the best parts (AI button, scores, export). Settings “About” and “What’s New” are broken. AI Studio is a tool list, not an AI workspace.

**Redesign first:** AI Studio (add composer + match dashboard OS), then dashboard metrics palette, then mobile Tailoring Result success screen.

**Polish only:** Settings dialogs, auth labels, Tailoring encoding fix, pricing FAQ, remove dashboard emoji.

**Can wait:** Orphan nav file cleanup, Atlas doc updates, WiseHire pass, unit test drift.

---

## 12. Implementation status (2026-06-16)

**Branch:** `feat/ui-ux-audit-fixes`  
**Scope:** UI-only fixes per phased implementation plan (Phases 0–6).

| Phase | Status | Highlights |
|-------|--------|------------|
| 0 | Done | Branch + tsc/build baseline |
| 1 | Done | Settings About/Changelog dialogs; tailoring mojibake + mobile bar; editor mobile AI CTA; auth labels; dashboard emoji removed |
| 2 | Done | Crimson/neutral metrics; CTA hierarchy; auth `?plan=` intent; portfolio tab ARIA; pricing FAQ; AppShell padding |
| 3 | Done | Editor duplicate mobile nav removed; preview overflow menu; portfolio full-preview sheet; upload mobile hero; onboarding progress |
| 4 | Done | AI Studio composer, token background, first-run tour, workflow card polish |
| 5 | Done | Pricing recommended tier; Applications workspace header; upload hero (interim) |
| 6 | Done | Orphan nav removed + `docs/legacy/nav/README.md`; test drift fixed; this section |

**Manual QA still recommended:** `/settings`, `/editor` (mobile), `/tailoring-hub/result/:id`, `/dashboard`, `/auth?plan=pro`, `/pricing`, `/ai-studio`, portfolio editor tabs.

---

## Audit method notes

- **Static code review:** primary method for authenticated surfaces
- **Production shell checks:** `/`, `/auth`, `/dashboard`, `/tailoring-hub`, `/ai-studio`, `/portfolio`, `/settings`, `/templates`, `/p/demo` returned HTTP 200 SPA shell (2026-06-16)
- **Subagent-assisted review:** layout/dashboard, editor/tailoring/AI/upload, portfolio/auth/settings
- **Not runtime-verified:** logged-in dashboard metrics, editor split, tailor live flow, AI inference UI — require manual QA or TestSprite after AI keys confirmed
- **No product code changed** during this audit
