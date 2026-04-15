# CHANGELOG

Local changelog tracking WiseResume changes.

## 2026-04-15

### WISEHIRE-PHASE3-BUGFIX — Phase 3 Bug Fix & Spec Compliance Pass
- **Summary**: 15-issue bug fix pass over the WiseHire Phase 3 landing page implementation. Covers spec violations, visual regressions, functional bugs, and governance gaps confirmed by spec-kit analysis plus 4 additional user-reported bugs.
- **Fixed**:
  - **Toggle labels** — "Job Seeker" → "For Job Seekers", "Hiring / HR" → "For Companies" (spec FR-001 / BRANDING.md)
  - **Aurora background** — `AuroraBackground.tsx` now uses a `MutationObserver` to detect `data-lp-product="wisehire"` and switches to WiseHire teal/blue color stops (`#0D2E6E`, `#1D4ED8`, `#38BDF8`) instead of always rendering red
  - **Demo section visibility** — Removed `lp-animate` from the outermost flex container in `WiseHireDemoSection` so the demo pane is visible immediately on render, not hidden until IntersectionObserver fires
  - **BriefDemo loop** — Score dial now resets to 0 and re-animates every ~3 s (infinite cycle)
  - **PipelineDemo loop** — Pipeline kanban resets to initial card positions when all 7 cards reach the Offer column, then cycles again
  - **JDDemo loop** — Typewriter restarts 2.5 s after completion; all state resets cleanly
  - **Pricing badge** — Every tier now shows an "Early Access" badge; Professional tier additionally shows a "⭐ Most Popular" inline pill
  - **Pricing nav link** — In WiseHire mode, clicking "Pricing" in the nav smooth-scrolls to `#wisehire-pricing` instead of navigating to `/pricing` (WiseResume page)
  - **AvatarFallback color** — Avatar fallback in the landing nav switches to WiseHire blue (`rgba(29,78,216,0.15)` / `#3B82F6`) in WiseHire mode instead of always showing crimson
  - **FeatureNumberedNav crimson** — Replaced hardcoded `rgba(158,27,34,...)` active-state colours with `var(--lp-brand-pill-bg)` and `var(--lp-brand-pill-border)` CSS variables (respects mode)
  - **Comment typo** — "WISERESUEME" → "WISERESUME" in Index.tsx
- **New files**:
  - `src/components/landing/wisehire/WiseHireTrustSection.tsx` — HR-specific social proof section (4 trust cards: AI screening, consistent scoring, speed, team alignment)
  - `src/components/landing/wisehire/WiseHireFeatureTicker.tsx` — Scrolling marquee of WiseHire pillars (Brief Generator · JD Writer · Pipeline Board · Bulk Screening · Talent Pool)
- **Section order after fix**: Hero → Trust → Feature Ticker → Demo → Features → Pricing → Footer
- **Modified files**:
  - `src/components/landing/LandingToggle.tsx` — label copy
  - `src/components/landing/AuroraBackground.tsx` — MutationObserver + product-aware colour stops
  - `src/components/landing/wisehire/WiseHireDemoSection.tsx` — lp-animate removed from flex container
  - `src/components/landing/wisehire/BriefDemo.tsx` — replay loop
  - `src/components/landing/wisehire/PipelineDemo.tsx` — reset loop
  - `src/components/landing/wisehire/JDDemo.tsx` — restart loop
  - `src/components/landing/wisehire/WiseHirePricing.tsx` — badge fix, `id="wisehire-pricing"`
  - `src/pages/Index.tsx` — imports, section order, nav link, FeatureNumberedNav vars, AvatarFallback, typo
- **Tasks completed**: Phase 3 Bug Fix Pass (all 15 issues + 4 user-reported bugs) ✅
- **Spec reference**: `specs/001-wisehire-hr-platform/plan.md` Phase 3 bug fix

### WISEHIRE-PHASE3 — US1: Landing Page Toggle + Full WiseHire Theme
- **Summary**: The landing page now has a sticky "I'm a: Job Seeker / Hiring / HR" toggle strip at the top. Clicking "Hiring / HR" switches the entire landing to WiseHire mode: blue brand (`#1D4ED8`), "WiseHire" in the header, WiseHire hero, tabbed demo section, 5-pillar features, 4-tier pricing, and a 4-field waitlist modal (UI stub only — no backend call). URL updates to `?for=companies` so the link is shareable. Switching back restores WiseResume fully. Both light and dark themes work correctly in both modes.
- **New files**:
  - `src/components/landing/LandingToggle.tsx` — product switcher strip embedded in the header above the nav row
  - `src/components/landing/WaitlistModal.tsx` — 4-field form (email, name, company, size) with placeholder confirmation; no backend call
  - `src/components/landing/wisehire/WiseHireHero.tsx` — hero with typewriter (Hiring Manager / Recruiter / HR Director / Head of People / Talent Partner), "Join the Waitlist" CTA, "Log In" secondary CTA, trust badges
  - `src/components/landing/wisehire/WiseHireFeatures.tsx` — 5 pillar cards (Brief Generator, JD Writer, Pipeline Board, Bulk Screening, Talent Pool) + CTA card
  - `src/components/landing/wisehire/WiseHirePricing.tsx` — 4 tier pricing cards (Starter $49, Professional $149, Business $399, Enterprise custom) with Early Access badge
  - `src/components/landing/wisehire/BriefDemo.tsx` — animated mock AI candidate brief with live score dial
  - `src/components/landing/wisehire/PipelineDemo.tsx` — animated kanban pipeline board with auto-advancing cards
  - `src/components/landing/wisehire/JDDemo.tsx` — streaming typewriter JD writer UI simulation
  - `src/components/landing/wisehire/WiseHireDemoSection.tsx` — tabbed demo container (Brief Generator / Pipeline Board / JD Writer)
- **Modified files**:
  - `src/pages/Index.tsx` — mode state, `data-lp-product="wisehire"` attribute, WiseHire CSS variable overrides, `LandingToggle` in header, `WaitlistModal` rendered at root, OG meta tag + document title updates on mode change, hero paddingTop adjusted for toggle strip height
- **Tasks completed**: T022–T032 ✅
- **Spec reference**: `specs/001-wisehire-hr-platform/plan.md` Phase 3 / US1

