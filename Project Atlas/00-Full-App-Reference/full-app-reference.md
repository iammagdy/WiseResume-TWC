# WiseResume / WiseHire — Full App Reference
**Last updated:** 2026-05-05  
**App version:** 3.11.5  
**Live URL:** https://resume.thewise.cloud  
**GitHub repo:** `iammagdy/WiseResume-TWC` (branch: `main`)

> This document is the single authoritative reference for any AI agent, engineer, or
> stakeholder who needs to understand the complete WiseResume + WiseHire platform.
> It covers architecture, all edge functions, all database tables, all frontend routes,
> all API endpoints, AI infrastructure, credits system, auth flow, deployment pipeline,
> and every major feature. Nothing here is guessed — every item comes from verified
> source files.

---

## 1. Platform Overview

WiseResume is a full-stack AI-powered career platform with two products:

| Product | Audience | Entry URL |
|---------|----------|-----------|
| **WiseResume** | Job seekers — AI resume builder, tailoring, cover letters, portfolios, interview coaching | `/dashboard` |
| **WiseHire** | Recruiters / hiring companies — candidate screening, JD writing, talent pool, outreach | `/wisehire/dashboard` |

Both products share the same Supabase project, Kinde tenant, and AI provider pool. Access is controlled by plan gates and the `WiseHireGuard` component.

---

## 2. Tech Stack

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| Routing | React Router v6 |
| State management | Zustand + TanStack Query (React Query) |
| UI components | Tailwind CSS + shadcn/ui + Radix UI |
| Forms | React Hook Form + Zod |
| Animations | Framer Motion |
| Error tracking | Sentry |
| Push notifications | Web Push API (service worker) |

### Backend
| Layer | Technology |
|-------|-----------|
| Database | Appwrite Cloud (Frankfurt) |
| Edge functions | Supabase Edge Functions (Deno) — 2 Smart Hubs (AI-Gateway, Auth-Master) |
| Express server | Node.js server (`server/index.ts`) — handles BFF routes |
| Authentication | Appwrite Auth (JWT, JWKS-verified server-side) |
| AI providers | OpenRouter, Groq, DeepSeek (flat pool — up to 9 keys) |
| Email | Resend |
| Payments | RevenueCat (mobile) + Kinde-based plan management (web) |
| File delivery | Hostinger shared hosting (FTP → `/public_html/resume/`) |
| OG images | Edge function `og-image` |

### Mobile
| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 51 + Expo Router 3.5 |
| Platforms | iOS + Android |
| Auth | Kinde PKCE via `expo-auth-session` → `token-exchange` edge function |
| Push | Expo Notifications → `send-push` edge function |
| Payments | RevenueCat → `revenuecat-webhook` edge function |

