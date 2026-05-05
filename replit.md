# WiseResume — Compressed Project Knowledge Base

### Overview
WiseResume is an AI-powered web application for comprehensive career management. It assists users in creating and tailoring resumes for specific job listings, publishing public portfolios, practicing interview questions, tracking job applications, and managing career goals. The application focuses on providing an efficient and intelligent solution for career advancement by leveraging AI for resume generation, job tracking, and career guidance. The platform also includes WiseHire — an integrated HR SaaS product for recruiters.

### User Preferences
- **Supabase is the sole production source of truth** — Replit is a development/coding environment ONLY. Never treat Replit secrets, Replit environment variables, or the Express server as production infrastructure. All production secrets live in Supabase Vault. All production API traffic is served by Supabase Edge Functions. If a secret is absent from `process.env` in Replit, that is expected and normal — it is vault-managed and available to edge functions in production. Never add `replit_env` or `optional` secret sources; every secret is `supabase_vault`. Never suggest storing secrets in Replit as a production solution.
- **Documentation Rules**: After every completed task, bug fix, or feature, the following documentation updates are mandatory:
    - Add an entry to `CHANGELOG.md` detailing technical changes (files, functions, DB migrations, behavior) in English, without plain-language explanations.
    - Add a plain-language entry to `Project Atlas/04-For You (Plain Language)/` in the appropriate file (`current-features.md`, `stability-improvements.md`, or `coming-soon.md`), focusing on user benefits without jargon or file names. Update the "Last verified" timestamp.
    - Update relevant reference cards in `Project Atlas/01-Currently Implemented/` (e.g., database tables, critical systems, hooks, pages, stability fixes). Update the "Last verified" timestamp on touched cards.
    - Update `replit.md` only for changes in architecture, infrastructure, or key patterns (new endpoint, DB table, shared cache key, env var), skipping routine bug fixes.
- **No `any` casts** — TypeScript strict mode enforced.
- **Never change primary key column types** — destructive and breaks existing data.
- **Never invent marketing stats** — always source from `src/pages/Index.tsx`.
- **`user.id` = bridge UUID only** — never raw Kinde `kp_xxx` ID.
- **`creditUtils.ts`**: BYOK has been fully removed. Every authenticated AI request runs through the managed flat pool; credit deduction always applies and `isByok` is permanently false. The `isByok` field is retained on `CreditCheckResult` for source compatibility only. Daily limits derive from plan at runtime via a single batched `app_settings` query. Priority chain (highest wins): (1) per-user override `user_limit_<uuid>` in `app_settings`, (2) per-plan cap override `daily_cap_free|trial|pro` in `app_settings`, (3) global cap `global_daily_limit` in `app_settings`, (4) per-plan default from `planLimits.ts`. All override lookups are non-fatal fail-open.
- **Credit limit single source of truth**: `supabase/functions/_shared/creditLimits.json` — both `src/lib/planConfig.ts` (frontend) and `supabase/functions/_shared/planLimits.ts` (edge functions) import from this JSON. Never define credit limit numbers in either file directly; edit only `creditLimits.json`.
- **`useMe` is canonical** for plan/credits — queryKey: `['me', user?.id]`.
- **All edge functions** need `verify_jwt = false` in `supabase/config.toml`.
- **Pricing CTAs** on landing → `/auth?plan=free|pro|premium` (not direct `kindeRegister` calls).
- **Portfolio `pf-*` CSS**: Never touch — used by public portfolio pages.
- **Glass cleanup**: Complete — only `glass-pro` data value and `Badge variant="glass"` are preserved intentionally.
- **hard-purge**: Protected by `requireAdminAuth` — never callable without admin auth.
- **AI error secret-scrub**: every string that reaches stderr or the JSON envelope returned to the browser must run through `supabase/functions/_shared/scrubSecrets.ts` (`scrubSecrets` / `scrubAndCap`). Gemini calls authenticate via the `x-goog-api-key` header — never via `?key=…`.
- **Ops health signal**: every fail-open code path (rate limiter, AI breaker no-op, admin-settings DB error) writes a row via `_shared/opsHealth.ts` → `public.ops_health_events`. Read per-(event,feature) hourly counts via `ops_health_recent_counts(p_window_minutes)`.
- **PDF capture / print-safe.css**: `print-safe.css` was deleted because every rule was gated on a `[data-pdf-force-layout]` attribute that nothing ever set. If a future template introduces `backdrop-filter` or `position: sticky` inside the captured tree, set `data-pdf-force-layout` on the source element inside `prepareForCapture` and re-introduce targeted overrides — do not restore the old file as-is.
- **Template photo elements**: `<img>` tags inside `[data-resume-template]` (currently `CreativeTemplate` and `DesignerTemplate`) MUST set `crossOrigin="anonymous"` and MUST NOT use `loading="lazy"`. The Supabase Storage public bucket serving `photoUrl` must respond with `Access-Control-Allow-Origin: *`.
- **`WISE_ENV` Supabase secret**: explicit per-environment marker read by `admin-devkit-data`. Set to `production` in the production Supabase project and `dev` in any non-prod project. When unset, code falls back to the legacy `DENO_DEPLOYMENT_ID` heuristic — always set `WISE_ENV` on new Supabase projects.
- **AI cron secret**: `CRON_SECRET` Supabase Edge Function secret + `vault.cron_secret` row. The cron auth helper `requireCronSecretOrVault` (in `_shared/webhookAuth.ts`) accepts either the env-var fast path or the Vault RPC fallback (`public.get_cron_secret_internal()`, `service_role` only). Both must be kept in sync; the helper tolerates a rotation window where only one matches.
- **`ai_routing_config` active rows**: `editor-ai`, `resume-section-ai`, `tailor-resume`, `smart-fit-rewrite`, `agentic-chat`, `parse-job` (+ platform-wide rows). Legacy rows (`analyze-resume`, `recruiter-simulation`, `suggest-template`, `optimize-for-linkedin`) removed by migration `20260603000000`. Pass `featureName` on `AICallOptions` to get per-feature model routing; do not call `resolveFeatureRoute()` directly — it is deprecated.