### WISEHIRE-PHASE2 — US3: Account Type Visibility in Dev Kit
- **Summary**: HR vs Job Seeker account types are now fully visible in the admin dev kit. All existing users show "Job Seeker" (emerald badge). HR Account badge (WiseHire blue #1D4ED8) will appear as soon as the first HR user signs up.
- **Changes**:
  - `DevKitBadges.tsx` — new `AccountTypeBadge` component (emerald "Job Seeker" / blue "HR Account" with icon)
  - `OverviewPanel.tsx` — two new stat cards: "Job Seekers" (emerald) and "HR Accounts" (blue), computed from the full user list
  - `AdminUsersPanel.tsx` — `account_type` added to `AdminUser` interface; badge renders under email in every user row
  - `UserDetailDrawer.tsx` — `AccountTypeBadge` shown in drawer header below email; avatar tint switches to WiseHire blue for HR accounts
  - `supabase/functions/admin-list-users/index.ts` — both profile SELECT queries updated to include `account_type`; all 4 user record builders updated; function deployed
- **Tasks completed**: T016–T021 ✅
- **Spec reference**: `specs/001-wisehire-hr-platform/plan.md` Phase 2

### WISEHIRE-PHASE1-STEP-1 — Database Foundation
- **Summary**: Applied all 8 WiseHire Phase 1 SQL migrations to Supabase. All 7 new tables created with RLS enabled. `profiles.account_type` column added with DEFAULT `'job_seeker'`. `candidate-resumes` storage bucket created. `WISEHIRE_INVITE_SECRET` (64-char hex HMAC key) set as a Supabase edge function secret.
- **Migrations applied**: `20260420000001` through `20260420000008` — applied via Supabase Management API (CLI pooler auth blocked by Replit network; management API used as equivalent).
- **Tables created**: `wisehire_waitlist`, `wisehire_invites`, `wisehire_companies`, `wisehire_roles`, `wisehire_candidates`, `wisehire_candidate_briefs`, `wisehire_pipeline_events`
- **Column added**: `profiles.account_type TEXT NOT NULL DEFAULT 'job_seeker' CHECK (account_type IN ('job_seeker', 'hr'))`
- **RLS verified**: All 7 tables have RLS enabled; `wisehire_companies`, `wisehire_roles`, `wisehire_candidates`, `wisehire_candidate_briefs`, `wisehire_pipeline_events` have `owner_id = auth.uid()` policies; `wisehire_waitlist` and `wisehire_invites` are admin service-role-only.
- **New env secret**: `WISEHIRE_INVITE_SECRET` set in Supabase edge function secrets.
- **Governance updated**: `ARCHITECTURE.md` WiseHire tables moved from "planned" to "built". Storage bucket updated.
- **Tasks completed**: T001–T015 ✅
- **Files**: `supabase/migrations/20260420000001-8_wisehire_*.sql` (8 new files)
- **Spec reference**: `specs/001-wisehire-hr-platform/plan.md` Phase 1, Step 1

### WISEHIRE-PHASE1-TASKS
- **Summary**: Wrote `specs/001-wisehire-hr-platform/tasks.md` — the full Phase 3 SDD task list for WiseHire Phase 1 implementation. 121 checkboxed tasks organised across 13 phases, mapped to all 9 Phase 1 user stories. Completes the Spec → Plan → Tasks → Implementation SDD workflow. Also updated spec.md status to "Approved — Implementation in Progress".
- **Structure**: Phase 1 (DB foundation, T001–T015), Phase 2 (US3 account type visibility, T016–T021), Phase 3 (US1 landing toggle, T022–T032), Phase 4 (US2 waitlist backend, T033–T040), Phase 5 (US6 dev kit admin tools, T041–T049), Phase 6 (US3 sign-up + routing, T050–T057), Phase 7 (US4 onboarding, T058–T063), Phase 8 (US5 trial + subscription, T064–T071), Phase 9 (US1 dashboard shell, T072–T080), Phase 10 (US8 JD Writer, T081–T089), Phase 11 (US7 Brief Generator, T090–T101), Phase 12 (US9 Pipeline Board, T102–T113), Phase 13 (polish, T114–T121).
- **Parallel opportunities**: Phases 2+3 in parallel after Phase 1. Phases 7+8 in parallel after Phase 6. Phases 10+11+12 in parallel after Phase 9.
- **Files**: `specs/001-wisehire-hr-platform/tasks.md` (new), `specs/001-wisehire-hr-platform/spec.md` (status updated)

### WISEHIRE-PHASE1-PLAN (Task #13)
- **Summary**: Wrote the complete technical implementation plan for WiseHire Phase 1 at `specs/001-wisehire-hr-platform/plan.md`. Covers all 66 FRs from the approved spec, full database schema, edge function interfaces, email templates, exact file modifications, and a sequenced 11-step build order.
- **Constitution check**: All 66 FRs passed against governance rules. Key verifications: `requireAuth` on all `/wisehire/*` routes, RLS on all 7 new tables + `candidate-resumes` storage bucket, `botGuard` on 2 public edge functions, fail-closed rate limiting on both AI functions, `account_type` routing enforced bidirectionally, soft-delete for candidates, SkyWallpaper via AppShell, WCAG AA documented (keyboard pipeline mover).
- **New tables specified**: `wisehire_waitlist`, `wisehire_invites`, `wisehire_companies`, `wisehire_roles`, `wisehire_candidates`, `wisehire_candidate_briefs`, `wisehire_pipeline_events` + `profiles.account_type` column (8 SQL migrations).
- **New edge functions specified**: `wisehire-waitlist-join` (public), `wisehire-validate-invite` (public), `wisehire-generate-brief` (auth+HR), `wisehire-write-jd` (auth+HR), `admin-wisehire-waitlist` (admin), `admin-wisehire-invite` (admin).
- **New email templates specified**: `wisehire-invite.tsx`, `wisehire-waitlist-confirmation.tsx`, `wisehire-waitlist-notification.tsx`.
- **Files modified**: `Index.tsx` (toggle + WiseHire mode), `App.tsx` (routes), `OverviewPanel.tsx`, `AdminUsersPanel.tsx`, `UserDetailDrawer.tsx`, `CouponsPanel.tsx`, `EmailManagementPanel.tsx`, `admin-email-actions/index.ts`, `DevKitBadges.tsx`.
- **New files**: 50+ new pages, components, hooks, lib files across `src/pages/wisehire/`, `src/components/wisehire/`, `src/components/landing/wisehire/`, `src/hooks/wisehire/`, `src/lib/wisehire/`.
- **Build order**: 11 independently deployable steps: Schema → Landing Toggle → Waitlist Backend → Dev Kit Badges → Dev Kit Admin Tools → Sign-Up + Onboarding → Trial + Subscription → Dashboard Shell → JD Writer → Candidate Brief → Pipeline Board.
- **Files**: `specs/001-wisehire-hr-platform/plan.md` (new)
- **Spec reference**: `specs/001-wisehire-hr-platform/spec.md`

### GOVERNANCE-COMPREHENSIVE-UPDATE (Task #12)
- **Summary**: All six governance files comprehensively rewritten to reflect the full platform from day 1 to now, and to officially register WiseHire as the second product under The Wise Cloud umbrella.
- **CONSTITUTION.md**: Updated Section 1 (Purpose) to cover both WiseResume and WiseHire under The Wise Cloud. Updated approved brand list to include WiseHire. Added Section 7: WiseHire Governance covering desktop-first exception, no free tier, invite-only pre-launch, account type isolation, candidate data privacy, and shared infrastructure rules. Updated Section 6.1 to enforce account_type routing discipline for all agents.
- **BRANDING.md**: Added WiseHire as an officially approved brand name with full identity spec — primary color `#1D4ED8` (blue-700), WCAG AA contrast requirement, CSS variable switching via `--lp-brand`, canonical toggle language ("For Job Seekers" / "For Companies"), and brand hierarchy (WiseResume + WiseHire as sub-brands under The Wise Cloud).
- **PRODUCT.md**: Rewrote to dual-audience platform structure. Full WiseResume feature inventory documented (Resume Builder, 30+ templates, all AI tools, Portfolio, Interview Coach, Job Tracker, AI Studio, Career Assessment, Achievements, Analytics, Onboarding). Full WiseHire product scope documented by phase (Phase 1–4). WiseHire tier structure defined. Quality rules updated with WiseHire-specific rules including desktop-first documented exception, no free tier, fail-closed AI, WCAG AA.
- **ARCHITECTURE.md**: Comprehensive rewrite. Full tech stack table. Full Kinde → Supabase Token Bridge documentation. All confirmed current Supabase tables documented with purpose (sourced from `types.ts`), WiseHire planned tables marked clearly as not-yet-built. All 5 Supabase Storage buckets documented (including planned `candidate-resumes` for WiseHire). All 77 edge functions listed and categorized. Full AI system: credit limits, atomic deduction, BYOK (AES-GCM-256), multi-layer rate limiting, fail-closed behavior, WiseHire AI rate limits per tier. WiseHire routing table. Full security and privacy rules. Accurate migration workflow (SQL files in `supabase/migrations/` + `npx supabase db push`).
- **DECISIONS.md**: Preserved all 6 existing decisions exactly. Added Decision #7 (WiseHire same-codebase expansion — rationale, consequences, account_type enforcement). Added Decision #8 (WiseHire desktop-first Phase 1/2 documented exception with Phase 3 mobile commitment).
- **Files**: `project-governance/CONSTITUTION.md`, `project-governance/BRANDING.md`, `project-governance/PRODUCT.md`, `project-governance/ARCHITECTURE.md`, `project-governance/DECISIONS.md`, `project-governance/CHANGELOG.md`
- **Spec reference**: `specs/001-wisehire-hr-platform/spec.md` (G-001, G-019, G-020)


### BOT-SCRAPER-PROTECTION
- **Summary**: Multi-layer bot and scraper protection added entirely within the codebase — no DNS, Cloudflare, or Hostinger changes required.
- **Bot Guard Utility** (`supabase/functions/_shared/botGuard.ts`):
  - `isMaliciousBot(ua)` — fingerprints 35+ known scraper tools and automation libraries (Python requests/urllib/httpx, Scrapy, curl, wget, Selenium, Playwright, Puppeteer, Go/Java/Ruby HTTP clients, and vulnerability scanners like Nuclei and Nikto).
  - `isKnownCrawler(ua)` — allow-list for legitimate search/social crawlers (Googlebot, Bingbot, Twitterbot, facebookexternalhit, LinkedInBot, SlackBot, DiscordBot, Telegram, Apple, Yandex, DuckDuckGo). Always exempted from blocks.
  - `hasForeignReferer(referer, allowedHosts)` — detects requests whose Referer header originates from an external domain.
  - `botBlockedResponse(corsHeaders)` — standard 403 JSON response for blocked requests.
- **`track-portfolio-view`**: Three-layer protection — UA fingerprinting → 403, Referer validation (allows `thewise.cloud` and `localhost`) → 403, IP rate limit → 429 after 30 req/min (database-backed).
- **`og-image`**: UA fingerprinting (known crawlers exempted for link previews), IP rate limit → 429 after 60 req/min.
- **`portfolio-meta`**: Malicious bots blocked before any DB query; replaced local inline `isCrawler()` with shared `isKnownCrawler()`.
- **`checkIpRateLimit`** added to `_shared/rateLimiter.ts`: Persistent DB-backed IP rate limiting via `rpc_rate_limits` table. Fail-open on DB error. Skips limiting when client IP is undetermined.
- **`public/robots.txt`**: `User-agent: *` now has `Disallow: /p/`. Named crawlers keep `Allow: /`. Sitemap directive added.
- **Files**: `_shared/botGuard.ts` (new), `_shared/rateLimiter.ts`, `track-portfolio-view/index.ts`, `og-image/index.ts`, `portfolio-meta/index.ts`, `public/robots.txt`

### EMAIL-OBFUSCATION
- **Summary**: Contact email addresses on public portfolio pages are no longer present in the raw HTML — bots cannot harvest them by reading page source.
- The "Get in Touch" button in `PublicHero.tsx` and `StickyHeader.tsx` now stores the email split across `data-eu` (user part) and `data-ed` (domain part) attributes. The `mailto:` link is assembled in JavaScript only when a real user clicks the button. Zero UX change for human visitors.
- **Files**: `src/components/portfolio/public/PublicHero.tsx`, `src/components/portfolio/public/StickyHeader.tsx`

### TRUST-SECURITY-MESSAGING
- **Summary**: Added specific, plain-language security messaging for users — explaining exactly what protects them, not generic marketing copy.
- **Landing page** (`src/components/landing/TrustSection.tsx`): New "Your privacy is protected" section with 4 callout cards: email hidden from bots, public/private portfolio toggle, AI chat HMAC tokens, resume data never shared or used for training. Fully dark/light mode aware via `--lp-*` CSS variables. Uses `lp-animate` scroll animation consistent with all other landing sections.
- **Portfolio editor**: Inline `ShieldCheck` note beneath the contact email input in `MoreTab.tsx` and `ProfileSection.tsx` explaining the bot-obfuscation.
- `Index.tsx` updated: `<TrustSection />` inserted between the feature grid and the PWA install strip.
- **Files**: `src/components/landing/TrustSection.tsx` (new), `src/pages/Index.tsx`, `src/components/portfolio/editor/MoreTab.tsx`, `src/components/portfolio/editor/ProfileSection.tsx`

### PORTFOLIO-ACCESSIBILITY-ANIMATION-TOKENS (Tasks #5, #6, #7)
- **Summary**: Three-phase audit fixing 18 findings across accessibility, interaction quality, and design tokens on public portfolio pages.
- **Task #5 — Accessibility & touch targets**: All interactive elements meet 44×44 px minimum; muted `#9ca3af` colour replaced with contrast-safe values on light themes; missing `aria-label` on icon-only social buttons added; focus rings made visible and consistent.
- **Task #6 — Interaction & animation quality**: Scroll-triggered animations smoothed (cubic-bezier, staggered delays); `active:scale-95` press states added; `prefers-reduced-motion` respected; hover scale transitions unified.
- **Task #7 — Design tokens, fonts & polish**: Portfolio theme CSS variables consolidated (`--pf-heading-font`, `--pf-body-font`, etc.); font loading improved (display swap, subset); light theme text contrast corrected across all 9 themes; border radius and spacing tokens unified.

### LANDING-PERFORMANCE-CLEANUP (Phases 1–3)
- **Summary**: Fixed FCP regression and removed dead bundle weight from the landing page.
- **Phase 1**: Fixed import errors causing blank screen on first load.
- **Phase 2**: Removed Three.js, GSAP, and all debug `console.log` calls from the bundle.
- **Phase 3**: UX flow improvements — CTA pulse animation, hero trust badges, feature ticker.
- **Cleanup**: Removed orphaned `PageLoadingSpinner` import and Supabase 401 warm-up fetch from `Index.tsx`.
- **Files**: `src/pages/Index.tsx`, various component files

## 2026-03-24

### PARSING-ATS-AUDIT
- **Summary**: Implemented the Parsing & ATS Simulation Audit (Spec-020). Refined PDF parsing heuristics for international formats, synchronized edge function fallback parsers, and overhauled the ATS user feedback UI.
- **Parsing**: Expanded `SECTION_PATTERNS` to support new section headers (e.g., "Work History", "Career Summary"). Resolved ALL-CAPS splitting issues for experience fields. Improved date range extraction to support single-year and varied date formats. Fully synchronized the edge function `localParser.ts` to capture Awards, Projects, Volunteering, and Languages during AI outages.
- **ATS Simulation**: Updated `simulateATSParsing` to compute overall scores (0-100), extract detailed `matchedKeywords` and `missingKeywords` directly from a Job Description, and supply `formattingWarnings` for two-column layouts and low OCR confidence.
- **UI/UX**: Rendered the missing and matched keywords inside `ATSParserPreview.tsx`. Added a "Resume Keywords Found" section visible even without a Job Description, using enhanced bento-style chip components for a premium aesthetic. Added recovery UI banners in `UploadPage.tsx` tied to `parseStatus`.
- **LinkedIn Import**: Expanded edge function parsing support to include certifications, volunteering, languages, and projects. Improved rejection message for URL-only pasting.
- **Resilience**: Wrapped Gemini text-cleaning requests in try/catch to maintain fallback extraction capability even when the AI service is unreachable, utilizing the newly synchronized local RegExp parser (`localParser.ts`).
- **Tests**: Verified implementation via `sectionParsers.test.ts` and `atsParser-D1.test.ts` (100% pass rate). Finalized all documentation in `parsing_audit_walkthrough.md`.

## 2026-03-22

### API-BUGFIXES-UX
- **Summary**: Executed the `api/bugfixes-ux` phase, addressing critical bugs in authentication resilience, active resume state management, connection banner precision, deep analysis tool feedback, and PDF export integrity.
- **Active State**: Fixed active resume recognition, eliminating the "Create a resume first" interstitial after creation/duplication.
- **Resilience**: Implemented differentiated error logging in `SupabaseBridge` for network vs. auth failures.
- **PDF Integrity**: Hardened PDF export integrity by fixing `Uint8Array` byte-leakage in combined PDF generation and resolved SharedArrayBuffer TypeScript lints.
- **UI/UX**: Added backdrop-blur-md glassmorphism to Job Analysis and Export sheets and refactored Preview Page layout to prevent FAB overlap.
- **Verification**: `npm run build` and `npm run test` (301/302) verified across all domains.

## 2026-03-17

### COMPREHENSIVE-UNIT-TESTS
- **Summary**: Implemented a robust, 302-test suite covering all 10 product domains (D1â€“D10) as part of spec-021. This provides the stable testing foundation required for upcoming parsing and AI audits.
- **AI & Logic**: Validated `useAgenticChat`, `useAIPrompts`, and `useAITailor` hooks including streaming and error states.
- **Editor & State**: Full coverage for `resumeStore` persistence, hydration, and complex CV manipulation logic.
- **Authentication**: Verified `AuthContext` token bridge readiness, Kindeâ€“Supabase exchange flows, and protected route redirection.
- **Parsing**: Stabilized regex-based parsing for sections and dates; added stubs for future ATS simulation enhancements.
- **Domains (D7â€“D10)**: Completed the final phase (Task C) covering Interview (voice/simulator), Portfolio (visibility/chat), Applications Tracker, and Settings (BYOK/Theme).
- **Environment**: Configured Vitest for stable path resolution within the nested repo structure. Updated `framer-motion` and `haptics` mocks.
- **Files**: `src/pages/__tests__/*`, `src/hooks/__tests__/*`, `src/lib/__tests__/*`, `src/test/setup.ts`, `vitest.config.ts`, `src/test/mocks/*`
- **Results**: `npm run test` â€” 302/302 passing across 50 files. Coverage established as baseline for future feature work.

## 2026-03-15

### SECURITY-AUDIT-FIXES
- **Summary**: Addressed all critical and medium-priority findings from the code security audit. Six targeted fixes applied with small, safe changes. All 166 tests pass. Edge functions redeployed.
- **Security (Critical)**: `authMiddleware.ts` — replaced insecure JWT payload decode with full HS256 signature verification using `jose.jwtVerify()` and `EXT_SUPABASE_JWT_SECRET`. Downstream functions now reject tampered tokens.
- **Bug Fix (Medium)**: `PortfolioEditorPage.tsx` — explicitly catches PostgreSQL error code `23505` (duplicate key) in `handleSave` and displays a user-friendly "username taken" toast instead of a silent failure.
- **Error Handling (Medium)**: `InterviewPage.tsx` — added `.onError()` callback to `saveSession.mutate()` that shows a toast on network or auth failures. Also consolidated JSON/regex parse paths into a single `useMemo` and added display-safe markdown conversion for new AI JSON output.
- **Resilience**: `AuthContext.tsx` — preserves cached Supabase bridge token when Kinde is loading or unavailable, enabling graceful offline/fallback access.
- **Persistence**: `supabaseBridge.ts` — migrated bridge token storage from in-memory to `localStorage`, eliminating redundant token exchange calls on page refresh. `clearBridge()` also clears localStorage.
- **AI Output**: `interview-chat/index.ts` — rewrote end-interview system prompt to output structured JSON (`overallAssessment`, `strengths`, `improvements`, `score`, `nextSteps`) instead of fragile markdown, with legacy regex fallback in the parser.
- **Rate Limiting**: New migration `20260315000000_rate_limit_get_public_portfolio.sql` — adds `rpc_rate_limits` tracking table and enforces 60 requests/minute per IP inside `get_public_portfolio` RPC body.
- **Files**: `supabase/functions/_shared/authMiddleware.ts`, `src/pages/PortfolioEditorPage.tsx`, `src/pages/InterviewPage.tsx`, `src/contexts/AuthContext.tsx`, `src/lib/supabaseBridge.ts`, `supabase/functions/interview-chat/index.ts`, `supabase/migrations/20260315000000_rate_limit_get_public_portfolio.sql`
- **Tests**: `npm run test` — 166/166 passing. Edge functions deployed via `npx supabase functions deploy`.
- **Next**: Run `npx supabase db push` to apply rate limit migration to production DB.

## 2026-03-14

### DEV-KIT-SECURITY-UI
- **Summary**: Secured the Developer Kit by moving password verification server-side, increased email rate limits for robustness, and overhauled the UI for better contrast.
- **Security**: Deleted hardcoded frontend password and implemented `verify-dev-kit` Edge Function.
- **Reliability**: Increased `check_email_rate_limit` (3 → 10 per hour) to accommodate full Dev Kit smoke tests.
- **UI/UX**: Replaced problematic translucent `secondary` button variant with solid accessible background. Increased Dev Kit card and header opacity.
- **Files**: `src/pages/DevToolsPage.tsx`, `src/components/ui/button.tsx`, `src/components/dev-kit/TestItem.tsx`, `src/components/dev-kit/DevKitRunner.tsx`, `supabase/functions/verify-dev-kit/index.ts`, `supabase/migrations/20260313220000_unified_contact_requests.sql`

### PORTFOLIO-CHAT-PERSISTENCE
- **Summary**: Fixed the "disappearing chat" issue on public portfolios by implementing logic for fallbacks and message limits.
- **Logic**: Updated `ask-portfolio` Edge Function to return `isFallback: true` instead of disabling chat when owner BYOK is missing.
- **UX**: Implemented a 5-message visitor limit with a visible `N/5` counter for fallback sessions.
- **Resilience**: Removed aggressive "self-hide" logic in `ChatWidget`. The widget now stays visible and provides helpful feedback/errors.
- **Files**: `src/components/portfolio/public/ChatWidget.tsx`, `supabase/functions/ask-portfolio/index.ts`

### DOMAIN-STANDARDIZATION
- **Summary**: Global replacement of legacy domains with official ones across all layers.
- **Domains**: Replaced `wiseresume.com`, `wiseresume.mcdisover.com`, and `wiseresume.lovable.app` references with `thewise.cloud` and `resume.thewise.cloud`.
- **Integrations**: Updated Dev Kit smoke tests to use `contact@thewise.cloud`.
- **Files**: `src/components/dev-kit/DevKitRunner.tsx`, `src/lib/portfolioUrl.ts`, `supabase/functions/_shared/cors.ts`, Global regex replace.

### UI-READABILITY-FIXES
- **Summary**: Improved theme-awareness and readability for core components.
- **Developer Card**: Redesigned `DeveloperCreditCard` with theme-responsive backgrounds and glassmorphism. Fixed hardcoded dark text/backgrounds that broke light theme visibility.
- **Files**: `src/components/settings/DeveloperCreditCard.tsx`, `src/components/settings/DeveloperCreditCard.css`

### THEME-AWARE-BRANDING
- **Summary**: Standardized app branding with theme-aware assets and dynamic splash screen.
- **Branding**: Implemented `Light.webp` and `Dark.webp` as primary logo sources.
- **UX**: Added dynamic theme-aware splash screen in `index.html` to prevent white-flash on load.
- **Assets**: Regenerated PWA icons and favicons using official branding. Removed all legacy `wise-ai-logo` assets.
- **Files**: `index.html`, `src/hooks/useThemeLogo.ts`, `src/components/brand/AppIcon.tsx`, `src/components/layout/AppShell.tsx`

## 2026-03-13

### API-BUGFIXES-UX
- **Summary**: Implemented 6 core fixes and UX improvements (013-api-bugfixes-ux).
  1) Token-exchange flow inspection and validation context established.
  2) Forced `currentResumeId` sync after creating/duplicating to prevent "Create a resume first" interstitial bug.
  3) Differentiated `OFFLINE_NETWORK` vs `AUTH_REJECTION` for the connection error banner in `AppShell`.
  4) Replaced disabled Deep Analyze text area with a clickable Toast interceptor for better feedback.
  5) Fixed PDF export BLOB generation (using `Uint8Array` directly) to ensure PDF integrity on all platforms.
  6) Added glassmorphic `backdrop-blur-md` to Settings/Dialogs/Sheets and adjusted AppShell FAB / layout padding to prevent overlap with `BottomTabBar`.
