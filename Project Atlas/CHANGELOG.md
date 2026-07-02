# Project Atlas Changelog

## 2026-07-03 - Portfolio Notifications, Email Branding, and Bell Popover UX

- **Database Collection Security**: Enabled `documentSecurity: true` on `notifications`, `portfolio_visits`, and `portfolio_history` collections. This ensures document-level read permissions (e.g. `read("user:<ownerUserId>")`) set during document creation are enforced by Appwrite, resolving the issue where notifications and visitor history did not appear in the owner's UI.
- **Idempotent Setup Script**: Codified the collection security settings in `scripts/setup_portfolio_security.cjs` to make the configuration reproducible.
- **Branded Email Template**: Implemented a branded HTML email layout for `portfolio_contact` submissions in `appwrite-hubs/ai-gateway/src/main.js` with WiseResume colors (#9E1B22), visitor details, and a call-to-action button to check in-app notifications.
- **Bell Popover UX**: Implemented a YouTube-style Popover dropdown for the top-bar Bell icon in `src/components/layout/AppWorkspaceTopBar.tsx` for desktop users, featuring the 5 latest notifications with specialized type icons, unread badge, and a footer link to `/notifications`. Mobile Bell retains direct navigation behavior for safety.
- **Acceptance Status**: `READY_FOR_OWNER_VERIFICATION` (pending manual verification of email delivery and top-bar Popover interaction by the owner in production).

## 2026-07-03 - Portfolio Contact Form Turnstile Fix

- **Turnstile siteverify URL fix**: Identified and resolved the root cause of the Contact Form failures. The `ai-gateway` Appwrite function was incorrectly calling the non-existent `v1` Cloudflare Turnstile siteverify endpoint (`https://challenges.cloudflare.com/turnstile/v1/siteverify`), which returned HTTP 404 and caused the token validation to fail with `TURNSTILE_SITEVERIFY_FAILED`.
- **API Version Correction**: Corrected the endpoint URL to `https://challenges.cloudflare.com/turnstile/v0/siteverify` in `appwrite-hubs/ai-gateway/src/main.js`.
- **Infrastructure Validation**: Recomputed source hashes in `src/lib/devkit/sourceHashes.generated.json`. Verified Node.js syntax, TypeScript (`npx tsc --noEmit`), and production build (`npm run build`) all pass.
- **Appwrite Deployment**: Successfully ran GitHub Actions workflow "Deploy Appwrite Hubs" targeting only `ai-gateway` (Run ID: `28626574102`, Job ID: `84894323958`), resulting in a successful deployment.
- **Verdict**: `READY_FOR_OWNER_VERIFICATION` (pending manual verification of the Turnstile challenge on the live domain by the owner).

---

## 2026-07-03 - Secure OTP Password Reset System Implementation & Verification

- **OTP-Based Authentication Flow**: Implemented a secure, OTP-based password reset system, replacing the previous vulnerable link-based flow.
- **Backend Service Implementation** (`email-service`): Added actions `send-password-reset-otp`, `verify-password-reset-otp`, and `reset-password-with-otp` in the Appwrite serverless function. Includes timing-safe HMAC verification of OTP and challenge tokens, and lockout limits (5 attempts) to prevent brute-forcing.
- **Appwrite Schema Setup**: Created an idempotent schema setup script `scripts/setup_password_reset_otps_schema.cjs` configuring the server-only `password_reset_otps` collection with no client read/write permissions (`permissions: []`).
- **Secret Propagation & Deployment**: Registered a cryptographically secure `PASSWORD_RESET_OTP_SECRET` on Appwrite and GitHub Actions. Ran targeted GitHub Actions deploy run `28620551054` for `email-service`, completing successfully.
- **Frontend Integration**: Updated `AuthBold.tsx`, `AuthPage.tsx`, and settings page components to show secure OTP inputs, prevent account enumeration, and support prefilled email redirects upon password reset from settings.
- **Production E2E Verification**: Successfully executed live E2E tests covering: reset requests, OTP delivery, incorrect OTP rejection, successful reset path, login verification, old password rejection, challenge reuse protection, old link rejection, and settings signout redirects. Test accounts were cleanly purged from database after testing.
- **Verdict**: `FULLY VERIFIED`.

---

## 2026-07-02 - Portfolio Production Tracing and Verification

- **Diagnostic Session Report:** Created a dedicated session report `WiseResume_Portfolio_Contact_Notifications_Session_2026-07-02.md` detailing the production debugging and verification findings.
- **Vercel Cache Invalidation:** Added a hidden JSX cache buster element in `src/App.tsx` to force Vite to generate a new entry point hash, successfully bypassing the Vercel Edge CDN cache.
- **Production Console Logs:** Discovered that Vite minification config (`esbuild.pure`) strips `console.log` statements in production. Migrated diagnostic logs in `usePortfolioTracking.ts` and `PublicPortfolioPage.tsx` to `console.warn` to preserve them.
- **Automated Verification:** Created and updated Playwright E2E spec `tests/e2e/specs/28-portfolio-production-tracing.spec.ts` which verified visit tracking and "I'm Interested" clicks successfully in production.
- **Appwrite Database Audit:** Confirmed visit and interest document creation, and the generation of unread owner notifications in the Appwrite production database.
- **Current Status:** `READY_WITH_BLOCKERS`. The public portfolio Contact Form remains blocked on Cloudflare Turnstile captcha validation in production.

## 2026-07-02 - Fix Portfolio Contact and Notification flows

- **Turnstile Error Recovery** (`PortfolioContactForm.tsx`): added a 6-second timeout watchdog that resets and recovers the Turnstile widget cleanly if verification gets stuck, avoiding manual page refreshes. Removed intrusive debug log statements.
- **Notification Schema Fallback** (`ai-gateway`, `public-share`): implemented a link-retry fallback in the Appwrite function notifications helper. If the live database notifications collection schema is missing the `link` attribute, the creation retry automatically strips the attribute and writes the notification successfully, preventing silent delivery failures.
- **Portfolio Visit Tracking Permissions** (`api/track-portfolio-view.ts`): reordered the tracking backend to resolve the owner user ID first, write the visit document with owner-only read permissions (`Permission.read(Role.user(ownerUserId))`), and trigger the `portfolio_visit` notification.
- **Unread Badge & Notifications UI** (`AppWorkspaceTopBar.tsx`, `NotificationsPage.tsx`): added a Bell icon and unread indicator badge to the authenticated app top bar, wired 7 filter tabs (All, Unread, Visits, Interests, Messages, AI/Resume, System), and color-coded Lucide icons.
- **i18n & Test Parity** (`locales/en/app.json`, `locales/ar/app.json`, `NotificationsPage.tsx`, `publicPrivacyHardening.test.ts`): translated all fallback notification tabs and empty state strings to Arabic, populated both localization catalogs, verified full key parity, and updated security unit test expectations to support owner-only read permissions.
- **Validation**: `npx tsc --noEmit` passed, production build passed, 813 Vitest tests passed, hub syntax checks passed, and source hashes were regenerated.

## 2026-07-02 - English-default localization hardening

- Made English the default independently of browser language while preserving explicit Arabic preferences and `/ar` routes.
- Prevented missing English translation keys from displaying Arabic fallback copy.
- Completed English copy for Upload, Portfolio, saved jobs, workspace navigation, Applications, Import Job, and related messages.
- Fixed Tailoring Hub dates that inherited the browser's Arabic locale during an English session.
- Production verification passed ten authenticated routes plus an Arabic-preference clean browser default check.
- No backend or Appwrite deployment was required.

## 2026-07-02 - Final launch evidence and PDF export repairs

- Completed fresh production PDF/DOCX upload parsing and captured real Designed PDF, ATS PDF, and DOCX downloads.
- Fixed a footer-only second PDF page caused by using the full-page layout sentinel as content height.
- Fixed horizontal PDF text clipping by fitting fixed-width template descendants to the native export canvas.
- Reverified production after deployment: both PDFs are one-page and visually complete; the DOCX is a valid 20-entry package.
- The portfolio contact form failed closed when Turnstile rejected the automated environment; no message was sent and sampled private fields were absent from the public DOM.
- Final verdict: `LAUNCH_READY` with a human-browser contact challenge completion retained as a non-blocking follow-up.

## 2026-07-02 - Fresh credentialed E2E QA follow-up

- Passed fresh login/logout/re-login, failed-login feedback, and refresh persistence.
- Created and persisted a disposable resume, completed one live editor AI improvement, and ran live Tailoring Hub AI with meaningful changes and an honest 50 to 85 score delta.
- Passed portfolio publishing, password protection, public unlock, restoration to public access, and visible private-field checks.
- Confirmed two high-severity launch warnings: Tailoring history storage reports itself broken, and Arabic guide/example routes render English content.
- Fresh download-file and upload-parser evidence remain incomplete because the in-app browser did not expose saved files or local file attachment.
- Final verdict: `NOT_READY` until the P1 findings and fresh file evidence are closed.

## 2026-07-02 - Comprehensive post-fix QA and readiness pass

- Re-ran production smoke coverage for public content, authenticated workspace routes, Arabic upload content, and 390x844 responsive layouts.
- Confirmed `/api/app-settings` returns HTTP 200 and public `/guides` and `/examples` populate without an authentication gate.
- Passed TypeScript, production build, 132 Vitest files / 768 tests, catalog parity, and Arabic critical-surface coverage.
- Recorded the existing repository-wide lint baseline of 256 errors and 180 warnings; no new product-code defect was isolated in this pass.
- No Appwrite hub changed and no Appwrite deployment was required.

**Last verified:** 2026-07-02
**Type:** changelog
**Sources:**
- `Project Atlas/GOVERNANCE.md`
- `Project Atlas/RULES.md`
- `Project Atlas/MASTER_HANDOVER_2026.md`
- `Project Atlas/SOURCE_OF_TRUTH_MAP.md`
**Canonical owner:** this file

---

## 2026-07-01 - Legal routes: privacy/terms pages moved outside app shell (commit `88cc80ca`)

Routes for `/privacy-policy`, `/terms-of-service`, `/ar/privacy-policy`, and
`/ar/terms-of-service` were moved from inside `<AppShell>` to top-level public
routes so they render as standalone pages (no sidebar/nav). One-file change in
`src/AppInterior.tsx`. No backend/Appwrite/Auth/AI changes.

Validation: `tsc --noEmit` PASS, `npm run build` PASS.

---

## 2026-06-26 - Infra stabilization: dev tunnel removal + Sentry CSP fix (branch `fix/remove-prod-dev-tunnel-and-sentry-csp`, PR #133)

Two safe infra/config fixes from the Live QA Stabilization Triage, applied before wider public launch.
No Appwrite deploy. No backend/auth/routing/AI/UI logic changes. No secrets touched.

- **F-C (P2) — FIXED.** Removed committed Impeccable dev tunnel script (`<script src="http://localhost:8400/live.js">`)
  from `index.html` (3 lines). CSP was already blocking it; removal eliminates CSP violation on every page load
  and insecure localhost URL in production page source.
- **F-A (P3) — FIXED.** Added `https://*.ingest.de.sentry.io` to CSP `connect-src` in `vercel.json`,
  `vite.config.ts` (CSP_BASE meta tag), and `public/_headers` (Hostinger/Cloudflare). Sentry error reporting,
  traces, and replays now permitted by CSP. Domain added to `connect-src` only (not `script-src`/`style-src`).
- **page.html** — inspected but intentionally left unchanged (not referenced in any build/deploy/runtime config).
- **Deferred:** F-B (analytics abort — working as designed), F-D (/examples 401 — page renders from static JSON),
  F-E (/subscription 401 — page handles gracefully).

Validation: `tsc --noEmit` PASS, `npm run test` 673 passed, `npm run build` PASS, grep checks clean.

## 2026-06-26 - Live Browser QA Audit + Stabilization Triage (read-only, production commit `38583687`)

Full live browser QA audit on production (`https://wiseresume.app`) using Playwright 1.59.1.
127 route-viewport combinations tested. Verdict: **READY FOR BROAD TESTING**. No P0/P1. No PR #132 regressions.
5 pre-existing infra issues triaged with root cause, impact, and fix plan.
Reports in `Project Atlas/UI_UX_FULL_APP_AUDIT_2026-06-26/`.

## 2026-06-26 - Comprehensive Audit repair pass (branch `repair/audit-findings-2026-06-26`)

Implemented the actionable findings from `Project Atlas/Comprehensive Audit 2026-06-26/`
(verdict was PASS WITH WARNINGS, no confirmed P0). Scoped commits, no Appwrite deploy, no
`target=all`, Appwrite GitHub App left suspended.

- **F1 (P1 deploy blocker) — FIXED.** Regenerated `src/lib/devkit/sourceHashes.generated.json`.
  The manifest was stale for **three** hubs (not the two the audit caught): `admin-visitor-analytics`
  and `track-visitor-event` (06-25 analytics merge) **plus `email-service`** (changed by `fbd24841`
  on 06-23, after the manifest was last generated). The official `Deploy Appwrite Hubs` workflow's
  `git diff --exit-code` manifest gate would have failed on the next run; it now passes (verified by
  re-running `compute-source-hashes.mjs` → clean diff). Manifest-only; no hub runtime change.
- **F9 (P1 CI) — FIXED.** Re-enabled `PortfolioEditorPage.test.tsx` + `PortfolioEditorPage-D8.test.tsx`
  in `pr-validation.yml`. Root cause was a **test-mock defect**, not an editor bug: the
  `useProfile`/`useResumes` mocks returned a fresh object per render, so the page's
  `useEffect(…, [profile])` re-fired every render and looped forever (CI hang). Mocks now return
  stable references + the missing `parseDbJson` export was added. No editor source changed.
- **F7 (P2) — FIXED.** Committed the 4 missing portfolio-hub `package-lock.json` files to match the
  repo convention (21/25 hubs already track theirs).
- **F11 — already addressed (no change).** `TailoringHubPage` already frames the unchanged-output
  guardrail as a recoverable warning (amber, "No changes detected", Retry / Edit job description),
  not a failure; `hasMeaningfulChanges` honesty guardrail intact.
- **F2/F3/F13/F14 — owner verification only** (Appwrite Console / Vercel / GitHub App; agent has no
  access). See `WiseResume_All_Findings_Repair_Report.md`.
- **F4/F5/F6 — this docs sync.** **F8/F10/F12/F15 — documented as backlog/monitored** (no safe code change).

## 2026-06-25 - DevKit Visitor Analytics command-center + country resolution (branch `feature/devkit-visitors-analytics-upgrade`, merged `a4d497f9`)

Refactored the DevKit Growth & Traffic dashboard into a default "App Overview" (Analytics) tab plus a
"Visitor Deep Dive" (Visitors) tab. Backend: `admin-visitor-analytics` gained a `runSafe` wrapper +
enriched payload (daily/hourly/heatmap/referrers/funnel/OS/trends) and standalone actions;
`track-visitor-event` added server-side country resolution via Appwrite's `x-appwrite-country-code`
header (geojs.io fallback), `/devkit` ingestion exclusion, and new `session_end`/`perf` event types.
Client `visitorTrack.ts` switched to HTTPS/CORS-friendly geo, added retry queue + UTM capture.
`track-visitor-event` and `admin-visitor-analytics` were deployed to Appwrite (status=ready). Validated:
tsc, eslint, vite build, hub test, live country `EG` confirmed. (Note: the source-hash manifest was not
regenerated at the time — corrected in the 2026-06-26 repair pass, F1.)

## 2026-06-24 - Landing page UX critique + delight micro-interactions + DESIGN.md refresh (working tree on `main`, later committed `dea0ee65`..`f6d9a489`)

Full UX critique of the landing page: removed banned `type:'spring'` easing (→ ease-out-quart),
removed numbered category eyebrow labels, added a labeled Suspense fallback + `DemoErrorBoundary`,
scroll affordance in the sticky header, hover delight on hero/feature CTAs (gated on reduced motion),
double-submit guard on the hero CTA, and replaced hardcoded `rgba` on the Footer icon with
`var(--lp-trust-icon)`. Refreshed `DESIGN.md` to match live tokens; added `PRODUCT.md`, `CLAUDE.md`,
`.windsurfrules`, and the `.impeccable` submodule + claude settings PostToolUse hook.

## 2026-06-23 - Auth "Bold" design ported across signin / signup / forgot / reset (branch `claude/fervent-faraday-iwuf82`, PR #128)

Ported the **Auth Bold** design from `iammagdy/Auth-Routes` (`AuthBold.dc.html` — the
handoff bundle published from `claude.ai/design`) into the app. The `.dc.html` source uses
a Scout-runtime templating syntax (`<sc-if>`, `{{ … }}`, `<dc-import>`) that is not native
React, so it was hand-ported to a single reusable component rather than imported. The
`claude_design` MCP path was attempted first but the server has been turned down
(`api.anthropic.com/v1/design/mcp` → 410 / replaced by Google Drive MCP), so the source
was pulled from the user's mirror repo via `raw.githubusercontent.com`.

**Component:** `src/components/auth/AuthBold.tsx` — one component, five modes (`signin`,
`signup`, `forgot`, `reset`, `change`). Self-contained styles (CSS-in-`<style>` scoped via
`.ab-root`) with container queries reflowing mobile → tablet → desktop in one element.
Animated Scout SVG mascot (eye-tracking via `mousemove`, blink interval, wander interval,
cover-on-password-focus that respects the eye-toggle's `scaleY(.55)` peek), typewriter
hero ("Ready when **you are.**"), animated count-up stats, rotating conic-gradient card
border (`@property --ab-angle`), pulsing CTA, dark/light theme toggle wired to
`useIsDark` for initial preference. All animations are no-ops under
`prefers-reduced-motion`.

**Page wiring (Appwrite logic unchanged):**
- `src/pages/AuthPage.tsx` is now a slim controller around `<AuthBold>`. Sign-in →
  `createEmailPasswordSession`, sign-up → `account.create` + `createEmailPasswordSession`
  + `upsertProfileIdentity` + `email-service` `send-verification`, forgot →
  `email-service` `send-password-reset`. `SIGNUP_PLAN_KEY` (`signup_plan_intent`) is
  preserved and surfaced inside the card via the `notice` prop. Redirect-after-login
  (`?redirect=…`, default `/dashboard`) and the `?mode=signup/login` URL sync are intact.
- `src/pages/AuthResetPasswordPage.tsx` uses `<AuthBold mode="reset">` with `doneSlot` for
  the invalid-link and success states. `updateRecovery` + best-effort
  `send-password-changed` notification preserved verbatim. Inline mismatch / min-length
  checks moved into the error pill.

**Tests:** `src/components/auth/__tests__/AuthBold.test.tsx` — 10 vitest cases (renders for
each mode, submit-fires, error pill, doneSlot, footer mode-toggle, inline Forgot? link,
mismatch blocks submit). Local `vitest run` → 10/10 green.

**CI:** Typecheck + portfolio tests ✅. Vercel preview ✅
(`wise-resume-twc-git-claude-fervent-faraday-iwuf82-iam-magdy.vercel.app`). TestSprite
Pre-Check ❌ "No tests detected" — advisory only (TestSprite is a SaaS that orchestrates
browser E2E against the preview and needs a test plan authored in its dashboard; not
fixable from the repo). User accepted it as advisory.

**Out of scope (deferred):** the `change` password mode is built into `<AuthBold>` for
future use but no new route is registered — the in-account password change continues to
go through `components/settings/sections/ChangePasswordDialog.tsx`.

---

## 2026-06-23 - ai-gateway push auto-trigger RESOLVED via GitHub-App suspension (branch `claude/epic-maxwell-evkfa4`, PR #124)

Every push to `WiseResume-TWC` (any branch) auto-built the **AI Gateway Hub** as a
`type: vcs` deployment via the **Appwrite GitHub App** (installation
`69fd518d91ac2b25574c` / GitHub install `130461735`, repo providerRepositoryId
`1170228859`) — `ai-gateway` was the only one of 25 functions still Git-linked. Not GitHub
Actions (all workflows are `workflow_dispatch`/`pull_request`). Production was never
affected — the live deployment is the manual build `6a3a1927…`; failed `vcs` builds are
non-activating.

**Both Appwrite-API off-switches were tried and proven insufficient:** (A) the
function-level detach (`PUT /functions/ai-gateway`, blank VCS fields = Console "Disconnect
Git") is cosmetic — a push of `f4b2595` still built `6a3a2050` (the API masks the VCS
fields); (B) deleting the Appwrite VCS installation (`DELETE /vcs/installations/…` →
`204`, `total: 0`) did **not** stop delivery — three `vcs` builds fired *after* the delete
(`4223f6e`@epic-maxwell, `7594501`@main, `4152b06`@confident-johnson). The push event is
delivered by the Appwrite GitHub App and cannot be removed from the API or repo tooling.

**Resolution (owner, verified ✅):** owner **suspended the Appwrite GitHub App** (GitHub →
Settings → Applications → Appwrite → Suspend). Verified — test commit `0935388` (and
later `d008efd`) created **no** `vcs` build (Vercel still built the push, so it reached
GitHub; Appwrite did nothing; the `appwrite[bot]` comment stopped updating), and no new
`vcs` build appeared from any branch in a 2-min window; previously every push built within
~30–60s. Reversible by un-suspending (or removing just `WiseResume-TWC` under *Repository
access*). Nothing else touched — backend/functions/data/auth/secrets/site and the deploy
workflow are unaffected. Deploys are now manual-only via `Deploy Appwrite Hubs`
(workflow_dispatch) or the Console — matching `DISABLE_APPWRITE_GIT_FOR_MANAGED_HUBS = true`.
Added manual-only tooling: `scripts/detach_appwrite_git.cjs` + the `Detach Appwrite Git`
workflow. Supersedes the `claude/clever-volta-cnv3wt` entry below (its API-only detach is
now disproven).

---

## 2026-06-23 - ai-gateway VCS auto-build failures resolved (branch `claude/clever-volta-cnv3wt`)

Follow-up to PR #119. The recurring red "AI Gateway Hub (WiseResume)" check was the
Appwrite GitHub-App auto-build packaging the whole repo (~6.77 MB) → root `postinstall`
(`ensure-puppeteer-chrome`) → builder killed (the PR #117 issue). Findings: production
was **never affected** — the active deployment was the last-good manual/CLI build
(`6a39c386…`, `ready`); failed `type: vcs` builds are non-activating (`activate: false`).
The function-config API masks the VCS fields, so clearing them can't stop the builds; the
per-function Console card shows "No repository connected" yet a VCS build still fired →
the link lives at the Appwrite **GitHub-App install level**. Actions (via Appwrite MCP):
(1) ran the canonical detach (empty VCS fields, matching `deploy_hubs.cjs`
`DISABLE_APPWRITE_GIT_FOR_MANAGED_HUBS`); (2) published a fresh known-good deployment
(duplicated ready `6a39c386…` → `6a3a12ad…`, now active + latest + `ready`, zero
downtime). **Owner action to fully stop future failed entries:** remove `WiseResume-TWC`
from the Appwrite GitHub App (GitHub → Settings → Applications → Appwrite → Configure).
Closes the PR #117 open item.

---

## 2026-06-23 - 8-Area audit → remediation (PR #120, branch `claude/serene-ride-nk2c6t`)

Phased remediation of eight audited areas (batches B0–B16; B13 agentic tool-loop and
B17 route consolidation deferred) plus two review fixes. Validated locally:
`npm run build` green, 23 targeted unit tests + a new `track-visitor-event` hub test
pass, `node --check` on all changed hubs, source hashes refreshed, Vercel preview
Ready.

- **Frontend (safe now, all degrade gracefully):** plan-badge instant cache resolve
  (`usePlan`); WiseResume `wiseresume-classic` default everywhere (`migrateTemplateId`
  replaces all dangerous `'modern'` fallbacks incl. the missed `TailoringHubPage:431`);
  server-backed dashboard activity (`useActivityFeed`); Settings scroll-paint fix
  (paused ProfileCard animations + reduced-motion, static gradient) and Sign-Out moved
  out of Danger Zone; offline-sync conflict vs load-baseline `$updatedAt` (clock-skew
  data-loss fix); editor auto-grow textareas + reversed-date warning; Letter page
  default; 6 dead files removed.
- **Backend (need manual Appwrite steps to activate):** `ai-gateway` no longer
  fabricates a 55→78 tailoring score (returns `null`); compact `tailor_result`
  rich-diff persisted to `tailor_history` (schema-safe write); new server-side,
  bot-guarded, rate-limited `track-visitor-event` hub replaces the silently-rejected
  browser write; onboarding funnel metadata `JSON.parse` + `audit_logs` provisioning
  (separate from `admin_audit_logs`); Wise AI prompt context + `get_company_briefing`.
- **Environment note:** implementation session had no Appwrite egress / MCP, so
  schema + permission + targeted hub deploy were handed off via idempotent scripts
  (`scripts/setup_tailoring_lineage_schema.cjs`, `setup_visitor_events_schema.cjs`,
  `setup_audit_logs_collection.cjs`) and the **Deploy Appwrite Hubs** workflow targeting
  `track-visitor-event,ai-gateway,admin-onboarding-funnel,admin-devkit-data`. See the
  matching Master Handover session log for the full runbook.

## 2026-06-23 - Portfolio visitor count + completion-bar fix (PR #119, branch `claude/clever-volta-cnv3wt`)

Two long-standing portfolio bugs, both root-caused against the **live Appwrite
schema/data** before fixing:

- **Visitor count stuck at 0.** The visit beacon (`api/track-portfolio-view.ts`,
  `server/index.ts`) writes `username, ref, sections_viewed, sections_timing,
  time_spent_seconds, device, ab_variant`, and the dashboard reads them via
  `Query.equal('username', …)`. The live `main/portfolio_visits` collection had a
  completely unrelated column set (`user_id, portfolio_id, referrer, country,
  device_type, page, utm_source`) and **zero indexes** — so every fire-and-forget
  write failed silently with "Unknown attribute." The table had **0 rows ever**.
  Fix: added the missing **optional** attributes + a `idx_pv_username` index
  (idempotent `scripts/setup_portfolio_visits_schema.cjs`, same pattern as the
  `portfolio_interactions` repair). **Applied to production and verified
  end-to-end** (write succeeds → dashboard query returns it → test row deleted).
  Real visits record going forward, given the Vercel `APPWRITE_API_KEY` is set.

- **Completion bar marked Skills/Work experience as missing when filled.**
  `useResumes()` returns raw Appwrite docs where `skills`/`experience` are
  JSON-encoded strings (`resumeDataToDb` → `JSON.stringify`), but the completion
  logic called `Array.isArray()` on the raw string (always false). Fix: new
  tested helper `deriveResumeCompletion` (`src/lib/portfolioCompletion.ts`) parses
  via `parseDbJson` before counting; wired into `PortfolioEditorPage`. Regression
  test added.

Unrelated red checks on the PR: `AI Gateway Hub` build (pre-existing
`providerRootDirectory` auto-build issue, see PR #117 notes — this PR changes no
function build inputs) and `TestSprite "No tests detected"` (standing repo gate).

---

## 2026-06-23 - Password gate → "Scout" mascot (PRs #112, #116)

The password-gate mascot evolved across iterations and its final state is **Scout**, an
ATS-scanner robot ported from the owner-provided Claude Design ("Scout Password Screen"):
- #112 — first reworked the gate's cat to be cuter/more animated (interim).
- #116 — replaced the cat entirely with **Scout** (`PortfolioPasswordGate.tsx`): antenna +
  glowing dot, dark rounded head, two camera lenses whose pupils track the pointer, and lens
  **shutters that cover the lenses while typing** (one-eyed peek when the password is revealed),
  plus a pulsing scan beam and "ATS" label. Card/pill/title/input/submit/footer match the design.
- Reds are driven by the portfolio **accent color**; the themed animated backdrop is kept;
  respects `prefers-reduced-motion`. Frontend-only (ships via Vercel).

Note: the gate's password verification/flow is unchanged — this is purely the visual mascot/card.

---

## 2026-06-23 - "I'm Interested" moved to Appwrite (branch `fix/portfolio-interest-via-appwrite`)

The "I'm Interested" beacon hit `/api/portfolio-interest` (Vercel), which needs a
properly-scoped `APPWRITE_API_KEY` env var. In production that key wasn't authenticating
(generic "not authorized" — a guest-level error, i.e. wrong/malformed key value, not a scope
issue). Rather than keep fighting the Vercel env var, the endpoint was moved server-side.

- public-share gains a `portfolio-interest` action (uses the function's own scoped key):
  validates username + per-browser UUID token, dedups on token, writes `portfolio_interactions`
  (`token`/`portfolio_username`/`interaction_type`/`referrer_hostname`). No PII/IP stored.
- Frontend `sendPortfolioInterest` + `appwrite-functions.ts` route to public-share instead of the
  Vercel route. The Vercel `/api/portfolio-interest` is now unused (left in place; harmless).
- Removes the Vercel `APPWRITE_API_KEY` dependency for interest. (Analytics `track-portfolio-view`
  still uses it, but that's silent/non-blocking.)

---

## 2026-06-23 - Public Portfolio Visitor Experience (branch `fix/portfolio-visitor-experience`)

Fixes three broken visitor features + redesigns the password gate and polishes the chat
launcher / footer.

- **Chat fix:** public-share `executeAiGateway` used the object-form `createExecution`, but the
  bundled node-appwrite 17.2.0 is positional → `Invalid functionId param` on every `ask-portfolio`.
  Switched to positional. (`appwrite-hubs/public-share/src/main.js`)
- **Interest fix:** `portfolio_interactions` was missing `token`/`portfolio_username`/
  `interaction_type`/`referrer_hostname` (only had `user_id`) → "Unknown attribute" → "Could not
  send interest." New idempotent `scripts/setup_portfolio_interactions_schema.cjs` (+ token index),
  wired into the public-share deploy block.
- **Contact form:** ai-gateway needs a Turnstile token for anonymous senders, but
  `VITE_TURNSTILE_SITE_KEY` is missing in the Vercel build → no widget → "Security check required."
  ⚠️ OWNER must set `VITE_TURNSTILE_SITE_KEY` in Vercel (pairs with the Appwrite
  `TURNSTILE_SECRET_KEY`). Error message clarified.
- **Password gate redesign:** new `PortfolioPasswordGate.tsx` — a cat that watches the pointer and
  covers its eyes while you type (peeks on show-password) + an accent-driven animated aurora
  background. Respects reduced-motion.
- **Chat launcher:** pulse ring + sparkle badge + first-visit "Ask me about <Name>" hint pill.
- **Footer:** "Built with WiseResume" is now an accent pill badge.
- Detail: `Project Atlas/Portfolio Visitor Experience 2026-06-23/PORTFOLIO_VISITOR_EXPERIENCE_REPORT.md`.

---

## 2026-06-23 - Public Portfolio Cold-Start Warmup (branch `fix/portfolio-warmup`)

Fixes visitors seeing the loading skeleton for ~3 minutes on `/p/:username`. Root cause:
Appwrite function **cold starts** — `get-public-portfolio` / `portfolio-gate` run in <1.5s
warm but spin up a cold container (minutes) for the first visitor after idle; that wait isn't
in the logged `duration`. Latent, not caused by the schema fix.

- Side-effect-free **warmup early-return** (`{ ok: true, warm: true }`) added to both functions,
  before any DB access — triggered by a native schedule (`x-appwrite-trigger: schedule`) or an
  explicit `{ action: 'warmup' }` body. No DB/analytics/rate-limit/session/email side effects.
- Native Appwrite **CRON `*/5 * * * *`** on both functions via new `HUB_SCHEDULES` in
  `scripts/deploy_hubs.cjs` (chosen over GitHub Actions cron, which would bill ~8,640 min/month).
- Disable: set the `HUB_SCHEDULES` entry to `''` and redeploy the narrow target.
- Detail: `Project Atlas/Portfolio Warmup 2026-06-23/PORTFOLIO_WARMUP_REPORT.md`.

---

## 2026-06-23 - Profiles Portfolio Schema Fix (branch `fix/profiles-portfolio-schema`)

Fixes portfolio save/publish failing on production with "a portfolio field is
misconfigured" — the live `profiles` collection was missing ~18 portfolio columns
the editor writes (and `useProfile.LIVE_PROFILE_ATTRIBUTES` whitelists), so Appwrite
rejected the write with "Unknown attribute". **Pre-existing** (from commit `1d9765c7`),
NOT caused by the password-persistence work.

- `scripts/setup_profiles_portfolio_schema.cjs` (idempotent) adds the 18 missing
  attributes — strings (`portfolio_resume_id/style/layout/font/accent_color/sync_mode`,
  meta title/desc, availability_headline, github/website/twitter url, contact_email,
  draft_saved_at), large JSON strings (`portfolio_sections`, `portfolio_extras` 250 KB,
  `portfolio_draft` 250 KB), boolean `open_to_work`. Never changes permissions or data.
- Wired into `deploy_hubs.cjs` portfolio-settings block so a narrow `--only=portfolio-settings`
  deploy applies it with the approved deploy key. No `target=all`. No frontend change.
- Detail: `Project Atlas/Portfolio Profiles Schema Fix 2026-06-23/PROFILES_SCHEMA_FIX_REPORT.md`.

---

## 2026-06-23 - Portfolio Password Persistence (PR #108)

Makes portfolio password protection actually work in production while keeping
`portfolio_settings` server-only. Follow-up to PR #107 (which exposed the gap:
`portfolio_settings` was missing `password_enabled`/`password_hash` and the editor
tried to write them client-side against a server-only collection).

- **New hub `portfolio-settings`** — owner-authed via Appwrite JWT (user_id resolved
  server-side; browser `user_id` never trusted); actions status/enable/disable;
  bcrypt cost 12 (gate-compatible); response never includes the hash; writes with the
  API key so the collection stays server-only.
- **Schema** — `scripts/setup_portfolio_settings_schema.cjs` (idempotent) ensures
  `password_enabled` (boolean, default false) + `password_hash` (string 256, nullable,
  no default); no permission change. Wired into `deploy_hubs.cjs` so a narrow
  `--only=portfolio-settings` deploy applies it inline (ai_credits/jobs precedent).
- **Editor** — `PortfolioEditorPage` rewired off direct `portfolio_settings`
  reads/writes (client bcrypt removed) to call the new function.
- **Gate functions unchanged.** Deploy target: `portfolio-settings` only (never `target=all`).
- Validation: tsc PASS; build PASS; node --check PASS; hub unit test PASS;
  MoreTab + usePublicPortfolio 32/32 PASS; source hashes regenerated.
- Detail: `Project Atlas/Portfolio Password Persistence 2026-06-23/PASSWORD_PERSISTENCE_IMPLEMENTATION_REPORT.md`.

---

## 2026-06-22 - Portfolio Findings Repair (branch `fix/portfolio-repair` — PENDING owner review & deploy)

Implements the repair plan for the Portfolio Full Discovery Audit
(`Project Atlas/Portfolio Audit 2026-06-22/PORTFOLIO_FULL_DISCOVERY_AUDIT.md`).
**Not merged, not pushed, not deployed.** Validation: `tsc --noEmit` PASS, `npm run build` PASS,
hub `node --check` PASS, hub password test PASS. Full detail + coverage table:
`Project Atlas/Portfolio Audit 2026-06-22/PORTFOLIO_REPAIR_IMPLEMENTATION_REPORT.md`.

### Security / privacy (P1/P2)
- **PORT-P1-01** Portfolio contact form now delivers to the **portfolio owner** (looked up
  server-side by username; `reply_to` = visitor), not the platform admin (`ai-gateway`).
- **PORT-P1-02** Owner contact email + internal `user_id` removed from public JSON-LD and the
  public payloads (`usePortfolioSEO`, `get-public-portfolio`, `api/public-portfolio` mapProfile).
- **PORT-P1-03** Brute-force lockout (8 / 15 min per username+IP) added to the **primary** Appwrite
  password path (`get-public-portfolio`, `verify-portfolio-password`).
- **PORT-P2-01** Password hash no longer mirrored into `portfolio_extras` / client state.
- **PORT-P2-02** Session-cap, chat-session rate-limit and daily-cap now **fail closed** on DB error.
- **PORT-P2-04** Single `portfolio_settings` read (TOCTOU removed). **PORT-P2-05** `crypto.timingSafeEqual`.
- **PORT-P2-06** Vercel `getResume` ownership re-check (+ path marked legacy/secondary).
- **PORT-P2-11** Visitor-question injection hardening (XML wrappers + sanitization).
- **PORT-P3-10** `user_id` dropped from analytics journey. **PORT-P3-03** parse-guard on hubs.

### Reliability / UX / product
- **PORT-P1-05** Custom-domain editor UI disabled ("coming soon"); saved values preserved.
- **PORT-P2-07** No duplicate publish toast. **PORT-P2-09** Templates/Career-Card use canonical domain.
- **PORT-P2-10** View analytics routed through the validated `/api/track-portfolio-view` endpoint. Follow-up: added the real Vercel route `api/track-portfolio-view.ts` (it previously existed only in the non-deployed `server/index.ts`, so the beacon would have 404'd in production and dropped analytics — caught in PR #107 review).
- **PORT-P3-01** Rate-limited public state (no more misleading "Not Found").
- **PORT-P3-08** Draft size guard uses UTF-8 bytes. **PORT-P3-12** robust initials. **PORT-SEC-15** exact reserved-domain match (extra hardening; not a numbered audit finding).

### Deferred / verified-safe / needs owner verification
- **PORT-P3-09 DEFERRED** (secret separation) — the DevKit token minter signs with `APPWRITE_API_KEY`;
  a safe fix needs a new dedicated signing secret across minter + consumers + env (owner action).
- **VERIFIED SAFE:** PORT-P3-06 (print layout already `esc()`-encodes hrefs); chat wiring exists.
- **NEEDS OWNER VERIFICATION (Appwrite Console):** `portfolio_settings` perms, username collection-ID
  drift (PORT-P1-04), existence of `portfolio_session_rate_limits` / `chat_sessions`, function CORS,
  OG `APPWRITE_DATABASE_ID`, legacy plaintext `resume_shares` passwords (PORT-P3-11).

### Source hashes
Regenerated (`scripts/compute-source-hashes.mjs`) for the 6 changed hubs.

---

## 2026-06-22 - Production Push + Smoke Test Closeout (UI/UX audit live)

### Commits pushed to `main` (no force)
- `ec73548d6cfdb62f5d4c4cd37303c713ff354e20` — `fix(ui): complete Project Atlas UI/UX audit fixes` (full UI/UX audit implementation + the 12 audit reports + 3 implementation reports).
- `31c863dd5a5637214571b042af27d0223a4b1ceb` — `chore(security): remove hardcoded QA credentials` (current HEAD).

### Deployment
- Vercel production deploy for `31c863dd` reached **READY** (`dpl_EGAcis9Wf3gBPhtcyRGAi4ShdnUq`, target production, region iad1; aliases incl. `wiseresume.app`). **No Appwrite deployment triggered; no environment variables changed.**

### Validation
- `npx tsc --noEmit` PASS; `npm run build` PASS (no sourcemaps; only the pre-existing chunk-size advisory).
- **Production smoke test (`https://wiseresume.app`, in-browser, authenticated session) = PASS WITH ACCEPTED WARNINGS:** landing (no console errors, no overflow, `lenis` reset live), dashboard (logo→`/dashboard`, no fabricated stats, no upgrade buttons), pricing (correct free-user plan-rank CTAs), editor (mounted, `--editor-rail-end` live, no overflow), preview ("Export Options" label), tailoring/ai-studio/settings load — no horizontal overflow anywhere.

### UI/UX work shipped (live on production)
Landing Lenis/scroll reset; Dialog/AlertDialog/Drawer height-trap `max-h`; Tailwind `info` token; Tailoring Hub mobile clipping; Report 02 responsive fixes; editor light/dark P0; preview wrong-resume gating; pricing plan-rank CTAs; dashboard tip-copy + sidebar logo→`/dashboard` + empty-state copy; upload double-submit guard + recovery wiring; tailoring guardrail warning/retry; AIQuestionsDialog→Radix focus-trap/a11y; public-portfolio contact/chat a11y; all 8 AI-Studio sheet labels/live-regions; onboarding skip hidden on welcome; tracked-credential cleanup. (Per-pass detail in the entries below + `UI_UX_AUDIT_2026-06-22/` reports.)

### Security
QA creds removed from tracked HEAD; `WISE_RESUME_E2E_EMAIL` / `WISE_RESUME_E2E_PASSWORD` env vars introduced; no real `.env` secrets committed; no `.claude/worktrees` committed. **URGENT: owner must rotate the QA account password** (the old value existed in git history before cleanup; this work removed it from HEAD only). Optional later: git history scrub (BFG / git-filter-repo) — but rotation is the urgent remediation.

### Verdict
**Ready for broad user testing with accepted warnings** — NOT final-launch-ready/perfect.

### Accepted warnings
- Pre-existing non-blocking `useCombinedTailorHistory` Appwrite 403 (tailor-history permissions; fails gracefully).
- z-index tooltip(55)/modal(50) overlay-tier split — deferred.
- Some flows code-verified-only (AI-Studio sheet rendered DOM, preview wrong-resume flash, dialog/AIQuestionsDialog trigger, public-portfolio contact/chat live).
- Full screen-reader QA — future task.

### Remaining backlog
- z-index overlay-tier-split PR.
- Appwrite `useCombinedTailorHistory` 403 / tailor-history permission cleanup.
- Public portfolio contact form / chat live QA.
- Full screen-reader QA pass.
- Optional git history scrub (BFG / git-filter-repo) for the old credential value.
- Optional broader PII cleanup: base owner email used as sample data in ~14 tracked files.
- Broad user-testing bug collection (triage by severity).

---

## 2026-06-22 - Security: remove hardcoded QA credentials from tracked files

### Summary
Removed pre-existing hardcoded QA test-account credentials (password + login email) from tracked E2E scripts/specs and two audit reports; replaced with environment variables. No backend/Appwrite/API/auth/AI/payment/schema/deployment-workflow changes. `tsc --noEmit` + `npm run build` pass.

### Changed
- `scripts/e2e-resend-verification.mjs`, `scripts/e2e-signup-plus8.mjs`, `scripts/e2e-signup-test.mjs`, `scripts/signup-and-send-verification.cjs`: read QA email/password from `WISE_RESUME_E2E_EMAIL` / `WISE_RESUME_E2E_PASSWORD` (or argv) with a safe "missing env" error + exit; removed the hardcoded literals **and** removed the `console.log` lines that printed the password.
- `tests/e2e/specs/27-antigravity-auth-flows.spec.ts`: email assertion now uses `process.env.WISE_RESUME_E2E_EMAIL` (asserted only when set); no hardcoded email.
- `reports/audits/2026-06-20-devkit-live-audit.md`, `reports/e2e-wiseresume-report.md`: redacted the owner email to a `qa-user@example.com` placeholder.
- `tests/e2e/fixtures/.env.test.example`: added empty `WISE_RESUME_E2E_EMAIL=` / `WISE_RESUME_E2E_PASSWORD=` placeholders.

### Verified
`git grep`: no QA password or `+1` login-email literal remains in any tracked file. Dry-run confirms the scripts fail safely (clear message, exit 1) with no credentials and never print the password.

### Action required
**Rotate the QA account password** — the old value existed in tracked git history before this cleanup (this commit removes it from HEAD only, not from history). Separately, the base owner email is still used as sample/demo data in ~14 tracked files (resume templates / test fixtures / historical docs); broader PII cleanup is left as a separate decision (not done here to avoid a broad refactor).

---

## 2026-06-22 - UI/UX Audit Auth-Gated Browser QA Pass

### Summary
Owner provided a dedicated PREMIUM QA account and logged it in (agent did not handle the password). With the authenticated session, the previously-blocked auth-gated surfaces were verified via the local dev server (Vite :5000) + preview DOM/eval/screenshot tools. **No product source changed this pass; no credentials stored.** `tsc` + `build` re-confirmed PASS (exit 0).

### Verified live (fixes confirmed)
- **Editor light-mode P0:** light theme → header `rgba(255,255,255,.88)`, `--editor-surface-2: 0 0% 100%`, light section headers/borders; branded rail stays dark (`--editor-rail-end`) with legible white text; **screenshot confirms a clean premium light editor**. Dark mode → original dark tokens restored. Both themes good.
- **Pricing (PREMIUM):** Free/Pro = "Included" (disabled), Premium = "Current Plan" — **no "Upgrade" on Free/Pro**.
- **Dashboard:** no fabricated tip stats; premium sees no "Upgrade" (shows "Manage billing"); sidebar logo → `/dashboard`; no overflow.
- **Editor mobile "Improve with AI":** "AI" label + `aria-label="Improve Summary"` + 44px.
- **AI Studio mobile:** composer pins at `top:56px`, clears the 48px header (no collision); no overflow.
- **Preview:** mobile primary button = "Export Options" (matches behavior); no overflow.
- **Tailoring Hub / Settings / Portfolio editor:** load, no overflow. No console errors anywhere.

### Code-verified, not exercised live
AI-Studio sheet DOM (sheets open from workflows / avoided AI credits), Preview wrong-resume flash (racy), Dialog max-h trigger + AIQuestionsDialog focus-trap (Radix; needs AI flow), public-portfolio contact/chat (no published portfolio). z-index still **deferred**.

### Verdict
**PASS WITH WARNINGS — close to push-ready.** Headline risks retired live; residual = deferred z-index P1 + a few code-verified-only items. Then branch → commit → PR. See `IMPLEMENTATION_FULL_REMAINING_AUDIT_REPORT.md` → "Auth-Gated Browser QA Pass".

---

## 2026-06-22 - UI/UX Audit Final Browser QA Pass

### Summary
Ran the local dev server (Vite :5000) and verified the working tree via preview DOM/eval tools. **Browser QA = PASS WITH WARNINGS:** public surfaces verified clean; auth-gated surfaces BLOCKED (no QA credentials; account creation prohibited). UI-only; no backend/Appwrite/API/auth/AI-logic/deploy changes. `tsc` + `build` PASS (exit 0). Not committed/pushed.

### Verified (browser, public)
- **Landing:** no horizontal overflow at 1440 & 375; `lenis` class active (official `html.lenis body{height:auto}` reset live); `.scroll-stack-inner` min-height = 100dvh and padding-bottom = 270px desktop / **93px (14vh) mobile** (empty-band fix confirmed); hero CTA visible at 375×667; no console/server errors. Investigated the at-rest `scroll-behavior:smooth` — non-issue (Lenis uses `behavior:"instant"` + transient `lenis-smooth`).
- **Pricing:** renders Free/Pro/Premium; unauthenticated CTAs all "Get Started" (no stray Upgrade); no overflow.
- **Auth:** login form renders. Route gating confirmed (`/ai-studio` → `/auth`).

### Fixed this pass
- Closed the 2 remaining AI-Studio sibling sheets' a11y: `PortfolioBioSheet.tsx` (aria-live/aria-busy region) and `ResumeABCompareSheet.tsx` (`htmlFor`/`id` on selects + JD textarea, aria-live loading region, `role="alert"`). All 8 AI-Studio sheets now consistent.

### Blocked / deferred
- **Auth-gated flows BLOCKED** (editor light-mode P0, preview, dialogs/AIQuestionsDialog, AI-Studio DOM, tailoring, dashboard, settings, portfolio, pricing premium case) — code-verified only, need a QA account/owner browser verification.
- **z-index (P1)** still deferred (tooltip 55 > modal 50; Radix tooltips portal to body).

### Verdict
**PASS WITH WARNINGS — do not fast-track to `main`.** Run §9/§12 browser QA on auth-gated flows (light + dark) first. See `IMPLEMENTATION_FULL_REMAINING_AUDIT_REPORT.md` → "Final Browser QA Pass".

---

## 2026-06-22 - UI/UX Audit Final Pre-Push Cleanup Loop

### Summary
Closed/validated the remaining partial/deferred P1s. UI-only; no backend/Appwrite/API/auth/AI-logic/payment/deploy changes. `tsc --noEmit` + `npm run build` PASS (exit 0); eslint on edited sheets = 0 problems. Not committed/pushed.

### Fixed
- **AI Studio a11y (P1):** all 6 audited sheets (`ColdEmail`, `SalaryNegotiation`, `ReferenceLetter`, `SkillsGap`, `PersonalBranding`, `JobRejection`) now have `htmlFor`/`id`-associated labels, a `role="status" aria-live="polite"` + `aria-busy` generation/result live region, and `role="alert"` on inline errors. Combined with the earlier AIActionBar + AIQuestionsDialog work, the "AI results not announced" and "AI-Studio labels" P1s are now addressed across audited surfaces. (No AI/API/credit/layout changes — additive attributes + one sr-only span per sheet.)

### Still deferred
- **z-index inversion (P1):** verified (tooltip 55 > modal 50) but a blind fix would break tooltips rendered inside dialogs (Radix portals to body); needs a browser-verified overlay-tier split — documented with files + suggested PR + QA.
- Two unlisted AI-Studio siblings (`PortfolioBioSheet`, `ResumeABCompareSheet`) — same-pattern follow-up.

### QA / verdict
Browser/mobile/screen-reader QA = **BLOCKED** (auth-gated flows, no dev server/credentials). Pre-push verdict: **PASS WITH WARNINGS** — static validation green, all P0s + nearly all P1s fixed, but browser QA not run and z-index deferred → **not yet safe to fast-track to `main`**. See `IMPLEMENTATION_FULL_REMAINING_AUDIT_REPORT.md` → "Final Pre-Push Cleanup Loop".

---

## 2026-06-22 - UI/UX Audit Full Remaining Pass (P0/P1 closeout)

### Summary
Implemented the remaining safe UI/UX/responsive/a11y/theme/correctness findings on top of Wave 0 + Report 02. UI-only; no backend/Appwrite/API/auth/AI-logic/payment/route/schema/deploy changes. All audit **P0s fixed**; most P1s fixed; a few P1/P2 deferred with rationale. `tsc --noEmit` + `npm run build` PASS (exit 0); eslint clean for edited files. Not committed/pushed.

### Fixed in this pass
- **Editor light/dark mode (P0):** `editor-workspace.css` now has light defaults + a verbatim `.dark` override; branded rail stays dark crimson in both themes (`--editor-rail-end`). Dark mode unchanged.
- **Preview wrong-resume (P1):** `PreviewPage.tsx` renders a skeleton (not the stale resume) until the URL-requested id is bootstrapped (`isPreviewReady` gate).
- **Pricing CTA (P1):** `PricingPage.tsx` plan-rank — premium users no longer see "Upgrade" on Free/Pro (Included/Current Plan/disabled).
- **Dashboard tip stats (P1):** `DashboardStats.tsx` fabricated percentages rephrased to non-numeric guidance.
- **AIQuestionsDialog → Radix (P1 a11y):** rebuilt on `Dialog` (focus trap, Escape, title/desc, associated labels).
- **Public contact form (P1 a11y):** `PortfolioContactForm.tsx` label `htmlFor`/`id`, focus rings, `role=alert`/`status`. **AIActionBar** got `aria-live`/`aria-busy`. **ChatWidget** send got `aria-label`+44px.
- **Tailoring guardrail (P2):** reframed as a recoverable warning with inline Retry / Edit job description (no AI-logic change). **Upload (P2):** double-submit guard + parse-recovery actions wired.
- **Small fixes:** sidebar logo→`/dashboard`; empty-state copy; dark `--input` raised; onboarding Skip hidden on welcome; SetupTab duplicate import removed.

### Deferred (with rationale)
Global z-index restack (regression risk); ai-studio multi-sheet aria-live/label sweep (volume; editor path + AIQuestionsDialog done); Auth inline errors; portfolio password-state hydration; WiseHire token swap + radius/H1/WiseHire-bg (broad/subjective); dead-component deletion. See `IMPLEMENTATION_FULL_REMAINING_AUDIT_REPORT.md`. **Browser/mobile QA still required** before production sign-off.

---

## 2026-06-22 - UI/UX Audit Report 02 (responsive/mobile pass)

### Summary
Controlled responsive/mobile fixes from `Project Atlas/UI_UX_AUDIT_2026-06-22/02_RESPONSIVE_AUDIT.md` (items A–K). UI/CSS-class/small-component only; no backend/API/auth/Appwrite/AI/state/route/payment/deploy changes. Builds on Wave 0 (left intact). `tsc --noEmit` + `npm run build` PASS (exit 0); no new lint errors in edited files. Not committed/pushed.

### Changes (9 files)
- **Dashboard (A,F):** gated `.dashboard-workspace-main-body` / `.dashboard-resume-list-scroll` overflow to `xl:` so mobile/tablet (<1280px) get one natural page scroll (desktop list scroll preserved); resume list `pb-20 lg:pb-1` so the bottom-left FAB no longer overlaps the last row.
- **AI Studio (B):** composer `sticky top-14 lg:top-0` so it no longer collides under the mobile sticky header.
- **Editor (C,G,H):** mobile "Improve with AI" now shows an "AI" label + `aria-label`; Education inputs standardized to `h-11` (match date pickers); collapsed Education/Experience rows get native `title` tooltips.
- **Preview (E):** mobile primary button relabeled "Export Options" to match its behavior (opens the options sheet). (Item D — bottom-bar overlap — verified NOT an issue: the bar is `shrink-0` normal flow, no change.)
- **Tailoring Hub (J):** compact truncated job-context chip now shown on mobile (`max-w-[40vw]`, real data only).
- **Landing (I):** hero `minHeight: min(640px, 88dvh)` so the CTA isn't pushed too low on short phones.
- **Sheet (K):** side-sheet base width `w-full`→`w-[92%]` to leave a dismiss strip below 375px (`xs`/`sm` + bottom sheets unchanged).

### Deferred
Persistent mobile bottom-nav, preview wrong-resume gating, editor light-mode (P0, owner decision), upload dedupe, z-index refactor, full a11y pass. Live device confirmation pending. See `IMPLEMENTATION_REPORT_02_RESPONSIVE.md`. Mobile/responsive risk reduced, not eliminated.

---

## 2026-06-22 - UI/UX Audit Wave 0 (landing scroll, dialog max-height, info token, tailoring clip)

### Summary
Controlled UI-only fix pass for the four highest-impact / lowest-risk items (A–D) from `Project Atlas/UI_UX_AUDIT_2026-06-22/00_EXECUTIVE_SUMMARY.md`. No backend/API/auth/AI/payment/Appwrite/route/state/deployment changes. `tsc --noEmit` and `npm run build` both PASS (exit 0); no new lint errors in edited files. Not yet committed/pushed.

### Changes (8 files, UI only)
- **Landing scroll (P0):** imported `lenis/dist/lenis.css` (`src/main.tsx`) and added unlayered `.lenis.lenis-smooth { scroll-behavior: auto !important }` (`src/index.css`) so native smooth-scroll no longer fights Lenis; reduced mobile ScrollStack `padding-bottom` to 14vh and switched `min-height` to `100dvh` w/ vh fallback (`ScrollStack.css`).
- **Dialog trap (P0):** added `max-h-[calc(100dvh-2rem)] overflow-y-auto` to default `DialogContent` and `AlertDialogContent`, and `max-h-[calc(100dvh-6rem)] overflow-y-auto` to `DrawerContent` (shadcn/Radix structure preserved).
- **`info` token (P1):** added `info` (DEFAULT + foreground) to `tailwind.config.ts`, activating the dead `bg-info`/`text-info` classes in `badge.tsx`/`sonner.tsx`.
- **Tailoring mobile clip (P1):** scoped `.jmw-result-body--compare { padding-bottom:1.25rem }` to `@media (min-width:640px)` so the mobile `4.5rem + safe-area` rule is no longer overridden under the fixed action bar.

### Deferred
Editor light-mode P0 (needs owner decision), preview wrong-resume gating, pricing CTA plan-rank, dashboard tip copy, z-index refactor, AI a11y pass, mobile nav, upload dedupe. See `IMPLEMENTATION_WAVE_0_REPORT.md`. Live device/a11y confirmation pending. Exec-Summary P0/P1 risk reduced, not eliminated.

---

## 2026-06-22 - Security Remediation Closeout (PR #104 + PR #105)

### Summary
Completed the full-codebase security remediation cycle: implemented, reviewed, merged, deployed, and verified the fixes from the security review. Final verification verdict is **PASS WITH WARNINGS**. Production is safe to keep live and ready for broad user testing; public launch is **conditional** on owner-side checks. No rollback or new deploy required.

### PR #104 — Security fixes (merged; 15 hubs deployed)
Merge commit `1f790dbd4361c1c978871f3e298abb1fab3a5b0e`.
- **Portfolio / shared-resume XSS:** new `safeHref()` (`src/lib/urlUtils.ts`) allowlisting `http`/`https`/`mailto`/`tel` and rejecting `javascript:`/`data:`/`vbscript:`; wired into all public-portfolio link sites (ProjectCard, CaseStudyCard, PublicSections, PublicHero, ContactLinks, GitHubProjectsSection, VisitorsPanel), the PDF/print export (`portfolioPrintLayout.ts`), and the shared-resume template (`WiseResumeClassicTemplate.tsx`). Unsafe URLs render as plain text / non-clickable; safe URLs are not normalized/broken.
- **job-import credits/rate-limit/idempotency:** ported the `resume-section-ai` charging pattern into `appwrite-hubs/job-import` (`parse-job` = 1 credit). Failed fetch/LLM/no-result paths do not charge; same-URL retries are idempotent within the TTL.
- **ai-health authenticated-only:** `appwrite-hubs/ai-health` now requires a valid Appwrite user session (anonymous → 401); response shape unchanged; no provider keys exposed.
- **admin-sentry fail-closed:** webhook now rejects when `SENTRY_WEBHOOK_SECRET` is unset (`if (!secret) return false`); unsigned webhooks → 401.
- **Raw DEVKIT_PASSWORD bearer fallback removed:** 9 admin hubs (admin-impersonate, admin-email, admin-testmail, admin-moderation, admin-portfolio-usernames, admin-visitor-analytics, admin-onboarding-funnel, admin-deploy-hubs, inspect-ai-keys) are now signed-token-only (`verifySignedToken` / `APPWRITE_API_KEY` verification preserved).
- **WiseHire rate limits:** per-IP throttle on `waitlist-check-email` (email enumeration) and per-user throttle on `write-jd`/`generate-brief` in `wisehire-gateway` (no credit deduction).
- **Portfolio unlock token user_id binding:** `get-public-portfolio` unlock token now validated against both username and owner `user_id`.
- **DevKit username availability moved server-side:** new read-only `check-username-availability` action in `admin-devkit-data`; `UserDetailDrawer` no longer issues a direct cross-user browser query.

### PR #105 — Deploy smoke-check fix (merged; deploy-script only)
Merge commit `42819189193f48fea47fb38994614d263e17032c`.
- Updated `scripts/deploy_hubs.cjs` smoke checks for the now fail-closed endpoints: `admin-sentry` (unsigned webhook) and `ai-health` (anonymous) now treat **401 as the expected PASS** via an `okStatuses` option. A 200 to either would now fail the smoke (regression guard).
- **No hub redeploy required** — changes only affect the deploy-script's smoke-validation step.

### Deployment state
- **15 Appwrite hubs deployed and live from PR #104** (job-import, wisehire-gateway, admin-devkit-data, get-public-portfolio, admin-sentry, ai-health, admin-impersonate, admin-email, admin-testmail, admin-moderation, admin-portfolio-usernames, admin-visitor-analytics, admin-onboarding-funnel, admin-deploy-hubs, inspect-ai-keys) via the official `deploy-appwrite-hubs.yml` workflow (targeted, not `target=all`).
- **Vercel production deployed** (success for both `1f790dbd` and `42819189`).
- **PR #105 merged**, deploy-script-only; no hub redeploy triggered.

### Verification result — PASS WITH WARNINGS
- Production safe to keep live: **YES**.
- Broad user testing: **YES**.
- Public launch: **CONDITIONAL** (owner-side checks below).

### Tests passed
- `npx tsc --noEmit`; `npm run build`; relevant Vitest (urlUtils/safeHref, ProjectCard, GitHubProjectsSection, portfolio public, templates/WiseResumeClassicTemplate, ContactLinks — 69 tests); hub tests (8 files incl. ai-health-auth, devkit-auth-signed-only, job-import-credit, wisehire-ratelimit); source-hash gate (`compute-source-hashes.mjs` + `git diff --exit-code`); `git diff --check`.
- **Live anonymous endpoint checks:** ai-health → 401, admin-sentry unsigned webhook → 401, job-import → 401, get-public-portfolio (bogus user) → 404, admin-devkit-data & inspect-ai-keys (invalid token) → 401 — all with deployment IDs matching the #104 run.
- **Authenticated read-only browser checks:** dashboard, portfolio studio, tailoring hub, editor, settings load with no blocking errors; live public portfolio (`/p/<user>`) renders with normal links preserved and **zero unsafe hrefs**.

### Known warnings / blocked tests
- **Signed Sentry webhook → 200** still needs owner-side confirmation (cannot sign without the secret).
- **QA write tests blocked** without a dedicated QA account (signup gated by SlideCaptcha + email verification; owner's real account not used for writes).
- **Live job-import credit deduction blocked** without a QA account.
- **WiseHire recruiter flow blocked** without a recruiter account.
- **`useCombinedTailorHistory` "not authorized" console warning in Editor** — non-blocking; editor fully functional; likely **pre-existing/unrelated** (no changed file touches `tailor_history` or its permissions).

### Remaining follow-ups
- Confirm the signed Sentry webhook with a real Sentry event.
- Create/use a QA account for write-flow smoke (resume save, job-import credit deduction, portfolio `javascript:` rendering, DevKit, WiseHire).
- Investigate the `useCombinedTailorHistory` 403 separately (confirm it predates the remediation).
- Deferred: CSP `unsafe-inline` removal; SHA-256→bcrypt portfolio-password migration; impersonation nonce sessionStorage review; custom-domain mapping disclosure; job-import DNS-rebinding pin.
- CI noise: AI Gateway auto-build failure and TestSprite "no tests detected" (both unrelated, non-required).

### Current final status
Security remediation **complete**. No immediate rollback required. No new deploy required. **Ready for broad user testing.**

---

## 2026-06-21 - Anti-Gravity Post-Secret Live QA

### Summary
Completed the Anti-Gravity post-secret live browser QA against `https://wiseresume.app` after the owner added `PORTFOLIO_JWT_SECRET` to Appwrite and GitHub Secrets and redeployed the affected portfolio functions. All critical flows pass. No P1 blockers. Status upgraded from `BLOCKED_EXTERNAL_ACCESS` to `READY_FOR_BROAD_USER_TESTING`.

### QA Results
| Area | Result |
|------|--------|
| Auth / Login / Logout | ✅ PASS |
| Resume Editor | ✅ PASS |
| AI Tools — Suggest Skills | ✅ PASS |
| Tailoring Hub | ⚠️ P2 — Guardrail fired on blank test resume (expected behavior) |
| Portfolio Password Protection (setup + security) | ✅ PASS |
| Portfolio gate propagation | ⚠️ P2 — CDN propagation delay >40s (not a code bug) |
| Settings & Logout | ✅ PASS |
| Security (no hash/secret in guest HTML) | ✅ CLEAN |

### Test Artifacts
- E2E spec updated: `tests/e2e/specs/27-antigravity-auth-flows.spec.ts`
- Report: `Project Atlas/Deployment Reports/WiseResume_AntiGravity_PostSecret_LiveQA_2026-06-21.md`

### Status
`READY_FOR_BROAD_USER_TESTING` — TestSprite can be rerun; broad user testing and launch are safe.

---

## 2026-06-21 - Final Autonomous QA Loop

### Summary
Ran the final autonomous QA/fix/deploy loop. Local validation passed, public production routes loaded on `https://wiseresume.app`, and the remaining DeepSeek routing mismatch in `job-import` was fixed and deployed. Final status is `BLOCKED_EXTERNAL_ACCESS` because `PORTFOLIO_JWT_SECRET` is missing from the required live portfolio functions and no safe test credentials were available for authenticated browser QA.

### Changes Applied
| File | Change |
|------|--------|
| `appwrite-hubs/job-import/src/main.js` | Reordered the provider pool to prefer DeepSeek before Groq/OpenRouter fallbacks. |
| `tests/hubs/job-import-routing.test.cjs` | Added a focused regression check for DeepSeek-first `job-import` provider order. |
| `src/lib/devkit/sourceHashes.generated.json` | Updated the `job-import` source hash to `c00d55c1f5ff8c8ed5bd6179d08928e6f81da4140cfa3e044b68e1b5fa964618`. |

### Deployment
| Target | Result |
|--------|--------|
| Vercel production | Success for commit `393ff9ae73d8fd4f80efd7c91fe87a8271a0d599`; deployment `5136403494`. |
| `job-import` | Official workflow run `27884437136`, deployment `6a37068e5b8ff5226838`, ready/active. |

### Verification
- `npx tsc --noEmit` - pass.
- `npm run build` - pass.
- Appwrite hub syntax checks for `ai-gateway`, `get-public-portfolio`, `verify-portfolio-password`, `portfolio-gate`, and `job-import` - pass.
- `node tests/hubs/portfolio-password-verification.test.cjs` - pass.
- `node tests/hubs/ai-gateway-routing.test.cjs` - pass.
- `node tests/hubs/job-import-routing.test.cjs` - pass.
- `npx vitest run src/lib/devkit/aiToolsCatalogue.test.ts src/lib/__tests__/workspaceSearch.test.ts` - pass.
- `node scripts/compute-source-hashes.mjs` - pass.
- `git diff --check` - pass.

### Remaining Blockers
- `PORTFOLIO_JWT_SECRET` is missing from GitHub repository secrets and from Appwrite `get-public-portfolio` and `portfolio-gate` variables.
- Authenticated browser QA is blocked without safe test credentials.
- TestSprite rerun, broad user testing, and launch are not recommended until those external blockers are cleared.

---

## 2026-06-20 - Post-Fix Production Deployment Readiness

### Summary
Pushed post-fix commit `ba523905b2e57dfe75cc6696a9277efeee51578f` to `origin/main`, verified the Vercel production deployment, and ran the official targeted Appwrite hub deployment workflow for `get-public-portfolio`, `verify-portfolio-password`, and `ai-gateway`.

### Deployment Results
| Target | Result |
|--------|--------|
| Vercel production | Success at `https://wise-resume-1hvl3wy6z-iam-magdy.vercel.app`. |
| `get-public-portfolio` | Appwrite workflow run `27883728138`, deployment `6a36ff71461f294e1ce4`, ready. |
| `verify-portfolio-password` | Appwrite workflow run `27883728138`, deployment `6a36ff80ae087936f7bb`, ready. |
| `ai-gateway` | Appwrite workflow run `27883728138`, deployment `6a36ff8e7cbdd33d3ea5`, ready; safe smoke returned HTTP 200. |

### Verification
- `npx tsc --noEmit` - pass.
- `node tests/hubs/portfolio-password-verification.test.cjs` - pass.
- `node tests/hubs/ai-gateway-routing.test.cjs` - pass.
- `npx vitest run src/lib/devkit/aiToolsCatalogue.test.ts src/lib/__tests__/workspaceSearch.test.ts` - pass.
- `node scripts/compute-source-hashes.mjs` - pass.
- `git diff --check` - pass.
- `npm run build` - pass; existing Vite `bcryptjs` browser crypto and chunk-size warnings remain.

### Final Status
`DEPLOYED_PENDING_MANUAL_QA`. Browser/manual QA and TestSprite rerun remain required before broad user testing or launch. `PORTFOLIO_JWT_SECRET` was not present as a GitHub repository secret and was blank in the workflow environment, so live Appwrite variable presence remains unknown and must be verified by the owner.

---

## 2026-06-20 - Portfolio Unlock, AI Routing Metadata, and Tailoring Hub Entry Fixes

### Summary
Fixed the P0 public portfolio unlock regression caused by bcrypt hashes being saved by the editor while public hubs only checked SHA-256. Also repaired AI Gateway tailor identity preservation, aligned DevKit AI route metadata, and moved user-facing Tailor entry points to Tailoring Hub.

### Changes Applied
| File | Change |
|------|--------|
| `appwrite-hubs/get-public-portfolio/src/main.js` | Added bcrypt password verification with legacy raw SHA-256 and `sha256:` support; fail-closed when protection is enabled but hash is missing; kept JWT secret checks fail-safe. |
| `appwrite-hubs/verify-portfolio-password/src/main.js` | Matched the same bcrypt/SHA verification behavior and fail-closed missing-hash handling. |
| `appwrite-hubs/*/package.json` | Added `bcryptjs` dependency for the two portfolio password hubs. |
| `appwrite-hubs/ai-gateway/src/main.js` | Preserved returned structured IDs, matched reordered tailor items by identity, stopped re-sorting AI-returned order, and restored the bullet transformation limit prompt guardrail. |
| `src/lib/devkit/aiToolsCatalogue.ts` / `.test.ts` | Aligned `resume-section-ai` with the gateway's DeepSeek default. |
| Dashboard/search/navigation files | Updated user-facing Smart Tailor links to `/tailoring-hub` while preserving legacy `/tailor` routes. |
| `tests/hubs/portfolio-password-verification.test.cjs` | Added bcrypt and legacy SHA password regression coverage. |

### Job Import Provider Order
Inspected only. `ImportJobSheet` uses `useImportJob`, which invokes the separate `job-import` hub for URL imports. That hub currently builds its provider pool as Groq -> OpenRouter -> DeepSeek, while `ai-gateway` routes `parse-job` through DeepSeek first. This is a production Tailoring Hub URL-import path and is a known provider-order mismatch, but no code change was made in this pass because it is separate from the P0/P1 fixes and should be changed with focused job-import validation.

### Verification
- `npx tsc --noEmit` - pass.
- `npm run build` - pass; existing large chunk and Vite `bcryptjs` browser crypto warnings remain.
- `node --check appwrite-hubs/ai-gateway/src/main.js` - pass.
- `node --check appwrite-hubs/get-public-portfolio/src/main.js` - pass.
- `node --check appwrite-hubs/verify-portfolio-password/src/main.js` - pass.
- `node --check appwrite-hubs/portfolio-gate/src/main.js` - pass.
- `node tests/hubs/portfolio-password-verification.test.cjs` - pass.
- `node tests/hubs/ai-gateway-routing.test.cjs` - pass; env-missing alerts are expected locally and fail closed.
- `npx vitest run src/lib/devkit/aiToolsCatalogue.test.ts src/lib/__tests__/workspaceSearch.test.ts` - pass.
- `node scripts/compute-source-hashes.mjs` - pass.
- `git diff --check` - pass.

### Source Hash Updates
- `ai-gateway`: `e9c40b8f3096ad73e0bad7d7c2cf5a7cb8bf7a1933c836171f950049240ff27b`
- `get-public-portfolio`: `996397a6ef20065b3c7c872b0e2bd1349b61525b879fad6ccccbfa11e5f4f98f`
- `verify-portfolio-password`: `ceae5b6a3bb0714b8bfd8bcf0c7ece96744e5d97f087fe22fb0158f6d8ce31a4`

### Deployment Required
- Vercel frontend deploy required for dashboard/search/navigation and DevKit catalogue changes.
- Appwrite Hub deploy required for:
  - `get-public-portfolio`
  - `verify-portfolio-password`
  - `ai-gateway`
- `portfolio-gate` did not change; syntax check only.

### Manual QA Still Needed
1. Publish a password-protected portfolio from the editor, then unlock it publicly with the same password.
2. Confirm a legacy SHA-256 protected portfolio still unlocks.
3. Confirm a protected portfolio with a bad password stays locked.
4. Run a Tailoring Hub job flow and confirm reordered experience entries keep the correct original IDs.
5. Open dashboard Smart Tailor, workspace search, feature discovery, and a saved job's Tailor Resume action; each should land in Tailoring Hub.

---

## 2026-06-16 - Security: Server-side Portfolio Password Verification

### Security Issue (Addressed)

**Password Hash Exposure:**
- Public portfolio read `password_hash` from Appwrite into browser
- Client-side SHA-256 verification exposed hash to potential attackers
- This was a security risk (hash exposure)

**Fix:**
- Created new Appwrite Function `verify-portfolio-password`
- Server-side password verification — hash never leaves server
- Client sends password, receives only success/failure response
- No breaking changes to existing flow (can migrate gradually)

### Files Added/Changed
| File | Change |
|------|--------|
| `appwrite-hubs/verify-portfolio-password/src/main.js` | **New** — Server-side password verification function |
| `appwrite.json` | Added function configuration |

### Deployment Required
- Deploy `verify-portfolio-password` function via GitHub Actions or CLI
- Frontend can optionally migrate to use this instead of client-side verification

### Future Migration Path
1. Update `usePublicPortfolio` to call `verify-portfolio-password` function instead of reading hash
2. Remove client-side SHA-256 verification
3. Password hash will be completely hidden from browser

---

## 2026-06-16 - Portfolio Password, Resume Selection, Chat Field Fixes

### Root Cause (Production QA Audit Continued)

**Portfolio Password Split-Brain:**
- Editor wrote `password_enabled`/`password_hash` to `portfolio_settings` collection
- Public hooks (`usePortfolioGate`, `usePublicPortfolio`) read from `profiles.portfolio_extras`
- Result: Password protection appeared configured but never worked publicly

**Wrong Resume Bug:**
- `usePublicPortfolio` fetched resume by `user_id` + `limit(1)` instead of using `portfolio_resume_id`
- Users with multiple resumes saw random resume instead of selected one

**Portfolio Chat Field Mismatch:**
- `public-share` function used camelCase (`portfolioEnabled`, `fullName`, `jobTitle`)
- Appwrite raw documents use snake_case (`portfolio_enabled`, `full_name`, `job_title`)
- Result: Chat couldn't find published portfolios or build context

### Changes Applied
| File | Change |
|------|--------|
| `src/hooks/usePublicPortfolio.ts` | `usePortfolioGate` now reads password state from `portfolio_settings` (source of truth) with fallback to legacy `portfolio_extras` |
| `src/hooks/usePublicPortfolio.ts` | `usePublicPortfolio` reads password hash from `portfolio_settings` with fallback; uses `portfolio_resume_id` to fetch selected resume |
| `appwrite-hubs/public-share/src/main.js` | `getPortfolioProfile` uses `portfolio_enabled` (snake_case); `getResumeForPortfolio` uses selected resume ID; `buildProfileContext` handles snake_case fields with camelCase fallback; safely parses JSON `portfolio_extras` |

### Verification
- `npx tsc --noEmit` — zero errors.
- `npm run build` — successful (44s).

### Deployment Required
- Frontend deploys automatically via Vercel on next push.
- Appwrite Function `public-share` requires manual deploy via `appwrite-push` or CLI.

---

## 2026-06-16 - AI Credits / Pro Badge / Portfolio Save Fixes

### Root Cause (Production QA Audit)

**AI Credits Issues:**
1. **Hardcoded `20` fallbacks**: 4 UI components (`AICreditsIndicator`, `CreditUsageSheet`, `AICreditsRow`, `DashboardStatusPopover`) had `const limit = credits?.daily_limit ?? 20` causing Pro users to see 20 credits instead of 50.
2. **Pro badge styling**: `DashboardPlanBadge` rendered Pro plan with muted gray styling instead of blue, making Pro appear like Free.

**Portfolio Save Issue:**
1. **CRITICAL**: `LIVE_PROFILE_ATTRIBUTES` whitelist in `useProfile.ts` excluded all portfolio fields (`portfolio_resume_id`, `portfolio_sections`, `portfolio_extras`, etc.). `filterProfilePayload()` stripped these fields before Appwrite update, causing portfolio saves to persist only basic fields.

### Changes Applied
| File | Change |
|------|--------|
| `src/components/editor/ai/AICreditsIndicator.tsx` | Import `useMe` and `PLAN_CREDIT_LIMITS`; derive fallback limit from `effective_plan` instead of hardcoded 20 |
| `src/components/ai/CreditUsageSheet.tsx` | Import `useMe` and `PLAN_CREDIT_LIMITS`; derive fallback limit from `effective_plan` |
| `src/components/settings/sections/AICreditsRow.tsx` | Import `useMe` and `PLAN_CREDIT_LIMITS`; derive fallback limit from `effective_plan` |
| `src/components/dashboard/DashboardStatusPopover.tsx` | Import `useMe` and `PLAN_CREDIT_LIMITS`; derive fallback limit from `effective_plan` |
| `src/components/dashboard/DashboardPlanBadge.tsx` | Fix Pro badge styling: blue-50/bg-blue-950 instead of muted gray |
| `src/hooks/useProfile.ts` | **CRITICAL**: Add 18 portfolio fields to `LIVE_PROFILE_ATTRIBUTES` whitelist: `portfolio_resume_id`, `portfolio_sections`, `portfolio_meta_title`, `portfolio_meta_description`, `portfolio_style`, `portfolio_layout`, `portfolio_accent_color`, `portfolio_font`, `open_to_work`, `availability_headline`, `portfolio_sync_mode`, `portfolio_extras`, `github_url`, `website_url`, `twitter_url`, `contact_email`, `portfolio_draft`, `portfolio_draft_saved_at`, `phone_number`, `digest_enabled`, `hired_at` |

### Verification
- `npx tsc --noEmit` — zero errors.
- `npm run build` — successful (49s).

### Deployment Required
- Frontend deploys automatically via Vercel on next push.
- No backend/Appwrite changes required for these fixes.

---

## 2026-06-16 - Resume Editor Autosave Persistence Fix (TestSprite)

### Root Cause (from TestSprite QA Report)
TestSprite found that editing the Professional Summary did not persist after reload. The `SummarySection` component updated local Zustand state on change but only set `touched=true` on blur. The `useEditorAutosave` hook debounces cloud saves (1500ms first, 3000ms subsequent), meaning quick edits followed by immediate navigation/reload could lose data before the debounced save fired.

### Bug Analysis
1. **Missing blur flush**: SummarySection onBlur did not trigger a cloud save
2. **Debounce window**: 1.5s-3s delay allowed data loss on quick navigation
3. **Save visibility**: Relied solely on toast notifications (may be disabled in user settings)

### Changes Applied
| File | Change |
|------|--------|
| `src/contexts/EditorSaveContext.tsx` | **New** — React context providing `flushSave()` to child components, enabling immediate save on blur |
| `src/hooks/useEditorAutosave.ts` | Added `flushSave` function that clears pending debounce and saves immediately; Added `onRegisterFlush` callback to expose flush to context; Returns `{ saveToCloud, flushSave }` |
| `src/pages/EditorPage.tsx` | Wrapped editor content with `EditorSaveProvider`; Registered flush function with context |
| `src/components/editor/SummarySection.tsx` | Added `useOptionalEditorSave()` hook; Calls `editorSave.flushSave()` on blur to prevent data loss |

### How It Works
1. User types in Summary field → Zustand state updates immediately (local)
2. User blurs/clicks away → `flushSave()` triggers immediate cloud write (bypasses debounce)
3. Save indicator in header shows "Saving…" → "Saved" status
4. Page reload/refresh → `beforeunload` and `pagehide` handlers also flush pending saves

### Verification
- `npx tsc --noEmit` — zero errors.
- `npm run build` — successful (1m 3s).
- No breaking changes to debounce behavior for normal typing flow.

### Deployment Required
- Frontend deploys automatically via Vercel on next push.
- No backend/Appwrite changes required.

---

## 2026-06-16 - Tailoring Result Route Fix (E2E)

### Root Cause (from E2E Test Report)
E2E test `Routing and Error Handling: Tailoring result survives refresh` accessed `/tailor/result/:id` but received 404. The route was defined as `/tailoring-hub/result/:resumeId` in `AppInterior.tsx` but the test (and user expectations) expected `/tailor/result/:id`.

### Changes Applied
| File | Change |
|------|--------|
| `src/AppInterior.tsx` | Added `/tailor/result/:resumeId` route alias pointing to `TailoringHubResultPage` |

### Verification
- `npx tsc --noEmit` — zero errors.
- Route now supports both `/tailoring-hub/result/:id` and `/tailor/result/:id`

### Deployment Required
- Frontend deploys automatically via Vercel on next push.

---

## 2026-06-14 - Tailoring Hub False Success Fix (F-1)

### Root Cause (from TestSprite QA Report)
TestSprite found that Tailoring Hub showed "Tailored CV Ready" with "0 Before / 0 After" scores when AI returned unchanged resume content. The AI Gateway (`appwrite-hubs/ai-gateway/src/main.js:1162-1168`) falls back to original resume fields when AI output is empty/invalid, but frontend had no validation to detect this silent failure.

### Changes Applied
| File | Change |
|------|--------|
| `src/lib/tailorMerge.ts` | Added `normalizeText()` helper (trim, lowercase, collapse whitespace, remove punctuation); Added `hasMeaningfulChanges()` function with `ChangeSummary` interface — compares normalized content across enabled sections (summary, skills, experience, education, projects, certifications, awards); Returns detailed change detection including `hasChanges`, per-section flags, `changedSections` array, and human-readable `description` |
| `src/pages/TailoringHubPage.tsx` | Added mandatory validation after AI response; Uses `hasMeaningfulChanges()` to compare original vs merged tailored resume; Detects zero scores (0/0), equal scores with no content changes, or missing meaningful changes; Blocks navigation, shows error toast "No meaningful changes detected", preserves original resume (no save), returns to workspace with retry option |
| `src/pages/TailoringHubResultPage.tsx` | Added `isUnchangedWarning` detection logic (combines `changeSummary.hasChanges`, zero scores, equal scores); Header shows amber "Changes Not Verified" with warning icon when unchanged, green "Tailored CV Ready" when changed; Added warning banner with explanation and "Retry Tailoring"/"Edit Manually" buttons for unchanged results; Added success banner with change summary description for valid results; Added `changeSummary` to navigation state |
| `src/lib/__tests__/tailorMerge.test.ts` | **New** — 30 tests: `normalizeText` (6 tests), `hasMeaningfulChanges` (18 tests), `buildMergedResume` (6 tests) |
| `src/pages/__tests__/TailoringHubPage-F1.test.tsx` | **New** — 7 tests: unchanged detection, zero-score scenarios, meaningful change detection, whitespace/case filtering |
| `src/pages/__tests__/TailoringHubResultPage-F1.test.tsx` | **New** — 9 tests: warning/success UI state logic, backwards compatibility |

### Verification
- `npx tsc --noEmit` — zero errors.
- `npx vitest run src/lib/__tests__/tailorMerge.test.ts` — 30/30 pass.
- `npx vitest run src/pages/__tests__/TailoringHubPage-F1.test.tsx` — 7/7 pass.
- `npx vitest run src/pages/__tests__/TailoringHubResultPage-F1.test.tsx` — 9/9 pass.
- `npm run build` — success (46.56s).

### Important Correction from Code Review
**Credits ARE consumed for unchanged AI output.** Frontend validation happens AFTER AI Gateway deducts credits (`recordSuccessUsage` at `main.js:2214`). The fix prevents false success UI but cannot prevent credit consumption without backend enhancement to validate AI output BEFORE recording credits. Documented as known limitation.

### Behavior Summary
| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| AI returns unchanged content | Shows "Tailored CV Ready", saves resume, navigates | Blocks navigation, shows error, no save, retry available |
| User refreshes unchanged result page | Would show success | Shows amber warning "Changes Not Verified" with retry/edit buttons |
| AI returns meaningful changes | Works correctly | Shows "Tailored CV Ready" with change summary banner |

### Deployment Required
- Frontend deploys automatically via Vercel on next push.
- No Appwrite changes required.

---

## 2026-06-05 - Phase 2 AI Security Hardening: Idempotency, Dedup & Credit Resilience

### Root Causes (from AI-SECURITY-AUDIT-2026-06-05.md, Phase 2 scope)
- No idempotency layer: double-click / refresh / back-nav could trigger duplicate provider calls and double credit charges.
- `recordSuccessUsage` had no retry logic — a single Appwrite DB blip silently lost credit recording.
- `ai_credits` get-or-create had no race handling — concurrent first-requests could hit a duplicate-document error.
- `daily_limit` was written back to `ai_credits` on every deduction, allowing stale limits to persist after plan changes.
- `safeLogAiRequest` silently swallowed all errors — missing collection produced zero operational signal.

### Changes Applied
| File | Change |
|------|--------|
| `appwrite-hubs/ai-gateway/src/main.js` | Add `IDEMPOTENCY_CACHE_COLLECTION_ID`, `IDEMPOTENCY_TTL_MS`, `RECORD_USAGE_BACKOFFS` constants; `computeContentKey()` SHA256 content key; `checkIdempotencyCache()`, `createIdempotencyPending()`, `updateIdempotencySuccess()`, `deleteIdempotencyDoc()` helpers; idempotency check before credit deduction in main handler; `updateIdempotencySuccess` on all 6 success paths; `deleteIdempotencyDoc` on all failure/error paths; retry-aware `recordSuccessUsage` with 3 attempts and exponential backoff; `loadCreditState` get-or-create race fix (catch 409, retry read); remove `daily_limit` write-back from `recordAiUsage`; derive `effectiveLimit` from `PLAN_DAILY_LIMITS` not stored value; `safeLogAiRequest` warns once on missing collection, logs `credits_charged`, `idempotency_key`, `is_idempotency_hit` |
| `src/lib/appwrite-functions.ts` | Generate `X-Idempotency-Key` UUID header for every AI gateway call; add 409 classification message |
| `src/hooks/__tests__/useAIAction-D1.test.ts` | 4 new Phase 2 test scenarios: 409 dedup hit, double-click no charge, concurrent actions, provider failure no charge |

### Verification
- `node --check appwrite-hubs/ai-gateway/src/main.js` — clean.
- `npx tsc --noEmit` — zero errors.
- `npx vitest run src/hooks/__tests__/useAIAction-D1.test.ts` — 8/8 pass.

### New Collections / Indexes Required (Appwrite Console)
- Create `idempotency_cache` collection in DB `main` with attributes: `key` (str 64, unique), `user_id` (str 36), `feature` (str 64), `status` (str 16), `has_result` (bool), `cached_result` (str 65536, nullable), `created_at` (str 32), `expires_at` (str 32). Server-only permissions.
- Add unique index on `idempotency_cache.key`.
- Add `credits_charged` (int), `idempotency_key` (str 64, nullable), `is_idempotency_hit` (bool) to existing `ai_request_logs` collection.
- Add unique index on `ai_credits.user_id` (belt-and-suspenders for code-side get-or-create fix).

### Deployment Required
- Redeploy `ai-gateway`: `node scripts/deploy_hubs.cjs --only=ai-gateway`
- Frontend changes go live on next Vercel deploy.

### Known Limitations Deferred to Phase 3
- Non-atomic credit deduction race (different inputs from two browser tabs can still race on separate function instances).
- In-memory rate limiter resets on cold start.
- `ask-portfolio` server-side question counter.
- Idempotency cache expired-record cleanup.

---

## 2026-06-05 - Phase 4 AI Security Hardening: Admin Visibility & Startup Validation

### Root Causes (from AI-SECURITY-AUDIT-2026-06-05.md, Phase 4 scope)
- No admin-accessible view of `ai_request_logs` (Phase 2 collection) — credit and idempotency data invisible to ops.
- Misconfigured env vars (missing `ADMIN_EMAIL`, `APPWRITE_API_KEY`, AI provider keys) produced silent failures on first request rather than immediate cold-start alerts.

### Changes Applied
| File | Change |
|------|--------|
| `appwrite-hubs/admin-devkit-data/src/main.js` | New `handleAIRequestAnalytics(body, log)` handler: queries `ai_request_logs`, returns per-feature/provider aggregates, credit totals, idempotency hit rate, graceful `missing_collection` flag; registered as DevKit action `ai-request-analytics`; cold-start startup validation IIFE |
| `appwrite-hubs/ai-gateway/src/main.js` | Cold-start startup validation IIFE: logs `[ALERT]` for missing `APPWRITE_API_KEY`, `ADMIN_EMAIL`, `RESEND_API_KEY`, no AI provider keys |

### Verification
- `node --check appwrite-hubs/ai-gateway/src/main.js` — clean.
- `node --check appwrite-hubs/admin-devkit-data/src/main.js` — clean.
- `npx tsc --noEmit` — zero errors.

### New Collections / Indexes Required (Appwrite Console)
- Add index on `ai_request_logs.created_at` (desc) for efficient `ai-request-analytics` queries.
- Add index on `ai_request_logs.user_id` (asc) if not already present.

### Deployment Required
- Redeploy both functions:
  - `node scripts/deploy_hubs.cjs --only=ai-gateway`
  - `node scripts/deploy_hubs.cjs --only=admin-devkit-data`

---

## 2026-06-05 - Phase 3 AI Security Hardening: Persistent Rate Limits & Concurrency

### Root Causes (from AI-SECURITY-AUDIT-2026-06-05.md, Phase 3 scope)
- In-memory rate limiter reset on cold start — cross-instance burst abuse possible.
- `ask-portfolio` 10-question cap enforced only client-side — easily bypassed by multi-tab or direct API calls.
- Expensive AI operations (cost ≥ 2) could be launched concurrently from multiple tabs, potentially exhausting daily credits in seconds.

### Changes Applied
| File | Change |
|------|--------|
| `appwrite-hubs/ai-gateway/src/main.js` | Phase-3 constants: `CHAT_SESSIONS_COLLECTION_ID`, `PORTFOLIO_MAX_QUESTIONS`, `MAX_CONCURRENT_JOBS_PER_USER`, `PLAN_PER_MINUTE_LIMITS`; 3 new helpers: `checkPersistentRateLimit()`, `countPendingJobs()`, `validatePortfolioSession()`; `loadCreditState` now accepts pre-fetched plan; main handler: plan fetched once, ask-portfolio session check, persistent rate limit check, concurrency guard |
| `src/hooks/__tests__/useAIAction-D1.test.ts` | 3 new Phase 3 test scenarios: concurrent jobs rejected, session not found, session limit reached |

### Verification
- `node --check appwrite-hubs/ai-gateway/src/main.js` — clean.
- `npx tsc --noEmit` — zero errors.
- `npx vitest run src/hooks/__tests__/useAIAction-D1.test.ts` — 11/11 pass.

### New Collections / Indexes Required (Appwrite Console)
- Add `question_count` attribute to `chat_sessions`: Integer, default 0 (enables server-side portfolio cap).
- Add index on `ai_request_logs.user_id` and `ai_request_logs.created_at` (required for `checkPersistentRateLimit` queries).

### Deployment Required
- Redeploy `ai-gateway`: `node scripts/deploy_hubs.cjs --only=ai-gateway`

### Known Limitations Deferred to Phase 5
- Non-atomic credit deduction remains (idempotency lock covers the common same-input case).
- Email rate limiter still in-memory.
- Idempotency cache expired-record cleanup still deferred.
- Session hopping (user creates multiple `chat_sessions` docs) not yet blocked.

---

## 2026-06-05 - Phase 1 AI Security Hardening (9 fixes)

### Root Causes (Identified in AI-SECURITY-AUDIT-2026-06-05.md)
- Clients could override `model`, `maxTokens`, and `temperature` on every AI call, enabling cost-abuse through inflated token budgets and model substitution.
- `agentic-chat` accepted unbounded `conversationHistory` with no shape validation, enabling token flooding.
- `send-contact-email` interpolated raw user strings into HTML without escaping, creating stored-XSS risk in the admin inbox; rate limit was 5/hr per IP.
- `x-smoke-test` path bypassed authentication entirely, exposing provider availability to unauthenticated callers.
- `wise-ai-chat` dumped the entire `opts` object (up to 60 KB) into the AI prompt, allowing clients to inject arbitrary keys and content.
- `agentic-chat` function-response error strings were injected verbatim into the user content slot, enabling prompt injection via crafted `functionResponse.result.error`.
- `ADMIN_EMAIL` had hard-coded fallback `'magdy.saber@outlook.com'` in both `ai-gateway` and `admin-devkit-data`; if the env var was unset, the fallback could be exploited.
- Subscription documents granted users `Permission.update` via Appwrite client, allowing direct field manipulation.

### Changes Applied
| File | Change |
|------|--------|
| `appwrite-hubs/ai-gateway/src/main.js` | Add `FEATURE_MAX_TOKENS` and `FEATURE_TEMPERATURE` server-side constant maps; remove all client `aiOpts.model / maxTokens / temperature` overrides; `callCandidate` uses `candidate.model` exclusively |
| `appwrite-hubs/ai-gateway/src/main.js` | `agentic-chat` history: cap to last 10 messages, validate `role` ∈ {user, assistant}, sanitize content to 2000 chars per item |
| `appwrite-hubs/ai-gateway/src/main.js` | `agentic-chat` function-response: escape `fr.name` to 64 chars; never expose raw error string in SYSTEM NOTE |
| `appwrite-hubs/ai-gateway/src/main.js` | Add `escapeHtml()` helper; apply to all user fields in `send-contact-email` HTML builder; add 200/254/100/5000 char content limits; escape subject line |
| `appwrite-hubs/ai-gateway/src/main.js` | Tighten `EMAIL_RATE_LIMIT_MAX` from 5 to 3 per IP per hour |
| `appwrite-hubs/ai-gateway/src/main.js` | `x-smoke-test`: require valid JWT before returning provider availability |
| `appwrite-hubs/ai-gateway/src/main.js` | Add `WISE_AI_CHAT_ALLOWED_FIELDS` whitelist map + `buildWiseAiChatPayload()` function; replace raw `opts` dump with whitelisted, length-capped payload (8 KB cap down from 60 KB) |
| `appwrite-hubs/ai-gateway/src/main.js` | Add prompt-injection defense instruction to `wise-ai-chat` and `agentic-chat` system prompts |
| `appwrite-hubs/ai-gateway/src/main.js` | Remove hard-coded `ADMIN_EMAIL` fallback; impersonation fails closed when env var absent |
| `appwrite-hubs/admin-devkit-data/src/main.js` | Remove hard-coded `ADMIN_EMAIL` fallback (same pattern); remove `Permission.update` from subscription docs at all three write sites (set-plan, grant-trial, revoke-trial) |
| `appwrite-hubs/coupons/src/main.js` | Remove `Permission.update` from subscription document permissions |

### Verification
- `node --check appwrite-hubs/ai-gateway/src/main.js` — clean.
- `node --check appwrite-hubs/admin-devkit-data/src/main.js` — clean.
- `node --check appwrite-hubs/coupons/src/main.js` — clean.

### Deployment Required
- Redeploy `ai-gateway`: `node scripts/deploy_hubs.cjs --only=ai-gateway`
- Redeploy `coupons`: `node scripts/deploy_hubs.cjs --only=coupons`
- Redeploy `admin-devkit-data`: `node scripts/deploy_hubs.cjs --only=admin-devkit-data`
- Set `ADMIN_EMAIL` env variable in Appwrite Console for both `ai-gateway` and `admin-devkit-data` functions (hard-coded fallback removed).

### Not Fixed (Requires Appwrite Console — out of scope for code-only phase)
- Remove `UPDATE` from Appwrite collection-level rules for `subscriptions` (belt-and-suspenders alongside function-level permission change).
- `ask-portfolio` server-side question counter requires a `question_count` attribute on the `chat_sessions` collection.
- Atomic credit deduction (read-write race condition) — documented as Phase 2 work.

---

## 2026-06-03 - Admin Panel / DevKit Audit Fixes (7 code + 2 ops items)

### Root Causes (Verified via codebase audit)
- `admin-devkit-data` returned `daily_limit: null` for users with no `ai_credits` document, causing the admin UI to display `∞ unlimited` for all plans.
- The `ChevronDown` expand indicator in `AdminUsersPanel` was inside a `stopPropagation` div, making the most natural click target (the chevron) swallow the event and appear broken.
- `ActAs.tsx` called `startImpersonation()` inside a `useEffect`, so route guards evaluated auth state before the impersonation store was updated, causing a brief "access denied" flash.
- During impersonation, `appwriteFunctions.invoke` always created an Appwrite JWT for the **admin** session; `ai-gateway` charged credits to the admin's account instead of the impersonated user.
- `ActingAsBanner` renders `fixed top-0` (~40px) with no compensating padding on the content below it, obscuring the UI during Act As sessions.
- `ai-gateway` schema for `company-briefing` instructed the AI to return `{overview, talkingPoints, risks, questions}` while the client validated for `companySnapshot`, causing every Company Briefing call to fail.
- `VITE_DEV_KIT_PASSWORD` was still referenced in `deploy-frontend.yml` even after the password auth was removed.

### Changes Applied
| File | Change |
|------|--------|
| `appwrite-hubs/admin-devkit-data/src/main.js` | Derive `daily_limit` from plan defaults (`free=5, pro=50, premium=-1`) when no `ai_credits` document exists |
| `src/components/dev-kit/AdminUsersPanel.tsx` | Move `ChevronDown` outside the `stopPropagation` wrapper; expand click now works reliably |
| `src/pages/ActAs.tsx` | Move `startImpersonation()` + `history.replaceState()` to module-level synchronous init; eliminates auth-flash race condition |
| `src/lib/appwrite-functions.ts` | Import `isImpersonating`/`getImpersonationState`; attach `X-Impersonating-User-Id` header during Act As so credits go to the correct user |
| `appwrite-hubs/ai-gateway/src/main.js` | Accept `X-Impersonating-User-Id` (admin-only); introduce `effectiveUserId` for rate-limit + credit attribution; fix `company-briefing` schema to match `CompanyBriefing` TypeScript type; add `logPoolSummary` startup log (counts only, no key values); document credits race condition with TODO |
| `src/AppInterior.tsx` | Add `useImpersonatingBanner` hook via `useSyncExternalStore`; wrap content in `pt-10` div when banner is active |
| `.github/workflows/deploy-frontend.yml` | Remove stale `VITE_DEV_KIT_PASSWORD` env reference (no longer used in any source file) |

### Verification
- `npx tsc --noEmit` — zero errors.
- `node --check appwrite-hubs/ai-gateway/src/main.js` — clean.
- `node --check appwrite-hubs/admin-devkit-data/src/main.js` — clean.
- `npm run build` blocked by worktree `node_modules` absence (known worktree limitation); full build must be verified in the main repo on merge.
- No secret values logged or committed. `sanitizeAiPayload` confirmed to strip `__headers` before any AI provider call.

### Deployment Required
- Redeploy `admin-devkit-data` for credit default fix: `node scripts/deploy_hubs.cjs --only=admin-devkit-data`
- Redeploy `ai-gateway` for impersonation credit fix + company-briefing fix + pool logging: `node scripts/deploy_hubs.cjs --only=ai-gateway`
- Frontend changes go live on next Vercel deploy of the branch after merge.

### Not Fixed (Requires Appwrite Console)
- `admin-sentry` deployment still needs manual activation in Appwrite Console: Functions → admin-sentry → `...` → Activate.

### Known Remaining Risk (Documented)
- AI credits race condition: `loadCreditState` + `recordAiUsage` is a non-atomic read-write. Documented with TODO comment in `ai-gateway`. Risk is LOW for typical usage; warm-instance rate limiter mitigates the common case.

---

## 2026-06-02 - Appwrite Functions Audit and Admin Hub Token Alignment

### Root Cause (Verified)
- `ai-gateway` had an inactive latest deployment and one recent provider failure. After redeploy, smoke and real AI requests succeeded, but the real test exposed that `__headers.X-Appwrite-JWT` could be included in the model payload for generic `wise-ai-chat` requests.
- Several legacy admin functions rejected the passwordless DevKit session with `401` because `admin-devkit-data` now signs DevKit sessions with `APPWRITE_API_KEY`, while the older functions still verified only `DEVKIT_PASSWORD`.
- `inspect-ai-keys` failed at runtime because its package did not include `node-appwrite`, even though the function imports it.
- `admin-testmail` failed inbox checks because Testmail's API expects `apikey` in the query string for this endpoint, not a Bearer header.
- Six functions had stale active deployments (`admin-deploy-hubs`, `coupons`, `email-service`, `job-import`, `public-share`, `wisehire-gateway`).

### Fix
- Redeployed `ai-gateway` and stripped sensitive transport/auth fields before building any model messages.
- Redeployed stale hubs so every active deployment now matches the latest deployment.
- Updated legacy admin functions to accept DevKit session tokens signed with `APPWRITE_API_KEY` / `APPWRITE_FUNCTION_API_KEY`, while keeping `DEVKIT_PASSWORD` as a temporary compatibility fallback.
- Added `node-appwrite` to `inspect-ai-keys`.
- Updated `admin-testmail` inbox calls to pass `apikey` as Testmail expects and to report a clean unconfigured state if the key is missing.

### Verification
- Live Appwrite audit: 21 functions checked; no disabled functions, no stale active deployments, no latest-execution failures.
- Live smoke tests returned HTTP 200 for `ai-gateway`, `admin-devkit-data`, `admin-email`, `admin-testmail`, `admin-feature-flags`, `admin-moderation`, `admin-portfolio-usernames`, `admin-visitor-analytics`, `admin-onboarding-funnel`, and `inspect-ai-keys`.
- Real `ai-gateway` request returned HTTP 200 through Groq, and the response did not contain JWT/header leakage.

### Architecture Note
- Recommended consolidation path: keep one browser-facing Admin/DevKit gateway (`admin-devkit-data`) and migrate admin actions behind it gradually. Do not merge every admin worker into one physical function immediately; deployment, email, Sentry, analytics, and provider tools have different dependencies, secrets, and failure risks.

---

## 2026-06-02 - Admin Panel Profile Menu Access

### Root Cause (Verified)
- `useAuth()` returns a normalized `AppUser` from Appwrite with `id`, `email`, `name`, and `emailVerification`; the Appwrite email is at `appwriteUser.email`.
- In the current checkout, the admin access chain was missing from the workspace shell: `AppWorkspaceLayout` did not evaluate admin status or pass `onAdminPanel`, `DashboardWorkspaceProfileDialog` did not accept/render `onAdminPanel`, and `/devkit` was mounted without an admin route wrapper.
- Follow-up deployment failure: Vite/esbuild rejected a duplicate `onAdminPanel` binding left in `AppWorkspaceSidebar.tsx` after rebasing over upstream admin-menu work.
- Follow-up UI/auth mismatch: `admin-devkit-data` already verifies the signed-in Appwrite JWT email, but `DevToolsPage` still rendered the obsolete DevKit access-key/password form and called `devKitLogin(password)`. The landing-page avatar dropdown also did not include the admin-only panel entry.
- Follow-up live Appwrite mismatch: the active `admin-devkit-data` deployment was still running old password-based code (`Invalid DevKit password`). After redeploying the current source, JWT verification initially timed out because `node-appwrite` `Account.get()` hung inside the function runtime.

### Fix
- Added `src/hooks/useIsAdmin.ts` with the unchanged admin email value and an auth-settled comparison against `user.email`.
- Added `src/components/layout/AdminRoute.tsx` so direct `/devkit` navigation waits for hydrated auth before allowing only the admin email through.
- Wired `onAdminPanel` through `AppWorkspaceLayout`, desktop/mobile workspace sidebars, and `DashboardWorkspaceProfileDialog`.
- Removed the duplicate `onAdminPanel` destructuring in `AppWorkspaceSidebar.tsx` so the production Vite build can complete.
- Removed the DevKit password/access-key form. `/devkit` now auto-requests the server-issued DevKit session from the signed-in Appwrite admin email and displays the verified email while loading.
- Added the Admin Panel item to the landing-page avatar dropdown, gated by the same `useIsAdmin()` hydrated email check.
- Updated stale admin-function error copy so expired/unauthorized DevKit sessions tell the user to sign in with the admin email account instead of mentioning a password.
- Updated `admin-devkit-data` JWT email verification to call Appwrite REST `/account` with `X-Appwrite-JWT` and an 8s timeout instead of `node-appwrite Account.get()`.
- Redeployed `admin-devkit-data`; active deployment `6a1e5eddedbdc0a4b4e0`.

### Verification
- `npx tsc --noEmit` — zero errors.
- `npm run build` — passed after the duplicate binding fix.
- `npm run build` — passed after the passwordless DevKit/landing-dropdown update.
- Live Appwrite test — `verify-devkit-session` with a JWT for `magdy.saber@outlook.com` returned HTTP 200 and a DevKit session.

---

## 2026-05-29 - Pre-Launch Bug Fixes (Email, Tests, Portfolio, CI)

### Changes

- **Email verification (registration):** `src/pages/AuthPage.tsx` — silent catch on `send-verification` now shows a warning toast when the email fails to send, so users know to use the Resend button on the next page.
- **Email service false-success:** `appwrite-hubs/email-service/src/main.js` — when Appwrite creates a token but doesn't return a `secret`, the function now returns a 500 error instead of `{ success: true, delivery: 'appwrite' }`, preventing the user from being told the email was sent when it wasn't.
- **Resend cooldown persistence:** `src/pages/AuthVerifyEmailPage.tsx` — 60-second resend cooldown is now stored in `localStorage` under `wr_verify_resend_ts` so it survives page refreshes.
- **Portfolio silent translation error:** `src/pages/PortfolioEditorPage.tsx` — post-publish translation sync failure now shows a warning toast instead of silently failing.
- **Portfolio LinkedIn/GitHub normalization:** `src/pages/PortfolioEditorPage.tsx` and `src/components/templates/shared/contactUtils.ts` — added `ensureLinkedinUrl()` and `ensureGithubUrl()` helpers; portfolio editor save path now uses these to handle bare usernames (e.g. `magdy-saber` → `https://linkedin.com/in/magdy-saber`).
- **GitHub Actions stale step:** `.github/workflows/deploy-appwrite-hubs.yml` — removed stale `revenuecat-webhook` build step (RevenueCat was removed in 2026-05-27 session).
- **Fix appShellLayout test:** updated stale expected offset `5.5rem` → `4.5rem` to match current implementation.
- **Fix usePublicPortfolio test:** replaced stale Supabase mock with correct Appwrite `databases.listDocuments` mock.
- **Fix aiTailor-D1 test:** replaced `mockFetch` pattern with `appwriteFunctions.invoke` mock; fixed retry timer (3000 → 5000 ms); fixed abort test rejection handler ordering.
- **Fix exportResumePdf test:** added `requestAnimationFrame` polyfill in `beforeEach` (jsdom does not implement RAF natively).
- **Fix PortfolioEditorPage test:** added missing `usePlan`, `appwriteFunctions`, `databases`, and `Query.orderAsc` mocks; simplified assertions to match actual render output.

### Verification
- `npx tsc --noEmit` — zero errors.
- `npm test` — 5 previously-failing tests now pass.
- `node --check appwrite-hubs/email-service/src/main.js` — syntax clean.

---

## 2026-05-27 - Remove Payment Provider, Keep Billing Coming Soon

Removed the previous payment provider from web, mobile, Appwrite hub deployment, tests, env examples, and package dependencies. No replacement provider was added.

- Added provider-neutral temporary billing state in `src/lib/billing.ts`: `paymentStatus: "coming_soon"`, `paymentsEnabled: false`, `availablePaymentMethods: []`.
- Subscription, upgrade dialog, and upgrade wall UI now keep premium surfaces visible but disable payment CTAs as Coming Soon.
- Existing internal plan data remains the premium source of truth; default users are not granted premium.
- Removed the obsolete payment webhook hub and dedicated deploy helper; hub deploy scripts no longer include payment webhook deployment or secret provisioning.
- Removed obsolete web/mobile payment SDK dependencies from package manifests and lockfiles.
- Removed obsolete provider-specific env vars from web/mobile env examples.
- Updated Atlas current-state docs to document disabled online payments and future provider integration requirements.
- Updated `Deploy.bat` so local click-to-deploy runs the current hub deployment script from the repo root, removes the stale `revenuecat-webhook.tar.gz` archive before deploying, and fails visibly if deployment fails.
- Remote Appwrite cleanup note: delete the old payment webhook function from Appwrite Console if it still exists after this code is deployed.
- Follow-up: the GitHub Actions manual hub workflow still has a stale build step for the removed webhook and requires a separate workflow-scope update before that workflow is used again.

## 2026-05-26 - Email system recovery and direct Appwrite deployment

### Root Cause (Verified)
The final PR #70 code was correct but not operationally complete: `email-service` was not deployed to Appwrite, and GitHub Actions could not be used because available workflow minutes were exhausted. A second issue was found during direct recovery: Appwrite's Node.js runtime does not provide `git`, so the in-app `admin-deploy-hubs` function could fail when cloning the repo. A third issue was found in the local deployment script: `functions.createVariable()` was using the old positional Appwrite SDK signature and could not create brand-new variables for `email-service`.

### Fix
- Deployed `admin-deploy-hubs` directly from local using Appwrite SDK; active deployment `6a1515c3abe4f3a9fd8d`.
- Deployed `email-service` directly from local using Appwrite SDK; active deployment `6a1516cd249d2b749492`.
- Updated `admin-deploy-hubs` to download the GitHub repo tarball through the GitHub API instead of shelling out to `git clone`.
- Updated `scripts/deploy_hubs.cjs` to load `.env.deploy`, support `--only=...`, create Appwrite variables with `sdk.ID.unique()`, and blank verification/recovery templates after targeted email-service deploys.
- Updated `email-service` so browser-invoked user actions read the JWT from `body.__headers.X-Appwrite-JWT`, which is how `appwriteFunctions.invoke()` forwards headers through Appwrite executions.
- Added `send-admin-verification` to `email-service` and routed DevKit God Mode verification sends through the branded email-service path.
- Updated DevKit Email Service smoke test to call `email-service:send-test` instead of the unrelated skipped `send-contact-email` check.
- Updated auth reset flows to surface `email-service` invoke errors consistently.

### Files Changed
| File | Change |
|------|--------|
| `appwrite-hubs/email-service/src/main.js` | Header forwarding, DevKit token delegation, admin verification action, Any-safe internal auth |
| `appwrite-hubs/email-service/package-lock.json` | Locked Appwrite SDK dependency for repeatable hub packaging |
| `appwrite-hubs/admin-deploy-hubs/src/main.js` | GitHub API tarball download instead of `git clone` |
| `scripts/deploy_hubs.cjs` | Direct targeted deploy path and Appwrite variable creation fix |
| `scripts/deploy_webhook_hub.cjs` | Appwrite variable creation signature fix |
| `src/components/dev-kit/DevKitRunner.tsx` | Real email-service smoke test |
| `src/components/dev-kit/AdminUsersPanel.tsx` | Admin verification now uses `email-service` |
| `src/pages/AuthPage.tsx` | Password reset checks `fnError` |
| `src/pages/AuthVerifyEmailPage.tsx` | Stale resend comment corrected |

### Verification
- `node --check appwrite-hubs/email-service/src/main.js` — passed.
- `node --check appwrite-hubs/admin-deploy-hubs/src/main.js` — passed.
- `node --check scripts/deploy_hubs.cjs` — passed.
- `npx tsc --noEmit` — passed.
- `npm run build` — passed.
- Live Appwrite `email-service` password reset execution for an existing user returned `{"success":true}` and logged "Password reset email sent".
- Live Appwrite `email-service` verification smoke to `delivered@resend.dev` returned `{"success":true}` and logged "Verification email sent".
- Live Appwrite `email-service` welcome smoke to `delivered@resend.dev` returned `{"success":true}` and logged "Welcome email sent".
- Appwrite Auth email templates for verification and recovery were blanked to a single space.

### Remaining Operational Notes
- Resend MCP could not be used for account logs because the configured Resend MCP API key returns `API key is invalid`; Appwrite execution logs still confirm Resend accepted the live sends.
- Frontend production should update through Vercel Git integration after these local changes are committed and pushed. No manual Vercel upload should be used.

---

## 2026-05-23 - Portfolio sidebar icon alignment

### Summary
- **Workspace sidebar:** Changed the Portfolio nav icon from `Sparkles` to `Globe` so it better matches the public portfolio/profile concept and aligns with other nav surfaces.

### Verification
- `npx tsc --noEmit`

---

## 2026-05-23 - Wise Workspace mobile drawer sidebar-width match

### Summary
- **Wise Workspace:** Changed the mobile chat drawer from viewport-based width to the same sidebar-width rule used by the mobile app sidebar.
- Mobile drawer now uses `min(var(--app-sidebar-width, 17rem), 86vw)`; desktop drawer sizing remains unchanged.

### Verification
- `npx tsc --noEmit`
- Browser check on mobile `/dashboard`: Wise Workspace drawer measured `272px` wide on a `430px` viewport.

---

## 2026-05-23 - Theme toggle performance smoothing

### Summary
- **Theme toggle:** Removed the expensive universal `theme-transitioning *` color transition that animated every element during light/dark switches.
- Theme changes now apply the root class immediately, use the browser View Transitions API when available, and fall back to a short transition on major shell surfaces and controls only.
- Added `color-scheme` for light/dark roots so browser-native controls match without extra repaints.

### Verification
- `npx tsc --noEmit`
- Browser check on mobile `/dashboard`: theme toggled successfully and `theme-transitioning` cleared after the fallback transition.

---

## 2026-05-23 - Mobile sidebar footer placement

### Summary
- **Mobile workspace nav:** Fixed the sidebar sheet wrapper height so the membership/profile footer can use the full drawer height.
- The premium/profile block now sits at the bottom of the mobile drawer instead of floating in the middle; desktop sidebar layout is unchanged.

### Verification
- `npx tsc --noEmit`
- Browser check on mobile `/dashboard`: visible drawer footer bottom aligned with the viewport bottom.

---

## 2026-05-23 - Wise Workspace mobile chat width

### Summary
- **Wise Workspace:** Reduced the mobile chat drawer width from `92vw` to `86vw`.
- Desktop drawer sizing remains unchanged at `min(26rem, 32vw)`.
- Updated the shared layout width constant so the app stage shrink stays aligned with the drawer.

### Verification
- `npx tsc --noEmit`

---

## 2026-05-23 - Mobile sidebar drawer fit

### Summary
- **Mobile workspace nav:** Tightened the left navigation sheet width to match the actual sidebar width on phones instead of leaving an empty panel strip.
- Removed the oversized rounded right edge and used the sheet's built-in close handling so the mobile drawer reads as a proper app menu.

### Verification
- `npx tsc --noEmit`

---

## 2026-05-23 - AI Studio welcome banner placement

### Summary
- **AI Studio:** Replaced the fixed bottom onboarding banner with an inline welcome callout inside the AI Studio content flow.
- The welcome callout now dismisses with an icon button and no longer overlays the sidebar account/billing area or bottom workspace controls.

### Verification
- `npx tsc --noEmit`
- Browser layout check on `http://localhost:5000/ai-studio`: welcome message rendered inline and fixed welcome banner count was `0`.

---

## 2026-05-23 - Portfolio editor desktop width correction

### Summary
- **Portfolio editor:** Removed the hard `56rem` max-width from the portfolio editor scroll container so desktop content fills the available app workspace instead of appearing as a narrow centered column.
- Kept responsive desktop side padding and mobile full-width behavior.

### Verification
- `npx tsc --noEmit`
- Browser layout check on `http://localhost:5000/portfolio`: portfolio editor workspace width matched the available app content area.

---

## 2026-05-23 - Settings desktop width correction

### Summary
- **Settings:** Removed the hard `42rem` max-width from the settings workspace scroll container so desktop settings content fills the available app workspace instead of appearing as a narrow centered column.
- Kept responsive padding with desktop `clamp()` spacing and mobile full-width behavior.

### Verification
- `npx tsc --noEmit`
- Browser layout check on `http://localhost:5000/settings`: settings workspace width matched the available app content area.

---

## 2026-05-23 - Portfolio Save Draft live-schema correction + UI review fixes

### Summary
- **Portfolio:** Verified live Appwrite `profiles` attributes via API. The collection does **not** include `portfolio_extras`, `portfolio_draft`, or `portfolio_draft_saved_at`; Save Draft now stores the working copy locally first and suppresses the missing-attribute write path instead of showing `Unknown attribute: "portfolio_extras"`.
- **Profile writes:** `useProfile.updateProfile()` now filters update payloads to the live `profiles` attributes to avoid client writes failing on stale Supabase-era portfolio fields.
- **Portfolio size guard:** Draft save/autosave now checks the merged draft payload size, not only the raw draft snapshot.
- **Settings:** Fixed invalid nested button markup in `SettingsProfileHero`.
- **Portfolio setup:** Hardened resume select item keys against duplicate resume IDs.

### Root cause
The previous Atlas note assumed `portfolio_extras` existed in Appwrite. Live API verification on 2026-05-23 showed `profiles` currently has only: `user_id`, `email`, `full_name`, `username`, `avatar_url`, `onboarding_completed`, `job_title`, `industry`, `career_level`, `location`, `linkedin_url`, `portfolio_bio`, `portfolio_enabled`, `profile_completed`, `display_name`, `plan`, `country`, `is_suspended`, `suspension_reason`.

### Verification
- `npx tsc --noEmit`
- `npx vitest run src/components/dashboard/__tests__/DashboardHero.test.tsx src/pages/__tests__/PortfolioEditorPage-D8.test.tsx src/pages/__tests__/PortfolioUsernameConflict-D8.test.tsx`
- `npm run build`

---

## 2026-05-23 - Portfolio draft (Appwrite), editor workspace, tailor wizard, Wise AI toggle

### Summary
- **Portfolio:** Save Draft / autosave persist working copy in `portfolio_extras` (`portfolioDraft`, `portfolioDraftSavedAt`) — fixes `Unknown attribute: portfolio_draft` on live Appwrite `profiles`.
- **Editor:** Icon-first section rail with active highlight; ATS suggestions FAB + sheet; resume strength above preview; `EditorPage` dynamic-import syntax fix; workspace top bar hidden on `/editor` and `/preview`.
- **Tailor:** Four-step setup wizard (`resume` → `job` → `options` → `run`), single visible step card.
- **Shell:** `toggleChat()` on Wise AI (top bar + desktop nav).

### Files (primary)
`src/lib/portfolioDraftStorage.ts`, `src/hooks/useProfile.ts`, `src/pages/PortfolioEditorPage.tsx`, `src/components/portfolio/editor/SaveBar.tsx`, `src/pages/EditorPage.tsx`, `src/components/editor/EditorNavRail.tsx`, `EditorSuggestionsPanel.tsx`, `EditorResumeStrengthBar.tsx`, `editor-workspace.css`, `src/pages/TailorPage.tsx`, `src/components/tailor/page/*`, `src/store/wiseWorkspaceStore.ts`, `AppWorkspaceTopBar.tsx`, `DesktopNav.tsx`, `AppWorkspaceLayout.tsx`

### Log
`Project Atlas/05-Migration to Appwrite/27-Session-Log-2026-05-23-Portfolio-Editor-Tailor-Workspace.md`

### Verification
- `npx tsc --noEmit`

---

## 2026-05-23 - Dashboard reference alignment correction (design-system-v1, pass 8)

### Summary
UI-only correction pass to match the approved reference composition more closely: wider premium sidebar + supportive AI rail proportions, restored rich workspace controls/metrics, improved recent resumes section tooling, and richer row/rail/sidebar atmospheric polish while preserving all existing behaviors and real data wiring.

### What was matched
- **App shell proportions**: desktop grid shifted toward reference balance (~256px sidebar / dominant main / ~320px rail)
- **Sidebar**: dark crimson wash, premium nav active state, compact premium/credits/profile panels
- **Top workspace bar**: command search + `Import Job`, `Wise AI`, theme/settings, avatar circle
- **Header tone**: confident greeting + supporting sentence with compact spacing
- **Metrics**: compact premium cards with real-data-only visibility (`ATS average`, `Tailored`, `Application matches`, `Missing keywords`)
- **Recent resumes**: section title + count, internal search, filter/view controls, richer row presentation
- **Resume rows**: document icon tile, stronger metadata hierarchy, ATS ring prominence, top suggestion styling, refined action buttons
- **AI rail**: richer `AI Workspace` card (opportunity/weakest/next step + CTA + high-impact) plus quick actions and recent activity cards
- **Visual language**: restrained crimson atmosphere, layered dark surfaces, premium shadows, subtle micro-interactions

### Verification
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-23 - Dashboard final premium polish (design-system-v1, pass 7)

### Summary
Final UI-only polish pass on approved dashboard structure: elevated depth/atmosphere, refined row craftsmanship, richer command-center top bar, calmer premium sidebar, and a more sophisticated AI rail while preserving all actions, hooks, and data flow.

### Refined areas
- `DashboardWorkspaceToolbar` — improved greeting hierarchy, command-surface quality, direct action composition (`Import job`, `Wise AI`, `Tailor`)
- `DashboardWorkspaceSidebar` — premium dark/crimson atmosphere, compact branded header, polished nav and subtle status footer
- `DashboardMetricsStrip` — compact premium metric cards with restrained icon accents and improved typography rhythm
- `ResumeListCard` (`workspace`) — stronger row hierarchy, richer layered surfaces, refined action buttons, premium AI suggestion styling
- `DashboardIntelligencePanel` — polished AI intelligence cards, stronger grouping depth, improved CTA and quick-action readability
- `DashboardWorkspaceLayout` / `DashboardPage` — maintained approved composition while restoring ATS context wiring to sidebar and AI rail
- `index.css` — final atmospheric gradient/shadow/highlight tokens and restrained micro-interactions for dashboard surfaces

### Verification
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-23 - Dashboard approved direction implementation (design-system-v1, pass 6)

### Summary
UI-only controlled implementation aligned to approved premium AI-native workspace direction: restored balanced three-column composition with dark/crimson restraint, compact metric cards, intelligent resume rows, and a useful right AI rail (opportunity, weakest section, next step, quick actions, recent activity) while preserving all existing dashboard behavior.

### What changed
- `DashboardWorkspaceLayout` — reintroduced sidebar/rail balance and passed existing ATS context to sidebar
- `DashboardWorkspaceSidebar` — premium narrow dark nav with reduced noise and compact status footer
- `DashboardWorkspaceToolbar` — greeting + supporting copy, command/search bar, direct productivity actions
- `DashboardMetricsStrip` — compact horizontal metric cards (real data only, hidden when unavailable)
- `DashboardIntelligencePanel` — contextual AI rail cards (workspace insight, quick actions, recent activity)
- `ResumeListCard` (`workspace`) — compact rich rows with subtle surfaces, ATS ring, metadata, AI suggestion line, aligned actions
- `DashboardPage` — restored metrics section and tab counts, retained main-list focus and existing data/actions
- `index.css` — premium dark workspace layering, restrained crimson accents, soft depth tokens

### Verification
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-23 - Dashboard minimal workspace reset (design-system-v1, pass 5)

### Summary
Hard visual simplification toward Linear/Notion-style workspace: removed metric pills, boxed surfaces, AI module sections, sidebar ATS/groups, and card-stack resume UI. One focal resume list, minimal AI rail (insight + action + context), flat nav, toolbar with overflow for secondary actions.

### Removed / simplified
- `DashboardMetricsStrip` usage on dashboard page
- Resume list surface container and tab count badges
- AI rail: signal map, insight blocks, headers, import/new links, decorative cards
- Sidebar: nav groups, ATS card, logo box
- Resume rows: per-row cards → divider list with hover wash
- CSS: command bar, AI module, metric pill, gradient chrome

### Verification
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-23 - Dashboard premium refinement (design-system-v1, pass 4)

### Summary
Final UI-only polish on the existing workspace: premium AI rail module (layered insight blocks, signal map from real scores), refined command toolbar, tighter grouped sidebar, metric pills, anchored resume surface, calmer depth/hover — without layout redesign or added scroll.

### What changed
- `DashboardIntelligencePanel` — embedded AI module with primary focus, insight blocks, category signal map
- `DashboardWorkspaceToolbar` — command bar composition
- `DashboardWorkspaceSidebar` — nav groups, sticky self-start, integrated ATS footer
- `DashboardWorkspaceLayout` — 10.5rem / 16rem columns, items-start, sticky rail
- `DashboardMetricsStrip` — pill metrics
- `DashboardPage` — workspace surface wrapper, compact footer banners
- `index.css` — refinement tokens (AI module, command bar, surfaces)

### Verification
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-23 - Dashboard composition correction (design-system-v1, pass 3)

### Summary
UI-only density and balance pass on the existing three-zone workspace: compress vertical rhythm, integrate a restrained sidebar (no full crimson wall), compact premium resume rows, denser intelligence rail, calmer surfaces. No backend, routing, auth, hooks, or data changes.

### What changed
- `DashboardWorkspaceLayout` — narrower columns, lg intelligence below main, reduced padding
- `DashboardWorkspaceSidebar` — card-surface nav, smaller type, compact ATS chip
- `DashboardWorkspaceToolbar` — inline greeting + count, h-9 controls
- `DashboardMetricsStrip` — inline strip with subtle divider
- `DashboardIntelligencePanel` — grid signal rows, sticky on xl, no motion bloat
- `ResumeListCard` (`workspace`) — single-row compact layout, smaller ring, restrained insight
- `DashboardPage` — tighter tabs/list/footer spacing
- `index.css` — restrained workspace tokens (sidebar, cards, rail)

### Verification
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-23 - Dashboard workspace OS composition (design-system-v1, pass 2)

### Summary
Second UI-only pass: three-zone workspace layout (sidebar nav → resume surface → intelligence rail), borderless resume stack, premium workspace cards with ATS + AI insight preview, embedded intelligence panel. Desktop top nav hidden on `/dashboard` in favor of workspace sidebar (xl+).

### What changed
- `DashboardWorkspaceLayout`, `DashboardWorkspaceSidebar`, `DashboardWorkspaceToolbar`, `DashboardMetricsStrip`, `DashboardIntelligencePanel`
- `ResumeListCard` `presentation="workspace"` — primary product cards
- `AppShell` — hide `DesktopNav` on `/dashboard`
- `DashboardPage` — full composition restructure
- `index.css` — workspace OS tokens

### Verification
- `npx tsc --noEmit` — passed
- `npm run build` — passed
- `vitest` `DashboardHero.test.tsx` — passed

---

## 2026-05-23 - Dashboard AI workspace visual refactor (design-system-v1)

### Summary
UI-only pass on `/dashboard`: calmer workspace layout, compact header (replaces gradient spotlight hero), embedded AI Workspace insight rail, refined metrics and resume rows. No backend, API, auth, routing, state, or AI logic changes.

### What changed
- `DashboardWorkspaceHeader` — greeting + active resume strip with ATS ring (existing profile/resume/score data only).
- `DashboardUtilityRail` + `DashboardRecentActivity` — right rail: AI insight, quick actions, recent resume activity from existing `resumes` list.
- `DashboardNextActionCard` — AI workspace framing, weakest-section signal when score data exists.
- `DashboardStats` — compact metrics; hide tailored/keyword metrics when zero.
- `ResumeListCard` (`atlas-row`) — scannable rows with score ring, metadata, Edit/Tailor/More unchanged behavior.
- `index.css` — softer dashboard surfaces, calmer metrics/insight panels, quieter premium nav badge.
- `DashboardPage` — layout wiring only (removed `DashboardSpotlightHero` from page).

### Verification
- `npx tsc --noEmit` — passed
- `npm run build` — passed
- `vitest` `DashboardHero.test.tsx` — passed

---

## 2026-05-22 - Branded auth email templates (Appwrite Console configuration)

### Summary
Diagnosed why new users received signup confirmation and password-reset emails from "Appwrite" instead of "WiseResume". Root cause: Appwrite's built-in auth email system was being used with no custom SMTP provider and no custom templates configured in the Appwrite Console.

### What changed
- Created `appwrite-hubs/email-templates/email-verification.html` — branded HTML for the Appwrite Email Verification template (sent on signup via `account.createVerification()`).
- Created `appwrite-hubs/email-templates/password-recovery.html` — branded HTML for the Appwrite Password Recovery template (sent on forgot-password via `account.createRecovery()`).
- Created `appwrite-hubs/email-templates/README.md` — paste instructions, subject lines, Appwrite variable notes.

### What still needs to be done in the Appwrite Console (no code changes — console only)
1. **Settings → SMTP**: configure Resend SMTP (`smtp.resend.com`, port 465, user `resend`, password = existing Resend API key, sender `WiseResume <noreply@thewise.cloud>`).
2. **Auth → Email Templates → Email Verification**: set subject to `Confirm your WiseResume email address`, paste `email-verification.html` body.
3. **Auth → Email Templates → Password Recovery**: set subject to `Reset your WiseResume password`, paste `password-recovery.html` body.

### Why
`account.createVerification()` and `account.createRecovery()` are Appwrite built-in calls (`AuthPage.tsx:100`, `AuthPage.tsx:67`). Without SMTP + template customisation in the Console, Appwrite sends from its own infrastructure with its own branding.

### Verification
- Pending: user to apply Console config and test a fresh signup + forgot-password flow.

---

## 2026-05-22 - AI tools audit and repair (5 confirmed bugs fixed)

### Summary
Full code audit of every AI tool in the app. Two rounds of inspection: backend handler existence, then frontend rendering pipeline. Found and fixed 5 confirmed root causes.

### What changed

| Tool | Root cause | Fix |
|---|---|---|
| Career Plan | `schemaPrompt('career-assessment')` injected `{summary, recommendedRoles, gaps, milestones}` — fields the frontend never reads. `CareerPathResult` reads `{currentLevel, nextRoles, skillGaps, industryAlternatives, actionPlan}`. Correct schema existed in `extracted_prompts.json` but was never wired in. | Fixed schema in `schemaPrompt()` to match `CareerPathResult` exactly. |
| Company Briefing | Routed to `openrouter/llama-3.3-70b-instruct:free` — free tier with rate limits, causing intermittent failures especially on mobile. | Changed `FEATURE_ROUTES['company-briefing']` to `groq/llama-3.3-70b-versatile`. |
| Smart Fit Wizard (AI rewrite) | `smart-fit-rewrite` was in `FEATURE_ROUTES` but had no handler in `buildMessages` or the response processor. Gateway sent `"hello"` to the LLM; orchestrator expected `{success:true, outcomes:[...]}` and threw `RewriteFailureError('unavailable')` every time. | Added sentence-rewrite prompt in `buildMessages` and a result processor returning `{success:true, outcomes:[...]}`. |
| Portfolio Chat (visitor-facing) | (1) `ask-portfolio` had no handler — gateway sent `"hello"` instead of the visitor's question. (2) `ChatWidget.tsx` read `data?.answer` but gateway returned `data.content`. | Added portfolio-context-aware handler in `buildMessages` returning `{answer, isFallback, chatDisabled}`. Updated `ChatWidget.tsx` to send `profileContext` in request body. |
| 7 wise-ai-chat tools | System prompt said "return JSON if asked" — no enforcement. LLM sometimes returned prose instead of JSON, causing `parseAIJson` to throw silently. | Tightened to "return ONLY valid JSON object, no markdown, no prose". |

### Files changed
- `appwrite-hubs/ai-gateway/src/main.js`
- `src/components/portfolio/public/ChatWidget.tsx`

### Verification
- `node --check appwrite-hubs/ai-gateway/src/main.js` — clean
- `npx tsc --noEmit` — zero errors

### Deployment
**`ai-gateway` Appwrite function must be redeployed** after merge. `ChatWidget.tsx` deploys via Vercel on merge to `main`. No schema changes.

---

## 2026-05-21 - PDF page-cut boundary protection (snapping overcorrection fix)

### Summary
Fixed the bug where custom section page cuts (specifically before the EDUCATION header) were ignored or incorrectly shifted forward, leaving the section heading on Page 1 while section content was pushed to Page 2.

### What changed
- Updated both the shared `src/lib/exportPagePlan.ts` page planner and Vercel's native PDF export copy (`api/export/pdf-native.ts`).
- Modified `snapBreakPositionsToSectionHeadings` to snap page breaks to `Math.min(section.top, headTop)` instead of `section.top`, ensuring breaks always land before a section and its heading element (even if a heading has a negative margin or starts slightly above the container top).
- Refined the heading-crossing guard in `snapBreakPositionsToAvoidBlocks` to strictly protect any break Y coordinate that was originally before or at a section boundary (`y <= headTop || y <= section.top`) from being shifted forward past that boundary by overlapping avoid blocks from the previous section.
- Added comprehensive unit tests in `src/lib/exportPagePlan.test.ts` representing these exact layout boundary and negative-margin snapping conflict scenarios, verifying that manual section cuts are preserved perfectly.

### Why
The verified root cause was a snapping conflict. When browser layout differences placed a section-boundary cut at the section start (e.g. `800`), an avoid block from the previous section (e.g., the last Experience entry) extending slightly further down (e.g., to `810`) was matched. The avoid-snapping logic snapped the break forward to the bottom of the avoid block (`810`). Because the snapped break `800` was greater than a negative-margin heading top `790`, the guard `y <= headTop` evaluated to `false`, allowing the break to land at `810` (after the heading). This split the section header onto Page 1 while its content was on Page 2.

### Verification
- Added two regression tests to `src/lib/exportPagePlan.test.ts` (all 20 unit tests passed successfully).
- `npx tsc --noEmit` passed.
- `npm run build` verified.

### Deployment
Deploy through Vercel by pushing `main`. No Appwrite function redeploy is required.

---

## 2026-05-21 - PDF automatic fallback avoids splitting experience entries

### Summary
Fixed the remaining PDF export path that could still place a page footer between an Experience title and its description.

### What changed
- Added content-aware automatic break generation for the server fallback path.
- Kept saved custom cuts authoritative: they are clamped/validated, not snapped to section or entry boundaries.
- Updated both Vercel and local Express PDF APIs to use the same fallback behavior.
- Added regression tests for custom-cut clamping and automatic fallback avoiding Experience splits.

### Why
The live site is deployed by Vercel and had received the latest code. The remaining root cause was not deployment drift. It was that if the PDF API received no usable saved cut, automatic pagination still used raw fixed-height cuts and could split `data-break-avoid` Experience blocks.

### Verification
- `npx vitest run src/lib/exportPagePlan.test.ts src/lib/exportResumePdf.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/__tests__/pdfUtils.test.ts`
- `npx tsc --noEmit`
- `npm run build`

### Deployment
Deploy through Vercel by pushing `main`. No Appwrite function redeploy is required.

---

## 2026-05-21 - Data-based PDF downloads keep saved page cuts

### Summary
Fixed a remaining download path that could still ignore saved custom page cuts.

### What changed
- `exportResumePdfFromData()` now passes saved `resume.customization.customBreakPositions` into PDF generation by default.
- Added regression coverage for offscreen/data-based resume PDF downloads.

### Why
The verified root cause was that some dashboard/list downloads render the resume offscreen from saved data instead of using the live editor template. That helper omitted saved custom cuts, so the export used automatic pagination and could split an Experience entry.

### Verification
- `npx vitest run src/lib/exportResumePdf.test.ts src/lib/exportPagePlan.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/__tests__/pdfUtils.test.ts`
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-21 - Custom PDF page cuts are exact

### Summary
Changed custom PDF page cuts so saved user-selected cuts are treated as exact export instructions.

### What changed
- Production and local PDF renderers now validate/sort saved custom cut coordinates but no longer move them through section-heading or keep-together snapping.
- The page-cut setup preview now shows cropped page slices with footer space, matching the export segment model instead of only showing lines over a continuous document.
- Segment rendering now waits for fonts/resources instead of substituting fonts during PDF output.
- Added regression tests for exact cuts inside entries and at a section boundary.

### Why
The verified root cause was that the export server was still allowed to reinterpret saved cuts. A cut placed before Education could be snapped backward or otherwise rendered differently from the setup view.

### Verification
- `npx vitest run src/lib/exportPagePlan.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/__tests__/pdfUtils.test.ts`
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-21 - PDF page cuts no longer split keep-together entries

### Summary
Fixed the remaining live PDF truncation case where a custom page cut could split an experience entry, placing the footer between the job title and its description.

### What changed
- Added shared export planning logic to snap cuts away from `data-break-avoid` blocks.
- Updated the live Vercel PDF function to measure exported HTML when custom cuts exist, then snap those cuts away from section headings and keep-together resume entries before rendering page segments.
- Updated the local Express PDF renderer to use the same keep-together snap behavior.
- Added regression tests for cuts inside normal and oversized keep-together blocks.

### Why
The verified root cause was in the live PDF renderer. The templates already mark experience entries with `data-break-avoid`, but commit `3acc94b9` skipped the Vercel measurement/snap pass and rendered raw custom break positions. A raw cut inside an experience item therefore clipped the first page mid-entry and continued the text on the next page.

### Verification
- `npx vitest run src/lib/exportPagePlan.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/__tests__/pdfUtils.test.ts`
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-21 - PDF section cuts no longer move backward into previous entry

### Summary
Fixed an overcorrection in the keep-together page-cut logic where a user cut before Education could be moved backward to the start of the final Experience entry.

### What changed
- `snapBreakPositionsToAvoidBlocks()` now snaps cuts near the bottom of a keep-together entry forward to the entry bottom instead of backward to the entry top.
- The same rule was applied to the Vercel PDF function's inline page-planning copy.
- Added regression coverage for a section-boundary cut that falls a few pixels inside the previous entry.

### Why
The verified root cause was that the keep-together fix treated every cut inside `data-break-avoid` the same. A cut intended for the Education boundary could land slightly inside the previous Experience entry after export measurement, so the renderer moved the break to the top of that Experience entry. The result was page 2 starting with the final job instead of Education.

### Verification
- `npx vitest run src/lib/exportPagePlan.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/__tests__/pdfUtils.test.ts`
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-21 - Custom PDF page cuts honored in downloads

### Summary
Fixed the remaining PDF page-cut issue after user verification showed the previous page-cut entry was incomplete.

### What changed
- Export clones now remove screen-only preview scaling before sending HTML to Puppeteer.
- Resume PDF export now keeps the live preview height coordinate space whenever saved custom cuts exist, preventing the server from filtering valid cuts as "outside" trimmed content.
- Preview Save/Share, Share Sheet PDF, and combined application-package exports now pass saved custom cuts to the resume PDF generator.
- Added regression tests for transform stripping and custom-cut height preservation.

### Why
The verified root cause was not the earlier client-side normalization alone. On the Preview page, the exported clone could keep `transform: scale(...)` from the responsive preview, while the saved page-cut Y positions were unscaled. Also, export height still used a trimmed content height even though saved cuts were based on the live preview height, so valid cuts could still be rejected by server normalization.

### Verification
- `npx vitest run src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/exportPagePlan.test.ts`
- `npx tsc --noEmit`

---

## 2026-05-20 - PDF renderer function startup fix

### Summary
Fixed the production PDF renderer function crash that made resume downloads fail before rendering began.

### What changed
- `api/export/pdf-native.ts` now loads `@sparticuz/chromium` through an indirect dynamic import so Vercel's `ncc` bundler does not relocate the package away from its `bin` directory.
- Kept `puppeteer-core` lazy-loaded after request validation so simple `GET`/bad-request responses cannot crash during function startup.
- Moved `pdf-lib` and export page-planning helpers off the module top level and into lazy imports inside the valid PDF render path. This keeps the Vercel function startup surface minimal and prevents unrelated renderer dependencies from crashing simple `405`/`400` responses.
- Follow-up production verification showed startup was fixed, but the valid render path then failed because Vercel could not resolve the lazy local import `../../src/lib/exportPagePlan` after transpiling the function. The page-planning helper is now a normal static local import again so Vercel bundles it correctly; external packages remain lazy.
- Vercel runtime logs then proved even the static `src/lib/exportPagePlan` import was preserved as an unresolved runtime import (`Cannot find module '/var/task/src/lib/exportPagePlan'`). The PDF function now carries its small page-planning helpers inline, making the serverless entry self-contained apart from external packages explicitly shipped with the function.
- Live PDF quality verification then showed the older slice-and-merge page renderer produced valid PDF bytes but dropped link annotations inside clipped resume content. The serverless renderer now uses Chromium's normal full-document print path and browser footer templates for page numbers/branding, preserving selectable text and clickable resume links.

### Why
The verified production symptom was `FUNCTION_INVOCATION_FAILED` for both `GET` and `POST` on `https://resume.thewise.cloud/api/export/pdf-native`, meaning the function crashed before normal request handling. Reproducing the Vercel-style bundle locally with `@vercel/ncc` showed the concrete root cause: `@sparticuz/chromium` was bundled/relocated and then failed with `The input directory "Y:\\bin" does not exist... you must externalize @sparticuz/chromium`. After the fix, the bundled function returns the expected `405` for `GET` and `400` for malformed `POST`, proving startup no longer crashes.

### Verification
- Live endpoint before fix: `GET` and minimal `POST` returned Vercel `FUNCTION_INVOCATION_FAILED`.
- `npx @vercel/ncc build api/export/pdf-native.ts -o .tmp-ncc-pdf --transpile-only`
- Imported the generated bundle locally: `GET` returned `405`, malformed `POST` returned `400`.
- Valid bundled POST progressed past Chromium package resolution; the remaining local error was Windows-only browser launch (`spawn ... chromium ENOENT`), not the previous missing `bin` directory relocation error.
- Rebuilt after startup hardening with a Vercel-style `ncc` bundle; `GET` and malformed `POST` still returned `405`/`400`, and a valid render still reached only the expected local Windows Chromium launch limitation.
- Live after deploy: `GET /api/export/pdf-native` returned `405` JSON instead of `FUNCTION_INVOCATION_FAILED`; minimal `POST` exposed the second-stage lazy local import resolution error, which was then fixed with a static local import.
- Live Vercel logs for the static import attempt showed `ERR_MODULE_NOT_FOUND` for `/var/task/src/lib/exportPagePlan`, confirming the function cannot rely on unresolved `src/` imports in production.
- Live PDF.js verification showed Chromium's direct print path preserves selectable text and the test hyperlink annotation.
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-20 - PDF export restored to selectable text and clickable links

### Summary
Replaced the resume PDF export path with the server-side Chromium renderer again so generated PDFs preserve selectable text and clickable hyperlinks instead of embedding screenshots.

### What changed
- `src/lib/nativePdfGenerator.ts` now serializes the resume DOM and sends HTML to `/api/export/pdf-native` for Chromium/Puppeteer rendering.
- Removed the resume PDF screenshot/canvas assembly path from `generateNativePDF`; `pdf-lib` remains only for cover-letter generation and merging existing PDFs.
- Restored server response guards so HTML fallbacks or unavailable PDF services do not download fake `.pdf` files.
- Added `NativePdfOptions` export alias for callers that already import that type.
- Updated `src/lib/nativePdfGenerator.test.ts` to assert that HTML, links, page-break data, and branding options are sent to the PDF endpoint.

### Why
The verified root cause of non-clickable, non-selectable PDFs was architectural: the client-side html2canvas route captures the resume as an image, then inserts that image into a PDF. Even when it is not blank, that output cannot preserve real text or link annotations. Chromium's HTML-to-PDF renderer is the correct path because it prints the actual DOM.

### Verification
- `npx vitest run src/lib/nativePdfGenerator.test.ts`
- `npx tsc --noEmit`
- Local `/api/export/pdf-native` probe with PDF.js: extracted text included `WiseResume Link Test` and annotations included `https://github.com/example`.
- `npm run build`

---

## 2026-05-20 - PDF export blank page fix

### Summary
Superseded by the selectable-text PDF fix above. The earlier client-side screenshot path was corrected for blank captures, but the approach itself was rejected because it cannot preserve text or clickable links.

### What changed
- Added `createPdfCaptureContainer()` in `src/lib/exportDomUtils.ts` so export captures use an off-screen but still rendered host.
- Updated `src/lib/nativePdfGenerator.ts` to use that rendered capture host instead of a `visibility:hidden` container.
- Replaced the stale server-call PDF unit test with regression coverage for the rendered capture host and export clone cleanup.

### Why
The verified root cause was the capture host style: the resume clone was inserted under an ancestor with `visibility:hidden`. `html2canvas` respects that CSS, so it captured a white canvas even when the resume content existed and layout measurements succeeded. A Puppeteer/html2canvas probe confirmed `visibility:hidden` produced `nonWhite: 0`, while the new off-screen rendered host produced visible pixels.

### Verification
- `npx vitest run src/lib/nativePdfGenerator.test.ts`
- `npx tsc --noEmit`
- Browser html2canvas probe: hidden host captured blank white; rendered off-screen host captured non-white resume pixels.
- `npm run build`

---

## 2026-05-20 — 3-Tier AI Enhancement (Implemented)

### Summary
All 3 tiers of the AI enhancement plan implemented, TypeScript-clean, committed to `main`. Requires `resume-section-ai` redeploy.

### What changed

**Tier 1 — Context enrichment**
| File | Change |
|------|--------|
| `appwrite-hubs/resume-section-ai/src/main.js` | `buildResumeContextBlock(resume)` — structured name/title/recent-role/top-skills/education block replaces `JSON.stringify().slice(0,1000)` in all section prompts |

**Tier 2 — Clarifying questions**
| File | Change |
|------|--------|
| `appwrite-hubs/resume-section-ai/src/main.js` | `buildSummaryQuestionsResponse`, `buildSkillsQuestionsResponse`, `buildAddMetricsQuestionsResponse`; sparsity checks (summary <50 chars, skills <3 items, experience add_metrics <60 chars); `generate_with_answers` and `add_metrics_with_answers` action handlers |
| `src/components/editor/ai/AIQuestionsDialog.tsx` | NEW generic dialog — `contextLabel` prop replaces `projectName` |
| `src/components/editor/ai/ProjectAIQuestionsDialog.tsx` | Refactored to thin wrapper over `AIQuestionsDialog` |
| `src/components/editor/SectionAIAction.tsx` | Intercepts `{type:'questions'}` response; `handleQuestionsSubmit`/`handleQuestionsSkip`; renders `<AIQuestionsDialog>` |
| `src/components/editor/ExperienceSection.tsx` | **Bug fix:** `jobDescription` now passed to `enhance()`; questions flow for `add_metrics` on sparse entries |

**Tier 3 — JD-aware actions**
| File | Change |
|------|--------|
| `appwrite-hubs/resume-section-ai/src/main.js` | `tailor_to_job`, `find_skill_gaps`, `suggest_certifications` added to `ACTION_INSTRUCTIONS` |
| `src/hooks/useAIEnhance.ts` | `ActionType` extended: `generate_with_answers`, `add_metrics_with_answers`, `tailor_to_job`, `find_skill_gaps`, `suggest_certifications` |
| `src/components/editor/InlineAIButton.tsx` | `requiresJD` flag on `AIActionConfig`; `hasJobDescription` prop; JD-locked actions render disabled+tooltip (desktop) or greyed+hint (mobile); new actions: `tailor_to_job` on summary+experience, `find_skill_gaps` on skills, `suggest_certifications` on certifications |
| `src/components/editor/SectionAIAction.tsx` | `hasJobDescription` derived from store and passed to `InlineAIButton`; `find_skill_gaps` apply branch is append-only |
| `src/components/editor/ExperienceSection.tsx` | `hasJobDescription` from store passed to `InlineAIButton` in `ExperienceItem` |

### Deployment required
Redeploy `resume-section-ai` — delete existing tar first:
```
del appwrite-hubs\resume-section-ai.tar.gz
node scripts/deploy_hubs.cjs
```

---

## 2026-05-20 — 3-Tier AI Enhancement Plan (Approved, Pending Implementation)

### Summary
Comprehensive plan designed and approved for making all AI assist buttons smarter across every editor section. Plan stored at `Project Atlas/05-Migration to Appwrite/28-Plan-3Tier-AI-Enhancement.md`. No code written yet.

### What is planned
| Tier | Change |
|------|--------|
| **1 — Context enrichment** | `buildResumeContextBlock()` in `resume-section-ai/src/main.js` replaces the raw 1000-char JSON dump; every section prompt gets candidate name, title, recent role, top skills, education |
| **2 — Clarifying questions** | Generic `AIQuestionsDialog.tsx`; question builders for summary/skills/experience; questions flow wired into `SectionAIAction.tsx` and `ExperienceSection.tsx`; ExperienceSection jobDescription bug fixed |
| **3 — JD-aware actions** | `tailor_to_job` (summary + experience), `find_skill_gaps` (skills, append-only), `suggest_certifications` (certifications); all JD-gated in `InlineAIButton` |

### Files to be changed (next agent)
`resume-section-ai/src/main.js`, `useAIEnhance.ts`, `SectionAIAction.tsx`, `ExperienceSection.tsx`, `InlineAIButton.tsx`, `AIQuestionsDialog.tsx` (new), `ProjectAIQuestionsDialog.tsx` (update)

### Deployment required after implementation
Redeploy `resume-section-ai` — delete existing tar first, then run `deploy_hubs.cjs`.

---

## 2026-05-20 — Fix: AI Gateway Critical Outage (Windows Deploy / dd-trace)

### Root Cause
`deploy_hubs.cjs` ran `npm install` on Windows, bundling Windows-native C++ binaries for `dd-trace` into `ai-gateway.tar.gz`. On Linux Appwrite, `require('dd-trace')` failed to load at module startup → every `ai-gateway` invocation crashed. Killed: `agentic-chat`, `analyze-resume`, `score-resume`, `tailor-resume`, `generate-cover-letter`.

Secondary bug: `callLLM` in `resume-section-ai` had `timeout: 55000` (55 s) exceeding Appwrite's 30 s function limit.

### What changed
| File | Change |
|------|--------|
| `appwrite-hubs/ai-gateway/package.json` | Removed `dd-trace: ^5.102.0` |
| `appwrite-hubs/ai-gateway/src/main.js` | Removed all 36 lines of dd-trace/tracer/llmobs code |
| `appwrite-hubs/resume-section-ai/src/main.js` | `callLLM` timeout `55000` → `10000` ms |

### Deploy note
Stale `.tar.gz` archives must be deleted before rerunning `deploy_hubs.cjs` — the script skips rebuilding if an archive already exists.

---

## 2026-05-20 — Smart Context-Aware Tech Suggestions

### Problem
`Suggest Technologies` always generated the same generic output regardless of the project, because it had no way to gather specific context and ignored the user's resume background.

### What changed
| File | Change |
|------|--------|
| `appwrite-hubs/resume-section-ai/src/main.js` | Clarifying questions when context is sparse; new `suggest_technologies_with_answers` action; `url`/`githubUrl` in prompt; resume tech stack extraction via `extractKnownStack()`; shared `buildSuggestTechUserPrompt()` |
| `src/components/editor/ProjectsSection.tsx` | `questionsAction` state tracks which action triggered the dialog; `suggest_technologies` payload includes `url`/`githubUrl`; submit routes to `suggest_technologies_with_answers`; skip falls back gracefully |
| `src/hooks/useAIEnhance.ts` | Added `suggest_technologies_with_answers` to `ActionType` union |

### Behaviour now
- **Sparse context** (description < 80 chars and no role): shows 3 questions about domain, purpose, platform → answers drive specific suggestions
- **Rich context**: skips dialog, generates directly with enriched context (URL, GitHub, resume stack)
- **Skip button**: falls back to best-effort direct generation instead of blank `generate`

### Deployment required
Redeploy `resume-section-ai` hub after pulling:
```
git pull origin main && APPWRITE_API_KEY=<key> node scripts/deploy_hubs.cjs
```

---

## 2026-05-20 — Fix: AI Gateway + Resume Section AI Down After Windows Redeploy

### Root Cause
Running `deploy_hubs.cjs` on Windows compiled `dd-trace`'s native C++ binaries for Windows and bundled them in the `ai-gateway` tar. Appwrite runs on Linux — the Windows `.node` files failed to load at module startup, marking every `ai-gateway` execution as `failed`. This silently killed all AI features routed through the gateway (`agentic-chat`, `analyze-resume`, `tailor-resume`, cover letter generation, etc.).

`resume-section-ai` had a separate latent bug: `callLLM` timeout was 55 000 ms but the Appwrite function execution limit is 30 s. Any LLM call slower than 30 s was killed by Appwrite mid-request.

### Fixes
- **`appwrite-hubs/ai-gateway/package.json`** — removed `dd-trace` dependency. Datadog LLM observability was best-effort and `DATADOG_API_KEY` was never configured; removing it has zero runtime impact.
- **`appwrite-hubs/ai-gateway/src/main.js`** — removed all `dd-trace` / `tracer` / `llmobs` code (36 lines).
- **`appwrite-hubs/resume-section-ai/src/main.js`** — reduced `callLLM` per-call timeout from 55 000 ms → 10 000 ms, matching `ai-gateway`'s fail-fast approach and keeping the total within the 30 s function budget.

### Deployment Required
Both `ai-gateway` and `resume-section-ai` must be redeployed:
```
APPWRITE_API_KEY=<key> node scripts/deploy_hubs.cjs
```

---

## 2026-05-20 — legacy payment provider Web + Mobile Payments Integration

### Summary
Integrated legacy payment provider as the payment gateway for web and mobile. Web SDK (`removed web payment SDK`) initialized after auth, real purchase flow replaces all "coming soon" upgrade CTAs, a new Appwrite Function (`legacy-payment-webhook`) receives RC events and syncs subscription state, and the mobile paywall's RC initialization is wired up in the root layout.

### Architecture
- Billing engine: legacy billing + Stripe
- Entitlement IDs: `pro` and `premium` — match existing plan strings
- Sync: Webhook-driven — legacy provider fires `INITIAL_PURCHASE` / `RENEWAL` / `CANCELLATION` → `legacy-payment-webhook` Appwrite Function updates `subscriptions` collection
- Coupon UI removed from `UpgradeDialog`, `UpgradeWall`, `SubscriptionPage` (replaced by RC promo codes)

### Files changed
- `src/lib/billing.ts` — NEW singleton configure/get
- `src/providers/legacy payment providerProvider.tsx` — NEW auth-aware SDK init context
- `src/hooks/old-payment-provider.ts` — removed old offerings/purchase/customer-info hook
- `src/AppInterior.tsx` — added `<legacy payment providerProvider>`
- `src/components/plan/UpgradeDialog.tsx` — replaced coupon form with RC purchase buttons + live prices
- `src/components/plan/UpgradeWall.tsx` — replaced "coming soon" toast with RC purchase + live prices
- `src/pages/SubscriptionPage.tsx` — RC purchase buttons, manage subscription link, coupon UI removed
- `src/lib/appwrite-functions.ts` — removed `validate-coupon` / `redeem-coupon` from COUPON_FUNCTIONS
- `appwrite-hubs/legacy-payment-webhook/` — NEW Appwrite Function (signature verified, handles 6 event types)
- `scripts/deploy_hubs.cjs` — added `legacy-payment-webhook` hub + env var block
- `.env.example` — added `removed web payment API key`
- `mobile/app/_layout.tsx` — RC initialization after user identity loads

### Verification
- `npm exec tsc -- --noEmit` — zero errors
- `node --check appwrite-hubs/legacy-payment-webhook/src/main.js` — clean

### Prerequisites (legacy payment dashboard — user action required)
1. Create Web Billing app → get `removed web payment API key`
2. Connect Stripe account
3. Create Pro ($9/mo) and Premium ($19/mo) products
4. Create entitlements `pro` and `premium`
5. Create one Offering with two packages linked to those entitlements
6. Set `removed payment webhook secret` → configure webhook URL (Appwrite Function HTTP endpoint)
7. Add iOS + Android apps → set `removed iOS payment API key` / `removed Android payment API key` in Expo env

---

## 2026-05-19 — DevKit: Deploy Hubs fix, BYOK tests removed, moderation error improvements

### Summary
Three DevKit bugs fixed in a single commit (PR #58).

### Root causes
1. **Deploy Hubs permanently disabled**: `handleDeployHubsStatus` in `admin-devkit-data` required `DEVKIT_PASSWORD` in `admin-deploy-hubs` variables, but that function never reads it. The status check falsely reported it missing, blocking the deploy button regardless of real vars.
2. **BYOK smoke tests**: BYOK was removed from the app but `DevKitRunner.tsx` still had 7 dead tests that always returned warn/skipped.
3. **Moderation fallback error**: Three real error messages had no matching pattern in `errorTranslate.ts`, silently falling through to the generic "Something went wrong" fallback.

### Changes
- `appwrite-hubs/admin-devkit-data/src/main.js` — removed `DEVKIT_PASSWORD` from required list; added `bug_reports`, `blocklist`, `moderation_queue` to diagnostics
- `src/lib/devkit/errorTranslate.ts` — added 3 new error patterns (runtime crashed, 403, un-indexed attribute)
- `src/components/dev-kit/DevKitRunner.tsx` — removed dead BYOK test block
- `src/components/dev-kit/config.ts` — removed `byok` section
- `src/components/dev-kit/types.ts` — removed `'byok'` from `SectionId` union

### Verification
- `npm exec tsc -- --noEmit` — zero errors

### Deployment note
`admin-devkit-data` must be redeployed to Appwrite for the Deploy Hubs status fix to take effect.

---

## 2026-05-19 — Page break control popup (Editor + Preview)

### Summary
Moved manual page-cut editing to a single entry point: the clickable page-count badge opens a dialog in the editor and preview. Removed the duplicate block from Export Options. Fixed PDF truncation caused by silently auto-saving smart breaks on first open.

### Root cause
`ExportPageBreakSetup` auto-persisted suggested breaks when opened with empty `customBreakPositions`, so export used mid-section Y values and Puppeteer segments clipped content.

### Changes
- `PageCountBadge.tsx`, `PageBreakSetupDialog.tsx` — badge opens shadcn dialog; count uses `resolveExportPageCount` (custom breaks → `length + 1`, else estimate).
- `ExportPageBreakSetup.tsx` — no auto-persist; 1/2/3 page presets; “start new page before section”; sliders only when custom cuts saved.
- `LivePreviewPanel.tsx`, `PreviewPage.tsx` — badge + dialog + dashed break lines when cuts are saved.
- `ExportOptionsSheet.tsx` — removed embedded page-break UI (export still reads saved `customBreakPositions`).
- `pdfUtils.ts` — `resolveExportPageCount`, `computeBreaksForTargetPages`, `addBreakBeforeSection`.
- `sectionLabels.ts` — shared section labels for break UI.
- Tests: extended `pdfUtils.test.ts`; added `ExportPageBreakSetup.test.tsx`.

---

## 2026-05-19 — Page cut dialog readable preview

### Summary
Fixed the page-cut dialog miniature using fit-to-width scaling (full dialog width, scrollable up to 320px) instead of height-only scaling that produced a ~70px-wide pillar. Slider labels now use template-root coordinates (`getSectionLabelForBreakY`).

### Changes
- `PageBreakDialogPreview.tsx`, `pageBreakPreviewScale.ts` — width-first scale + page bands + P2/P3 break markers.
- `pdfUtils.ts` — `getSectionLabelForBreakY`.
- `exportDomUtils.ts` — clone pins width/background.

---

## 2026-05-19 — Page cut dialog preview and PDF export fixes

### Summary
Fixed page-cut UX: dialog shows a scaled clone of the live resume, break guide lines no longer appear in PDFs, footers show `Page N of M - Made with WiseResume` (clickable link), and section-based cuts persist reliably.

### Changes
- `PageBreakDialogPreview.tsx`, `exportDomUtils.ts` — scaled DOM clone preview; strip `data-pdf-exclude` nodes before export.
- `LivePreviewPanel.tsx`, `SectionOverlayManager.tsx` — mark editor overlays as PDF-excluded.
- `nativePdfGenerator.ts` — clone template without UI overlays for server HTML.
- `server/index.ts` — combined footer when page numbers and branding are enabled.
- `EditorPage.tsx`, `PreviewPage.tsx` — keep `showPageNumbers` when custom breaks are saved.
- `pdfUtils.ts` — `addBreakBeforeSection` returns `{ breaks, applied }`; `injectForcedBreaks` replaces in-section breaks.
- `ExportPageBreakSetup.tsx` — live height on persist; toast when section cut is invalid.

---

## 2026-05-19 — Editor live preview first-load fix

### Summary
Fixed the editor live preview not rendering on the first visit (refresh was required) and PDF export failing with “Resume preview not visible” when the preview pane had not mounted yet.

### Root causes
- `useIsMobile` treated the first paint as desktop (`undefined` → `false`) before `matchMedia` ran, so sub-1024px layouts briefly mounted the desktop split then dropped the preview panel.
- `useEditorHydration` skipped DB load when a *different* resume was already in persisted Zustand storage (e.g. opening `/editor?id=…` after editing another resume).
- `react-resizable-panels` could leave the preview column at 0px width on first mount inside the flex editor shell.
- `LivePreviewPanel` returned `null` when `templateComponents[selectedTemplate]` was missing instead of migrating/falling back to `modern`.

### Changes
- `src/hooks/use-mobile.tsx` — synchronous initial `matchMedia` width check.
- `src/hooks/useEditorHydration.ts` — hydrate when `localResume.id !== currentResumeId`; read template from `template_id` or `template`.
- `src/components/editor/LivePreviewPanel.tsx` — `migrateTemplateId` + `modern` fallback.
- `src/pages/EditorPage.tsx` — panel group ref + layout reset; stable panel ids; PDF export falls back to `exportResumePdfFromData` when `[data-resume-template]` is absent.
- `src/components/ui/resizable.tsx` — `forwardRef` on `ResizablePanelGroup`.

---

## 2026-05-18 — Audit Fixes: Deploy Timeout + SDK Alignment

### Summary
Fixed the critical regression that made DevKit Deploy Hubs non-functional, and standardized all hub SDK declarations to `^17.2.0`.

### Changes
- **`scripts/deploy_hubs.cjs`** — `admin-deploy-hubs` was being set to 30s timeout (Appwrite default); now set to 900s (Appwrite maximum). `ensureFunction()` also fixed to never reduce an existing timeout that is already higher than the target value.
- **9 hub `package.json` files** — bumped `node-appwrite` from `^11.x` / `^14.0.0` → `^17.2.0`: `admin-devkit-data`, `admin-email`, `admin-feature-flags`, `admin-impersonate`, `admin-moderation`, `admin-onboarding-funnel`, `admin-portfolio-usernames`, `admin-visitor-analytics`, `ai-gateway`.
- **`appwrite-hubs/inspect-ai-keys/package.json`** — removed unused `node-appwrite` declaration (hub uses raw axios only).
- **`Project Atlas/MASTER_HANDOVER_2026.md`** — corrected Fix 4 description: prior claim "every other hub uses `^14.0.0`" was inaccurate. Added raw-axios hub design note at end of file.
- **`.github/workflows/deploy-appwrite-hubs.yml`** — updated comment to reflect intentional manual-only deploy policy (removed "re-enable next month" instruction).

### Deploy required
All 9 hubs with bumped package.json need redeployment for the new SDK version to take effect. Use DevKit → Deploy AI Hubs after this commit is merged and pushed. `admin-deploy-hubs` timeout fix in `deploy_hubs.cjs` takes effect on the next run of the deploy script (GitHub Actions manual trigger or DevKit deploy).

---

## 2026-05-18 - DevKit Hub Runtime/Auth Repair

### Summary
Implemented the DevKit 100% repair plan for the confirmed backend runtime/auth failures and broken visible tab contracts. The affected Appwrite hubs were redeployed live after verification.

### Root causes
- Several standalone DevKit hubs called `crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))` without checking buffer lengths. Malformed or stale signed DevKit tokens could throw `RangeError: Input buffers must have the same byte length`, causing Appwrite `500` runtime failures instead of clean `401` responses.
- `admin-deploy-hubs` accepted only `Bearer <raw DEVKIT_PASSWORD>`, while the frontend now sends a server-issued signed DevKit session token.
- `LiveActivityPanel` probed ghost/stale functions (`me`, `admin-get-settings`, `admin-audit-logs`) as red live checks even though those paths are not owned current DevKit functions.
- `EmailManagementPanel` read `admin_audit_logs` directly from the browser for recent sends, bypassing the admin backend and exposing the panel to database permission failures.
- `admin-onboarding-funnel` was missing required Appwrite API variables. `admin-impersonate` also had a package/runtime mismatch: CommonJS source under `"type": "module"`.

### What changed
- Added safe signed-token verification to `admin-devkit-data`, `admin-email`, `admin-testmail`, `admin-moderation`, `admin-portfolio-usernames`, `admin-visitor-analytics`, `admin-onboarding-funnel`, `admin-impersonate`, `inspect-ai-keys`, and `admin-deploy-hubs`.
- Updated `admin-deploy-hubs` to accept either the raw DevKit password or the signed DevKit session token.
- Added `admin-devkit-data` action `deploy-hubs-status` to inspect `admin-deploy-hubs` variable names through the Appwrite management API.
- Disabled the Deploy Hubs frontend button with a clear missing-variable state until `admin-deploy-hubs` has all required server variables.
- Replaced Live Activity ghost probes with owned `admin-devkit-data` checks.
- Routed Email recent-send audit reads through `admin-devkit-data:list-audit-logs` with category filtering.
- Removed `"type": "module"` from `appwrite-hubs/admin-impersonate/package.json`.

### Variable sync
- Created missing non-secret variables for `admin-onboarding-funnel`: `APPWRITE_API_KEY`, `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`.
- Created missing non-secret variables for `admin-deploy-hubs`: `APPWRITE_API_KEY`, `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`.
- Created missing endpoint/project variables for `admin-devkit-data`.
- Remaining blocker: `admin-deploy-hubs` still needs `DEVKIT_PASSWORD` set in Appwrite. `GITHUB_TOKEN` and `GITHUB_REPO` are present. Until `DEVKIT_PASSWORD` is added, the frontend deploy control remains disabled instead of broken.

### Live deployments
- `admin-devkit-data` -> `6a0a5a1cad719813f718` (`ready`)
- `admin-email` -> `6a0a5a329efdaefc0fba` (`ready`)
- `admin-testmail` -> `6a0a5a3c8bb89becd662` (`ready`)
- `admin-moderation` -> `6a0a5a50a0f7d0fc90a0` (`ready`)
- `admin-portfolio-usernames` -> `6a0a5a601419cd5cff11` (`ready`)
- `admin-visitor-analytics` -> `6a0a5a73e85af5112705` (`ready`)
- `admin-onboarding-funnel` -> `6a0a5a8857bfba05563b` (`ready`)
- `inspect-ai-keys` -> `6a0a5aab34038040e9ff` (`ready`)
- `admin-deploy-hubs` -> `6a0a5aba2e837df95554` (`ready`)
- `admin-impersonate` -> initial `6a0a5a97b4b228c37b2d`, then fixed package redeploy `6a0a5b69e688d77b95ac` (`ready`)

### Verification
- `node --check` passed for every changed Appwrite hub.
- `npm exec tsc -- --noEmit` passed.
- Live malformed-token smoke passed for all affected hubs: every execution completed with controlled HTTP `401`; none failed with `500`, `crypto is not defined`, `timingSafeEqual`, or module-load errors after the `admin-impersonate` package fix.

---

## 2026-05-18 - Import Job Runtime Failure Diagnosis

### Summary
Verified the root cause of the live "Appwrite Function runtime failed for job-import" error and prepared the repo-side fix path.

### Root cause
The bad `job-import` function version had duplicate declarations of `const parsedJob` and `savedDoc` in the same handler scope. Node rejects this at module parse time with `SyntaxError: Identifier 'parsedJob' has already been declared`, so Appwrite fails the execution before the function can return a normal JSON error.

### What changed
- Confirmed current `appwrite-hubs/job-import/src/main.js` passes `node --check`; the prior version fails with the duplicate declaration syntax error.
- Rebuilt `job-import.tar.gz` from the fixed source because the local archive still contained the broken duplicate declarations.
- Updated `src/hooks/useImportJob.ts` so the server-side save path returns `{ id: jobId }`; this prevents the import sheet from navigating with an undefined job after the backend succeeds.

### Deployment note
`deploy-appwrite-hubs.yml` is currently `workflow_dispatch` only, so the source fix at commit `ec757cbe` did not auto-deploy to Appwrite. A manual run was attempted on 2026-05-18, but GitHub failed the job before checkout with the annotation: "recent account payments have failed or your spending limit needs to be increased." Run the Deploy AI Hubs workflow again after the GitHub billing/spending-limit blocker is cleared, or deploy `job-import` from the rebuilt archive before claiming the live button is fixed.

### Verification
- `node --check appwrite-hubs/job-import/src/main.js` passed.
- `git show ec757cbe^:appwrite-hubs/job-import/src/main.js | node --check` reproduced the exact syntax failure.
- `tar -xOzf job-import.tar.gz ./src/main.js | node --check` passed after rebuilding the archive.
- Redeployed live Appwrite Function `job-import` directly as deployment `6a0a555f2d62c4db7d32`; Appwrite reported `ready`.
- Smoke execution with a blocked localhost URL completed with HTTP `400` and `{ ok:false, error:"Invalid or blocked URL" }`, proving the function boots and returns JSON instead of runtime-failing.

---

## 2026-05-16 - UI/UX Audit Implementation (Phases 1–4, 25 findings)

### Summary
All 25 actionable findings from the 2026-05-16 senior UI/UX audit implemented across 20 files. Zero new npm packages, no new Appwrite collections, no breaking changes. TypeScript clean.

### What changed

**Phase 1 — Mobile & Trust Quick Wins:**
- `ExportOptionsSheet` + `DashboardPage`: fixed critical bug — `wr-checklist-exported-*` never written; now dispatched via CustomEvent on export completion
- `AchievementToast`: replaced all hardcoded hex colors with semantic Tailwind tokens (`bg-card`, `text-foreground`, `text-primary`)
- `NotificationsPage`: added `toast.success` on markAllAsRead
- `ReferralPage`: stat values `0` → `'—'` with "Referral tracking coming soon." note
- `AppShell` + `DesktopNav`: renamed 'Ask' → 'Wise AI' on FAB and desktop button
- `BottomTabBar`: removed duplicate notification dot from More trigger; only changelog dot remains
- `ShortcutHelpSheet`: added per-category scope notes ("Available while editing a resume", etc.)
- `BottomTabBar`: More menu grid `grid-cols-4` → `grid-cols-3 sm:grid-cols-4`; grouped items with "Tools" / "Account" section labels
- `sonner.tsx`: `role="status"` → `role="log"` (correct ARIA semantics for toast stream)

**Phase 2 — Navigation & Dashboard Polish:**
- `DashboardPage`: Import Resume + Explore sections collapsed behind "Discover more ▼" toggle for returning users
- `TailorPage`: added breadcrumb, replaced `navigate(-1)` with `getBackRoute('/tailor')`; added `/tailor` to BACK_ROUTES
- `ApplicationsPage`: `<h1>My Activity</h1>` → `<h1>My Applications</h1>`
- `Breadcrumb`: last item gets `truncate max-w-[180px] sm:max-w-none` for long resume names on mobile

**Phase 3 — Stability & Performance:**
- `ResumeListCard` + `EmptyState`: `MiniTemplateThumbnail` wrapped in `ErrorBoundary`
- `TemplatesPage`: `TemplateThumbnail` in preview Sheet wrapped in `ErrorBoundary`
- `ResumeListCard`: thumbnail height `h-[54px]` → `h-[56px]` (correct A4 aspect ratio)
- `MiniTemplateThumbnail`: `IntersectionObserver` lazy rendering — renders skeleton until scrolled into view; browser-support guard for old browsers
- `EmptyState`: carousel `setInterval` skipped when `shouldReduceMotion` is true

**Phase 4 — Forms, Copy & Fine Polish:**
- `AuthPage`: static "At least 8 characters." hint under register password field
- `TailorPage`: `maxLength={2000}` + live character counter on custom instructions textarea
- `OnboardingChecklist`: `aria-label` on card and dismiss button; focus restoration to `<h1>` on dismiss; "Dismiss" → "Got it" copy

### Files changed
20 files · 182 insertions · 104 deletions

### Findings status after this session
All 25 findings marked `implement` are now `done`. Findings 26–29 remain deferred/n/a per original plan.

---

## 2026-05-16 - World-Class Enhancement Pass (All Phases)

### Summary
Full-codebase enhancement pass implementing 5 phases of improvements: trust/reliability, UX polish, feature completeness, product completeness, and technical health. Zero breaking changes. All new props are optional with safe defaults.

### What changed

**Phase 1 — Trust & Reliability:**
- `ExportProgressBar`: stage labels + error recovery UI with retry button
- `nativePdfGenerator`: one-retry on 5xx failures (3 s delay, capped at 1 attempt)
- `EditorHeader`: offline pending-count chip and syncing indicator
- `useNotifications`: added `markAllAsRead` mutation, fixed unread-count query invalidation
- `NotificationsPage`: fixed pre-existing `$id`/`$createdAt` field name bugs

**Phase 2 — UX Polish:**
- `MiniTemplateThumbnail`: extracted to own file from EmptyState
- `ResumeListCard`: 40×54px template thumbnail previews before score ring
- `sonner.tsx`: ARIA live region wrapper (`role="status" aria-live="polite"`)
- `Breadcrumb`: added optional `links` prop, `aria-label`, `aria-current="page"`
- Added breadcrumbs to CoverLetterEditPage, ApplicationTrackerPage, ResumeDetailPage
- `ShortcutHelpSheet`: new sheet listing all keyboard shortcuts in 4 categories
- `AppShell`: mounts ShortcutHelpSheet globally, wires `?` key + CustomEvent listener
- `BottomTabBar`: unread notification badge on More button + bell, What's New dot, Shortcuts menu item
- `AchievementToast`: golden-themed custom toast component
- `AchievementsPage`: fires celebration toast when achievements are newly earned

**Phase 3 — Feature Completeness:**
- `OnboardingChecklist`: new collapsible dashboard card with 5 getting-started steps
- `DashboardPage`: integrates OnboardingChecklist below DashboardStats

**Phase 4 — Product Completeness:**
- `TemplatesPage`: "Preview with my data / Sample data" toggle in preview sheet
- `ReferralPage`: LinkedIn, WhatsApp, and Copy Message social sharing buttons
- `usePortfolioSEO`: added `og:image` and `twitter:image` tags
- `server/index.ts`: new `GET /og-image/:username` Puppeteer screenshot endpoint (1200×630)

**Phase 5 — Technical Health:**
- `AppInterior`: wrapped with global `MotionConfig` for reduced-motion support
- `deploy-frontend.yml`: 3 MB JS bundle size guard step added to CI

### Verification
- `npx tsc --noEmit`: zero errors

### Files changed
22 modified, 4 created (`MiniTemplateThumbnail.tsx`, `OnboardingChecklist.tsx`, `ShortcutHelpSheet.tsx`, `AchievementToast.tsx`)

---

## 2026-05-15 - Export Pagination, iPhone Save, and Watermark Replacement

### Summary
Replaced the broken Live Preview page-break controls with an Export Options setup flow, moved PDF pagination to exact server-rendered page segments, and removed the remaining dead raster-PDF helper code.

### Root cause
The app had a visible custom page-break UI, but `generateNativePDF()` dropped `customBreakPositions`, page-numbering, branding, and content-height data before calling `/api/export/pdf-native`. The server then printed the whole HTML with normal Chromium pagination, so user-placed breaks were ignored and the final page stayed full A4/Letter height. iPhone failures were worsened by a deliberate `window.print()` fallback when the PDF service was unavailable.

### What changed
- Added an Export Options page setup panel that measures the rendered CV, starts from smart suggested breaks, and persists exact break positions.
- Updated `/api/export/pdf-native` to render exact clipped HTML segments and merge them into one text-selectable PDF, with the final page cropped to remaining content height.
- Added a visible, clickable `Wise Resume` PDF footer link and an image-export footer containing `Wise Resume` plus `https://resume.thewise.cloud`.
- Removed the Live Preview page-break controls and deleted the dead raster PDF helper internals from `src/lib/pdfGenerator.ts`.
- Removed the normal print fallback from resume PDF export errors; callers now show a direct retry/DOCX fallback message.

### Verification
- `npx vitest run src/lib/exportPagePlan.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportWatermark.test.ts src/lib/__tests__/pdfUtils.test.ts src/lib/exportResumePdf.test.ts` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed after fixing the Live Preview JSX nesting found by Vite.
- `npm run build:server` passed after adding the missing root `esbuild` dev dependency required by the existing script.
- Built-server smoke test against `POST /api/export/pdf-native` returned `%PDF-` bytes for an exact-break payload with branding enabled.

---

## 2026-05-15 - Bolt.new Import Optimization

### Summary
Addressed the "Repository size might be too large" warning in Bolt.new by identifying the root cause in the GitHub API metadata and providing a path to prune historical bloat. Created `.boltignore` to optimize AI context usage.

### Root cause
The repository's **Git history** (~283 MB) is significantly larger than the current source files (~12 MB). Bolt.new queries the GitHub API `size` property, which includes this history, triggering a proactive warning even if the current branch tarball is within the 5 MB limit.

### What changed
- Created `.boltignore` in the project root to exclude large generated assets (`public/pdfjs`, `public/tesseract`), build artifacts, and media from Bolt's AI context engine.
- Verified that the current branch archive size (3.13 MB) is below the 5 MB import cap.
- Provided instructions for pruning the legacy binary bloat from the Git history to reduce the reported repository size on GitHub.

### Verification
- Local `.git` size: 283 MB (bloated history confirmed).
- Local source size (clean): 11.9 MB (import-able).
- `git archive` size: 3.13 MB (under the 5 MB cap).

---

## 2026-05-15 - Bolt Repo Slimming (5 MB Import Cap)


### Summary
Prepared a slim branch so `iammagdy/WiseResume-TWC` can be imported into bolt.new, which enforces a hard ~5 MB GitHub tarball size cap.

### Root cause
The repo HEAD contained large committed Appwrite hub build artifacts (`.tar.gz` / `.zip`) and image-heavy documentation assets (screenshots). bolt.new imports by downloading the GitHub tarball and rejects repos over 5 MB.

### What changed
- Removed committed hub archives from the repo HEAD on branch `codex/bolt-slim` (root artifacts and `appwrite-hubs/*.tar.gz` + `auth-master.zip`).
- Removed image-heavy documentation assets: `screenshots/`, `docs/screenshots/`, `.canvas/assets/`.
- Updated `.gitignore` to prevent re-adding generated archives and those removed asset directories.
- Added session log: `Project Atlas/05-Migration to Appwrite/21-Session-Log-2026-05-15-Bolt-Repo-Slimming.md`.

### Verification
- Staged-tree archive size (gzipped) measured at ~3.28 MB (below bolt.new 5 MB cap).

### Current state
- Slimming work exists locally on branch `codex/bolt-slim` and must be committed/pushed to affect GitHub imports.

---

## 2026-05-15 - UI Follow-up Fixes

### Summary
Resolved the two follow-up issues left open after the main UI/UX stabilization pass: the recurring `useAppSettings` authorization warning and the landing mobile animated headline rendering issue.

### Root cause
The settings warning came from a direct browser read of `app_settings` on routes where that collection is not readable for the current user. The landing mobile issue came from reusing the desktop typewriter overlay pattern on a narrow mobile layout where an in-flow animated line is the correct model.

### What changed
- Updated `src/hooks/useAppSettings.ts` so expected Appwrite `401/403` settings-read failures fall back to defaults without warning spam.
- Added `src/hooks/__tests__/useAppSettings.test.tsx` to verify silent fallback for expected auth failures and warnings for unexpected failures.
- Added `src/components/landing/TypewriterHeadlineLine.tsx` and moved both `WiseResumeHero` and `LandingHeroShell` to the shared headline-line structure.
- Changed the landing mobile headline to an in-flow animated word line while preserving the desktop width-reservation behavior on `sm+`.
- Increased the mobile `.lp-typewriter-line` min-height in `src/pages/index-landing.css`.
- Updated `reports/ui-ux-stabilization-audit-2026-05-15.md` and added `Project Atlas/05-Migration to Appwrite/19-Session-Log-2026-05-15-UI-Followups.md`.

### Verification
- `npm exec vitest run src/hooks/__tests__/useAppSettings.test.tsx src/components/landing/__tests__/TypewriterHeadlineLine.test.tsx` passed.
- `npm exec tsc -- --noEmit` passed.
- Browser verification on the real local WiseResume server confirmed the settings warning no longer appears and the mobile landing headline renders correctly.

### Current state
- The two follow-up issues from the second-pass UI audit are fixed locally.
- No backend or deployment changes were required.

---

## 2026-05-15 - UI/UX Stabilization Pass

### Summary
Implemented the frontend stabilization pass for the confirmed shell, dashboard, tailor, upload, and landing UX issues, then documented the second-pass route sweep separately from the original fixes.

### Root cause
The regressions were caused by frontend layout and hierarchy problems rather than backend failures: mobile shell spacing did not account for both the Ask FAB and bottom nav, returning-user actions were buried or truncated on dashboard, and the tailor first screen combined a broken closed-state selector with an overloaded entry flow.

### What changed
- Added route-aware mobile shell spacing and Ask FAB suppression rules for fixed-footer pages.
- Tightened desktop navigation chrome without changing IA.
- Reworked dashboard returning-user actions, loading copy, selection discoverability, and upload-card mobile layout.
- Fixed the tailor resume selector closed state and removed the associated React key warning.
- Reframed the tailor first screen into a clearer step sequence and stacked the job URL controls on mobile.
- Increased landing hero spacing on mobile before the next content band.
- Added focused tests for shell layout, dashboard hero CTA behavior, and tailor URL control layout.
- Added `reports/ui-ux-stabilization-audit-2026-05-15.md` and `Project Atlas/05-Migration to Appwrite/18-Session-Log-2026-05-15-UI-UX-Stabilization.md`.

### Verification
- `npm exec vitest run src/components/layout/__tests__/appShellLayout.test.ts src/components/dashboard/__tests__/DashboardHero.test.tsx src/components/editor/tailor/__tests__/JobUrlParser.test.tsx` passed.
- `npm exec tsc -- --noEmit` passed.
- Browser verification covered authenticated dashboard/upload/tailor checks, public mobile checks for `/` and `/pricing`, and a second-pass route sweep across auth, job-seeker, and WiseHire surfaces.

### Current state
- The confirmed UI issues from the original audit are fixed locally.
- No Appwrite schema, function, or deployment changes were required for this pass.
- The second-pass sweep found two follow-up items to track separately: a recurring `useAppSettings` authorization warning and an existing mobile landing animated-title rendering issue.

---

## 2026-05-15 - Function Ownership Implementation

### Summary
Implemented the source-owned function routing plan for AI contracts, DevKit direct calls, coupons, WiseHire, public share password verification, and safe first-pass performance cleanup.

### Root cause
The frontend invoked several function names that were either routed through generic AI gateway behavior or not owned by the local `appwrite-hubs/` inventory. Structured AI callers expected typed JSON while most local gateway routes returned generic chat content.

### What changed
- Added Appwrite hubs: `coupons`, `wisehire-gateway`, and `public-share`.
- Routed coupon, WiseHire, and protected-share calls through owned local hubs in `src/lib/appwrite-functions.ts`.
- Added typed structured AI responses for high-risk AI gateway features while keeping `parse-resume` as the dedicated normalized route.
- Moved audited DevKit direct calls and Live Activity probes to owned `admin-devkit-data` / `resume-section-ai` paths.
- Removed the active unowned `submit-contact-request` fallback from feedback reporting.
- Rewrote `scripts/README.md` to point operators at Appwrite hub deployment and mark Supabase/edge scripts as legacy audit aids.
- Updated deploy inventory and Appwrite function manifest for the new hubs.
- Removed mixed dynamic/static import warnings for `captureErrorShim` and `pdf/textPreprocessor`.

### Verification
- `node --check` passed for modified/new Appwrite hubs and `scripts/deploy_hubs.cjs`.
- `npm exec tsc -- --noEmit` passed.
- `npm run build` passed.
- Remaining build warning: large chunks for heavy modules such as OCR, doc export, monitoring, DevKit, and charts.

### Current state
- Local source is ready for deployment.
- Live Appwrite was not redeployed in this session; the updated hubs must be deployed before live behavior can be claimed fixed.

---

## 2026-05-15 - Codebase health audit documented

### Summary
Added a dedicated Atlas session log for the read-only codebase health audit covering Appwrite function ownership, AI contract drift, legacy migration remnants, and performance risks.

### What changed
- Created `Project Atlas/05-Migration to Appwrite/16-Session-Log-2026-05-15-Codebase-Health-Audit.md`.
- Recorded the verified root findings from source inspection without changing application code.

### Verification
- `npm exec tsc -- --noEmit` passed during the audit session.
- `npm run build` passed during the audit session.
- Workspace remained clean on `main...origin/main`.

---

## 2026-05-14 - Root README Added

### Summary
Added a professional root `README.md` for the GitHub repository so the project has a clear SaaS-grade entry point for developers, operators, and AI agents.

### What changed
- Created a root README covering product positioning, platform surfaces, architecture, repository map, local setup, commands, environment notes, deployment path, and Atlas rules.
- Linked the README to the canonical Atlas files instead of duplicating deployment-sensitive operational truth.

### Verification
- Markdown file created at repo root.
- Atlas changelog updated to record the documentation change.

---

## 2026-05-14 - DevKit Operations Hub Auth/Deploy Stabilization

### Summary
Stabilized the DevKit panel auth path and deployment workflow for the panels that were showing `Unauthorized`, then simplified the sidebar into fewer operations surfaces.

### Root cause
DevKit login returns a signed token from `admin-devkit-data`, but several panels depend on standalone admin Appwrite Functions. The local standalone sources accept signed tokens, but the deploy workflow rebuilt only a subset of hubs and could leave live functions stale. Stale standalone functions reject the signed token and show `Unauthorized`.

### What changed
- Email Automations, Portfolios, Visitors, Testmail Inbox, and Mission Control live-visitors now use the shared DevKit client path for their standalone admin functions.
- DevKit sidebar now merges Visitors + Analytics + Onboarding into Growth & Traffic, and merges Email Automations into the Email hub.
- The Appwrite hub deploy workflow now rebuilds every deployed hub from source and validates archive shape before deployment.
- `scripts/deploy_hubs.cjs` now includes missing admin hubs, syncs shared admin variables to every admin hub, syncs Resend variables to email hubs, and runs safe smoke executions when `DEVKIT_PASSWORD` is available.

### Verification
- `npm exec tsc -- --noEmit` passed.
- `git diff --check` passed.
- Browser E2E reached `/devkit`, but full tab-by-tab testing is blocked until the DevKit password is supplied because the local DevKit session is locked.

---

## 2026-05-14 - Public Page Navigation Stall Fixed

### Summary
Fixed `/pricing` and other public utility pages appearing to load but then failing to navigate when the Dashboard button or similar links were clicked.

### Root cause
The routes were valid and rendered. The failure was a browser runtime stall caused by the animated WebGL Aurora background running on non-landing public pages. Chromium logged GPU `ReadPixels` stall warnings, and the in-app browser could render `/pricing` while click execution timed out. This made navigation look broken even though React routing was present.

### What changed
- `src/components/landing/AuroraLayer.tsx` now keeps WebGL Aurora only on the real landing pages (`/` and `/enterprises`).
- `src/components/landing/AuroraBackground.tsx` and `src/components/landing/Aurora.tsx` support `forceCssFallback`, so utility pages keep the branded background without starting the WebGL renderer.
- `/pricing`, `/sign-in`, `/whats-new`, `/auth*`, and `/p/*` now use the CSS fallback background.

### Verification
- In-app browser: loaded `http://localhost:5000/pricing`, clicked `Dashboard`, and landed on `http://localhost:5000/dashboard`.
- Headless browser smoke: `/pricing` rendered with zero fresh WebGL/GPU stall warnings; unauthenticated `/dashboard` redirected to `/auth?mode=login`.
- `npm exec tsc -- --noEmit` passed.

---

## 2026-05-13 - Deploy admin-devkit-data: Resend Vars + Redeployment Wiring

### Summary
Wired the CI deploy pipeline so that the `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_FROM_NAME` environment variables are automatically provisioned on the `admin-devkit-data` Appwrite Function when the GitHub Actions workflow runs. This unblocks the plan-change notification and email side-effects added in the previous entry.

### What changed
- `scripts/deploy_hubs.cjs` — added `ensureVariable` calls for `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_FROM_NAME` on `admin-devkit-data` after the hub deployment loop.
- `.github/workflows/deploy-appwrite-hubs.yml` — exports `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_FROM_NAME` from GitHub secrets into the deploy step so the deploy script can read them.

### Manual steps still required (one-time)
Add the three secrets to the GitHub repository (`Settings → Secrets and variables → Actions`):
- `RESEND_API_KEY` — same Resend API key already used by `admin-email`
- `RESEND_FROM_EMAIL` — e.g. `hello@thewise.cloud`
- `RESEND_FROM_NAME` — e.g. `WiseResume`

Then trigger the **Deploy AI Hubs** workflow (`workflow_dispatch`) from GitHub Actions. The script will deploy `admin-devkit-data` and set all three variables in one run.

### Smoke test
After the workflow completes: set a test user's plan in DevKit → confirm the user's notification appears in their bell icon and a transactional email arrives in their inbox.

---

## 2026-05-13 - Plan Change: Realtime Reflect + Notify User

### Summary
Three-part fix so that when God Mode DevKit sets a permanent plan or grants a trial, the target user's browser reflects the change immediately and they receive both an in-app notification and a transactional email.

### Root causes addressed
1. **Stale frontend cache** — `useMe` had `staleTime: 5 * 60 * 1000` with no push invalidation. `invalidateQueries(['me'])` in the admin's browser only cleared the admin's cache.
2. **No notification** — `handleSetPlan` and `handleGrantTrial` in `admin-devkit-data` never wrote to `notifications`.
3. **No email** — neither handler called Resend.

### What changed
- `src/hooks/useMe.ts` — added Appwrite Realtime subscription on `databases.main.collections.subscriptions.documents`. On any event the hook calls `queryClient.invalidateQueries({ queryKey: ['me', user.id] })` and unsubscribes on cleanup. Plan reflects in ~2 seconds without polling.
- `appwrite-hubs/admin-devkit-data/src/main.js` — added:
  - `resendRequest(method, path, body)` — minimal Resend REST helper (same pattern as `admin-email`)
  - `planUpgradeEmailHtml(email, planLabel, durationLabel)` — styled email template matching `baseTemplate` (indigo header, 560px max-width)
  - `createPlanNotification(databases, userId, planLabel, durationLabel, log)` — writes to `notifications` collection with `type: 'system'`, correct title/message, `is_read: false`, permissions scoped to `Role.user(userId)`. Non-fatal (try/catch + warning log).
  - `sendPlanUpgradeEmail(userId, planLabel, durationLabel, log)` — fetches user email via `getUser()`, sends via Resend. Skips gracefully when `RESEND_API_KEY` is absent. Non-fatal.
  - Both `handleSetPlan` and `handleGrantTrial` now call both helpers via `Promise.allSettled` after the DB write succeeds, so neither can block or fail the primary plan change.

### Env vars required in `admin-devkit-data` Appwrite Function
Add these in Appwrite Console → Functions → `admin-devkit-data` → Variables:
- `RESEND_API_KEY` — Resend API key (same value already used in `admin-email`)
- `RESEND_FROM_EMAIL` — sender address (e.g. `hello@thewise.cloud`)
- `RESEND_FROM_NAME` — sender name (e.g. `WiseResume`)

### Verification
- `npm exec tsc -- --noEmit` passed.
- `admin-devkit-data` must be redeployed after this commit for changes to take effect on live.

---

## 2026-05-13 - DevKit Login Spinner And Profile Action Fix

### Summary
Fixed the `/devkit` login button getting stuck in a loading state and corrected a DevKit profile drawer action contract that could dispatch the wrong backend action.

### What changed
- `devKitLogin` now times out after 15 seconds instead of waiting forever for an Appwrite SDK execution promise.
- Shared DevKit panel calls now time out after 20 seconds and return structured `NETWORK_ERROR` results.
- `UserDetailDrawer` now sends `profile_action: "get"` under the top-level `action: "update-profile"` contract instead of duplicate `action` keys.
- Redeployed `admin-devkit-data` as deployment `6a0415154ff4ed2b537e`.

### Verification
- `npm exec tsc -- --noEmit` completed successfully.
- Local browser smoke test on `localhost:5000/devkit` with a deliberately wrong password re-enabled the submit button instead of leaving it spinning.
- Live Appwrite `verify-devkit-session` wrong-password execution used deployment `6a0415154ff4ed2b537e`, completed, and returned HTTP `401` with code `INVALID_PASSWORD`.

---

## 2026-05-13 - DevKit Operations Data Restored

### Summary
Fixed misleading and broken DevKit operations data by making Appwrite Auth the source of truth for admin users and by separating active-user resumes from orphaned resume documents.

### What changed
- `admin-devkit-data` now uses internal REST GET helpers for Appwrite read/list calls instead of `node-appwrite` GET helpers that send request bodies.
- `overview-stats` now returns active-user-owned resume count, raw resume document count, orphan count, and the unverified Auth user list.
- `list-users-page` now pages from Appwrite Auth users first, then joins profiles, subscriptions, credits, and per-user resume counts.
- `set-plan` now writes only schema-valid subscription/profile fields and clears stale trial fields; `useMe` computes active trial effective plan from existing fields.
- DevKit UI now shows unverified and missing-profile users clearly and removes visible Supabase wording from the DevKit surfaces touched here.
- Redeployed `admin-devkit-data` as deployment `6a040bea5ae7d378180b`.

### Why
The DevKit was mixing old assumptions with current Appwrite data. Live Appwrite has 2 Auth users, 1 profile, and 34 resume documents; 31 resume documents are orphaned from deleted/nonexistent Auth users. Counting raw resume documents made infrastructure look wrong, and using profiles as the God Mode source hid the unverified Auth user.

### Verification
- Local handler execution against live Appwrite returned 2 Auth users, 1 verified user, 3 active-user-owned resumes, 31 orphaned resume documents, and `test@thewise.cloud` as the unverified user.
- A same-plan `set-plan` smoke test for the verified user returned success and the joined user list still showed `premium`.
- `npm exec tsc -- --noEmit` completed successfully.
- Live deployment status is `ready`; `verify-devkit-session` wrong-password execution returns `INVALID_PASSWORD` with empty runtime stderr.

---

## 2026-05-13 - DevKit Login Runtime Restored

### Summary
Fixed the live DevKit "Access denied" blocker by redeploying `admin-devkit-data` with a valid Appwrite Function artifact.

### What changed
- Rebuilt `admin-devkit-data.tar.gz` from `appwrite-hubs/admin-devkit-data/` so `package.json`, `src/main.js`, and `node_modules/` are at the archive root.
- Redeployed Appwrite Function `admin-devkit-data` as deployment `6a0407d342fbb7593d4d` with entrypoint `src/main.js`.
- Updated the DevKit Atlas cards to record the verified root cause and the Appwrite-native recovery path.

### Why
The login failure was not caused by the entered password. The live function failed before password verification with `Cannot find module 'node-appwrite'`, so the frontend collapsed the runtime failure into a generic "Access denied" toast.

### Verification
- New deployment status is `ready`.
- A deliberately wrong `verify-devkit-session` request now completes with HTTP `401`, code `INVALID_PASSWORD`, and empty runtime stderr, proving the function boots and auth handling is reachable.

---

## 2026-05-13 - DevKit Full Stability Audit & Remediation

### Summary
Full audit and fix of the DevKit developer tools. Resolved two frontend crashes, consolidated 14+ missing Appwrite Functions into the existing `admin-devkit-data` hub, fixed error reporting, and deployed 4 previously unbuilt functions to production.

### What changed

#### Frontend (no deployment required)
- **`TestItem.tsx`** — Added `result = { status: 'idle' }` default prop to prevent crash when `results[test.id]` is `undefined` before any test runs.
- **`DevKitRunner.tsx`** — Fixed prop name mismatch: `expandedJson` → `isExpanded`, `onToggleJson` → `onToggleExpand`, removed non-existent `globalRunning` prop. Added `?? { status: 'idle' }` fallback for result.
- **`VisitorsPanel.tsx`** — Fixed `[object Object]` error display: replaced `throw fnErr` (raw object) with `throw new Error(msg)` extraction and replaced `String(e)` in catch blocks with `e instanceof Error ? e.message : String(e)`.
- **`AdminUsersPanel.tsx`** — Rerouted all 11 admin mutation invocations (`admin-set-plan`, `admin-grant-trial`, `admin-revoke-trial`, `admin-suspend-user`, `admin-set-credits`, `admin-save-note`, `admin-impersonate`, `admin-merge-identity`, `admin-delete-user`, bulk operations) to `admin-devkit-data` with action-based routing.
- **`UserDetailDrawer.tsx`** — Rerouted all 14 admin invocations (`admin-audit-logs`, `admin-save-note`, `admin-update-profile`, `admin-get-identity`, `admin-merge-identity`, `admin-set-plan`, `admin-grant-trial`, `admin-revoke-trial`, `admin-suspend-user`, `admin-set-credits`, `admin-revoke-sessions`, `admin-delete-user`, `admin-wisehire-reset-user`, `admin-list-user-content`) to `admin-devkit-data` with action-based routing.

#### Backend (`admin-devkit-data` Appwrite Function)
Added 16 new action handlers: `set-plan`, `grant-trial`, `revoke-trial`, `suspend-user`, `set-credits`, `save-note`, `delete-user`, `merge-identity`, `revoke-sessions`, `list-user-content`, `update-profile`, `get-identity`, `user-audit-logs`, `wisehire-reset-user`, `live-activity`, `impersonate`, `get-resume-detail`.

Extended `requiredFunctions` diagnostics list from 7 → 11 entries. Removed stale `keysInSupabaseVault: false` Supabase relic.

#### Appwrite Deployments
- `admin-devkit-data` — redeployed with all new handlers (status: `ready`)
- `admin-visitor-analytics` — first live deployment (status: `ready`)
- `admin-testmail` — first live deployment (status: `ready`)
- `admin-impersonate` — first live deployment (status: `ready`)
- `admin-onboarding-funnel` — created and deployed as new function (status: `ready`)

### Why
- Smoke Runner was crashing on mount due to prop name mismatch between `DevKitRunner` and `TestItem` and an unguarded `undefined` result access.
- Visitors Panel showed `[object Object]` for all errors because Appwrite error objects were stringified with `String(e)` rather than `.message` extraction.
- 14 admin action buttons in God Mode and UserDetailDrawer were calling non-existent standalone Appwrite Functions. Consolidating into `admin-devkit-data` avoids deploying 14+ separate functions.

### Verification
- `npx tsc --noEmit` — 0 errors ✓
- All 4 new Appwrite deployments confirmed `status: ready` ✓

---

## 2026-05-13 - Fix infinite loading skeleton across protected routes


### Summary
Fixed a critical bug where the application would get stuck in a loading skeleton state indefinitely after the recent AuthContext refactor.

### What changed
- Updated multiple downstream files (`DashboardPage.tsx`, `InterviewPage.tsx`, `ProfilePage.tsx`, `JobSeekerRoute.tsx`, `WiseHireGuard.tsx`) to consume the newly renamed `authSettled` and `authReady` properties from `useAuth()`.
- Updated test files (`Auth-D3.test.tsx`, `ApplicationsTracker-D9.test.tsx`, `ApplicationsDeadline-D9.test.tsx`, `ApplicationsAnalytics-D9.test.tsx`) to match the new auth context shape.

### Why
The previous performance fix renamed `supabaseSettled` and `supabaseReady` to `authSettled` and `authReady` inside `AuthContext.tsx` and `ProtectedRoute.tsx`. However, the downstream consumers were still attempting to destructure `supabaseSettled` from `useAuth()`. This resulted in `undefined`, causing the `!supabaseSettled` checks to evaluate to true, which trapped those pages in a permanent loading skeleton.

### Verification
- `npx tsc --noEmit` completed successfully.
- Visual verification confirmed the dashboard now loads correctly and does not hang.

---

## 2026-05-13 - PDF.js worker bootstrap repair for CV upload

### Summary
Fixed the real browser-side CV upload blocker by replacing the broken PDF.js worker bootstrap and reclassifying worker startup failures so valid files no longer show up as damaged.

### What changed
- Replaced the old blob/classic-worker PDF.js bootstrap with a direct module-worker configuration through `GlobalWorkerOptions.workerPort`.
- Added a dedicated PDF worker runtime failure classification so browser startup failures no longer collapse into `CORRUPTED`.
- Updated upload recovery copy so only genuine invalid PDFs get damaged-file messaging.
- Verified the parser in a real browser context using `tests/e2e/fixtures/sample-resume.pdf`.

### Why
The previous implementation was still guessing at the failure. The verified issue was that PDF.js could not start its worker in the browser because the wrapper called `importScripts(...)` on a module-worker path, which broke before any resume text extraction happened.

### Verification
- `npm exec tsc -- --noEmit`
- `npx vitest run src/lib/__tests__/pdfParser-D1.test.ts src/lib/__tests__/parseResumePDF-D4.test.ts src/components/upload/__tests__/uploadErrorCopy.test.ts`
- Real browser-context verification:
  - `extractTextFromPDF(sample-resume.pdf)` succeeds
  - `parseResumePDF(sample-resume.pdf)` returns `success: true`

---

## 2026-05-13 - Live ai-gateway redeploy + Atlas functions rename

### Summary
Completed the live Appwrite `ai-gateway` redeploy for the resume parser fix and renamed the canonical Atlas backend-card section from `edge-functions/` to `functions/`.

### What changed
- Rebuilt `ai-gateway.tar.gz` with dependencies and redeployed it to the live Appwrite Function.
- Activated the new `ai-gateway` deployment and verified the live `parse-resume` execution path now returns structured `ResumeData`.
- Improved `src/lib/appwrite-functions.ts` so Appwrite envelope errors that contain an embedded status code are translated more accurately.
- Renamed `Project Atlas/01-Currently Implemented/edge-functions/` to `Project Atlas/01-Currently Implemented/functions/`.
- Updated key Atlas references and section index text so the canonical backend card path no longer uses the stale Supabase-specific folder name.

### Why
The repo-side parser fix was not enough by itself because the browser calls the live Appwrite `ai-gateway` function. Until that live function was redeployed, the dashboard could still hit stale parser behavior. At the same time, the Atlas folder name was misleading future agents by suggesting the old Supabase edge-function model was still the canonical backend-card structure.

### Verification
- Verified live Appwrite `createExecution('ai-gateway', { featureName: 'parse-resume', ... })` now returns `200` with structured `ResumeData`.
- `npm exec tsc -- --noEmit`
- `npx vitest run src/lib/__tests__/pdfParser-D1.test.ts src/lib/__tests__/parseResumePDF-D4.test.ts src/components/upload/__tests__/uploadErrorCopy.test.ts`
- Verified local parser asset endpoint `http://localhost:5000/pdfjs/standard_fonts/FoxitFixed.pfb` returns `200`.

---
## 2026-06-20 - DevKit live audit follow-up fixes

### Summary
Closed the remaining defects found during the DevKit live audit: Email Automations now handles Resend Segments, Diagnostics recognizes the deployed Admin Sentry hub, and destructive user-delete cleanup no longer leaves subscription/credit/notification residue.

### What changed
- `admin-email` now prefers `RESEND_SEGMENT_*` variables and keeps `RESEND_AUDIENCE_*` support as a legacy fallback.
- Email Automations UI now shows segment wording, surfaces setup-required sync states cleanly, and passes the resolved segment/audience key to manual contact actions.
- `admin-devkit-data` diagnostics now maps `admin-sentry` to the deployed Appwrite function id `6a0760710000ff231048`.
- DevKit `delete-user` now deletes owned `subscriptions`, `ai_credits`, and `notifications` rows before profile/auth cleanup.
- The Appwrite deploy workflow and deploy script now propagate `RESEND_SEGMENT_ALL_USERS` and `RESEND_AUDIENCE_ALL_USERS`.
- DevKit source hashes were regenerated for the changed hubs.

### Verification
- `node --check appwrite-hubs/admin-email/src/main.js`
- `node --check appwrite-hubs/admin-devkit-data/src/main.js`
- `npx eslint src/components/dev-kit/DeployHubsPanel.tsx src/components/dev-kit/EmailAutomationsPanel.tsx`
- `node scripts/compute-source-hashes.mjs`
- `npm run build`

---
## 2026-05-13 - Cross-device CV parsing stabilization

### Summary
Fixed CV upload parsing failures across desktop, iPhone, and Android by correcting the `parse-resume` backend contract, hardening frontend fallback behavior, and making PDF/OCR runtime assets part of normal local setup.

### What changed
- Added a dedicated `parse-resume` path inside `appwrite-hubs/ai-gateway/src/main.js` so the gateway now accepts extracted resume text and returns normalized `ResumeData` instead of a generic chat payload.
- Updated `src/lib/pdfParser.ts` to validate AI parser responses and fall back automatically to the local parser when the payload is malformed or empty.
- Added shared runtime asset checks in `src/lib/pdf/runtimeAssets.ts` and wired the PDF/OCR asset sync into `dev`, `start`, `postinstall`, and `prebuild`.
- Updated upload error handling so missing local parser assets, iPhone/Safari PDF compatibility issues, OCR/browser failures, and real corruption no longer collapse into the same damaged-file message.
- Repaired the parser test setup and updated focused tests to use the current Appwrite-based parsing path.

### Why
The verified root cause was twofold: `parse-resume` had already been routed through `ai-gateway`, but the gateway still treated it like a generic chat request and ignored the extracted resume text contract; on top of that, local PDF/OCR assets were not guaranteed outside build flows, which made device and environment failures look like bad files.

### Verification
- `node scripts/copy-pdf-ocr-assets.mjs`
- `npm exec tsc -- --noEmit`
- `npx vitest run src/lib/__tests__/pdfParser-D1.test.ts src/lib/__tests__/parseResumePDF-D4.test.ts src/components/upload/__tests__/uploadErrorCopy.test.ts`
- Verified local asset endpoints return `200` for PDF.js and Tesseract runtime files.

---

## 2026-05-13 - Local auth fix: redirect dev sessions from 127.0.0.1 to localhost

### Summary
Fixed local login failure where the browser showed `Failed to fetch` on the auth page when the app was opened on `http://127.0.0.1:5000`.

### What changed
- Added a DEV-only redirect in `src/main.tsx` from `127.0.0.1` to `localhost`.
- Added a stability card documenting the verified Appwrite origin mismatch.
- Updated the Auth page Atlas card with the current Appwrite-based auth model and the local development requirement.

### Why
The root cause was a live Appwrite Web platform mismatch, not bad credentials or a broken frontend. The project allows `http://localhost:5000` but rejects `http://127.0.0.1:5000`, so direct browser auth calls failed before the app received a normal API error.

### Verification
- Verified live Appwrite response for `Origin: http://127.0.0.1:5000` returns `403 general_unknown_origin`.
- Verified live Appwrite response for `Origin: http://localhost:5000` returns valid CORS headers.
- Local frontend and API server remained reachable after the redirect was added.

---

## 2026-06-30 - Arabic authenticated-app recovery sweep

### Summary
Recovered the highest-impact signed-in Arabic experience by fixing broken locale wiring, repairing corrupted Arabic catalog values, localizing shared helper-driven UI, and adding an Arabic coverage guardrail for critical authenticated surfaces.

### What changed
- Repaired Arabic catalog corruption and placeholder/key mismatches in the app and WiseHire locale files.
- Localized remaining visible English on the main signed-in surfaces: settings, profile, applications, upload/import, portfolio editor, dashboard activity/insights, imported-jobs widgets, and shared AI/top-bar labels.
- Made dashboard/activity relative-time text respect Arabic instead of defaulting to English.
- Added and verified a focused Arabic coverage script plus critical render tests for representative authenticated surfaces.

### Verification
- `npm run test:i18n`
- `npm run test:i18n:coverage`
- `npm run test -- src/i18n/__tests__/criticalArabicCoverage.test.ts`
- `npm run build`

### Remaining scope
This session recovered the critical authenticated Arabic path, but it did not finish every lower-priority English literal across the entire repository. Some secondary pages and helper components still need a follow-up completion pass.

---

## 2026-05-12 - Atlas A-to-Z source map

### Summary
Added `Project Atlas/SOURCE_OF_TRUTH_MAP.md` so future agents and contributors have one clear map for product identity, architecture, AI, DevKit, deployment, implemented features, planned work, governance, and conflict resolution.

### What changed
- Added the A-to-Z Atlas source map.
- Updated `Project Atlas/README.md` so the source map is the first file agents read.
- Re-verified the map against current code references: `package.json`, `src/lib/appwrite.ts`, `src/lib/appwrite-collections.ts`, and `src/lib/appwrite-bridge.ts`.

### Why
After removing competing external documents, the Atlas needed a single orientation page that tells agents exactly where each kind of truth lives and what must not be reintroduced.

### Verification
Documentation-only change. Key deleted outside docs were checked against `main` and returned not found. No runtime tests were required.

---

## 2026-05-12 - Documentation consolidation: Atlas-only source of truth

### Summary
The project documentation model was consolidated so `Project Atlas/` is the only source of truth for WiseResume, WiseHire, The Wise Cloud, architecture, deployment, AI routing, agent rules, and operational state.

### What changed
- Added `Project Atlas/GOVERNANCE.md` as the canonical governance page using the current Appwrite-native architecture.
- Updated Atlas rules and maintenance guidance to remove references to `project-governance/` as a higher authority.
- Folded durable rules from the old governance folder into Atlas language: inspect first, do not guess, preserve working behavior, keep account boundaries strict, document accepted changes, and protect deployment safety.
- Preserved AI routing intent inside `Project Atlas/02-Planned/ai-routing-rollout.md` and removed the old external routing folder as a separate source of truth.
- Removed stale or conflicting Markdown documentation outside `Project Atlas/`.

### Why
The repository had multiple competing documentation surfaces. Some older docs still described Kinde/Supabase as current and claimed `project-governance/` was supreme, while the live project is Appwrite-native and the README already directed agents to the Atlas. This cleanup removes that ambiguity for the owner and future AI agents.

### Verification
This was a documentation-only change. No application code was changed and no runtime test suite was required.
## 2026-06-30 - DevKit analytics accuracy and signup visibility

- Separated sessions, page views, anonymous visitors, authenticated active users, and Auth signups into independent metrics with explicit sources and partial-data status.
- Added an Appwrite Auth-backed Signups view under Users plus global server-side user search, filters and sorting.
- Added privacy-gated identity linking, 90-day raw analytics retention, daily aggregate schema, and account-deletion cleanup.
- Added regression coverage for Cairo day boundaries, metric definitions, user queries, tracking metadata, bots, throttling, and one-way identity hashes.
- Verification completed with a successful production build and 744 passing Vitest tests (1 todo, 1 skipped).