---

### System Architecture

**Tech Stack:**
- **Frontend**: React 18, TypeScript 5, Vite 6
- **Styling**: Tailwind CSS, Radix UI, Framer Motion
- **State Management**: Zustand, TanStack Query (React Query)
- **Authentication**: Kinde Auth (JWT verified server-side via JWKS), with `auth.thewise.cloud` as the dedicated Kinde custom domain (split from the app domain in 2026-05-03)
- **Database**: Supabase Postgres via Drizzle ORM
- **Backend**: Supabase Edge Functions (74 deployed) for business logic, AI calls, and auth helpers. Express.js server acts as a dev proxy, PDF exporter, and admin bridge.
- **Mobile**: Native iOS + Android client (`mobile/`) built with Expo SDK 51 + Expo Router 3.5. Integrates with the same Supabase project, Kinde tenant, and AI providers as the web app. Auth uses Kinde PKCE via `expo-auth-session`, exchanged through the existing `token-exchange` edge function. Edge functions for mobile: `register-push-token`, `send-push`, `revenuecat-webhook`, `mobile-config`, `mobile-api`. Tables: `device_push_tokens`, `mobile_app_versions`. Capacitor fully removed.
- **Hosting**: Hostinger for static frontend. Replit is a development/coding environment ONLY — never production infrastructure.

**Authentication Flow:**
Users authenticate via Kinde. The client exchanges the Kinde token with the Express server at `POST /api/fn/token-exchange`. The server validates the Kinde JWT, generates a user UUID, upserts profile data in Supabase, and issues a short-lived session JWT for subsequent API calls. Email/password sign-ups go through email verification (`auth-email-hook`) before access is granted.

**Replit Environment:**
- **Frontend**: Vite dev server on port 5000 (proxies `/api/*` to port 5001).
- **Backend**: Express API server (`server/index.ts`) on port 5001 via `tsx --watch` (dev proxy only).
- **Database**: Supabase is the sole source of truth. All data operations use `supabaseGet`/`supabaseUpsert`/`supabaseDelete` helpers calling the Supabase REST API directly.
- **Startup command**: `npm run server:dev & npm run dev`.
- `src/lib/apiFnUrl.ts` handles environment routing: `/api/fn/<name>` in dev and `${VITE_SUPABASE_URL}/functions/v1/<name>` in production.
- The Express server gracefully degrades when optional secrets are absent.