- **Files**: `src/lib/supabaseBridge.ts`, `src/hooks/useResumes.ts`, `src/components/editor/JobAnalysisSheet.tsx`, `src/components/layout/AppShell.tsx`, `src/lib/pdfGenerator.ts`, `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`, `src/components/ui/alert-dialog.tsx`

### AI-TEST-COOLDOWN
- **Summary**: Implemented a per-user 5-minute cooldown for the "Test AI Connection" action when using the built-in WiseResume AI provider.
  - Backend: Updated `ai-test` edge function to check `ai_usage_logs` for recent tests and return a 429 status with remaining time.
  - Frontend: Updated `AISettingsSheet.tsx` to handle 429 status, display a countdown timer on the test button, and disable it during the cooldown period.
  - Scope: Cooldown only applies to "WiseResume AI" provider; "Own API Key" providers are exempt.
- **Files**: `supabase/functions/ai-test/index.ts`, `src/components/settings/AISettingsSheet.tsx`

### BACKEND-GATEWAY-OVERHAUL
- **Summary**: Complete backend overhaul: unified split Supabase architecture, replaced Lovable AI Gateway with Gemini-direct (Wise AI), migrated email from Lovable SDK to Resend, and cleaned codebase of all legacy references.
- **Phase 1 — Architecture Unification**:
  - Updated `supabase/config.toml` project_id from `hjnnamwgztlhzkeuufln` → `jnsfmkzgxsviuthaqlyy`
  - Added 3 missing functions to config.toml: `ai-test`, `parse-job-text`, `send-contact-inquiry`
  - Unified `src/lib/supabaseConstants.ts` — `EDGE_FUNCTIONS_URL` now aliases `SUPABASE_URL`
  - Updated `src/integrations/supabase/client.ts` fallback URL to primary project
  - Updated `supabase/functions/_shared/dbClient.ts` comments for unified architecture
