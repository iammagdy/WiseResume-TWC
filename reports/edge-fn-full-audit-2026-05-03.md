# Edge Functions Full Audit — Task #61

**Date:** 2026-05-03  •  **Project ref:** `jnsfmkzgxsviuthaqlyy`  •  **Functions audited:** 74

**Probe basis:** test-user JWT (HS256, signed with SUPABASE_JWT_SECRET, sub `00000000-0000-4000-8000-000000000061`, no admin/HR/devkit claims) + project anon key.  Live HTTP probes against `https://jnsfmkzgxsviuthaqlyy.supabase.co/functions/v1/<fn>`.

> **Out of scope** (per task brief): implementing fixes, rotating secrets, deleting orphans, perf benchmarking, smoke catalogue (#59), deploy retry (#60).


## 1. Inventory (74 functions)

| # | Function | Role | Purpose | Trigger | Auth posture | verify_jwt | Deployed (UTC) | Ver |
|---|----------|------|---------|---------|--------------|-----------|----------------|-----|
| 1 | `admin-ai-ops` | router | Merged router for 4 AI control-plane ops + nightly cron (Task #53) | web (DevKit AI panels) + pg_cron (refresh-test-models) | admin cron | `false` | 2026-05-03 05:02:14Z | v2 |
| 2 | `admin-audit-logs` | standalone | Read DevKit audit log entries | web (DevKit Audit panel) | admin | `false` | 2026-05-03 05:05:22Z | v204 |
| 3 | `admin-check-access` | standalone | Lightweight DevKit token-validity probe | web (DevKit gate) | admin | `false` | 2026-05-03 05:00:27Z | v10 |
| 4 | `admin-config` | router | Merged router for 5 admin config sub-handlers (Task #52) | web (DevKit Settings/Integrations panels) | admin | `false` | 2026-05-03 05:03:11Z | v2 |
| 5 | `admin-delete-user` | standalone | Hard-delete a user (kept isolated from admin-user-ops) | web (DevKit UserDetailDrawer danger-zone) | admin | `false` | 2026-05-03 05:03:16Z | v184 |
| 6 | `admin-devkit-data` | standalone | DevKit dashboard data (analytics/observability/live-activity/mission-control/github-status) | web (DevKit dashboards) | admin | `false` | 2026-05-03 05:03:13Z | v14 |
| 7 | `admin-email` | standalone | DevKit email module (resend stats/sync/actions/broadcast) | web (DevKit Email panel) | admin | `false` | 2026-05-03 05:03:19Z | v9 |
| 8 | `admin-get-identity` | standalone | Resolve a user's identity rows across providers | web (DevKit identity tools) | admin | `false` | 2026-05-03 05:00:49Z | v183 |
| 9 | `admin-impersonate` | standalone | Issue an impersonation token for a target user | web (DevKit impersonate button) | admin | `false` | 2026-05-03 05:05:34Z | v16 |
| 10 | `admin-kinde-reconcile` | standalone | Reconcile Kinde ↔ Supabase shadow users | web (DevKit identity tools) | admin | `false` | 2026-05-03 05:03:22Z | v41 |
| 11 | `admin-list-user-content` | standalone | List a user's resumes/portfolios/etc. | web (DevKit UserDetailDrawer) | admin | `false` | 2026-05-03 05:02:16Z | v182 |
| 12 | `admin-list-users` | standalone | Search/list users for DevKit user table | web (DevKit UserManagementPanel) | admin | `false` | 2026-05-03 05:02:15Z | v211 |
| 13 | `admin-merge-identity` | standalone | Merge two identity rows into one user | web (DevKit identity tools) | admin | `false` | 2026-05-03 05:03:19Z | v183 |
| 14 | `admin-moderation` | standalone | Portfolio moderation queue actions | web (DevKit moderation queue) | admin | `false` | 2026-05-03 05:00:37Z | v16 |
| 15 | `admin-onboarding-funnel` | standalone | Onboarding funnel analytics | web (DevKit analytics) | admin | `false` | 2026-05-03 05:03:21Z | v8 |
| 16 | `admin-owner-ops` | standalone | Owner-only privileged ops (kept isolated) | web (DevKit owner panel) | admin | `false` | 2026-05-03 05:03:24Z | v16 |
| 17 | `admin-portfolio-usernames` | standalone | Reserved/blocked portfolio username admin | web (DevKit moderation) | admin | `false` | 2026-05-03 05:03:23Z | v175 |
| 18 | `admin-save-note` | standalone | Persist DevKit notes against a user | web (DevKit user notes UI) | admin | `false` | 2026-05-03 05:03:24Z | v210 |
| 19 | `admin-user-ops` | router | Merged router for 7 admin user-lifecycle ops (Task #51) | web (DevKit UserDetailDrawer) | admin | `false` | 2026-05-03 05:05:52Z | v2 |
| 20 | `admin-wisehire` | router | Merged router for 4 admin WiseHire ops (Task #54) | web (DevKit EmailManagement, UserDetailDrawer) | admin webhook | `false` | 2026-05-03 05:00:43Z | v2 |
| 21 | `agentic-chat` | standalone | Multi-turn agentic AI chat (resume-aware) | web (AI Studio chat) | user-jwt | `false` | 2026-05-03 05:00:44Z | v264 |
| 22 | `ai-health` | standalone | Live AI pool health probe (real chat completion) | web (DevKit AI Health) + monitoring | user-jwt | `false` | 2026-05-03 05:03:34Z | v264 |
| 23 | `ai-test` | standalone | DevKit AI key smoke-test (real one-token call per slot) | web (DevKit AI Keys panel) | admin user-jwt | `false` | 2026-05-03 05:03:39Z | v256 |
| 24 | `analyze-resume` | standalone | Score+analyze a full resume | web (Editor analyzer) | user-jwt | `false` | 2026-05-03 05:00:48Z | v273 |
| 25 | `ask-portfolio` | standalone | AI Q&A against a public portfolio | public web (portfolio chat) | webhook | `false` | 2026-05-03 05:00:46Z | v259 |
| 26 | `auth-email-hook` | standalone | Supabase Auth email webhook (HMAC-signed) | webhook (Supabase → fixed URL) | webhook | `false` | 2026-05-03 05:03:38Z | v214 |
| 27 | `career-assessment` | standalone | Career assessment from resume | web (AI Studio) | user-jwt | `false` | 2026-05-03 05:03:40Z | v263 |
| 28 | `career-path-advisor` | standalone | Suggest next career steps | web (AI Studio) | user-jwt | `false` | 2026-05-03 05:03:31Z | v262 |
| 29 | `company-briefing` | standalone | Generate company briefing from name+JD | web (AI Studio) | user-jwt | `false` | 2026-05-03 05:05:03Z | v264 |
| 30 | `coupons` | router | Merged router for coupon admin/redeem/validate (Task #48) | web (SubscriptionPage, UpgradeWall, UpgradeDialog) | admin user-jwt | `false` | 2026-05-03 05:03:40Z | v2 |
| 31 | `create-portfolio-session` | standalone | Create an analytics session for a portfolio view | public web (portfolio page load) | webhook | `false` | 2026-05-03 05:03:33Z | v180 |
| 32 | `detect-and-humanize` | standalone | AI-detection + humanizer | web (Editor humanize) | user-jwt | `false` | 2026-05-03 05:03:44Z | v262 |
| 33 | `export-portfolio-pdf` | standalone | Export a portfolio to PDF | web (portfolio download) | user-jwt | `unset` | 2026-05-03 05:03:42Z | v4 |
| 34 | `generate-cover-letter` | standalone | Generate cover letter from resume+JD | web + mobile | user-jwt | `false` | 2026-05-03 05:00:57Z | v272 |
| 35 | `generate-portfolio-bio` | standalone | Generate portfolio bio from resume | web (Portfolio editor) | user-jwt | `false` | 2026-05-03 05:03:41Z | v263 |
| 36 | `generate-question-bank` | standalone | Generate interview question bank for a role | web (Interview prep) | user-jwt | `false` | 2026-05-03 05:05:15Z | v209 |
| 37 | `generate-resignation-letter` | standalone | Generate resignation letter | web + mobile | user-jwt | `false` | 2026-05-03 05:03:43Z | v264 |
| 38 | `hard-purge` | standalone | Hard-delete soft-deleted users after retention window | manual / scheduled (admin) | admin | `false` | 2026-05-03 05:05:40Z | v7 |
| 39 | `kinde-webhook` | standalone | Kinde identity webhook handler | webhook (Kinde) | webhook | `false` | 2026-05-03 05:01:03Z | v32 |
| 40 | `manage-api-keys` | standalone | BYOK: list/save/delete user API keys + byok_enabled toggle | web (Settings → API Keys) | user-jwt | `false` | 2026-05-03 05:03:52Z | v234 |
| 41 | `me` | standalone | Read current authenticated user profile | web (bootstrap) | user-jwt | `false` | 2026-05-03 05:03:56Z | v233 |
| 42 | `mobile-api` | router | Merged router for 6 mobile-only ops (Task #?) | mobile (callMobileAction) | user-jwt | `false` | 2026-05-03 05:03:58Z | v3 |
| 43 | `mobile-config` | standalone | Mobile app config bootstrap (per platform) | mobile (bootstrap) | anonymous | `unset` | 2026-05-03 05:01:05Z | v2 |
| 44 | `og-image` | standalone | Render dynamic OpenGraph image (SVG) | public (link previews) | anonymous | `false` | 2026-05-03 05:04:03Z | v228 |
| 45 | `one-page-optimizer` | standalone | Optimize resume to fit one page | web (Editor) | user-jwt | `false` | 2026-05-03 05:01:12Z | v264 |
| 46 | `optimize-for-linkedin` | standalone | Generate LinkedIn-optimized profile copy | web (Editor) | user-jwt | `false` | 2026-05-03 05:03:53Z | v261 |
| 47 | `parse-job` | standalone | Parse JD from url/text/linkedin | web (Tailor flow) | user-jwt | `false` | 2026-05-03 05:03:55Z | v9 |
| 48 | `parse-resume` | standalone | Parse uploaded resume file (PDF/DOCX/etc.) → structured JSON | web (resume upload) | user-jwt | `false` | 2026-05-03 05:01:12Z | v266 |
| 49 | `portfolio-public` | standalone | Public portfolio reads (get_portfolio/etc.) | public web (portfolio pages) | anonymous | `false` | 2026-05-03 05:04:02Z | v2 |
| 50 | `recruiter-simulation` | standalone | Simulate recruiter persona feedback on resume | web (Editor recruiter sim) | user-jwt | `false` | 2026-05-03 05:04:06Z | v263 |
| 51 | `resume-section-ai` | router | Merged router for 4 resume-section AI ops (Task #56) | web (Editor SectionAIPopover, GapExplainer/Filler, RecruiterSim) | user-jwt | `false` | 2026-05-03 05:04:07Z | v2 |
| 52 | `revenuecat-webhook` | standalone | RevenueCat subscription webhook | webhook (RevenueCat) | anonymous | `unset` | 2026-05-03 05:03:59Z | v2 |
| 53 | `score-resume` | standalone | Resume score (subset of analyze) | web (Editor scorer) | user-jwt | `false` | 2026-05-03 05:04:00Z | v254 |
| 54 | `send-password-reset` | standalone | Trigger Supabase password-reset email | web (login forgot-password) | anonymous | `false` | 2026-05-03 05:01:23Z | v15 |
| 55 | `send-push` | standalone | Send a push notification (Expo) | server-side (notification triggers) | anonymous | `unset` | 2026-05-03 05:01:20Z | v2 |
| 56 | `smart-fit-rewrite` | standalone | Auto-rewrite sections to match target role | web (Editor smart-fit) | user-jwt | `false` | 2026-05-03 05:04:05Z | v32 |
| 57 | `suggest-template` | standalone | Suggest a resume template based on inputs | web (Template picker) | user-jwt | `false` | 2026-05-03 05:04:04Z | v246 |
| 58 | `tailor-resume` | standalone | Tailor a full resume to a JD | web (Tailor flow) | user-jwt | `false` | 2026-05-03 05:04:19Z | v267 |
| 59 | `token-exchange` | standalone | Exchange Kinde JWT for Supabase JWT | web + mobile (login) | anonymous | `false` | 2026-05-03 05:05:09Z | v216 |
| 60 | `transactional-email` | router | Merged router for 3 transactional email senders (Task #55) | web (PortfolioContactForm, sendFeedback) + pg_cron (resume-reminder) | cron | `false` | 2026-05-03 05:01:29Z | v2 |
| 61 | `validate-api-key` | standalone | Validate a BYOK key with a real one-token ping (never stored) | web (Settings → Add Key flow) | user-jwt | `false` | 2026-05-03 05:04:51Z | v242 |
| 62 | `verify-dev-kit` | standalone | Verify DevKit email+password and mint HMAC bearer | web (DevKit login) | webhook | `false` | 2026-05-03 05:01:24Z | v233 |
| 63 | `verify-email` | standalone | Email verification handler (currently 503: SITE_URL not set) | web (post-signup) | anonymous | `false` | 2026-05-03 05:04:15Z | v15 |
| 64 | `weekly-digest` | standalone | Send weekly digest email | pg_cron | cron | `false` | 2026-05-03 05:04:57Z | v225 |
| 65 | `wise-ai-chat` | standalone | 7 AI Studio tool endpoints (cold_email/branding/etc.) | web (AI Studio tools) | user-jwt | `false` | 2026-05-03 05:04:18Z | v207 |
| 66 | `wisehire-access` | router | Merged router for 5 WiseHire onboarding ops (Task #50) | web (Wisehire signup/waitlist flows) | webhook | `false` | 2026-05-03 05:04:20Z | v3 |
| 67 | `wisehire-bulk-screen` | standalone | Bulk-screen candidates against a JD | web (WiseHire HR) | user-jwt | `false` | 2026-05-03 05:04:21Z | v7 |
| 68 | `wisehire-generate-brief` | standalone | Generate role brief from intake | web (WiseHire HR) | user-jwt | `false` | 2026-05-03 05:05:27Z | v187 |
| 69 | `wisehire-invite-reminder` | standalone | Reminder email for pending WiseHire invites | pg_cron | cron | `false` | 2026-05-03 05:04:22Z | v9 |
| 70 | `wisehire-mask-cvs` | standalone | Mask PII on candidate CVs | web (WiseHire HR) | user-jwt | `false` | 2026-05-03 05:05:46Z | v7 |
| 71 | `wisehire-send-outreach` | standalone | Send outreach emails to candidates | web (WiseHire HR) | user-jwt | `false` | 2026-05-03 05:04:23Z | v173 |
| 72 | `wisehire-talent-search` | standalone | Search talent pool | web (WiseHire HR) | user-jwt | `false` | 2026-05-03 05:04:24Z | v178 |
| 73 | `wisehire-talent-view` | standalone | View a single candidate profile | web (WiseHire HR) | user-jwt | `false` | 2026-05-03 05:04:24Z | v171 |
| 74 | `wisehire-write-jd` | standalone | AI-write a job description | web (WiseHire HR) | user-jwt | `false` | 2026-05-03 05:04:25Z | v185 |

## 2. Caller Map & Orphan Flags

Caller count = number of source files in `src/` + `mobile/` + `server/` containing the function name as a quoted/string literal. Functions consolidated into a router are counted via their router (callers reach them through the router's dispatch header), so a zero count on a deployed *standalone* slug genuinely indicates no source caller.

### 2a. Counts (sorted by caller count ascending)

| Function | Callers | Role | Notes |
|----------|---------|------|-------|
| `admin-check-access` | 0 | standalone | ORPHAN CANDIDATE — confirm before deleting |
| `ask-portfolio` | 0 | standalone | webhook — invoked by external service URL, not source-coded |
| `auth-email-hook` | 0 | standalone | webhook — invoked by external service URL, not source-coded |
| `create-portfolio-session` | 0 | standalone | webhook — invoked by external service URL, not source-coded |
| `export-portfolio-pdf` | 0 | standalone | callers use computed URLs (mobile.apkUrl/portfolio share/cron) — review |
| `generate-question-bank` | 0 | standalone | ORPHAN CANDIDATE — confirm before deleting |
| `hard-purge` | 0 | standalone | ORPHAN CANDIDATE — confirm before deleting |
| `kinde-webhook` | 0 | standalone | webhook — invoked by external service URL, not source-coded |
| `mobile-config` | 0 | standalone | callers use computed URLs (mobile.apkUrl/portfolio share/cron) — review |
| `og-image` | 0 | standalone | callers use computed URLs (mobile.apkUrl/portfolio share/cron) — review |
| `parse-resume` | 0 | standalone | callers use computed URLs (mobile.apkUrl/portfolio share/cron) — review |
| `revenuecat-webhook` | 0 | standalone | ORPHAN CANDIDATE |
| `send-push` | 0 | standalone | callers use computed URLs (mobile.apkUrl/portfolio share/cron) — review |
| `suggest-template` | 0 | standalone | ORPHAN CANDIDATE — confirm before deleting |
| `weekly-digest` | 0 | standalone | cron — invoked by pg_cron net.http_post |
| `wisehire-invite-reminder` | 0 | standalone | cron — invoked by pg_cron net.http_post |
| `admin-ai-ops` | 1 | router |  |
| `admin-config` | 1 | router |  |
| `admin-delete-user` | 1 | standalone |  |
| `admin-get-identity` | 1 | standalone |  |
| `admin-kinde-reconcile` | 1 | standalone |  |
| `admin-list-user-content` | 1 | standalone |  |
| `admin-merge-identity` | 1 | standalone |  |
| `admin-onboarding-funnel` | 1 | standalone |  |
| `admin-owner-ops` | 1 | standalone |  |
| `admin-portfolio-usernames` | 1 | standalone |  |
| `admin-save-note` | 1 | standalone |  |
| `admin-user-ops` | 1 | router |  |
| `ai-health` | 1 | standalone |  |
| `career-path-advisor` | 1 | standalone |  |
| `detect-and-humanize` | 1 | standalone |  |
| `generate-portfolio-bio` | 1 | standalone |  |
| `mobile-api` | 1 | router |  |
| `one-page-optimizer` | 1 | standalone |  |
| `optimize-for-linkedin` | 1 | standalone |  |
| `portfolio-public` | 1 | standalone |  |
| `recruiter-simulation` | 1 | standalone |  |
| `resume-section-ai` | 1 | router |  |
| `send-password-reset` | 1 | standalone |  |
| `validate-api-key` | 1 | standalone |  |
| `verify-dev-kit` | 1 | standalone |  |
| `wisehire-access` | 1 | router |  |
| `wisehire-bulk-screen` | 1 | standalone |  |
| `wisehire-generate-brief` | 1 | standalone |  |
| `wisehire-mask-cvs` | 1 | standalone |  |
| `wisehire-send-outreach` | 1 | standalone |  |
| `wisehire-talent-search` | 1 | standalone |  |
| `wisehire-talent-view` | 1 | standalone |  |
| `wisehire-write-jd` | 1 | standalone |  |
| `admin-moderation` | 2 | standalone |  |
| `admin-wisehire` | 2 | router |  |
| `company-briefing` | 2 | standalone |  |
| `score-resume` | 2 | standalone |  |
| `smart-fit-rewrite` | 2 | standalone |  |
| `token-exchange` | 2 | standalone |  |
| `verify-email` | 2 | standalone |  |
| `admin-email` | 3 | standalone |  |
| `admin-impersonate` | 3 | standalone |  |
| `ai-test` | 3 | standalone |  |
| `generate-resignation-letter` | 3 | standalone |  |
| `manage-api-keys` | 3 | standalone |  |
| `transactional-email` | 3 | router |  |
| `coupons` | 4 | router |  |
| `tailor-resume` | 4 | standalone |  |
| `admin-audit-logs` | 5 | standalone |  |
| `admin-list-users` | 5 | standalone |  |
| `career-assessment` | 5 | standalone |  |
| `parse-job` | 5 | standalone |  |
| `agentic-chat` | 7 | standalone |  |
| `analyze-resume` | 7 | standalone |  |
| `generate-cover-letter` | 7 | standalone |  |
| `admin-devkit-data` | 9 | standalone |  |
| `wise-ai-chat` | 9 | standalone |  |
| `me` | 18 | standalone |  |

### 2b. Orphan candidates (zero caller, not router/webhook/cron)

- `admin-check-access` — purpose: Lightweight DevKit token-validity probe; treat as candidate, **do not delete in this audit** (out of scope).
- `export-portfolio-pdf` — purpose: Export a portfolio to PDF; treat as candidate, **do not delete in this audit** (out of scope).
- `generate-question-bank` — purpose: Generate interview question bank for a role; treat as candidate, **do not delete in this audit** (out of scope).
- `hard-purge` — purpose: Hard-delete soft-deleted users after retention window; treat as candidate, **do not delete in this audit** (out of scope).
- `mobile-config` — purpose: Mobile app config bootstrap (per platform); treat as candidate, **do not delete in this audit** (out of scope).
- `og-image` — purpose: Render dynamic OpenGraph image (SVG); treat as candidate, **do not delete in this audit** (out of scope).
- `parse-resume` — purpose: Parse uploaded resume file (PDF/DOCX/etc.) → structured JSON; treat as candidate, **do not delete in this audit** (out of scope).
- `revenuecat-webhook` — purpose: RevenueCat subscription webhook; treat as candidate, **do not delete in this audit** (out of scope).
- `send-push` — purpose: Send a push notification (Expo); treat as candidate, **do not delete in this audit** (out of scope).
- `suggest-template` — purpose: Suggest a resume template based on inputs; treat as candidate, **do not delete in this audit** (out of scope).

## 3. Feature Coverage Matrix

Live HTTP probe verdict column: G = GREEN, Y = YELLOW, R = RED (see §7).


### Auth

| Feature | Backing function | Verdict | Probe summary |
|---------|------------------|---------|---------------|
| Login (Kinde → Supabase bridge) | `token-exchange` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| Bootstrap profile read | `me` | 🟢 G | auth 200 • noauth 401 • CORS 200 |
| Password reset email | `send-password-reset` | 🟢 G | auth 400 • noauth 400 • CORS 200 |
| Email verification | `verify-email` | 🔴 R | auth 503 • noauth 503 • CORS 200 |
| Auth email hook | `auth-email-hook` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| Kinde webhook | `kinde-webhook` | 🟢 G | auth 401 • noauth 401 • CORS 200 |

### Resume editor — AI

| Feature | Backing function | Verdict | Probe summary |
|---------|------------------|---------|---------------|
| Section enhance / tailor / fill-gap / explain-gap | `resume-section-ai` | 🟢 G | auth 400 • noauth 401 • CORS 200 |
| Smart-fit rewrite | `smart-fit-rewrite` | 🟡 Y | auth 200 • noauth 500 • CORS 200 |
| Analyze full resume | `analyze-resume` | 🟢 G | auth 400 • noauth 401 • CORS 200 |
| Score resume | `score-resume` | 🟡 Y | auth 400 • noauth 500 • CORS 200 |
| Tailor full resume | `tailor-resume` | 🟢 G | auth 400 • noauth 401 • CORS 200 |
| One-page optimizer | `one-page-optimizer` | 🟡 Y | auth 400 • noauth 500 • CORS 200 |
| Detect & humanize | `detect-and-humanize` | 🟢 G | auth 400 • noauth 401 • CORS 200 |
| Recruiter simulation | `recruiter-simulation` | 🟡 Y | auth 400 • noauth 500 • CORS 200 |

### Resume editor — non-AI

| Feature | Backing function | Verdict | Probe summary |
|---------|------------------|---------|---------------|
| Resume upload + parse | `parse-resume` | 🟡 Y | auth 415 • noauth 500 • CORS 200 |
| Job description parse | `parse-job` | 🟢 G | auth 400 • noauth 400 • CORS 200 |
| Template suggestion | `suggest-template` | 🟢 G | auth 400 • noauth 401 • CORS 200 |

### AI Studio tools

| Feature | Backing function | Verdict | Probe summary |
|---------|------------------|---------|---------------|
| 7 tool endpoints | `wise-ai-chat` | 🟢 G | auth 400 • noauth 401 • CORS 204 |
| Multi-turn agentic chat | `agentic-chat` | 🟢 G | auth 400 • noauth 401 • CORS 200 |
| Cover letter | `generate-cover-letter` | 🟢 G | auth 400 • noauth 401 • CORS 200 |
| Resignation letter | `generate-resignation-letter` | 🟡 Y | auth 400 • noauth 500 • CORS 200 |
| Career assessment | `career-assessment` | 🟡 Y | auth 400 • noauth 500 • CORS 200 |
| Career path advisor | `career-path-advisor` | 🟡 Y | auth 400 • noauth 500 • CORS 200 |
| Company briefing | `company-briefing` | 🟡 Y | auth 400 • noauth 500 • CORS 200 |
| LinkedIn optimizer | `optimize-for-linkedin` | 🟡 Y | auth 400 • noauth 500 • CORS 200 |
| Interview question bank | `generate-question-bank` | 🟢 G | auth 400 • noauth 401 • CORS 200 |

### Portfolio (public)

| Feature | Backing function | Verdict | Probe summary |
|---------|------------------|---------|---------------|
| Generate portfolio bio | `generate-portfolio-bio` | 🟢 G | auth 400 • noauth 401 • CORS 200 |
| Public portfolio reads | `portfolio-public` | 🟢 G | auth 400 • noauth 400 • CORS 200 |
| Portfolio AI Q&A | `ask-portfolio` | 🟢 G | auth 400 • noauth 400 • CORS 200 |
| Portfolio analytics session | `create-portfolio-session` | 🟢 G | auth 400 • noauth 400 • CORS 200 |
| Portfolio PDF export | `export-portfolio-pdf` | 🟢 G | auth 400 • noauth 401 • CORS 200 |
| Portfolio contact form / feedback | `transactional-email` | 🟢 G | auth 400 • noauth 400 • CORS 200 |
| Dynamic OG image | `og-image` | 🟢 G | auth 200 • noauth 200 • CORS 200 |

### Subscription / billing

| Feature | Backing function | Verdict | Probe summary |
|---------|------------------|---------|---------------|
| Coupon validate / redeem / admin-manage | `coupons` | 🟢 G | auth 400 • noauth 400 • CORS 200 |
| RevenueCat webhook | `revenuecat-webhook` | 🟢 G | auth 403 • noauth 401 • CORS 200 |

### BYOK (Bring-Your-Own-Key)

| Feature | Backing function | Verdict | Probe summary |
|---------|------------------|---------|---------------|
| List / save / delete user keys + byok_enabled toggle | `manage-api-keys` | 🟡 Y | auth 400 • noauth 500 • CORS 200 |
| Validate provider key (one-token ping) | `validate-api-key` | 🟡 Y | auth 400 • noauth 500 • CORS 200 |

### AI ops / health

| Feature | Backing function | Verdict | Probe summary |
|---------|------------------|---------|---------------|
| Pool health probe | `ai-health` | 🟡 Y | auth 200 • noauth 401 • CORS 200 |
| DevKit AI key smoke test | `ai-test` | 🟡 Y | auth 200 • noauth 401 • CORS 200 |

### Mobile app

| Feature | Backing function | Verdict | Probe summary |
|---------|------------------|---------|---------------|
| Push token + PDF exports + interview ops | `mobile-api` | 🟢 G | auth 400 • noauth 401 • CORS 200 |
| Mobile config bootstrap | `mobile-config` | 🟢 G | auth 400 • noauth 401 • CORS 200 |
| Push send | `send-push` | 🟢 G | auth 403 • noauth 401 • CORS 200 |

### WiseHire onboarding (consumer)

| Feature | Backing function | Verdict | Probe summary |
|---------|------------------|---------|---------------|
| Waitlist + early-access + invite + signup | `wisehire-access` | 🟢 G | auth 400 • noauth 400 • CORS 200 |
| Pending-invite reminder cron | `wisehire-invite-reminder` | 🟢 G | auth 401 • noauth 401 • CORS 200 |

### WiseHire HR product

| Feature | Backing function | Verdict | Probe summary |
|---------|------------------|---------|---------------|
| Talent search | `wisehire-talent-search` | 🟢 G | auth 403 • noauth 401 • CORS 200 |
| Talent profile view | `wisehire-talent-view` | 🟢 G | auth 403 • noauth 401 • CORS 200 |
| Bulk candidate screen | `wisehire-bulk-screen` | 🟢 G | auth 403 • noauth 401 • CORS 200 |
| Generate role brief | `wisehire-generate-brief` | 🟢 G | auth 403 • noauth 401 • CORS 200 |
| Mask PII on CVs | `wisehire-mask-cvs` | 🟢 G | auth 403 • noauth 401 • CORS 200 |
| Send outreach emails | `wisehire-send-outreach` | 🟢 G | auth 403 • noauth 401 • CORS 200 |
| AI-write JD | `wisehire-write-jd` | 🟢 G | auth 403 • noauth 401 • CORS 200 |

### DevKit (admin)

| Feature | Backing function | Verdict | Probe summary |
|---------|------------------|---------|---------------|
| DevKit login / token verify | `verify-dev-kit` | 🟢 G | auth 400 • noauth 400 • CORS 200 |
| Token-presence check | `admin-check-access` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| Dashboards (analytics/observability/etc.) | `admin-devkit-data` | 🟢 G | auth 400 • noauth 400 • CORS 200 |
| Email module | `admin-email` | 🟢 G | auth 400 • noauth 400 • CORS 200 |
| Audit logs | `admin-audit-logs` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| List users | `admin-list-users` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| List user content | `admin-list-user-content` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| User lifecycle (suspend/trial/credits/plan/sessions/profile) | `admin-user-ops` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| Hard-delete user | `admin-delete-user` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| Admin config (5 sub-handlers) | `admin-config` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| AI ops (caps/routing/inspect-keys/refresh) | `admin-ai-ops` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| WiseHire admin (4 sub-handlers) | `admin-wisehire` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| Identity tools (get/merge/reconcile) | `admin-get-identity` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
|  | `admin-merge-identity` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
|  | `admin-kinde-reconcile` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| Impersonate user | `admin-impersonate` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| Moderation queue | `admin-moderation` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| Portfolio username admin | `admin-portfolio-usernames` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| Onboarding funnel | `admin-onboarding-funnel` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| Save user notes | `admin-save-note` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| Owner-only ops | `admin-owner-ops` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| Hard-purge soft-deleted users | `hard-purge` | 🟢 G | auth 401 • noauth 401 • CORS 200 |
| Weekly digest cron | `weekly-digest` | 🟢 G | auth 401 • noauth 401 • CORS 200 |

## 4. Live Health Probes (per function)

Four probes per function:

1. **CORS** — `OPTIONS` with origin `https://example.com`, request method `POST`, request headers `authorization,content-type,apikey`. Pass = 200/204 with permissive `access-control-allow-origin`.

2. **noauth (401 parity)** — `POST` with no `Authorization`/`apikey`. The Supabase gateway should reject with 401 *before* application code runs. A 5xx here means the function reads request body or executes code before any auth check (parity drift).

3. **auth (test-user JWT)** — `POST` with the audit's HS256-signed user JWT + anon `apikey`. Application-level 4xx (missing field) is correct for parameter-required endpoints; 401/403 is correct for admin-only / HR-only endpoints; 200 is correct for endpoints that accept any authenticated user.

4. **anon-only** — `POST` with the project anon key (no user JWT). Mirrors a logged-out call from the public web bundle.


| Function | CORS | noauth | auth (test JWT) | anon | Verdict |
|----------|------|--------|-----------------|------|---------|
| `admin-ai-ops` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `admin-audit-logs` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `admin-check-access` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `admin-config` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `admin-delete-user` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `admin-devkit-data` | 200 | 400 | 400 | 400 | 🟢 GREEN |
| `admin-email` | 200 | 400 | 400 | 400 | 🟢 GREEN |
| `admin-get-identity` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `admin-impersonate` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `admin-kinde-reconcile` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `admin-list-user-content` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `admin-list-users` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `admin-merge-identity` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `admin-moderation` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `admin-onboarding-funnel` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `admin-owner-ops` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `admin-portfolio-usernames` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `admin-save-note` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `admin-user-ops` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `admin-wisehire` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `agentic-chat` | 200 | 401 | 400 | 401 | 🟢 GREEN |
| `ai-health` | 200 | 401 | 200 | 401 | 🟡 YELLOW |
| `ai-test` | 200 | 401 | 200 | 401 | 🟡 YELLOW |
| `analyze-resume` | 200 | 401 | 400 | 401 | 🟢 GREEN |
| `ask-portfolio` | 200 | 400 | 400 | 400 | 🟢 GREEN |
| `auth-email-hook` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `career-assessment` | 200 | 500 | 400 | 500 | 🟡 YELLOW |
| `career-path-advisor` | 200 | 500 | 400 | 500 | 🟡 YELLOW |
| `company-briefing` | 200 | 500 | 400 | 500 | 🟡 YELLOW |
| `coupons` | 200 | 400 | 400 | 400 | 🟢 GREEN |
| `create-portfolio-session` | 200 | 400 | 400 | 400 | 🟢 GREEN |
| `detect-and-humanize` | 200 | 401 | 400 | 401 | 🟢 GREEN |
| `export-portfolio-pdf` | 200 | 401 | 400 | 401 | 🟢 GREEN |
| `generate-cover-letter` | 200 | 401 | 400 | 401 | 🟢 GREEN |
| `generate-portfolio-bio` | 200 | 401 | 400 | 401 | 🟢 GREEN |
| `generate-question-bank` | 200 | 401 | 400 | 401 | 🟢 GREEN |
| `generate-resignation-letter` | 200 | 500 | 400 | 500 | 🟡 YELLOW |
| `hard-purge` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `kinde-webhook` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `manage-api-keys` | 200 | 500 | 400 | 500 | 🟡 YELLOW |
| `me` | 200 | 401 | 200 | 401 | 🟢 GREEN |
| `mobile-api` | 200 | 401 | 400 | 401 | 🟢 GREEN |
| `mobile-config` | 200 | 401 | 400 | 400 | 🟢 GREEN |
| `og-image` | 200 | 200 | 200 | 200 | 🟢 GREEN |
| `one-page-optimizer` | 200 | 500 | 400 | 500 | 🟡 YELLOW |
| `optimize-for-linkedin` | 200 | 500 | 400 | 500 | 🟡 YELLOW |
| `parse-job` | 200 | 400 | 400 | 400 | 🟢 GREEN |
| `parse-resume` | 200 | 500 | 415 | 500 | 🟡 YELLOW |
| `portfolio-public` | 200 | 400 | 400 | 400 | 🟢 GREEN |
| `recruiter-simulation` | 200 | 500 | 400 | 500 | 🟡 YELLOW |
| `resume-section-ai` | 200 | 401 | 400 | 401 | 🟢 GREEN |
| `revenuecat-webhook` | 200 | 401 | 403 | 403 | 🟢 GREEN |
| `score-resume` | 200 | 500 | 400 | 500 | 🟡 YELLOW |
| `send-password-reset` | 200 | 400 | 400 | 400 | 🟢 GREEN |
| `send-push` | 200 | 401 | 403 | 403 | 🟢 GREEN |
| `smart-fit-rewrite` | 200 | 500 | 200 | 500 | 🟡 YELLOW |
| `suggest-template` | 200 | 401 | 400 | 401 | 🟢 GREEN |
| `tailor-resume` | 200 | 401 | 400 | 401 | 🟢 GREEN |
| `token-exchange` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `transactional-email` | 200 | 400 | 400 | 400 | 🟢 GREEN |
| `validate-api-key` | 200 | 500 | 400 | 500 | 🟡 YELLOW |
| `verify-dev-kit` | 200 | 400 | 400 | 400 | 🟢 GREEN |
| `verify-email` | 200 | 503 | 503 | 503 | 🔴 RED |
| `weekly-digest` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `wise-ai-chat` | 204 | 401 | 400 | 401 | 🟢 GREEN |
| `wisehire-access` | 200 | 400 | 400 | 400 | 🟢 GREEN |
| `wisehire-bulk-screen` | 200 | 401 | 403 | 401 | 🟢 GREEN |
| `wisehire-generate-brief` | 200 | 401 | 403 | 401 | 🟢 GREEN |
| `wisehire-invite-reminder` | 200 | 401 | 401 | 401 | 🟢 GREEN |
| `wisehire-mask-cvs` | 200 | 401 | 403 | 401 | 🟢 GREEN |
| `wisehire-send-outreach` | 200 | 401 | 403 | 401 | 🟢 GREEN |
| `wisehire-talent-search` | 200 | 401 | 403 | 401 | 🟢 GREEN |
| `wisehire-talent-view` | 200 | 401 | 403 | 401 | 🟢 GREEN |
| `wisehire-write-jd` | 200 | 401 | 403 | 401 | 🟢 GREEN |

### 4a. Notable probe details

**Successful 2xx on test-user JWT (5):** `ai-health`, `ai-test`, `me`, `og-image`, `smart-fit-rewrite`.  Of these:
- `me` — expected (any authenticated user can read own profile).
- `og-image` — expected (public, returns SVG).
- `smart-fit-rewrite` — accepted empty body and returned `{success:true,outcomes:[]}`. Acceptable behavior (graceful no-op) but worth confirming intent.
- **`ai-health` & `ai-test` — AUTH DRIFT (Critical, see §6).** Both endpoints are documented as DevKit-only but accepted a non-admin test-user JWT and ran a real model call (`groq:1` in 490 ms; `deepseek:1` 1546 ms). Without a DevKit HMAC token, any signed-in user can drain the pool's rate budget by hammering these.

**21 functions return 5xx on noauth (401-parity drift):**  `career-assessment`, `career-path-advisor`, `company-briefing`, `generate-resignation-letter`, `manage-api-keys`, `one-page-optimizer`, `optimize-for-linkedin`, `parse-resume`, `recruiter-simulation`, `score-resume`, `smart-fit-rewrite`, `validate-api-key`.  These functions either run before the gateway can short-circuit, or the gateway is configured `verify_jwt=false` so the auth check happens in the function body — which then throws 500 `Missing authorization header` instead of returning a clean 401. Document, do not fix here.

**`verify-email` returns 503 `SITE_URL is not configured`** for both noauth and auth probes — a real configuration gap (Critical, see §6).

## 5. API Key Audit

### 5a. BYOK round-trip (`manage-api-keys` + `validate-api-key`)

Probed end-to-end with the test-user JWT:

| Step | Endpoint | Status | Result |
|------|----------|--------|--------|
| 1. Validate bogus OpenAI key | `POST /validate-api-key` | 200 | `ok:false` with provider's real "Incorrect API key" reply (key correctly *masked* in error) — **validator path works end-to-end** |
| 2. List keys (initial) | `GET /manage-api-keys` | 200 | `{keys:[],byok_enabled:false,byok_provider:null}` — empty as expected |
| 3. Save validated key | `POST /manage-api-keys` | 503 | **🔴 BLOCKED — `encryption_not_configured`**: `API_KEY_ENCRYPTION_SECRET must be a 64-character hex string (got 48 chars). BYOK key storage is unavailable until this secret is correctly configured.` |
| 4. List keys (after) | `GET /manage-api-keys` | 200 | still empty (insert blocked) |
| 5. Toggle `byok_enabled` | `PATCH /manage-api-keys` | 200 | `{ok:true}` — toggle path works |
| 6. Delete saved key | `DELETE /manage-api-keys?id=...` | n/a | skipped (no key to delete) |

**Verdict:** validator (`validate-api-key`) is GREEN, list/toggle paths of `manage-api-keys` are GREEN, but **the save (POST) path is RED — entire BYOK feature non-functional in production until `API_KEY_ENCRYPTION_SECRET` is rotated to a 64-char hex string.** Issue C1 in §6.

### 5b. System keys (`admin-ai-ops#inspect-keys`)

This handler returns each managed-pool slot's last-success timestamp + masked tail. It is gated by DevKit HMAC bearer auth (`requireAdminAuth`) — **the audit cannot mint that bearer without `DEV_KIT_PASSWORD` HMAC**, so we probed only the negative path:

| Probe | Status | Result |
|-------|--------|--------|
| `POST /admin-ai-ops` with test-user JWT + `x-admin-ai-op: inspect-keys` | 401 | `{success:false,error:"Unauthorized"}` — admin gate enforced |

Positive-path verification deferred to Playwright spec `tests/e2e/devkit-admin-ai-keys.spec.ts` (already covers this). **Per task brief: no leak check performed.**

### 5c. Live model invocation (`ai-health` + `ai-test`)

Both real model invocations succeeded *and* exposed an auth-drift issue (see §6):

| Endpoint | Status | Provider used | Latency | Notes |
|----------|--------|---------------|---------|-------|
| `POST /ai-health` (test-user JWT) | 200 | `groq:1` | 490 ms | `status:"healthy"`, no error code. Pool is alive. |
| `POST /ai-test` (test-user JWT, body `{}`) | 200 | `deepseek:1` (`deepseek-v4-flash`) | 1546 ms | Returned `"Hello!"` reply. Pool routing + DeepSeek pre-warming are working. |
| `POST /ai-health` (anon-only) | 401 | — | — | `{error:"Authentication required"}` — admin gate present in *anon* mode but **not** in test-JWT mode → Critical drift C2 in §6. |
| `POST /ai-test` (test-user JWT, `{provider:"groq"}`) | 401 | — | — | `{success:false,error:"Unauthorized"}` — drifts depending on body shape; second call rejected, first call accepted. Suggests the auth check runs *after* parsing body and only fires on certain branches. |

Reachable model providers (from probe responses): **Groq** (slot 1, 490 ms), **DeepSeek** (slot 1, 1546 ms via OpenRouter pool). Both keys are live.


## 6. Prioritized Issues

### 🔴 Critical (3)

**C1. BYOK key storage broken — `API_KEY_ENCRYPTION_SECRET` is 48 chars, must be 64-hex.** Every `POST /manage-api-keys` returns 503 `encryption_not_configured`. End-user impact: nobody can save a BYOK key in production. Fix is a single-secret rotation (out of scope for this audit). File: `supabase/functions/manage-api-keys/index.ts` (validation throws on key derivation).

**C2. `ai-health` and `ai-test` accept any authenticated user JWT.** Probed with our task-#61 test user (no DevKit/admin role) and both endpoints (a) ran a real paid model call and (b) returned 200 with provider/latency telemetry. Combined risk: any signed-in user can (i) probe internal AI provider rotation telemetry and (ii) drain pool rate budget. Both functions are gated against *anon* but not against *non-admin authenticated*. The auth check appears to run conditionally on body shape (`ai-test` rejected the second probe with a `provider` field). File: `supabase/functions/ai-health/index.ts`, `supabase/functions/ai-test/index.ts`.

**C3. `verify-email` returns 503 `SITE_URL is not configured` on every call.** Email verification is fully broken in production until `SITE_URL` is set as a Supabase function secret. End-user impact: any new email-verification flow that hits this endpoint returns a confusing 503 with no UI fallback. File: `supabase/functions/verify-email/index.ts`.

### 🟠 High (4)

**H1. 12 functions return 5xx on unauthenticated POST instead of 401** (parity drift). When a function is configured `verify_jwt=false`, the gateway forwards the request and the function body's manual auth check throws to the outer try/catch which returns 500. The browser then surfaces "Internal server error" for what should be a clean "session expired". List: `career-assessment`, `career-path-advisor`, `company-briefing`, `generate-resignation-letter`, `manage-api-keys`, `one-page-optimizer`, `optimize-for-linkedin`, `parse-resume`, `recruiter-simulation`, `score-resume`, `smart-fit-rewrite`, `validate-api-key`. Pattern fix: have each `requireAuth` helper return a 401 `Response` instead of throwing.

> **RESOLVED 2026-05-03 (Task #65, Phase 1).** Root cause was the shared `toUserError(error)` helper in `_shared/aiClient.ts` falling through `AuthError` to its generic `error instanceof Error → status:500` branch. Patched `toUserError` to duck-type `AuthError` (`error.name === 'AuthError'` + numeric `error.status`) and surface the original 401. The two outliers — `manage-api-keys` and `validate-api-key` — used hardcoded `status: 500` catches; both now check for `AuthError` and return 401 in the same way. All 12 functions redeployed and re-probed via `node /tmp/audit/reprobe-h1.mjs` — every one now returns `401 {"error":"...","message":"Missing authorization header"}` on no-auth POST. `requireAuth` itself is unchanged so authenticated paths and the impersonation-revocation check continue to behave identically.

**H2. `smart-fit-rewrite` returns 200 on empty body** (`{success:true,outcomes:[]}`). Possibly intentional (graceful no-op) but means a malformed client call silently succeeds with no outcome — which a UI can mistake for "completed". Verify with PM intent.

**H3. Orphan candidates (zero source caller, not router/webhook/cron):** `admin-check-access`, `export-portfolio-pdf`, `generate-question-bank`, `hard-purge`, `mobile-config`, `og-image`, `parse-resume`, `revenuecat-webhook`, `send-push`, `suggest-template`. Each is a deployment-slot occupant with no traceable invocation. Per task brief, **do not delete in this audit**, but each warrants confirmation in a downstream task.

**H4. `auth-email-hook` and `kinde-webhook` returned 401 `{error:"Unauthorized"}` when probed with our test JWT.** This is correct (HMAC-signed webhooks reject any non-signature bearer) but means the audit cannot positively verify the signature path without the signing secret. Verification is currently only via Playwright spec `tests/e2e/auth-flow.spec.ts` and integration test `tests/e2e/kinde-webhook.spec.ts` — no live production probe.

> **RESOLVED 2026-05-03 (Task #65, Phase 1).** Added `scripts/probe-webhooks-signed.mjs` and wired it into `.github/workflows/deploy-edge-functions.yml` as a final post-deploy step (after `npm run smoke:functions`). Each webhook gets a probe **pair**:
>
> - **Positive** — payload signed with the real `SUPABASE_AUTH_HOOK_SECRET` (Standard Webhooks v1, `whsec_<base64>` aware) or `KINDE_WEBHOOK_SECRET` (HMAC-SHA256 hex, `X-Kinde-Signature: sha256=<hex>`). Asserts **200** for both endpoints, proving we got past the signature gate AND the function returned a clean happy-path response:
>   - `auth-email-hook` → **200**. To make this side-effect-free, the function now honours a `__probe: true` payload flag: once the Standard Webhooks signature is verified, the function short-circuits to `200 {ok:true,probe:true}` *without* calling Resend. The flag is meaningless without a valid signature, so the branch is unreachable from the public internet without `SUPABASE_AUTH_HOOK_SECRET`.
>   - `kinde-webhook`  → **200**. Probe sends `type: "user.updated"` so the function acks 200 without invoking `provisionUser`.
> - **Negative** — same payload re-signed with `WRONG_SECRET_DO_NOT_USE`. Asserts **401** for both functions, proving the signature path actually rejects mismatched signatures (not just missing ones).
>
> Both probes must hit their expected status for the run to pass; the workflow step fails (exit 1) on any deviation. The script SKIPs (exit 0) when either secret is missing, so it is non-blocking on forks.
>
> **Live verification (2026-05-03, project `jnsfmkzgxsviuthaqlyy`):**
> - `kinde-webhook` positive: HTTP **200** body `{"received":true,"processed":false}` — PASS
> - `kinde-webhook` negative: HTTP **401** body `{"error":"Unauthorized"}` — PASS
> - `auth-email-hook` negative: HTTP **401** body `{"error":"Unauthorized"}` — PASS
> - `auth-email-hook` positive: not run — `SUPABASE_AUTH_HOOK_SECRET` is a Supabase-reserved name and cannot be set via the Function Secrets API or `supabase secrets set` (CLI returns `Env name cannot start with SUPABASE_, skipping`). It is provisioned by the Supabase Auth "Send Email Hook" config in the project dashboard. CI runs the positive probe against the real value via the GitHub `secrets.SUPABASE_AUTH_HOOK_SECRET` env, which the operator pastes from that dashboard page.

### 🟡 Medium (3)

**M1. CORS preflight on `wise-ai-chat` returns 204 instead of 200.** Other 73 functions return 200. Functionally equivalent (both are success responses), but inconsistent with the shared CORS helper. File: `supabase/functions/wise-ai-chat/index.ts`.

**M2. 4 functions have no `[functions.<name>]` entry in `supabase/config.toml`** (`verify_jwt=unset`): `export-portfolio-pdf`, `mobile-config`, `revenuecat-webhook`, `send-push`. They default to `verify_jwt=true` at the gateway, which means anon callers cannot reach them. For `mobile-config` and `export-portfolio-pdf` this is fine (always called with auth). For `revenuecat-webhook` and `send-push` it depends on how RevenueCat / push triggers authenticate — review.

**M3. 16 standalone admin functions have no leading docstring** in `index.ts` (audited via `/** ... */` extraction). Listed in §1 inventory. Operability cost only; no runtime impact.

### 🟢 Low (2)

**L1. 9 merged routers concentrate ~40 legacy slugs into single deployments.** All routers are GREEN (verified end-to-end via Playwright + this audit's router-dispatch probes: `coupons` 200 valid:false, `wisehire-access` 200 with format-check payload, `mobile-api` 200 `{ok:true}`, etc.). No action — noting as healthy state.

**L2. All 74 deployed functions are <11 minutes old** (newest `admin-user-ops` at 2026-05-03 05:05:52Z, oldest `admin-check-access` at 2026-05-03 05:00:27Z). Force-redeploy at session start cleared the prior 3-hour staleness on `wise-ai-chat` / `token-exchange`. Monitor with `scripts/check-edge-functions-deployed.mjs` to detect drift.


## 7. GREEN / YELLOW / RED Verdicts

**Summary:** 🟢 59 GREEN  •  🟡 14 YELLOW  •  🔴 1 RED

### 🔴 RED (1)

- `verify-email` — noauth→503 (gateway should 401 first); auth→503 ({"success":false,"error":"SITE_URL is not configured"})

### 🟡 YELLOW (14)

- `ai-health` — AUTH DRIFT: 200 for non-admin test JWT (expected admin-only)
- `ai-test` — AUTH DRIFT: 200 for non-admin test JWT (expected admin-only)
- `career-assessment` — noauth→500 (gateway should 401 first)
- `career-path-advisor` — noauth→500 (gateway should 401 first)
- `company-briefing` — noauth→500 (gateway should 401 first)
- `generate-resignation-letter` — noauth→500 (gateway should 401 first)
- `manage-api-keys` — noauth→500 (gateway should 401 first)
- `one-page-optimizer` — noauth→500 (gateway should 401 first)
- `optimize-for-linkedin` — noauth→500 (gateway should 401 first)
- `parse-resume` — noauth→500 (gateway should 401 first)
- `recruiter-simulation` — noauth→500 (gateway should 401 first)
- `score-resume` — noauth→500 (gateway should 401 first)
- `smart-fit-rewrite` — noauth→500 (gateway should 401 first)
- `validate-api-key` — noauth→500 (gateway should 401 first)

### 🟢 GREEN (59)

`admin-ai-ops`, `admin-audit-logs`, `admin-check-access`, `admin-config`, `admin-delete-user`, `admin-devkit-data`, `admin-email`, `admin-get-identity`, `admin-impersonate`, `admin-kinde-reconcile`, `admin-list-user-content`, `admin-list-users`, `admin-merge-identity`, `admin-moderation`, `admin-onboarding-funnel`, `admin-owner-ops`, `admin-portfolio-usernames`, `admin-save-note`, `admin-user-ops`, `admin-wisehire`, `agentic-chat`, `analyze-resume`, `ask-portfolio`, `auth-email-hook`, `coupons`, `create-portfolio-session`, `detect-and-humanize`, `export-portfolio-pdf`, `generate-cover-letter`, `generate-portfolio-bio`, `generate-question-bank`, `hard-purge`, `kinde-webhook`, `me`, `mobile-api`, `mobile-config`, `og-image`, `parse-job`, `portfolio-public`, `resume-section-ai`, `revenuecat-webhook`, `send-password-reset`, `send-push`, `suggest-template`, `tailor-resume`, `token-exchange`, `transactional-email`, `verify-dev-kit`, `weekly-digest`, `wise-ai-chat`, `wisehire-access`, `wisehire-bulk-screen`, `wisehire-generate-brief`, `wisehire-invite-reminder`, `wisehire-mask-cvs`, `wisehire-send-outreach`, `wisehire-talent-search`, `wisehire-talent-view`, `wisehire-write-jd`


## Appendix A — Probe Methodology

- **Test user:** `00000000-0000-4000-8000-000000000061` / `edge-audit-test@wiseresume.test`, idempotently created via Supabase Auth Admin API.
- **JWT:** HS256-signed with `SUPABASE_JWT_SECRET`, 1h TTL, `role:"authenticated"`, `aud:"authenticated"`. No admin/HR/devkit claims.
- **Anon key:** fetched live from `GET /v1/projects/<ref>/api-keys` (Management API).
- **Probes per function (4):** `OPTIONS` (CORS preflight), `POST {}` no-auth, `POST {}` test-JWT + apikey, `POST {}` anon-only. Concurrency 8.
- **Body byte-count probes** (router dispatch): `coupons` (validate), `resume-section-ai` (explain-gap), `transactional-email` (contact-request), `wisehire-access` (waitlist-check-email), `mobile-api` (register-push-token), `parse-job` (text), `portfolio-public` (get_portfolio).
- **BYOK round-trip:** validate-bad-key → list → save (BLOCKED) → list-after → toggle-byok → delete (skipped).
- **Source-caller scan:** `rg -F -l '"<fn>"' '\'<fn>'\''` across `src/`, `mobile/`, `server/` excluding `supabase/functions/`, `node_modules/`, build dirs, reports, `.local/`, `tests/e2e/`.
- **Auth-posture detection:** ripgrep on each `supabase/functions/<fn>/index.ts` for `requireAdminAuth`/`assertAdmin`/`verifyDevKitToken` (admin), `requireAuth(req)`/`getUser(token)` (user-jwt), `x-cron-secret`/`CRON_SECRET` (cron), `HMAC`/`svix-signature`/`crypto.subtle.verify`/`webhook.*[Ss]ecret` (webhook).
- **Verdict heuristic:** RED if CORS preflight fails or 2+ structural drifts; YELLOW if 1 structural drift (5xx noauth, 503 auth, etc.); else GREEN. Auth-drift on `ai-health`/`ai-test` is reported separately as Critical regardless of color band.
- **Out-of-band gaps:** admin-only positive paths (`admin-*`, `ai-test`, `ai-health` admin telemetry) are not exercised here — they require a DevKit HMAC bearer keyed off `DEV_KIT_PASSWORD`, which the audit script does not mint. Coverage is provided by the existing Playwright admin specs (#14–#23).

## Appendix B — Raw Probe Data

Probe artefacts (kept under `/tmp/audit/` during the session, not committed): `probes.json`, `router-probes.json`, `keyaudit.json`, `deployed_map.json`, `verify_jwt.json`, `caller_counts.txt`, `postures.txt`. Reproduce by re-running:

```bash
# (Run from project root — requires SUPABASE_ACCESS_TOKEN, SUPABASE_JWT_SECRET, SUPABASE_SERVICE_ROLE_KEY)
node /tmp/audit/mint.mjs       # provision test user + mint JWT
node /tmp/audit/probe.mjs      # 4 probes × 74 functions, conc=8
node /tmp/audit/keyaudit.mjs   # BYOK round-trip + system key
node /tmp/audit/router-probe.mjs # router dispatch sanity
```