**AI System:**
- **Pool**: Up to 9 managed keys — 3 OpenRouter + 3 Groq + 3 DeepSeek. Provider chosen by per-feature routing config first (`ai_routing_config` table via `modelRouter.ts`), then random uniform selection among configured providers. One sibling-key retry within the same provider, then cross-provider fallback.
- **BYOK removed**: The BYOK code path still exists in `aiClient.ts` for source compatibility (30+ call sites), but `creditUtils.ts` sets `isByok = false` unconditionally. No user-facing BYOK UI or credit bypass exists.
- **Circuit breaker removed**: `recordBreakerEvent` is a no-op stub kept for call-site compatibility.
- **Feature routing**: `featureName` on `AICallOptions` triggers a DB lookup in `ai_routing_config` for the preferred provider + optional model override. A/B splits supported via `ab_secondary_provider` + `ab_split_pct`.
- **Smoke-test bypass**: `supabase/functions/_shared/smokeTest.ts` — `checkSmokeBypass` returns a synthetic 200 (no AI call, no credit deduction) when `x-smoke-test: true` is present AND the caller holds a valid DevKit admin token.
- **AI model catalog cron**: `refresh_ai_test_models` pg_cron job at `03:17 UTC` via `private.exec_refresh_ai_test_models()`. Reads `vault.cron_secret`, POSTs to `admin-ai-ops`. Catalog stored in `app_settings.ai_test_model_catalog`. Up to 50 OpenRouter + 15 Groq + 15 DeepSeek curated models; non-chat filter via `OPENROUTER_NON_CHAT_RE`.

**Subscription & Credits:**
- Plans: `free` (5 AI credits/day), `pro` (100 AI credits/day), `premium` (unlimited, stored as `-1`).
- Source of truth for credit values: `supabase/functions/_shared/creditLimits.json`.
- Expensive endpoints (`tailor-resume`, `generate-cover-letter`) deduct 2 credits; all others deduct 1.
- Trial plans supported — `subscriptions.trial_plan` + `trial_expires_at` override the base plan during the trial window.

**Core Features:**
- **Resume builder**: AI-powered creation, editing (30 templates), PDF export, ATS scoring, version history, sharing.
- **Resume tailoring**: Smart job-fit analysis with AI rewrite, `tailor_history` persistence.
- **Cover letters**: AI generation with 4 styles (Classic, Modern, Compact, Creative). Stored in `cover_letters` table.
- **Resignation letters**: AI-generated resignation letters. `resignation_letters` table.
- **Interview prep**: AI question bank, voice interview (ElevenLabs STT → Groq LLM → browser TTS), session scoring, `interview_sessions` + `interview_question_bank` tables, company briefings via `company-briefing` edge function.
- **AI Studio**: Tabbed AI tool hub at `/ai-studio`. Agentic chat with persistent sessions (`chat_sessions`, `chat_messages`), history panel, tool-calling, delete-experience action.
- **Career page**: Achievements, career assessment, goal tracking.
- **Achievements / Gamification**: `user_gamification` table.
- **Public portfolio**: At `/p/:username`. Password-protected option (`portfolio_settings.password_hash`). Portfolio interactions (`portfolio_interactions`), visits (`portfolio_visits`), history (`portfolio_history`), OG image (`og-image`), bio generation (`generate-portfolio-bio`), session tracking (`create-portfolio-session`), PDF export (`export-portfolio-pdf`).
- **QR codes**: Generate, batch, scan. `/qr-code`, `/qr-batch`, `/qr-scan`.
- **Kanban job tracker**: Board view at `/applications` with draggable cards and activity timeline.
- **Short links**: `/l/:linkId` with `short_links` table.
- **Referral system**: `/referral`.
- **Store screenshots**: App-store mockup screenshots at `/store-screenshots` + `store_screenshots` table.
- **LinkedIn import**: `POST /api/linkedin-profile` → Proxycurl → structured profile.
- **"Build from Text"**: Paste freeform career notes → `parse-linkedin` edge function → structured resume.
- **Admin impersonation (ActAs)**: Admins can act as any user from DevKit → Users panel. Sessions tracked in `impersonation_revocations` table. `ActAs.tsx` page + `ActAsDialog.tsx` + `ActingAsBanner.tsx`.
- **Notifications**: In-app notification center. `notifications` table.
- **WebMCP**: Agent discovery via static files, HTTP headers, and `navigator.modelContext` via `useWebMcp` hook.
- **Analytics Data Lifecycle**: Daily pruning of insert-heavy analytics tables with configurable retention and BRIN indexing.

**WiseHire (HR SaaS Platform):**
Full integrated HR product under `/wisehire/*`. Edge functions: `wisehire-access`, `wisehire-bulk-screen`, `wisehire-generate-brief`, `wisehire-invite-reminder`, `wisehire-mask-cvs`, `wisehire-send-outreach`, `wisehire-talent-search`, `wisehire-talent-view`, `wisehire-write-jd`.

Routes: `/wisehire/dashboard`, `/wisehire/jd-writer`, `/wisehire/briefs`, `/wisehire/briefs/:briefId`, `/wisehire/pipeline`, `/wisehire/bulk-screen`, `/wisehire/scorecards/:candidateId`, `/wisehire/talent-pool`, `/wisehire/analytics`, `/wisehire/mask-cvs`, `/wisehire/clients`, `/wisehire/onboarding`, `/wisehire/subscription`, `/wisehire/settings`.