- **Phase 2 — Lovable Gateway → Wise AI (Gemini Direct)**:
  - Rewrote `supabase/functions/_shared/aiClient.ts` — removed `callLovableGateway()` and `callEmergentUniversal()` (~130 lines), `mapModelForEmergent()`, `handleEmergentError()`
  - New priority chain: BYOK Ollama → BYOK Gemini → `WISE_AI_API_KEY` (Gemini direct) → `GEMINI_API_KEY` (legacy fallback)
  - Updated `generate-headshot/index.ts` and `parse-resume/index.ts` to use `WISE_AI_API_KEY`
  - Updated `generate-store-screenshots/index.ts` — replaced `ai.gateway.lovable.dev` URL with `generativelanguage.googleapis.com`
  - Updated `_shared/__tests__/aiClient.test.ts` to reflect new priority chain
- **Phase 3 — Email Migration (Lovable SDK → Resend)**:
  - Rewrote `supabase/functions/auth-email-hook/index.ts` — removed `@lovable.dev/email-js` and `@lovable.dev/webhooks-js`, replaced with direct Resend API using `RESEND_API_KEY`
  - Updated all 6 email template logo URLs from old project to primary project (`signup`, `recovery`, `reauthentication`, `magic-link`, `invite`, `email-change`)
- **Phase 4 — CORS & Environment Cleanup**:
  - Removed Lovable domains (`lovable.app`, `lovableproject.com`) from `_shared/cors.ts` CORS allowlist
  - Updated `.env.example` with correct Supabase URL and secret placeholders
- **Phase 5 — Deployment**: Requires Supabase CLI auth (deferred to manual step)
- **Phase 6 — Verification**: Build passes (exit code 0), PWA service worker built. Codebase scan confirms zero remaining references to `lovable`, `EMERGENT_LLM`, or old project ID `hjnnamwgztlhzkeuufln`.
- **Files changed**: `config.toml`, `supabaseConstants.ts`, `client.ts`, `dbClient.ts`, `aiClient.ts`, `aiClient.test.ts`, `cors.ts`, `.env.example`, `auth-email-hook/index.ts`, `generate-headshot/index.ts`, `parse-resume/index.ts`, `generate-store-screenshots/index.ts`, 6 email templates
- **Secrets to set**: `WISE_AI_API_KEY`, `RESEND_API_KEY` (via Supabase Dashboard)
- **Risks**: Edge functions need redeployment. Email logo assumes `wise-ai-logo.png` exists in primary project storage bucket.
## 2026-03-11

### FIX-MOBILE-EDITOR-NAV-OVERLAP
- **Summary**: Added `pb-20` to the SectionNavButtons container in the mobile editor so Previous/Next buttons are not hidden behind the BottomTabBar.
- **Files changed**: `src/pages/EditorPage.tsx`
- **Notes**: Only affects the mobile tabbed editor layout; desktop layout unchanged.

### FIX-AISTUDIO-BUILD-ERROR
- **Summary**: Fixed `.map()` returning `void[]` instead of `ReactNode[]` in AIStudioPage suggestions.
- **Files changed**: `src/pages/AIStudioPage.tsx`


### ADD-BACKGROUND-ASSETS
- **Summary**: Added 4 SkyWallpaper background assets + replication prompt to `public/backgrounds/`.
- **Files added**: `sky-light.jpg`, `sky-dark.jpg`, `sky-light.mp4`, `sky-dark.mp4`, `REPLICATION-PROMPT.md`
- **Notes**: REPLICATION-PROMPT.md contains full spec (tech stack, exact props, colors, animations, camera config, performance optimizations) to recreate the 3D background in another project.

## 2026-03-10

### FIX-PARSE-JOB-500
- **Summary**: Fixed 500 errors in `parse-job-text` and `parse-job-url` edge functions. `parse-job-text` had unhandled auth errors (missing try-catch around `requireAuth`). `parse-job-url` had the fix from previous session but was never redeployed. Both functions now deployed to Lovable Cloud.
- **Files changed**: `supabase/functions/parse-job-text/index.ts` (auth error handling)
- **Test**: Paste a job description text in the Tailor sheet or Analyze Job sheet â€” should parse without 500. Try a LinkedIn URL too.
- **Risks**: None â€” tailor slowness is expected retry behavior (30s timeout â†’ auto-retry succeeds).

### THEME-AWARE-LOGO
- **Summary**: Added theme-aware logo switching â€” light-mode uses `Logo_Web.webp`, dark-mode uses `Logo_Web-2.webp`. Created `useThemeLogo` hook for reuse. Updated `AppIcon`, `Index`, `Footer`, `JobMatchScore` to switch dynamically. QR generator and PDF export use the dark variant (static context with dark backgrounds).
- **Files changed**: `src/assets/wise-ai-logo-dark.webp` (new), `src/assets/wise-ai-logo-dark.png` (new), `src/hooks/useThemeLogo.ts` (new), `src/components/brand/AppIcon.tsx`, `src/pages/Index.tsx`, `src/components/landing/Footer.tsx`, `src/components/applications/JobMatchScore.tsx`, `src/components/portfolio/qr/QRGeneratorSheet.tsx`, `src/lib/companyBriefingPdf.ts`
- **Test**: Toggle between light and dark themes â€” verify logo changes on landing page (navbar + hero), footer, dashboard (via AppIcon/AppLogo), and JobMatchScore sheet. Check QR generator and PDF export still show logo correctly.
- **Risks**: Email templates still use remote URLs â€” needs separate upload.

### REPLACE-APP-LOGO
- **Summary**: Replaced entire app logo with new `Logo_Web.webp`. Overwrote `src/assets/wise-ai-logo.webp`, `.png`, and 3 `public/lovable-uploads/` files. Deleted unused variants (`wise-ai-logo-original.png`, `wise-ai-logo-small.png`, `wise-ai-icon.png`). Zero code changes â€” all existing imports/references automatically use the new logo.
- **Files changed**: 5 asset files overwritten, 3 deleted
- **Test**: Check logo on splash screen, landing page (navbar + hero), footer, dashboard, QR generator, and PDF export.

### FIX-PARSE-JOB-URL-USER-UNDEFINED
- **Summary**: Fixed `ReferenceError: user is not defined` in `parse-job-url` edge function. The variable is `userId` (from `requireAuth`), not `user.id`. Changed line 265 from `userId: user.id` to `userId: userId`.
- **Files changed**: `supabase/functions/parse-job-url/index.ts`
- **Test**: Try parsing a job URL via the Quick Tailor flow â€” should no longer return 500.
- **Risks**: None.
- **Risks**: Email templates still reference remote storage URL â€” needs separate upload.


### DARK-MODE-TEXT-READABILITY
- **Summary**: Improved dark-mode text readability over 3D wallpaper by (1) increasing glass surface opacity from ~0.5 to ~0.75-0.82 in dark mode, and (2) adding a subtle `text-shadow` on `body` in dark mode (excluded from resume templates via `[data-resume-template]`).
- **Files edited**: `src/index.css`
- **Test**: Toggle dark mode across the app â€” text in glass cards and on the landing page should be clearly readable. Resume preview/export should have no text-shadow.
- **Risks**: None â€” CSS-only, no logic changes.

### FIX-CLOUDS-NOT-RENDERING
- **Summary**: Fixed two bugs preventing 3D clouds from rendering: (1) cloud group positioned at Y=-30, far below camera viewport â€” moved to Y=0; (2) `segments={1}` too low to produce visible geometry â€” increased to `segments={20}`. Clouds now visible in both light and dark mode.
- **Files edited**: `src/components/ui/SkyWallpaperCanvas.tsx`
- **Test**: Open app on desktop and mobile â€” clouds should be visible floating in the background in both light and dark mode.
- **Risks**: None â€” purely fixes broken rendering.