### Key environment variables (frontend, baked into Vite build)
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_KINDE_CLIENT_ID
VITE_KINDE_DOMAIN          # auth.thewise.cloud (custom Kinde domain, split 2026-05-03)
VITE_SENTRY_DSN
BUILD_COMMIT               # injected at build time for version footer
BUILD_TIME
```

---

## 3. Authentication & Identity

### Auth provider: Kinde
- Custom domain: **`auth.thewise.cloud`** (separated from app domain 2026-05-03)
- Flow: Kinde issues a JWT → verified server-side via JWKS
- Bridge: `token-exchange` edge function mints a Supabase-compatible token so the
  frontend can call Supabase directly (RLS-aware queries)
- Impersonation: admins can act-as any user via `admin-impersonate`; revocations
  tracked in `impersonation_revocations` table

### Admin DevKit
- URL: `/devkit`
- Password-protected: `DEV_KIT_PASSWORD` (Supabase secret), verified by
  `verify-dev-kit` edge function
- Sessions stored in `admin_sessions` table
- All admin edge functions wrapped by `requireAdminAuth` from
  `_shared/adminAuth.ts`

### RLS & service role
- User-facing Supabase queries use the bridge token (RLS enforced)
- Edge functions use `getServiceClient()` from `_shared/dbClient.ts` (service role,
  bypasses RLS — used for admin and cross-user operations)

---

## 4. Subscription Plans & AI Credits

### Plans
| Plan | Daily AI Credits | Price |
|------|-----------------|-------|
| free | 5 | $0 |
| pro | 100 | $9/mo |
| premium | Unlimited (stored as `-1`) | $19/mo |

Source of truth: `supabase/functions/_shared/creditLimits.json`  
Both `src/lib/planConfig.ts` (frontend) and `supabase/functions/_shared/planLimits.ts`
(edge functions) import from this JSON — they cannot drift.

### Credit flow
1. User triggers an AI action (e.g. tailor-resume)
2. Edge function calls `checkAndDeductCredit(userId)` from `_shared/creditUtils.ts`
3. If `daily_usage >= daily_limit` (and limit ≠ -1), returns 429 credit exhausted
4. On success, increments `ai_credits.daily_usage` and logs to `ai_usage_logs`
5. Credits reset daily (cron resets `daily_usage = 0` at midnight UTC)

### Trial system
- Fields: `subscriptions.trial_plan`, `subscriptions.trial_expires_at`
- `useAICredits` hook detects active trial, computes `trialDaysLeft`
- Dirty-state guard: if `trial_plan` is set but `trial_expires_at` is null,
  treated as inactive (not active trial)

### BYOK (Bring Your Own Key) — REMOVED
- Fully removed from all user-facing code (Task #17, merged 2026-05-05)
- `manage-api-keys` edge function returns **410 Gone** (tombstone)
- `useAIKeyHydration` hook is a no-op stub
- `user_api_keys` table kept in DB (out of scope for removal)
- DevKit BYOK section marked "(Retired)"

---

## 5. AI Infrastructure

### Provider pool (flat pool architecture)
The AI system uses a flat pool of up to **9 keys** across 3 providers:
- **OpenRouter** — 3 key slots (primary managed provider)
- **Groq** — 3 key slots (fast structured-output path)
- **DeepSeek** — 3 key slots

Selection: provider chosen uniformly at random among those with at least one key
configured; then a random key within that provider is used.  
Fallback: one sibling-key retry, then cross-provider fallback.

### AI routing config (`ai_routing_config` table)
Per-feature routing overrides the random pool:
- `feature_name` → `provider` + `model`
- Supports A/B splits: `ab_secondary_provider`, `ab_secondary_model`, `ab_split_pct`
- Configured via admin DevKit → AI Routing panel
- Resolved by `_shared/modelRouter.ts` → `resolveFeatureRoute(featureName)`

### Model constants (`_shared/modelDefaults.ts`)
```
WISERESUME_OPENROUTER_MODEL  = 'google/gemma-4-31b-it:free'
WISERESUME_OPENROUTER2_MODEL = 'openai/gpt-oss-120b:free'
WISERESUME_GROQ_MODEL        = 'llama-3.3-70b-versatile'
```

### AI model catalog cron (Task #15)
- Cron in Supabase calls `exec_refresh_ai_test_models()` PG function
- Resolves edge-function URL from GUC `app.edge_functions_url` at call time
  (env-portable, falls back to production URL if GUC unset)
- Applied in migration `20260606000000_configure_ai_model_catalog_cron.sql`

### Feature flags (`_shared/featureFlags.ts`)
Precedence (highest → lowest):
1. Kill switch — if `kill_switch_function` is set → returns FALSE (caller should 503)
2. Per-user override — if userId in `enabled_user_ids` → TRUE
3. Per-plan — if plan in `enabled_plans` → TRUE
4. Percentage rollout — deterministic hash of userId vs `percentage_rollout`
5. Global default — `enabled_globally`

`isKillSwitchActive(functionName)` — called at top of every edge function handler.

### Shared modules in `supabase/functions/_shared/`
```
adminAuth.ts         aiClient.ts           aiTestModelCatalog.ts
authMiddleware.ts    botGuard.ts           contentModeration.ts
cors.ts              creditLimits.json     creditUtils.ts
dbClient.ts          encryption.ts         featureFlags.ts
fnLogger.ts          htmlEscape.ts         industryKeywords.ts
jwtUtils.ts          letterPersistence.ts  logger.ts
modelDefaults.ts     modelRouter.ts        opsHealth.ts
pdfRenderer.ts       planLimits.ts         portfolioBioPrompt.ts
portfolioSession.ts  profileContext.ts     providers.ts
provisionUser.ts     rateLimiter.ts        requestUtils.ts
resendAudiences.ts   resendConfig.ts       scoringFunctions.ts
scrubSecrets.ts      smokeTest.ts          urlSafety.ts
userRateLimiter.ts   webhookAuth.ts
```

---

## 6. Edge Functions (73 total)

Functions live in `supabase/functions/<name>/index.ts`.  
Auth: most user functions use JWT from `Authorization: Bearer <token>`.  
Admin functions additionally call `requireAdminAuth()` from `_shared/adminAuth.ts`.

### 6.1 Admin Panel Functions (20)

| Function | Description |
|----------|-------------|
| `admin-ai-ops` | Admin AI ops: refresh AI model catalog, manage routing config |
| `admin-audit-logs` | Fetch admin audit log entries with filtering and pagination |
| `admin-check-access` | Verify caller has admin-level access (used by DevKit bootstrap) |
| `admin-config` | Read/write `app_settings` rows (maintenance mode, feature flags, etc.) |
| `admin-delete-user` | Hard-delete a user and all their data from Kinde + Supabase |
| `admin-devkit-data` | Aggregate dashboard data for DevKit overview panel |
| `admin-email` | Send admin-composed transactional emails via Resend |
| `admin-get-identity` | Fetch Kinde identity details for a given user ID |
| `admin-impersonate` | Create impersonation session; log to `impersonation_revocations` |
| `admin-kinde-reconcile` | Reconcile Kinde user list with Supabase profiles table |
| `admin-list-user-content` | List all content (resumes, cover letters, etc.) for a specific user |
| `admin-list-users` | Paginated user list with plan, credits, and activity data |
| `admin-merge-identity` | Merge two Kinde identities into a single user account |
| `admin-moderation` | Flag, review, or clear user content moderation flags |
| `admin-onboarding-funnel` | Analytics on onboarding step completion rates |
| `admin-owner-ops` | Owner-only destructive ops (data purge, emergency access) |
| `admin-portfolio-usernames` | List and manage portfolio public usernames |
| `admin-save-note` | Save admin internal notes on a user profile |
| `admin-user-ops` | Update user plan, credits, flags, or subscription state |
| `admin-wisehire` | WiseHire-specific admin ops (access grants, waitlist management) |

### 6.2 AI Core Functions (11)

| Function | Description |
|----------|-------------|
| `agentic-chat` | Multi-turn agentic chat with tool use (resume edit, delete, update, search) |
| `ai-health` | Returns AI provider health status across all configured key slots |
| `ai-test` | Admin: test individual AI key slots with model catalog; DevKit AI panel |
| `analyze-resume` | Deep resume analysis: ATS score, keyword gaps, improvement suggestions |
| `career-assessment` | Career path assessment quiz with AI-generated coaching recommendations |
| `detect-and-humanize` | Detects AI-written text and rewrites it to sound more human |
| `editor-ai` | Router for 4 editor AI actions (see sub-actions below) |
| `recruiter-simulation` | Simulates a recruiter reviewing the resume; returns candid feedback |
| `resume-section-ai` | AI rewrites or improves a single resume section (experience, summary, etc.) |
| `score-resume` | Scores a resume 0-100 with breakdown by category |
| `wise-ai-chat` | General-purpose AI chat assistant for career questions |

**`editor-ai` sub-actions** (dispatched via `x-editor-ai-action` header or `body.action`):
- `analyze` — full resume analysis
- `recruiter-sim` — recruiter simulation
- `suggest-template` — recommend best resume template for the user's profile
- `optimize-for-linkedin` — LinkedIn profile optimization suggestions

### 6.3 Document Generation Functions (5)

| Function | Description |
|----------|-------------|
| `generate-cover-letter` | AI-generated cover letter tailored to a specific job posting |
| `generate-portfolio-bio` | AI-generated professional bio for the portfolio site |
| `generate-question-bank` | Generates interview question bank for a given job/industry |
| `generate-resignation-letter` | AI-generated professional resignation letter |
| `smart-fit-rewrite` | Rewrites resume bullets to better fit a target job description |

### 6.4 Job & Tailoring Functions (4)

| Function | Description |
|----------|-------------|
| `parse-job` | Parses a job posting URL or text into structured fields |
| `parse-resume` | Parses an uploaded resume PDF/DOCX into structured JSON |
| `tailor-resume` | AI-tailors a resume to a specific job description |
| `suggest-template` | Recommends the best resume template for a user profile |

### 6.5 Portfolio Functions (4)

| Function | Description |
|----------|-------------|
| `ask-portfolio` | AI Q&A over a public portfolio (used by portfolio visitors) |
| `create-portfolio-session` | Creates a session token for a portfolio editor session |
| `export-portfolio-pdf` | Server-side renders the portfolio to PDF and returns download URL |
| `portfolio-public` | Serves public portfolio data for the `p/:username` page |

### 6.6 WiseHire Functions (9)

| Function | Description |
|----------|-------------|
| `wisehire-access` | Checks and grants WiseHire product access for a given user |
| `wisehire-bulk-screen` | Bulk-screens multiple candidates against a job description |
| `wisehire-generate-brief` | Generates a company/role brief for a talent search |
| `wisehire-invite-reminder` | Sends reminder emails for pending WiseHire invitations |
| `wisehire-mask-cvs` | Anonymizes candidate CVs for bias-free screening |
| `wisehire-send-outreach` | Sends AI-personalized outreach emails to candidates |
| `wisehire-talent-search` | AI-powered talent pool search with scoring |
| `wisehire-talent-view` | Fetch a single candidate's full talent pool profile |
| `wisehire-write-jd` | AI-generates a full job description from a brief |

### 6.7 Auth & Identity Functions (8)

| Function | Description |
|----------|-------------|
| `auth-email-hook` | Supabase auth hook — intercepts email events (verify, reset) |
| `kinde-webhook` | Receives Kinde user lifecycle webhooks (created, updated, deleted) |
| `me` | Returns the current user's full profile, subscription, credits, and settings |
| `send-password-reset` | Sends password reset email via Resend |
| `token-exchange` | Exchanges a Kinde JWT for a Supabase-compatible session token |
| `validate-api-key` | Validates a provider API key format (admin use) |
| `verify-dev-kit` | Verifies DevKit password, creates `admin_sessions` row |
| `verify-email` | Handles email verification flow post-signup |

### 6.8 Infrastructure & Ops Functions (12)

| Function | Description |
|----------|-------------|
| `company-briefing` | Generates or fetches a company briefing for a given company name |
| `coupons` | Coupon code validation and application for plan upgrades |
| `hard-purge` | Admin-only: completely purge a user's data from the system |
| `manage-api-keys` | **410 Gone** — BYOK tombstone (BYOK feature removed Task #17) |
| `mobile-api` | Mobile BFF — aggregated data endpoint for the Expo app |
| `mobile-config` | Returns runtime config for the mobile app (feature flags, URLs) |
| `og-image` | Generates Open Graph images for resume share links |
| `revenuecat-webhook` | Processes RevenueCat subscription events for mobile IAP |
| `send-push` | Sends push notifications to registered devices |
| `transactional-email` | Sends system transactional emails (welcome, digest, alerts) |
| `weekly-digest` | Cron-triggered: sends weekly activity digest emails to active users |
| `optimize-for-linkedin` | LinkedIn profile optimization (also available as editor-ai sub-action) |

---

## 7. Database Tables (55 tables)

All tables are in the `public` schema unless noted. RLS enabled on user-facing tables.

### 7.1 User & Auth
| Table | Description |
|-------|-------------|
| `profiles` | Core user profile: name, email, avatar, onboarding state, plan |
| `subscriptions` | Plan, trial state, trial expiry, Kinde subscription ID |
| `user_preferences` | Per-user UI preferences (theme, language, notifications) |
| `user_gamification` | Gamification points, streaks, achievement state |
| `signup_otps` | OTP tokens for email verification at signup |
| `token_exchanges` | Records of Kinde→Supabase token exchange sessions |
| `admin_sessions` | DevKit admin sessions (created by `verify-dev-kit`) |
| `impersonation_revocations` | Audit trail of admin impersonation start/end events |

### 7.2 AI & Credits
| Table | Description |
|-------|-------------|
| `ai_credits` | Per-user daily credits: `daily_usage`, `daily_limit`, `usage_date` |
| `ai_usage_logs` | Every AI call: function, tokens, model, provider, duration, cost |
| `ai_routing_config` | Per-feature AI provider routing overrides with A/B split config |
| `credit_transactions` | Ledger of credit additions, deductions, plan changes |
| `tool_cache` | Cached AI responses to avoid redundant calls (keyed by hash) |

### 7.3 Resumes
| Table | Description |
|-------|-------------|
| `resumes` | Root resume record: title, template, user_id, created/updated |
| `resume_experiences` | Work experience entries linked to a resume |
| `resume_educations` | Education entries linked to a resume |
| `resume_skills` | Skills list linked to a resume |
| `resume_certifications` | Certifications linked to a resume |
| `resume_versions` | Version snapshots of a full resume (for history/undo) |
| `resume_shares` | Share tokens for the public resume preview (`/share/:token`) |
| `share_comments` | Comments on shared resumes (recruiter feedback) |
| `tailor_history` | Records of AI tailoring runs with before/after diff |

### 7.4 Documents
| Table | Description |
|-------|-------------|
| `cover_letters` | Cover letter documents linked to a user and optional job |
| `resignation_letters` | Resignation letter documents |
| `career_assessments` | Saved career assessment quiz results and AI recommendations |

### 7.5 Jobs & Applications
| Table | Description |
|-------|-------------|
| `jobs` | Saved job postings (URL, parsed fields, company, role) |
| `job_applications` | Application tracker: status, notes, dates, linked resume |
| `messages` | In-app messages (recruiter outreach, system messages) |

### 7.6 Portfolio
| Table | Description |
|-------|-------------|
| `portfolio_settings` | Public portfolio config: username, bio, theme, visibility |
| `portfolio_history` | Snapshot history of portfolio edits |
| `portfolio_visits` | Visitor analytics: IP hash, referrer, timestamp |
| `portfolio_interactions` | Click/interaction events on portfolio sections |
| `social_links` | User's social/professional links shown on portfolio |

### 7.7 Chat & Interview
| Table | Description |
|-------|-------------|
| `chat_sessions` | AI chat session metadata |
| `chat_messages` | Individual messages within a chat session |
| `interview_sessions` | Interview coaching session records |
| `interview_question_bank` | Generated interview question sets linked to a session |

### 7.8 Notifications & Communications
| Table | Description |
|-------|-------------|
| `notifications` | In-app notification feed (unread count, mark-read) |
| `push_subscriptions` | Web push subscription endpoints for browser push |
| `device_push_tokens` | Expo push tokens for mobile push notifications |
| `contact_inquiries` | Contact form submissions from the public site |

### 7.9 Company & WiseHire
| Table | Description |
|-------|-------------|
| `company_briefings` | Cached company briefings generated by `company-briefing` |

### 7.10 Admin & Ops
| Table | Description |
|-------|-------------|
| `app_settings` | Key-value runtime config (maintenance mode, feature flags, AI engine) |
| `admin_audit_log` | Admin action audit trail (who did what, when) |
| `audit_logs` | General audit log for security-sensitive operations |
| `bug_reports` | In-app bug reports submitted by users |
| `feature_requests` | In-app feature requests submitted by users |
| `error_log` | Server-side error log (edge function errors, unexpected exceptions) |
| `ops_health_events` | Operational health events (degradations, recoveries, incidents) |
| `usage_events` | Product analytics events (feature used, page viewed, etc.) |
| `rpc_rate_limits` | Rate limit state for RPC-level calls |

### 7.11 Mobile & Store
| Table | Description |
|-------|-------------|
| `mobile_app_versions` | Mobile app version manifest (min version, force-update flag) |
| `store_screenshots` | App Store / Play Store screenshot management |

### 7.12 Misc
| Table | Description |
|-------|-------------|
| `short_links` | URL shortener records (`/l/:linkId`) |
| `user_api_keys` | Legacy BYOK table — kept in DB, no longer written by app |

---

## 8. Express Server API Endpoints (`server/index.ts`)

The Express server runs alongside the Vite frontend (BFF pattern). All
`/api/data/*` routes require `Authorization: Bearer <kindeJwt>` header.

### Public endpoints
```
GET  /api/health                    Health check
GET  /api/ai-health                 AI provider pool health
GET  /api/db-health                 Database connectivity check
```

### Auth endpoints
```
POST /api/auth/reset-password       Trigger password reset email
POST /api/fn/token-exchange         Proxy to token-exchange edge function
```

### Resume data endpoints
```
GET    /api/data/resumes            List user's resumes
GET    /api/data/resumes/:id        Get single resume
POST   /api/data/resumes            Create resume
DELETE /api/data/resumes/:id        Delete single resume
DELETE /api/data/resumes            Bulk delete resumes
GET    /api/data/resumes/exists/:id Check if resume exists
```

### Profile & user endpoints
```
GET  /api/data/profile              Get current user profile
GET  /api/data/me                   Full user context (same as `me` edge fn)
GET  /api/data/portfolios/me        Get user's portfolio settings
GET  /api/data/activity-rows        Recent user activity feed
GET  /api/data/job-activity-rows    Job-related activity feed
GET  /api/data/hr-analytics         HR analytics dashboard data
```

### Jobs endpoints
```
GET    /api/data/jobs               List saved jobs
GET    /api/data/jobs/:id           Get single job
POST   /api/data/jobs               Save a job posting
DELETE /api/data/jobs/:id           Delete a job
```

### Notifications endpoints
```
GET    /api/data/notifications              Notification feed
GET    /api/data/notifications/unread-count Unread count
POST   /api/data/notifications/mark-read    Mark notifications read
POST   /api/data/notifications/mark-all-read Mark all read
DELETE /api/data/notifications/:id          Delete notification
DELETE /api/data/notifications              Clear all notifications
```

### Resume shares, short links, push subscriptions
```
GET    /api/data/resume-shares
POST   /api/data/resume-shares
DELETE /api/data/resume-shares/:id
GET    /api/data/short-links
POST   /api/data/short-links
DELETE /api/data/short-links/:id
POST   /api/data/push-subscriptions
DELETE /api/data/push-subscriptions
```

### Other endpoints
```
GET  /api/data/portfolio-analytics  Portfolio visitor analytics
POST /api/fetch-url                 Proxied URL fetch (rate-limited)
POST /api/linkedin-profile          LinkedIn profile import (rate-limited)
POST /api/track-handle-interest     Track WiseHire waitlist interest
```

---

## 9. Frontend Routes

### 9.1 Public / Unauthenticated Routes
```
/                       Landing page
/sign-in                Login / signup
/auth                   Auth redirect handler
/auth/callback          Kinde OAuth callback
/auth/verify-email      Email verification
/auth/reset-password    Password reset
/pricing                Pricing page
/templates              Template gallery
/examples               Resume examples gallery
/guides                 Guides index
/guides/:slug           Individual guide
/help                   Help center
/privacy-policy         Privacy policy
/terms-of-service       Terms of service
/waitlist               Waitlist signup
/whats-new              Changelog / what's new
/p/:username            Public portfolio page
/share/:token           Shared resume preview
/share/scorecard/:token Shared WiseHire scorecard
/share/brief/:token     Shared company brief
/l/:linkId              Short link redirect
/qr-scan                QR code scanner (camera)
/invite/:code           WiseHire invite redirect
```

### 9.2 WiseResume App Routes (authenticated)
```
/dashboard                  Dashboard (overview)
/dashboard/resumes          Resume list
/dashboard/tailor           Job tailoring tool
/dashboard/cover-letters    Cover letters list
/dashboard/resignation-letters Resignation letters list
/dashboard/applications     Application tracker
/dashboard/interview        Interview coaching
/dashboard/career           Career assessment
/dashboard/career-coach     Career coaching chat
/dashboard/ai-studio        AI Studio tools hub
/dashboard/analytics        Analytics dashboard
/dashboard/portfolio        Portfolio editor
/dashboard/notifications    Notifications
/dashboard/settings         Settings
/dashboard/profile          Profile
/dashboard/templates        Template selector
/dashboard/upload           Resume upload
/dashboard/help             Help
/dashboard/onboarding       Onboarding flow
/dashboard/achievements     Achievements / gamification
/dashboard/job-fit-analyzer Job fit analyzer tool

/editor                     Resume editor (full-screen)
/resume/:id                 Resume detail view
/tailor/:resumeId           Tailoring for a specific resume
/cover-letter/new           New cover letter
/cover-letter/edit/:id      Edit cover letter
/resignation-letter/new     New resignation letter
/resignation-letter/edit/:id Edit resignation letter
/application/:id            Single application detail
/job/:id                    Job detail view
/interview                  Interview session
/interview/report/:token    Interview report (shareable)
/career                     Career assessment
/ai-studio                  AI Studio
/ai-studio/:tool            Specific AI tool
/portfolio                  Portfolio editor (shorthand)
/profile                    Profile (shorthand)
/settings                   Settings (shorthand)
/search                     Search across all content
/notifications              Notifications (shorthand)
/achievements               Achievements (shorthand)
/analytics                  Analytics (shorthand)
/subscription               Subscription management
/referral                   Referral program
/preview                    Resume preview
/onboarding                 Onboarding
/upload                     Upload
/qr-code                    QR code generator
/qr-batch                   Batch QR code generation
/screenshots-gallery        App store screenshot gallery
/store-screenshots          Store screenshot manager
/wallpaper                  Wallpaper generator
```

### 9.3 WiseHire Recruiter Routes (WiseHireGuard-protected)
```
/wisehire/signup            WiseHire signup
/wisehire/signup-early-access/:code Early access code signup
/wisehire/onboarding        Recruiter onboarding flow
/wisehire/dashboard         Recruiter dashboard
/wisehire/roles             Job roles management
/wisehire/pipeline          Candidate pipeline
/wisehire/bulk-screen       Bulk candidate screening
/wisehire/talent-pool       Talent pool search
/wisehire/briefs            Company briefs list
/wisehire/briefs/:briefId   Company brief detail
/wisehire/jd-writer         Job description writer
/wisehire/mask-cvs          CV anonymizer
/wisehire/scorecards/:candidateId Candidate scorecard
/wisehire/scorecard-templates Scorecard template manager
/wisehire/analytics         Recruiter analytics
/wisehire/clients           Client management
/wisehire/settings          WiseHire settings
/wisehire/subscription      WiseHire subscription
/wisehire/terms-of-service  WiseHire ToS
/wisehire/privacy-policy    WiseHire privacy policy
/enterprise                 WiseHire enterprise landing (public)
```

### 9.4 Admin Routes (DevKit-protected)
```
/devkit                     Admin DevKit (password-gated)
/kinde-auth-test            Kinde auth diagnostics page
```

---

## 10. Admin DevKit Panels

The DevKit at `/devkit` provides 27 admin panels organized into sections:

| Section ID | Title |
|-----------|-------|
| `auth` | Auth & Token Bridge |
| `routing` | Routing & Protected Pages |
| `settings` | Settings & Preferences |
| `credits` | Credits & Usage |
| `ai` | AI Tools Smoke Test |
| `email` | Email & Communications |
| `db` | Resume & Data Checks |
| `errors` | Error Handling & Logging |
| `usage` | Usage Events |
| `byok` | BYOK API Key Probe (Retired) |

### Key panels within each section
- **OverviewPanel** — system health summary
- **AdminUsersPanel** — user list, search, plan editing
- **AIKeySlotPanels** — manage the 9 AI key slots (OpenRouter ×3, Groq ×3, DeepSeek ×3)
- **AIRoutingPanel** — per-feature provider routing config + A/B splits
- **AICostPanel** — AI cost tracking and usage analytics
- **AITestSlotModelsCard** — test any key slot against the model catalog
- **AppSettingsPanel** — runtime feature flag / kill switch management
- **CouponsPanel** — coupon code management
- **DeploymentPanel** — deployment status and controls
- **ModerationPanel** — content moderation queue
- **OnboardingFunnelPanel** — onboarding analytics
- **EmailManagementPanel** / **EmailAutomationsPanel** — email config
- **ObservabilityPanel** — error log viewer
- **LiveActivityPanel** — real-time user activity
- **MissionControlPanel** — ops health events
- **UserDetailDrawer** — deep-dive on individual users
- **AuditLogPanel** — admin action audit trail
- **WiseHireWaitlistPanel** — WiseHire access management
- **PortfolioUsernamesPanel** — portfolio username admin
- **OwnerOpsPanel** — owner-only destructive ops
- **IntegrationsPanel** — integration status (Kinde, Resend, RevenueCat, etc.)
- **FeatureFlagsPanel** — feature flag management
- **AnalyticsPanel** — product analytics

---

## 11. Resume Templates (27 templates)

Located in `src/components/templates/`. Each is a self-contained React component registered in `registry.ts`.

```
Academic      Banking       Bento         BoldType      Brutalist
Classic       Clean         Compact       Consulting    Creative
DataScience   Designer      Developer     DevOps        Elegant
Executive     Federal       Healthcare    Legal         Marketing
Minimal       Modern        Portfolio     Product       Professional
Sales         Swiss
```

---

## 12. Deployment Pipeline

### Frontend: Hostinger
- **Live URL:** `https://resume.thewise.cloud`
- **Deploy method:** GitHub Actions → `lftp` FTPS upload to `82.29.154.120` (FTP server IP)
- **Workflow:** `.github/workflows/deploy.yml` (manual trigger via `workflow_dispatch`)
- **FTP credentials:** `FTP_PASSWORD` secret, user `u966279061.thewise.cloud`
- **Target path:** `/public_html/resume/`
- **Transport:** Explicit FTPS on port 21 (primary) → Implicit FTPS port 990 (fallback)
- **Why direct IP:** `thewise.cloud` hostname resolves to CDN/web IPs that don't run FTP
- **Post-deploy verify:** polls `https://resume.thewise.cloud` up to 18×20s (6 min) for new build
- **Rollback:** `rollback-frontend.yml` re-uploads a previously verified build artifact

### Last deploy failure analysis (run 25357199678, 2026-05-05)
- **Root cause:** GitHub Actions artifact storage quota exhausted
- **What actually happened:** Build ✅ → FTPS upload ✅ → Live verification ✅ →
  Artifact tag ❌ (quota hit)
- **The site was deployed successfully** — only the rollback artifact tagging failed
- **Auto-retry:** Ran successfully (runs 25357296073 and 25357398240)
- **Fix:** Free up GitHub Actions artifact storage or increase quota limit

### Edge functions: Supabase
- **Workflow:** `.github/workflows/deploy-edge-functions.yml`
- **Check workflow:** `.github/workflows/check-edge-functions-deployed.yml` — runs on
  every push to main; fails if any local function is not deployed to Supabase

### GitHub Actions workflows (29 total)
Key workflows in `.github/workflows/`:
```
deploy.yml                       Frontend deploy to Hostinger
deploy-edge-functions.yml        Deploy Supabase edge functions
rollback-frontend.yml            Emergency rollback to last verified build
auto-retry-deploy.yml            Auto-retries failed deploys on fresh runner (different IP)
build-check.yml                  Vite build check on every push
type-check.yml                   TypeScript `tsc --noEmit`
lint.yml                         ESLint
auto-fix-lint.yml                Auto-fix and commit lint errors
auto-format-code.yml             Prettier auto-format
check-edge-functions-deployed.yml Verify all 73 edge fns are deployed
atlas-sync-check.yml             Verify Project Atlas docs match codebase
dependency-audit.yml             npm audit for vulnerabilities
dependency-auto-update.yml       Auto-update outdated packages
database-backup.yml              Daily DB backup
db-migration.yml                 Apply SQL migrations via Management API
generate-supabase-types.yml      Regenerate TypeScript types from DB schema
set-supabase-secrets.yml         Sync secrets to Supabase edge function env
check-secrets.yml                Detect hardcoded secrets in source
smoke-test.yml                   Post-deploy smoke tests
lighthouse.yml                   Lighthouse performance audit
bundle-size-report.yml           Bundle size tracking
unit-tests.yml                   Unit test runner
scan-debug-logs.yml              Find and flag debug log statements
dead-code-finder.yml             Find unused code/exports
find-todos.yml                   Catalog TODO comments
broken-links.yml                 Check for broken internal/external links
apply-rpc-migration.yml          Apply RPC/stored procedure migrations
edge-fn-monthly-reaudit.yml      Monthly edge function audit
check-deploy-status.yml          Check live site deployment status
```

---

## 13. Key Frontend Components

### Component directories (`src/components/`)
```
ai/              AI credit indicators, usage sheets
ai-studio/       AI Studio tool panels
applications/    Application tracker UI
auth/            Auth forms and guards
career/          Career assessment UI
cover-letter/    Cover letter editor
dashboard/       Dashboard widgets and layout
dev-kit/         Admin DevKit panels (27 panels — see §10)
editor/          Resume editor (canvas, toolbar, sections)
home/            Landing page sections
interview/       Interview coaching UI
landing/         Landing page components
layout/          Shell, sidebar, navbar, footer
onboarding/      Onboarding step components
plan/             Plan upgrade prompts and gates
portfolio/       Portfolio editor components
profile/         Profile editor
qr/              QR code UI
resignation/     Resignation letter editor
settings/        Settings sections (Account, AI, Appearance, Notifications, Privacy, Danger)
store/           App Store screenshot management
templates/       27 resume template components (see §11)
ui/              Shared design system components (shadcn/ui extensions)
upload/          Resume upload + parse UI
wisehire/        WiseHire recruiter-facing UI components
```

### Key hooks (`src/hooks/`)
| Hook | Description |
|------|-------------|
| `useAuth` | Kinde auth state (user, isAuthenticated) |
| `useMe` | Full user context from `me` edge function (credits, profile, subscription) |
| `useAICredits` | Derived AI credits state from `useMe`; computes `isActiveTrial`, `trialDaysLeft` |
| `useAIKeyHydration` | No-op stub (BYOK removed) |
| `useResumes` | Resume list with React Query caching |
| `useNotifications` | Notification feed with unread count |
| `useFeatureFlag` | Check a feature flag for the current user |

---

## 14. Mobile App (`mobile/`)

- **Framework:** Expo SDK 51 + Expo Router 3.5
- **Platforms:** iOS + Android
- **Auth:** Kinde PKCE via `expo-auth-session` → `token-exchange` edge function
- **Push notifications:** Expo Notifications → `device_push_tokens` table → `send-push` edge fn
- **Payments:** RevenueCat → `revenuecat-webhook` edge function
- **Mobile-specific edge functions:** `mobile-api`, `mobile-config`, `send-push`, `revenuecat-webhook`
- **Mobile-specific DB tables:** `device_push_tokens`, `mobile_app_versions`
- **Capacitor:** fully removed

---

## 15. Key External Services

| Service | Purpose | Config |
|---------|---------|--------|
| **Kinde** | User auth & identity | Domain: `auth.thewise.cloud`, client ID in `VITE_KINDE_CLIENT_ID` |
| **Supabase** | PostgreSQL DB + edge function runtime | URL + anon key in env |
| **Resend** | Transactional + marketing email | API key in Supabase secrets |
| **OpenRouter** | AI model gateway (primary) | 3 key slots in Supabase secrets |
| **Groq** | AI inference (fast structured output) | 3 key slots in Supabase secrets |
| **DeepSeek** | AI inference (tertiary) | 3 key slots in Supabase secrets |
| **RevenueCat** | Mobile in-app purchases | Webhook secret in Supabase secrets |
| **Sentry** | Frontend error tracking | DSN in `VITE_SENTRY_DSN` |
| **Hostinger** | Static frontend hosting | FTP to `82.29.154.120`, creds in GitHub secrets |

---

## 16. Migrations Timeline (recent)

Latest migrations applied (in order):
```
20260518000001  Edge function log retention policy
20260519000001  Audit 2026-05-02 performance indexes
20260520000001  AI test model allowlist
20260521000001  Impersonation revocations table
20260522000000  Snapshot resume title on artifacts
20260523000000  Drop misleading error_log admin policies
20260524000000  AI usage attribution RPCs
20260601000000  Mobile device tokens + app versions tables
20260601100000  Interview audio bucket
20260601200000  Editor AI routing config gaps
20260602000000  Editor AI routing config (full)
20260603000000  Retire legacy editor AI routing config
20260604000000  Add profiles.email column
20260605000000  parse-job AI routing config
20260606000000  Configure AI model catalog cron (Task #15)
```

---

## 17. Recent Significant Changes

| Task | Change |
|------|--------|
| **Task #15** | AI model catalog cron — GUC-aware cron URL; `exec_refresh_ai_test_models()` resolves edge-function URL from `app.edge_functions_url` GUC at call time |
| **Task #17** | BYOK fully removed — `aiClient.ts` stripped of BYOK path, `manage-api-keys` → 410 tombstone, `useAIKeyHydration` → no-op, `useIsBYOK` removed, DevKit BYOK section retired |
| **2026-05-03** | Kinde auth custom domain split: `auth.thewise.cloud` separated from app domain |
| **Flat-pool migration** | AI provider architecture changed from circuit-breaker to flat random pool; BYOK path eliminated; `recordBreakerEvent` kept as no-op for compat |

---

## 18. Known Issues & Notes for Agents

1. **Git push is broken locally** — the local git repo has a corrupted object at
   `1b4ac9ed...`. Use the GitHub REST API to push files. `GITHUB_ACCESS_TOKEN` env
   var is available in the Replit environment.

2. **Edge function check workflow fails on every push** — triggered because edge
   functions are not auto-deployed on push (Supabase deploys are a separate manual
   step). This is expected and non-blocking.

3. **`providers.ts` still has BYOK provider registry** — the `PROVIDERS` record
   (openai, anthropic, gemini, etc.) still exists in `_shared/providers.ts`. It is
   used only by `validate-api-key`. The full BYOK cleanup is tracked in Tasks #18
   and #19.

4. **`user_api_keys` table** — still exists in the database. Not written to by any
   active code. Do not delete without a dedicated migration.

5. **Artifact storage quota** — GitHub Actions artifact storage was exhausted on
   2026-05-05. Deploy succeeded but artifact tagging failed. Clean up old artifacts
   to prevent future failures.

6. **`suggest-template`** — exists both as a standalone edge function AND as a
   sub-action of `editor-ai`. Both paths are active.

7. **`optimize-for-linkedin`** — exists both as a standalone edge function AND as a
   sub-action of `editor-ai`. Both paths are active.