Sharable views: `/share/brief/:shareToken`, `/share/scorecard/:shareToken`.

**Admin DevKit (`/devkit`):**
Password-protected via `DEV_KIT_PASSWORD` (Supabase secret), verified server-side by `verify-dev-kit` edge function. Admin sessions stored in `admin_sessions` table. Admin-only edge functions wrapped by `requireAdminAuth` from `_shared/adminAuth.ts`.

Panels (from `src/components/dev-kit/`):

| Panel | Purpose |
|---|---|
| Mission Control | System health snapshot |
| Overview | User list summary + quick stats |
| Analytics | Page views, active users, AI credits, geographic distribution, signups sparkline |
| AI Cost | Per-user / per-feature / per-provider AI call attribution. Backed by `ai_usage_logs`. |
| Onboarding Funnel | Conversion funnel from signup to first resume |
| Live Activity | 30 s auto-refresh of last 50 `usage_events` + edge function health cards |
| Deployment | GitHub commits, env var checklist, Analytics Retention Sweep status |
| Audit Log | Admin action trail from `admin_audit_log` |
| Users | List, search, identity (Kinde email lookup), content, plan, credits, suspend, delete, merge, notes |
| Email Management | Send magic links, confirmations, custom emails via Resend |
| Email Automations | Transactional email trigger management |
| Coupons | Create / list / toggle / delete coupon codes |
| App Settings | Platform-wide flags, maintenance mode, feature gates, `app_settings` table |
| Feature Flags | Fine-grained feature gating |
| Portfolio Usernames | Audit / clean public portfolio handles |
| WiseHire | Waitlist + invite generation + account-type badges |
| AI Provider / AI Keys | Per-slot model picker (3× OR, 3× Groq, 3× DeepSeek). Dynamic live catalog (50 OR + 11 Groq + 2 DeepSeek). Server-side proxy routes for balance / model lists. Confirm-before-switch UX. |
| AI Routing | `ai_routing_config` table editor with Editor AI group + bulk override |
| Observability | `ops_health_events` counts, error log, rate-limit events |
| Moderation | Bug inbox (`bug_reports`), blocklist, moderation queue |
| Integrations | Kinde Events, Resend Bounces, Deploy/GitHub Actions |
| Owner Ops | One-click sample resume seed, owner-only utilities |
| Act As | Admin impersonation — act as any user, revocable |

**Express server routes (selected):**

| Route | Purpose |
|---|---|
| `GET /api/health` | Basic liveness probe |
| `GET /api/ai-health` | OpenRouter + Groq latency/status ping |
| `GET /api/db-health` | Supabase connectivity probe |
| `POST /api/fn/token-exchange` | Kinde → Supabase JWT exchange |
| `POST /api/fetch-url` | Server-side URL fetch proxy (rate-limited) |
| `POST /api/linkedin-profile` | Proxycurl LinkedIn import (rate-limited) |
| `GET /api/data/resumes`, `GET /api/data/resumes/:id` | Resume CRUD |
| `GET /api/data/profile`, `GET /api/data/portfolios/me` | Profile / portfolio data |
| `GET /api/data/notifications`, `POST /api/data/notifications/*` | Notification CRUD |
| `GET /api/data/jobs`, `GET /api/data/jobs/:id` | Job data |
| `GET /api/data/me` | Aggregated user record |
| `POST /api/export/pdf-native` | Server-side Puppeteer PDF export |
| `GET /api/admin/ai-provider/openrouter-status` | OpenRouter balance proxy |
| `GET /api/admin/ai-provider/groq-models` | Live Groq model list proxy |
| `GET /api/admin/ai-provider/gemini-models` | Live Gemini model list proxy |
| `POST /api/admin/ai-provider/gemini-test` | Gemini ping via managed key |
| `GET /api/admin/ai-provider/audit-recent` | Cursor-paginated `admin_audit_log` reader |
| `POST /api/auth/reset-password` | Password reset trigger |

All admin proxy routes are behind `requireAuthHeader + requireAdminEmail`. They respond with `{ configured: false }` when the backing env var is absent.

**Key database tables (public schema):**