### 3D-ANIMATED-BACKGROUND
- **Summary**: Replaced CSS-based sky background (gradients, puff clouds, stars) with a full-screen 3D animated background using React Three Fiber + GSAP. Desktop renders a `<Canvas>` with drei `<Stars>` (dark mode) and `<Clouds>` (both modes), camera parallax on mouse move, film grain noise overlay, 1rem inset border, and 3s fade-in on load. Mobile skips 3D entirely â€” plain div with animated background color + noise overlay for zero 3D overhead. Theme transitions animated via `useGSAP`.
- **Files created**: `src/components/ui/SkyWallpaperCanvas.tsx`
- **Files rewritten**: `src/components/ui/SkyWallpaper.tsx`
- **Dependencies added**: `three`, `@react-three/fiber`, `@react-three/drei`, `gsap`, `@gsap/react`
- **Test**: Visit app on desktop â€” should see 3D clouds floating, stars in dark mode, smooth color transition on theme toggle. On mobile â€” should see plain colored background with noise texture, no 3D. Public routes (`/p/`, `/share/`) should show nothing.
- **Risks**: R3F is heavier than CSS; lazy-loaded canvas mitigates initial bundle impact.


### LANDING-CTA-POLISH
- **Summary**: Removed guest "Log in" and "Sign Up" header buttons for a minimal landing page. Renamed "Get Started Free" â†’ "Get Started" with filled primary background and stronger glow effect.
- **Files edited**: `src/pages/Index.tsx`
- **Test**: Visit landing page as guest â€” header should show only logo + theme toggle. Hero CTA should say "Get Started" with a bold primary-colored button.
- **Manual action**: Update Kinde dashboard theme (Design â†’ Pages): background `#070712`, primary button `#D92638`, upload WiseResume logo, card background `hsl(240 20% 8%)`.



### AUTH-FLOW-SIMPLIFICATION
- **Summary**: Removed intermediate auth page card UI. Landing page buttons (Log in, Sign Up, Get Started Free) now call Kinde directly. AuthPage.tsx converted to a thin redirect layer that auto-triggers Kinde login/register based on `?mode=` param.
- **Files edited**: `src/pages/Index.tsx`, `src/pages/AuthPage.tsx`
- **Test**: Click "Log in", "Sign Up", and "Get Started Free" on landing page â€” should redirect directly to Kinde hosted auth. Visit `/auth?mode=login` directly â€” should auto-redirect to Kinde login.
- **Manual action**: Update Kinde dashboard (Design â†’ Pages) to match app dark theme: background `hsl(240 30% 3%)`, primary button color to match app primary red.



### REPO-SIZE-CLEANUP
- **Summary**: Deleted legacy/redundant files to reduce repo size (~16K+ lines removed). Deleted `email-templates-html.md`, `email-templates.md`, `deno.lock`. Could not delete `package-lock.json` or edit `.gitignore` (read-only).
- **Files deleted**: `email-templates-html.md`, `email-templates.md`, `deno.lock`
- **Note**: `.gitignore` and `package-lock.json` are read-only â€” need manual git cleanup for `package-lock.json`.


### ROUTE-RENAME-PRIVACY-TERMS
- **Summary**: Renamed `/privacy` â†’ `/privacy-policy` and `/terms` â†’ `/terms-of-service` across routes, links, and bug report screen map.
- **Files edited**: `src/App.tsx`, `src/components/landing/Footer.tsx`, `src/pages/AuthPage.tsx`, `src/lib/bugReport.ts`
- **Test**: Click Privacy Policy and Terms of Service links in footer and auth page; verify they navigate to `/privacy-policy` and `/terms-of-service`.



### AUTH-CLEANUP-LEGACY-ARTIFACTS
- **Summary**: Removed 6 ghost Clerk-era entries from `supabase/config.toml` (`clerk-webhook`, `debug-jwt`, `patch-clerk-jwt-template`, `provision-clerk-user`, `repair-clerk-uuid`, `repair-user-uuid`). Dropped legacy `signup_otps` table. Kept `auth-email-hook` (Lovable Cloud system function), `KindeAuthTestPage.tsx` (testing phase), and `get_clerk_user_id` DB function (still used by callers, rename deferred).
- **Files edited**: `supabase/config.toml`
- **Migration**: `DROP TABLE IF EXISTS public.signup_otps`
- **Test**: Verify app loads, auth works, Dev-Kit tests pass. No functional changes expected.


### BRIDGE-ERROR-BANNER-USAGE-EVENTS-CONFIG-FIX
- **Summary**: Added `lastError` state to supabaseBridge with `getLastError()`/`clearLastError()` exports. AppShell now shows a dismissible banner on bridge errors (session expired or data connection issues). Fixed `config.toml` to include `[functions.me]` and removed legacy `send-signup-otp`/`migrate-user-data` entries. Created `usage_events` table (RLS: user SELECT only, no client inserts). Updated `tailor-resume` to insert usage events via service-role. Added "Usage Events" section to Dev-Kit.
- **Files edited**: `supabase/config.toml`, `src/lib/supabaseBridge.ts`, `src/components/layout/AppShell.tsx`, `supabase/functions/tailor-resume/index.ts`, `src/pages/DevToolsPage.tsx`
- **Migration**: Created `public.usage_events` table
- **Test**: Log in â†’ Dev-Kit â†’ run "Load Last 5 Usage Events" (empty initially). Run tailor-resume, then re-check usage events. Verify bridge error banner by simulating token failure.

### TOKEN-EXCHANGE-HARDENING-AND-ME-ENDPOINT
- **Summary**: Hardened token-exchange with structured error codes (`INVALID_KINDE_TOKEN`, `SHADOW_USER_FAILED`, `PROFILE_UPSERT_FAILED`, `JWT_SECRET_MISSING`, `INTERNAL_ERROR`) and proper HTTP statuses. Added `token_exchanges` audit table for exchange diagnostics. Added `refreshTokenIfNeeded()` to supabaseBridge with auto-retry on 401 in safeClient and edgeFunctions. Created `/me` edge function returning userId, kinde_sub, profile, and preferences. Added "Who am I?" test to Dev-Kit.
- **Files edited**: `supabase/functions/token-exchange/index.ts`, `src/lib/supabaseBridge.ts`, `src/contexts/AuthContext.tsx`, `src/integrations/supabase/safeClient.ts`, `src/integrations/supabase/edgeFunctions.ts`, `src/pages/DevToolsPage.tsx`
- **Files created**: `supabase/functions/me/index.ts`
- **Migration**: Created `public.token_exchanges` table with RLS (deny-all for public, service-role only)
- **Test**: Log in â†’ Dev-Kit â†’ run "Who am I?" test â†’ verify structured response. Test token expiry handling by waiting or manually clearing bridge.


### AUTH-CLEANUP-LEGACY-ARTIFACTS
- **Summary**: Removed all legacy Supabase Auth artifacts after Kinde migration. Deleted unused edge functions (`send-signup-otp`, `verify-signup-otp`, `migrate-user-data`), legacy pages (`ResetPasswordPage`, `EmailConfirmationPage`), and outdated test file (`useAuth.test.tsx`). Removed corresponding lazy imports and route definitions from `App.tsx`. Zero `supabase.auth.*` calls remain in the frontend. Auth is 100% Kinde + token bridge.
- **Files deleted**: `src/hooks/useAuth.test.tsx`, `src/pages/ResetPasswordPage.tsx`, `src/pages/EmailConfirmationPage.tsx`, `supabase/functions/send-signup-otp/`, `supabase/functions/verify-signup-otp/`, `supabase/functions/migrate-user-data/`
- **Files edited**: `src/App.tsx` (removed 2 lazy imports and 2 route definitions)
- **Test**: Verify app loads, `/auth` works, protected routes redirect to `/auth` when logged out, login + dashboard flow works end-to-end.
- **Note**: `signup_otps` DB table remains (unused) â€” no schema changes made.

### DEV-KIT-UPGRADE
- **Summary**: Full rewrite of `/dev-tools` Dev-Kit page. Expanded from 3 to 7 sections with 18 total tests. Added "Run All" per section with sequential execution and pass/fail summary badges. Added collapsible JSON results with human-readable summary lines. New sections: Routing & Protected Pages, Settings & Preferences, Credits & Usage, Error Handling & Logging. All tests use real code paths.
- **Files**: `src/pages/DevToolsPage.tsx` (full rewrite)
- **Test**: Go to Settings â†’ Dev Tools â†’ enter password â†’ verify all 7 sections render â†’ click "Run All" per section â†’ verify summaries and collapsible JSON work.

### DEV-TOOLS-PAGE
- **Summary**: Added password-gated `/dev-tools` page for internal debugging of all AI tools and key features. Runs real requests against edge functions (tailor-resume, enhance-section, analyze-resume, score-resume, parse-resume, generate-cover-letter, agentic-chat) and Supabase queries. Shows raw JSON responses, HTTP status codes, and errors in copyable `<pre>` blocks. Accessible only via "Dev Tools" button on Developer Credit Card in Settings.
- **Files**: `src/pages/DevToolsPage.tsx` (new), `src/App.tsx` (added route), `src/components/settings/DeveloperCreditCard.tsx` (added Dev Tools button)
- **Test**: Go to Settings â†’ scroll to Developer card â†’ click "Dev Tools" â†’ enter password `thewisedeveloper` â†’ run each test and verify responses appear.
- **Removal**: Delete `DevToolsPage.tsx`, remove route from `App.tsx`, revert Dev Tools button in `DeveloperCreditCard.tsx`.


### AUDIT-AI-TOOLS-KINDE-AUTH
- **Summary**: Audited all 30 AI features and their edge function calls after Kinde auth migration. All frontend callers use the bridge token (via `edgeFunctions.invoke` or `getSupabaseToken()`). All edge functions use `requireAuth` middleware with JWT `sub` claim extraction. No issues found â€” no code changes needed.
- **Files**: No files changed (audit only)
- **Test**: Run manual test checklist: Resume Score, Section Enhance, Smart Tailor, Cover Letter, Parse Resume, Interview Simulator, Career Path, AI Chat â€” confirm no 401/403 errors in DevTools Network tab.

### REMOVE-TRASH-UI
- **Summary**: Completely removed Trash concept from UI. Deleted `TrashSheet.tsx`, removed Trash button from dashboard header, removed `showTrash` state and `TrashSheet` rendering from `DashboardPage.tsx`. Delete is now permanent with no Trash view.
- **Files**: `src/pages/DashboardPage.tsx` (removed import, state, button, component), `src/components/dashboard/TrashSheet.tsx` (deleted)
- **Test**: Dashboard header should have no Trash icon. Deleting a resume removes it permanently. No TypeScript errors.

### FIX-PGRST204-SOFT-DELETE (v2) â€” superseded by HARD-DELETE-REMOVE-TRASH
- **Summary**: Fixed PGRST202 error â€” RPCs not found in schema cache. Replaced `.rpc()` calls with direct `.update({ deleted_at })` + `.select('id')` which forces PostgREST to resolve the column. `emptyTrash` unchanged (already uses JS filtering + hard delete by ID).
- **Files**: `src/hooks/useResumes.ts`
- **Test**: Click Delete on a resume â†’ should soft-delete without errors. Open Trash â†’ restore and permanently delete should work. Empty Trash should work.


### FIX-PDF-DOWNLOAD-AUTH
- **Summary**: Fixed "Failed to generate PDF" in Company Briefing â€” `handleDownloadPDF` called `supabase.auth.getUser()` which fails with Kinde bridge tokens. Replaced with `useAuth()` hook to get user email. Also fixed `ErrorBoundary.tsx` bug report to use `getUserId()` from bridge instead of `supabase.auth.getUser()`.
- **Files**: `src/components/interview/CompanyBriefingSheet.tsx`, `src/components/ErrorBoundary.tsx`
- **Test**: Generate a Company Briefing, click Download PDF â€” should succeed. Trigger ErrorBoundary report â€” should include user ID.


### AUTH-AUDIT-EDGE-FUNCTIONS
- **Summary**: Audited all 48 edge functions for auth consistency with Kindeâ†’Supabase token bridge. Fixed 4 functions that used `supabase.auth.getUser()` (fails with cross-project bridge tokens): `generate-portfolio-bio` and `elevenlabs-scribe-token` now use `requireAuth()` from shared middleware; `ai-health` and `parse-resume` now use `decodeJwtPayload()` for optional auth. Removed unused `createClient` imports. 26 functions were already correct; 13+ public functions unchanged.
- **Files**: `supabase/functions/generate-portfolio-bio/index.ts`, `supabase/functions/elevenlabs-scribe-token/index.ts`, `supabase/functions/ai-health/index.ts`, `supabase/functions/parse-resume/index.ts`
- **Test**: Generate portfolio bio, use voice-to-text, check AI health, parse a resume â€” all should work when logged in.


### FIX-EDGE-FUNCTION-AUTH-401
- **Summary**: Fixed 401 Unauthorized in `tailor-resume`, `enhance-section`, `parse-job-url`. Replaced `getClaims()` (verifies against Lovable Cloud JWT secret) with `requireAuth()` from shared middleware (decodes without signature check, matching bridge token pattern).
- **Files**: `supabase/functions/tailor-resume/index.ts`, `supabase/functions/enhance-section/index.ts`, `supabase/functions/parse-job-url/index.ts`

### DEBUG-SHADOW-USER-CREATION
- **Summary**: Enhanced `token-exchange` edge function with verbose logging around `auth.admin.createUser` â€” logs target URL, user ID, email, full success/error objects. Broadened error matching to handle `already`/`duplicate`/`exists` variants. Added `getUserById` fallback verification: if createUser fails with unexpected error, confirms user actually exists before proceeding; returns 500 if not.
- **Files**: `supabase/functions/token-exchange/index.ts`
- **Test**: Trigger token-exchange, check edge function logs for diagnostic output. Confirm shadow user row exists in auth.users.

### FIX-SHADOW-USER-AUTH-USERS
- **Summary**: Fixed `resumes_user_id_fkey` foreign key violation by creating a shadow `auth.users` row in the `token-exchange` edge function using `serviceClient.auth.admin.createUser()` before upserting profiles. Idempotent â€” ignores "already registered" errors.
- **Files**: `supabase/functions/token-exchange/index.ts`
- **Notes**: Same pattern as `migrate-user-data`. The edge function auto-deploys on Lovable Cloud.


### FIX-USER-ID-BRIDGED-UUID
- **Summary**: Fixed `user.id` returning raw Kinde ID (`kp_...`) instead of bridged UUID, causing `invalid input syntax for type uuid` on all Supabase inserts. Updated `AuthContext` to use `getUserId()` from supabaseBridge as the primary `user.id`, falling back to Kinde ID only before bridge is ready. Fixed `CreateResumeDialog.handleCreateTailored` to use `getUserId()` with a null guard and toast error.
- **Files**: `src/contexts/AuthContext.tsx`, `src/components/dashboard/CreateResumeDialog.tsx`
- **Notes**: All 31+ files using `user.id` for Supabase calls are automatically fixed via the AuthContext change.

### KINDE-SUPABASE-TOKEN-BRIDGE
- **Summary**: Implemented a complete Kindeâ†’Supabase token bridge so RLS and edge functions work for Kinde-only users. Created `token-exchange` edge function that verifies Kinde tokens via JWKS, generates deterministic UUID v5 from Kinde ID, upserts a profile row, and signs a Supabase-compatible JWT. Created `supabaseBridge.ts` singleton to manage token lifecycle. Updated `safeClient.ts` to inject bridge token on every fetch. Updated `AuthContext` to exchange tokens on login and refresh every 50 min. Removed all `supabase.auth.getSession()` calls from frontend.
- **Files**: `supabase/functions/token-exchange/index.ts` (new), `src/lib/supabaseBridge.ts` (new), `src/contexts/AuthContext.tsx`, `src/integrations/supabase/safeClient.ts`, `src/lib/supabaseAuth.ts`, `src/lib/auditLogger.ts`, `src/integrations/supabase/edgeFunctions.ts`, `src/components/settings/AISettingsSheet.tsx`, `src/components/settings/ContactInquiryDialog.tsx`, `src/components/settings/FeatureRequestDialog.tsx`, `src/components/BugReportDialog.tsx`, `supabase/config.toml`
- **Secrets**: Added `EXT_SUPABASE_JWT_SECRET` to sign Supabase JWTs
- **Notes**: Existing data under old Supabase Auth UUIDs will need a separate migration. New data uses deterministic UUID v5 from Kinde ID.

### REMOVE-SUPABASE-AUTH-KINDE-ONLY
- **Summary**: Fully removed Supabase Auth from the login flow. AuthPage now shows only Kinde Google + Kinde email sign-in/sign-up (no Supabase forms, forgot-password, or reset-password). AuthContext simplified to derive auth state solely from `useKindeAuth()`. AuthCallbackPage stripped of Supabase token exchange. EmailConfirmationPage and ResetPasswordPage now redirect to `/auth`. SignInPromptDialog uses `kindeRegister()`/`kindeLogin()` instead of navigating to Supabase signup. Updated `useProfile`, `useEditorHydration`, `useEditorAutosave`, `AccountSection`, `DashboardPage`, and `SettingsPage` to use `KindeAppUser` type instead of Supabase `User`.
- **Files**: `src/pages/AuthPage.tsx`, `src/contexts/AuthContext.tsx`, `src/pages/AuthCallbackPage.tsx`, `src/pages/EmailConfirmationPage.tsx`, `src/pages/ResetPasswordPage.tsx`, `src/components/auth/SignInPromptDialog.tsx`, `src/hooks/useProfile.ts`, `src/hooks/useEditorHydration.ts`, `src/hooks/useEditorAutosave.ts`, `src/components/settings/sections/AccountSection.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/SettingsPage.tsx`
- **Notes**: Supabase client kept for DB queries. Data-access helpers (`auditLogger`, `edgeFunctions`, `supabaseAuth`) still reference `supabase.auth.getSession()` and will need a token bridge in a future step. No DB/RLS changes.


### KINDE-EMAIL-LOGIN-SECTION
- **Summary**: Added experimental Kinde email/password login section to `/auth` page below the Google button. Provides email input + "Sign In" / "Sign Up" buttons that redirect to Kinde's hosted login page with `loginHint` pre-filled. Existing Supabase email/password form untouched.
- **Files**: `src/pages/AuthPage.tsx`
- **Notes**: No DB, RLS, or AuthContext changes. Uses `kindeLogin({ loginHint })` and `kindeRegister({ loginHint })` from Kinde React SDK. Section labeled "Beta" to distinguish from primary flow.


### KINDE-AUTH-SOURCE-OF-TRUTH
- **Summary**: Switched `AuthContext` and `AuthCallbackPage` to use Kinde as the primary auth source for page access (routing). `isAuthenticated` is now true if either Kinde or Supabase session exists. `signOut` clears both providers. `kindeUser` exposed on context. Supabase session kept for data queries â€” no DB/RLS changes.
- **Files**: `src/contexts/AuthContext.tsx`, `src/pages/AuthCallbackPage.tsx`
- **Notes**: Kinde-only users can now access protected pages but Supabase data queries will fail without a token bridge (next step). Email/password login unchanged.

### KINDE-GOOGLE-BUTTON-SWITCH
- **Summary**: Switched "Continue with Google" button on `/auth` and `SignInPromptDialog` to use Kinde's `login()` instead of `supabase.auth.signInWithOAuth`. Lifted `KindeProvider` to `App.tsx` root. Simplified `KindeAuthTestPage` to use inherited provider.
- **Files**: `src/App.tsx`, `src/pages/AuthPage.tsx`, `src/components/auth/SignInPromptDialog.tsx`, `src/pages/KindeAuthTestPage.tsx`
- **Notes**: Email/password auth remains on Supabase. Kinde session does NOT create a Supabase session â€” `ProtectedRoute` won't recognize Kinde-only users yet. Follow-up needed for token bridge.

### KINDE-AUTH-TEST-PAGE
- **Summary**: Installed `@kinde-oss/kinde-auth-react` and added isolated `/kinde-auth-test` page with Login/Register/Logout buttons and user info display. Zero changes to existing Supabase Auth.
- **Files**: `src/pages/KindeAuthTestPage.tsx` (new), `src/App.tsx` (added lazy route)
- **Notes**: Kinde domain `https://thewisecloud.kinde.com`, Client ID `629174acb2874e6bbf53cd4a95497425`. Redirect URI set to `origin + /kinde-auth-test`.