`profiles`, `subscriptions`, `resumes`, `resume_experiences`, `resume_educations`, `resume_skills`, `resume_certifications`, `resume_versions`, `resume_shares`, `cover_letters`, `resignation_letters`, `tailor_history`, `jobs`, `job_applications`, `chat_sessions`, `chat_messages`, `tool_cache`, `ai_credits`, `ai_usage_logs`, `credit_transactions`, `user_api_keys` (legacy BYOK scaffolding — no longer written), `portfolio_settings`, `portfolio_visits`, `portfolio_interactions`, `portfolio_history`, `social_links`, `short_links`, `store_screenshots`, `interview_sessions`, `interview_question_bank`, `company_briefings`, `career_assessments`, `user_gamification`, `notifications`, `usage_events`, `audit_logs`, `admin_audit_log`, `admin_sessions`, `app_settings`, `ai_routing_config`, `feature_requests`, `bug_reports`, `error_log`, `ops_health_events`, `rpc_rate_limits`, `impersonation_revocations`, `device_push_tokens`, `mobile_app_versions`, `contact_inquiries`, `signup_otps`, `token_exchanges`, `messages`, `share_comments`.

**Shared edge-function modules (`supabase/functions/_shared/`):**
`adminAuth.ts`, `aiClient.ts`, `aiTestModelCatalog.ts`, `authMiddleware.ts`, `botGuard.ts`, `contentModeration.ts`, `cors.ts`, `creditLimits.json`, `creditUtils.ts`, `dbClient.ts`, `encryption.ts`, `featureFlags.ts`, `fnLogger.ts`, `htmlEscape.ts`, `industryKeywords.ts`, `jwtUtils.ts`, `letterPersistence.ts`, `logger.ts`, `modelDefaults.ts`, `modelRouter.ts`, `opsHealth.ts`, `pdfRenderer.ts`, `planLimits.ts`, `portfolioBioPrompt.ts`, `portfolioSession.ts`, `profileContext.ts`, `providers.ts`, `provisionUser.ts`, `rateLimiter.ts`, `requestUtils.ts`, `resendAudiences.ts`, `resendConfig.ts`, `scoringFunctions.ts`, `scrubSecrets.ts`, `smokeTest.ts`, `urlSafety.ts`, `userRateLimiter.ts`, `webhookAuth.ts`.

**Editor AI smoke-test bypass:**
The 5 active Editor AI edge functions (`editor-ai`, `resume-section-ai`, `tailor-resume`, `smart-fit-rewrite`, `agentic-chat`) check for `x-smoke-test: true` + valid DevKit admin token and return a synthetic 200 without calling AI or deducting credits. Implemented via `_shared/smokeTest.ts`. DevKit smoke tests cover all 4 `editor-ai` sub-actions via `editor-ai-*` test entries.

**Project Structure:**
- `src/`: Frontend code.
- `supabase/`: Edge functions and database migrations.
- `server/`: Express.js backend code.
- `mobile/`: Expo SDK 51 native client (iOS + Android).
- `public/`: Static assets.
- `specs/`: Technical specifications.
- `project-governance/`: Architecture documentation.
- `Project Atlas/`: Living knowledge base (engineering cards + plain-language docs).
- `wise-templates/`: Resume templates.

---

### External Dependencies
- **Kinde Auth**: User authentication and identity management. Custom domain: `auth.thewise.cloud`.
- **Supabase**: Backend-as-a-Service (PostgreSQL, Edge Functions, RLS, Vault, Cron).
- **Drizzle ORM**: PostgreSQL database interaction.
- **Proxycurl**: LinkedIn profile data import (server-side, `server/index.ts`).
- **OpenRouter**: Primary managed AI provider (up to 3 keys).
- **Groq**: Secondary managed AI provider (up to 3 keys). Also used for JSON-mode calls.
- **DeepSeek**: Tertiary managed AI provider (up to 3 keys).
- **Gemini**: AI provider for Gemini-specific features (managed `GEMINI_API_KEY`).
- **Resend**: Transactional email delivery. Audience management via `resendAudiences.ts`.
- **RevenueCat**: Mobile subscription and entitlement management.
- **Expo Push Notifications**: Via `send-push` edge function + `device_push_tokens` table.
- **Sentry**: Error tracking via `VITE_SENTRY_DSN`. Feedback submitted programmatically via `captureFeedback()` — no standalone Sentry widget.
- **GitHub**: Version control, CI/CD, and DevKit Deployment panel integration.
- **Vite**: Frontend build tool.
- **Tailwind CSS**: Utility-first CSS framework.
- **Radix UI**: UI component library.
- **Framer Motion**: Animation library.
- **Zustand**: State management library.
- **TanStack Query (React Query)**: Data fetching and caching library.
- **Expo SDK 51**: Native shell for iOS and Android clients.