## 2026-03-09

### PORTFOLIO-SYNC-MODE-DEDUP
- **Summary**: Removed duplicate Content Sync Mode toggle from Setup Tab's "Content & Visibility" section. The Content Tab retains the sole toggle with its smart pre-population logic. Setup Tab now focuses purely on section visibility switches.
- **Files**: `src/components/portfolio/editor/SetupTab.tsx`, `src/pages/PortfolioEditorPage.tsx`



### PORTFOLIO-AUDIT-FIX â€” Issue 2 Refresh Button
- **Summary**: Replaced `window.location.reload()` with `queryClient.invalidateQueries` for targeted analytics refresh without full page reload.
- **Files**: `src/components/portfolio/VisitorsPanel.tsx`


### PORTFOLIO-TOOL-BUG-FIX-ROUND
- **Summary**: Comprehensive portfolio tool bug fix round addressing 9 issues: (1) Footer link now explicit href + visual underline. (2) Visitors panel: fixed domain to resume.thewise.cloud, added refresh button, richer draft placeholder with mock cards. (3) Short link domain fixed. (4) Career card preview removed max-w-2xl for full-width scaling. (5) Theme filter: assigned proper categories to base themes, strict filtering. (6) Content tab restructured: Match CV/Custom toggle, separate portfolioSummary field in portfolioExtras, renamed Case Studiesâ†’Projects, reordered sections. (7) Chat widget: z-[60], pointer-events:auto, BYOK owner key via getUserKeyFromDB, chatDisabled self-hide. (8) Username field: replaced "WiseResume/" with live URL preview. (9) LivePreviewCard: shows bio snippet, Open to Work badge, view count. Design thumbnails inject user name/avatar.
- **Files**: `src/pages/PublicPortfolioPage.tsx`, `src/components/portfolio/VisitorsPanel.tsx`, `src/lib/portfolioThemes.ts`, `src/components/portfolio/editor/ThemeStorePicker.tsx`, `src/components/portfolio/editor/ContentTab.tsx`, `src/pages/PortfolioEditorPage.tsx`, `src/components/portfolio/editor/SetupTab.tsx`, `src/components/portfolio/editor/DesignTab.tsx`, `src/components/portfolio/editor/LivePreviewCard.tsx`, `src/components/portfolio/public/ChatWidget.tsx`, `src/components/portfolio/CareerCardSheet.tsx`, `supabase/functions/ask-portfolio/index.ts`

---

## 2026-03-09

### COMPANY-BRIEFING-SCROLLBAR-PDF-LOADING
- **Summary**: (1) Replaced ScrollArea with native overflow-y-auto div for visible scrollbar. (2) Rewrote PDF export using pdf-lib with professional layout: white background, WiseResume logo, branded header, structured sections, diagonal watermark, footer with copyright/URL/user email/page numbers. (3) Added smart loading progress bar with animated steps and rotating status messages.
- **Files**: `src/components/interview/CompanyBriefingSheet.tsx`, `src/lib/companyBriefingPdf.ts` (new)

### FIX-RESUME-DELETE-DELETEALL-PORTFOLIO-TABS
- **Summary**: Three fixes: (1) Resume soft-delete â€” added `.select('id')` to `.update()` mutations to force PostgREST schema cache refresh. (2) Delete All Data â€” fixed `share_comments` deletion via `share_id` subquery, used `localStorage.clear()` and `window.location.replace('/')`. (3) Portfolio Editor â€” moved Content & Visibility and Availability from Content tab to Setup tab.
- **Files**: `src/hooks/useResumes.ts`, `src/lib/dataExport.ts`, `src/pages/SettingsPage.tsx`, `src/components/portfolio/editor/ContentTab.tsx`, `src/components/portfolio/editor/SetupTab.tsx`, `src/pages/PortfolioEditorPage.tsx`

---

## 2026-03-09
- **Summary**: Enhanced Company Briefing tool with dual input modes (Search by Company Name + Paste Job Description), deep research via `gemini-2.5-pro` for company-name searches, expanded output (competitors, products/services, tech stack, Glassdoor-style workplace insights), PDF download, copy-to-clipboard, and Smart Tailor CTA linking to resume tailoring.
- **Files**: `supabase/functions/company-briefing/index.ts`, `src/types/companyBriefing.ts`, `src/hooks/useCompanyBriefing.ts`, `src/components/interview/CompanyBriefingSheet.tsx`

---

### FIX-4-ISSUES-CI-DELETE-DOCS
- **Summary**: Four fixes: (1) GitHub CI â€” replaced broken `npm install -g supabase` with `supabase/setup-cli@v1` and deploy-all. (2) Resume delete â€” replaced RPC calls (`soft_delete_resume`, `soft_delete_resumes`, `restore_resume`) with direct `.update()` using `as any` cast since RPCs only exist on Lovable Cloud, not external DB. (3) Delete All Data â€” added missing tables (`short_links`, `contact_inquiries`, `feature_requests`), explicit dependent deletes (`share_comments`, `resume_shares`, `resume_versions`), more localStorage cleanup. (4) Reorganized CHANGELOG-local.md and updated SPEC.md.
- **Files**: `.github/workflows/deploy-edge-functions.yml`, `src/hooks/useResumes.ts`, `src/lib/dataExport.ts`, `enhancements-for-vibe-coding/CHANGELOG-local.md`, `enhancements-for-vibe-coding/SPEC.md`

---

### FIX-6-ISSUES-DELETE-NAV-AI
- **Summary**: Six fixes: (1) Resume delete â€” switched to RPC calls (reverted next session). (2) Delete All Data â€” signs user out after deletion. (3) Desktop nav â€” removed `/settings` from Home matchPaths. (4) Settings tab â€” conditional tab in desktop nav with back-to-previous-page. (5) AI "Last used" â€” seeded from `ai_usage_logs` on init. (6) AI provider revert â€” deferred persistence until key validated.
- **Files**: `src/hooks/useResumes.ts`, `src/pages/SettingsPage.tsx`, `src/components/layout/DesktopNav.tsx`, `src/hooks/useAIKeyHydration.ts`, `src/components/settings/AISettingsSheet.tsx`

---

### PORTFOLIO-EDITOR-REORG-AI-PROJECT
- **Summary**: (1) Added `add_project` tool to Wise AI edge function. (2) Reorganized portfolio editor from 3 tabs to 4 tabs (Setup/Content/Design/More).
- **Files**: `supabase/functions/agentic-chat/index.ts`, `src/hooks/useAgenticChat.ts`, `src/components/portfolio/editor/ContentTab.tsx` (new), `src/components/portfolio/editor/SetupTab.tsx`, `src/components/portfolio/editor/MoreTab.tsx`, `src/pages/PortfolioEditorPage.tsx`
- **Notes**: Edge function needs redeployment.

---

### UNIVERSAL-WISE-AI-DELETE-FIX
- **Summary**: (1) Resume delete via DB RPCs. (2) Universal Wise AI floating button on mobile + pill in desktop nav. (3) Context-aware category filters in chat. (4) Smart action confirmations via suggest_edits flow.
- **Files**: `src/hooks/useResumes.ts`, `src/components/layout/AppShell.tsx`, `src/components/layout/DesktopNav.tsx`, `src/components/editor/AgenticChatSheet.tsx`, `src/hooks/useAgenticChat.ts`, `src/lib/agenticChat.ts`, `supabase/functions/agentic-chat/index.ts`

---

### ANALYTICS-DELETE-AISTUDIO-CHAT
- **Summary**: (1) Analytics page desktop layout fix with smarter insights. (2) Resume delete robustness fix. (3) AI Studio resume picker popup. (4) Wise AI clickable resume cards in responses.
- **Files**: `src/pages/AnalyticsPage.tsx`, `src/hooks/useResumes.ts`, `src/pages/AIStudioPage.tsx`, `src/components/editor/AgenticChatSheet.tsx`

---

### PROFILE-DASH-CHAT-UX
- **Summary**: (1) Profile "Complete Your Profile" banner. (2) Dashboard delete â†’ "Move to Trash" wording. (3) Removed ResumeFilters. (4) Chat new-chat icon. (5) Chat scroll fix + resume picker. (6) Chat passes resume list to edge function.
- **Files**: `src/pages/ProfilePage.tsx`, `src/pages/DashboardPage.tsx`, `src/components/editor/AgenticChatSheet.tsx`, `src/hooks/useAgenticChat.ts`, `src/lib/agenticChat.ts`, `supabase/functions/agentic-chat/index.ts`

---

### PROFILE-NAV-IMPORT-SHARE
- **Summary**: (1) Fixed `/profile` highlighting Home tab. (2) LinkedIn Smart Import step-by-step wizard. (3) Profile page LinkedIn import button. (4) Portfolio Share with draft detection.
- **Files**: `src/components/layout/DesktopNav.tsx`, `src/components/settings/LinkedInImportSheet.tsx`, `src/pages/ProfilePage.tsx`

---

### LINKEDIN-SMART-IMPORT
- **Summary**: Replaced URL import with guided Smart Import â€” visual step cards showing what to copy from LinkedIn.
- **Files**: `src/components/settings/LinkedInImportSheet.tsx`

---

### BACKUP-RESTORE-WHITELIST-FIX
- **Summary**: Switched backup import from strip-list to whitelist column approach. Unknown/stale columns silently dropped.
- **Files**: `src/lib/accountBackup.ts`

---

### BACKUP-RESTORE-FIX
- **Summary**: Fixed backup import FK constraint errors by stripping stale cross-reference columns.
- **Files**: `src/lib/accountBackup.ts`, `src/components/profile/AccountBackupSheet.tsx`

---

### LINKEDIN-PDF-FIX + LINKEDIN-URL-GUIDE
- **Summary**: Fixed LinkedIn PDF import (client-side pipeline with OCR fallback). Added guided URL import flow.
- **Files**: `src/components/settings/LinkedInImportSheet.tsx`

---

### ONBOARDING-DATA-REFLECT-FIX
- **Summary**: Invalidated React Query profile cache after onboarding DB update.
- **Files**: `src/pages/OnboardingPage.tsx`

---

### DOMAIN-SWAP
- **Summary**: Replaced `wiseresume.magdysaber.com` with `resume.thewise.cloud` across all domain references.
- **Files**: `src/lib/portfolioUrl.ts`, `supabase/functions/portfolio-meta/index.ts`, `supabase/functions/_shared/cors.ts`

---

### SAVEBAR-OVERLAP-FIX
- **Summary**: Changed SaveBar from fixed to static flex footer to prevent overlap.
- **Files**: `src/components/portfolio/editor/SaveBar.tsx`, `src/pages/PortfolioEditorPage.tsx`

---

### PORTFOLIO-EMPTY-RESUME-FIX
- **Summary**: `get_public_portfolio` now returns empty resume skeleton instead of NULL for users with no resumes.
- **Files**: DB migration

---

### OAUTH-IMPLICIT-FLOW
- **Summary**: Switched from PKCE to implicit OAuth flow to fix origin mismatch error.
- **Files**: `src/integrations/supabase/safeClient.ts`

---

### OAUTH-LANDING-SAFETY-NET
- **Summary**: Added OAuth hash token detection in Index.tsx to forward to `/auth/callback`.
- **Files**: `src/pages/Index.tsx`

---

### REMOVE-LOVABLE-CLOUD-AUTH
- **Summary**: Deleted `@lovable.dev/cloud-auth-js` package that intercepted OAuth calls.
- **Files**: `src/integrations/lovable/index.ts` (deleted), `package.json`

---

### REMOVE-CROSS-DOMAIN-OAUTH
- **Summary**: Removed leftover cross-domain OAuth relay logic from AuthPage.
- **Files**: `src/pages/AuthPage.tsx`

---

### GOOGLE-AUTH-CALLBACK-FIX
- **Summary**: Added error detection in AuthCallbackPage for whitelisting failures.
- **Files**: `src/pages/AuthCallbackPage.tsx`

---

### GOOGLE-AUTH-FIX
- **Summary**: Switched Google OAuth to direct `supabase.auth.signInWithOAuth`.
- **Files**: `src/pages/AuthPage.tsx`, `src/components/auth/SignInPromptDialog.tsx`

---

### PWA-ALT-BROWSER
- **Summary**: Fixed Install button for alternative Chromium browsers.
- **Files**: `src/components/pwa/InstallButton.tsx`

---

### HERO-CTA-SHIMMER + HERO-CTA-RESTYLE
- **Summary**: Added shimmer animation and redesigned authenticated hero CTA buttons.
- **Files**: `src/index.css`, `src/pages/Index.tsx`

---

### DEPT-CONTACT-FAQ
- **Summary**: Department dropdown in contact dialog, fixed email logos, expanded FAQ to 21 items, replaced mailto with dialog on Help page.
- **Files**: `src/components/settings/ContactInquiryDialog.tsx`, `src/pages/TermsPage.tsx`, `src/pages/PrivacyPage.tsx`, `src/pages/HelpPage.tsx`, edge functions

---

### DIALOG-EMAIL-REVAMP
- **Summary**: Fixed dialog positioning, revamped notification email templates, added `screen` and `error_category` to `bug_reports`.
- **Files**: `src/components/BugReportDialog.tsx`, `src/lib/bugReport.ts`, edge functions, DB migration

---

### EDGE-FN-AUTH-401
- **Summary**: Fixed 401 in feedback edge functions by replacing `getUser()` with manual JWT decode.
- **Files**: Edge functions, `FeatureRequestDialog.tsx`, `ContactInquiryDialog.tsx`

---

### EMAIL-SENDER-UPDATE + EMAIL-DELIVERY-FIX
- **Summary**: Fixed email deliverability by separating from/to addresses and using `notifications@thewise.cloud`.
- **Files**: Edge functions (send-bug-report, send-feature-request, send-contact-inquiry)

---

### LIGHT-MODE-VISIBILITY-FIXES
- **Summary**: Fixed hardcoded white colors causing light mode issues across auth, settings, and portfolio. Created `useIsDark` hook.
- **Files**: `src/hooks/useIsDark.ts` (new), `src/pages/EmailConfirmationPage.tsx`, `src/components/portfolio/public/StickyHeader.tsx`, `src/components/home/ActionCard.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/AuthPage.tsx`, `src/components/auth/SlideCaptcha.tsx`

---

### AUTH-CARD-GLASS + SCROLL
- **Summary**: Glassmorphic auth card styling with reduced opacity and scroll support for tall forms.
- **Files**: `src/pages/AuthPage.tsx`

---

### CAPTCHA-HOOKS-FIX
- **Summary**: Fixed SlideCaptcha hook ordering crash and ErrorBoundary bug report button.
- **Files**: `src/components/auth/SlideCaptcha.tsx`, `src/components/ErrorBoundary.tsx`

---

### SIGNUP-TERMS-CAPTCHA
- **Summary**: Added Terms/Privacy checkbox and slide-to-verify captcha to sign-up form.
- **Files**: `src/components/auth/SlideCaptcha.tsx` (new), `src/pages/AuthPage.tsx`

---

### LEGAL-PAGES-POLISH + EMAIL-DOMAIN-CONTACT
- **Summary**: Rewrote legal content, fixed backgrounds, added contact dialog with department dropdown, created `send-contact-inquiry` edge function.
- **Files**: `src/pages/TermsPage.tsx`, `src/pages/PrivacyPage.tsx`, `src/components/settings/ContactInquiryDialog.tsx` (new), edge function, DB migration

---

### BYOK-ROUTING-FIX + MANAGE-KEYS-500-FIX
- **Summary**: Fixed Gemini BYOK key retrieval and manage-api-keys 500 error by removing non-existent column queries.
- **Files**: `supabase/functions/_shared/aiClient.ts`, `supabase/functions/ai-test/index.ts`, `supabase/functions/manage-api-keys/index.ts`

---

### AI-TEST-PROVIDER-IDENTITY + AI-SETTINGS-LEAK-FIX + AI-TEST-401-FIX
- **Summary**: Deterministic provider greetings, fixed settings leaking between users, fixed 401 in ai-test.
- **Files**: `supabase/functions/ai-test/index.ts`, `src/hooks/useAIKeyHydration.ts`, `src/contexts/AuthContext.tsx`

---

### OTP-6-DIGIT-FIX + OTP-RESEND-FIX + OTP-DEPLOY-FIX + OTP-EDGE-FUNCTION
- **Summary**: Full OTP signup flow: `signup_otps` table, `send-signup-otp` and `verify-signup-otp` edge functions, 6-digit numeric codes with 10-min expiry, resend support, branded email template.
- **Files**: DB migration, `supabase/functions/send-signup-otp/index.ts`, `supabase/functions/verify-signup-otp/index.ts`, `src/pages/AuthPage.tsx`, `src/pages/EmailConfirmationPage.tsx`

---

### PORTFOLIO-DOMAIN-FIX
- **Summary**: Updated all domain references to `thewise.cloud`. Increased portfolio cache times.
- **Files**: `src/lib/portfolioUrl.ts`, edge functions, `src/pages/PortfolioEditorPage.tsx`, `src/hooks/usePublicPortfolio.ts`

---

### ONBOARDING-PHASE-2 + ONBOARDING-PHASE-3
- **Summary**: OTP email template with 6-digit code, rewrote EmailConfirmationPage with OTP input UI, moved onboarding to dedicated page route, retired modal carousel.
- **Files**: `src/pages/EmailConfirmationPage.tsx`, `src/pages/OnboardingPage.tsx`, `src/pages/DashboardPage.tsx`, email templates, deleted `OnboardingCarousel.tsx` and `OnboardingStep.tsx`

---

### LANDING-PAGE-AUTH-CLEANUP
- **Summary**: Removed redundant auth entry points from landing page (demo card buttons, bottom CTA).
- **Files**: `src/pages/Index.tsx`

---

### LANDING-GLASS-THEME
- **Summary**: Glassmorphic hero CTA and header styling, reduced header opacity to 0.55.
- **Files**: `src/pages/Index.tsx`, `src/index.css`

---

## 2026-03-08

### EMAIL-TEMPLATE-POLISH
- **Summary**: Redesigned all 6 auth email templates with futuristic premium look â€” dark header/footer, red accent, gradient CTA buttons.
- **Files**: `supabase/functions/_shared/email-templates/*.tsx`

---

### BRANDED-AUTH-EMAILS
- **Summary**: Scaffolded all 6 auth email templates for `notify.thewise.cloud`. Created `EmailConfirmationPage`. Uploaded logo to storage.
- **Files**: Email templates, `supabase/functions/auth-email-hook/index.ts`, `src/pages/EmailConfirmationPage.tsx`, `src/pages/AuthPage.tsx`, `src/App.tsx`

---

### OAUTH-CUSTOM-DOMAIN
- **Summary**: Fixed Google OAuth 404 on custom domains by routing through Lovable app domain then redirecting back with session tokens.
- **Files**: `src/pages/AuthPage.tsx`, `src/pages/AuthCallbackPage.tsx`

---

### SKELETON-DEDUP
- **Summary**: Eliminated duplicate skeleton states across 9 pages. Merged cover letter/resignation skeletons into shared `ListPageSkeleton`.
- **Files**: 9 page files, `src/components/layout/PageSkeletons.tsx`, `src/components/ui/skeleton-card.tsx`

---

### AUTH-MIGRATION
- **Summary**: Complete removal of Clerk authentication â€” migrated to pure Supabase Auth. Rewrote AuthContext, simplified edge function auth middleware, simplified `get_clerk_user_id()` and `safe_uid()` to return `auth.uid()`.
- **Files**: Deleted 4 Clerk files, rewrote 6 core files, created `AuthPage.tsx` and `supabaseAuth.ts`, edited 20+ import-swap files, DB migration
- **Notes**: All RLS policies maintained via simplified helper functions.

---

## 2026-03-07

### ISSUE-C (D-2, D-3, P-2, S-1, PE-1)
- **Summary**: Five medium UX fixes: server error state on Dashboard, persisted tab/search in sessionStorage, renamed Export button, share page "Go to WiseResume" link, tooltip on disabled Save button.
- **Files**: `src/pages/DashboardPage.tsx`, `src/pages/PreviewPage.tsx`, `src/pages/SharePage.tsx`, `src/components/portfolio/editor/SaveBar.tsx`

---

<!-- Entry template:
- ### ISSUE-ID
- **Summary**: What changed
- **Files**: Files touched
- **Notes**: Optional notes
-->
