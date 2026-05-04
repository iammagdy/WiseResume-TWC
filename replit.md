# WiseResume — Compressed Project Knowledge Base

### Overview
WiseResume is an AI-powered web application for comprehensive career management. It assists users in creating and tailoring resumes for specific job listings, publishing public portfolios, practicing interview questions, tracking job applications, and managing career goals. The project's vision is to establish a robust, AI-driven platform for job seekers, with future expansion into an HR SaaS product called WiseHire. The application focuses on providing an efficient and intelligent solution for career advancement by leveraging AI for resume generation, job tracking, and career guidance.

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
- **`creditUtils.ts`**: Derive daily limit from plan at runtime via single batched `app_settings` query. Priority chain (highest wins): (1) per-user override `user_limit_<uuid>` in `app_settings`, (2) per-plan cap override `daily_cap_free|trial|pro` in `app_settings`, (3) global cap `global_daily_limit` in `app_settings`, (4) per-plan default from `planLimits.ts`. All override lookups are non-fatal fail-open.
- **`useMe` is canonical** for plan/credits — queryKey: `['me', user?.id]`.
- **All edge functions** need `verify_jwt = false` in `supabase/config.toml`.
- **Pricing CTAs** on landing → `/auth?plan=free|pro|premium` (not direct `kindeRegister` calls).
- **Portfolio `pf-*` CSS**: Never touch — used by public portfolio pages.
- **Glass cleanup**: Complete — only `glass-pro` data value and `Badge variant="glass"` are preserved intentionally.
- **Credit limits**: Canonical values in `src/lib/planConfig.ts` (PLAN_CREDIT_LIMITS) AND `supabase/functions/_shared/planLimits.ts` — update both together.
- **BYOK bypass**: `creditUtils.ts` verifies key exists in `user_api_keys` before granting unlimited credits — ai_provider pref alone is insufficient.
- **hard-purge**: Protected by `requireAdminAuth` — never callable without admin auth.
- **AI error secret-scrub**: every string that reaches stderr or the JSON envelope returned to the browser must run through `supabase/functions/_shared/scrubSecrets.ts` (`scrubSecrets` / `scrubAndCap`). Gemini calls authenticate via the `x-goog-api-key` header — never via `?key=…`.
- **Ops health signal**: every fail-open code path (rate limiter, AI breaker, OpenRouter admin-settings DB error) writes a row via `_shared/opsHealth.ts` → `public.ops_health_events`. Read per-(event,feature) hourly counts via `ops_health_recent_counts(p_window_minutes)`.
- **PDF capture / print-safe.css**: `print-safe.css` was deleted in TPL-3 because every rule was gated on a `[data-pdf-force-layout]` attribute that nothing in the codebase ever set, and the file was not imported anywhere. None of the 30 templates use `backdrop-filter` or `position: sticky` inside the captured tree, so no rule from the file was needed. If a future template introduces those properties, set `data-pdf-force-layout` on the source element inside `prepareForCapture` (and remove it in the cleanup callback) and re-introduce the targeted overrides — do not bring back the dead file as-is.
- **Template photo elements**: `<img>` tags inside `[data-resume-template]` (currently `CreativeTemplate` and `DesignerTemplate`) MUST set `crossOrigin="anonymous"` and MUST NOT use `loading="lazy"`. Lazy loading is not triggered by `html2canvas` and a missing `crossOrigin` taints the export canvas, breaking `toDataURL`. The Supabase Storage public bucket serving `photoUrl` must respond with `Access-Control-Allow-Origin: *` for the matching `crossOrigin` mode.
- **`WISE_ENV` Supabase secret**: explicit per-environment marker read by `admin-devkit-data` (and any future env-aware edge code). Set as a Supabase Edge Function secret to `production` in the production Supabase project and `dev` in any non-prod project. When unset, code falls back to the legacy `DENO_DEPLOYMENT_ID` heuristic, which is an undocumented Deno Deploy detail and must not be relied on long-term — always set `WISE_ENV` on new Supabase projects.

### System Architecture

**Tech Stack:**
- **Frontend**: React 18, TypeScript 5, Vite 6
- **Styling**: Tailwind CSS, Radix UI, Framer Motion
- **State Management**: Zustand, TanStack Query (React Query)
- **Authentication**: Kinde Auth (JWT verified server-side via JWKS)
- **Database**: Supabase Postgres via Drizzle ORM
- **Backend**: Supabase Edge Functions for business logic, AI calls, and auth helpers. Express.js server acts as a dev proxy, PDF exporter, and admin bridge.
- **Mobile**: Native iOS + Android client (`mobile/`) built with Expo SDK 51 + Expo Router. It integrates with the same Supabase project, Kinde tenant, and AI providers as the web app. Auth uses Kinde PKCE via `expo-auth-session`, exchanged through the existing `token-exchange` edge function. New edge functions for mobile include `register-push-token`, `send-push`, `revenuecat-webhook`, `mobile-config`, and PDF export functions. New tables `device_push_tokens` and `mobile_app_versions` are used. Capacitor is fully removed.
- **Hosting**: Hostinger for static frontend, Replit for development environment.

**Authentication Flow:**
Users authenticate via Kinde. The client exchanges the Kinde token with the Express server at `POST /api/fn/token-exchange`. The server validates the Kinde JWT, generates a user UUID, upserts profile data in Supabase, and issues a short-lived session JWT for subsequent API calls.

**Replit Environment:**
- **Frontend**: Vite dev server on port 5000 (proxies `/api/*` to port 5001).
- **Backend**: Express API server (`server/index.ts`) on port 5001 via `tsx --watch` (dev proxy only).
- **Database**: Supabase is the sole source of truth. All data operations use `supabaseGet`/`supabaseUpsert`/`supabaseDelete` helpers calling the Supabase REST API directly.
- **Startup command**: `npm run server:dev & npm run dev`.
- `src/lib/apiFnUrl.ts` handles environment routing: `/api/fn/<name>` in dev and `${VITE_SUPABASE_URL}/functions/v1/<name>` in production.
- The Express server gracefully degrades when optional secrets are absent.

**Core Features & Implementations:**
- **AI Career Management**: AI-powered resume building, tailoring for job listings, public portfolios, interview practice, job tracking, and career goal management.
- **AI System**: Centralized AI client (`supabase/functions/_shared/aiClient.ts`) dispatches calls to OpenRouter and Groq (primary providers). Supports "Bring Your Own Key" (BYOK) and per-feature routing configured in `ai_routing_config` table. A/B splits are supported via `ab_secondary_provider` and `ab_split_pct`.
- **AI Error Handling**: Structured error chain from Supabase Edge Functions to user-facing toasts.
- **Agentic Chat**: Multi-turn AI assistant with persistent sessions and tool-calling capabilities.
- **Subscription & Credits**: `free`, `pro`, `premium` plans with dynamic daily AI credit limits.
- **Design System**: Consistent UI with Deep Indigo primary, Warm Amber accent colors, Inter typography, custom shadow scales, and light/dark/system themes.
- **Navigation**: `DesktopNav` and `BottomTabBar` for intuitive feature access; locked tabs guide users to subscription upgrades.
- **Admin DevKit**: Password-protected admin panel with Mission Control, Analytics, Live Activity, Deployment, Audit Log, AI Provider panels, AI Routing (with "Editor AI" group + bulk override), Feature Flags, Owner Ops, User management, Observability, Moderation (Bug Inbox, Blocklist, Moderation Queue), and Integrations (Kinde Events, Resend Bounces, Deploy/GitHub Actions).
- **Editor AI smoke-test bypass**: All 8 Editor AI edge functions (`resume-section-ai`, `tailor-resume`, `analyze-resume`, `recruiter-simulation`, `suggest-template`, `optimize-for-linkedin`, `smart-fit-rewrite`, `agentic-chat`) check for the `x-smoke-test: true` request header after auth and return a synthetic 200 response without calling the AI provider or deducting credits. Implemented via `supabase/functions/_shared/smokeTest.ts`. DevKit smoke-test runner covers all 8 functions.
- **ai_routing_config**: Seeded rows for `resume-section-ai`, `recruiter-simulation`, `suggest-template`, `optimize-for-linkedin`, `smart-fit-rewrite` added via migration `20260601200000_editor_ai_routing_config_gaps.sql` (in addition to existing rows seeded in 20260511000001).
- **Server-side LinkedIn Importer**: `POST /api/linkedin-profile` endpoint uses Proxycurl for structured profile data import with rate limiting.
- **Kanban Job Tracker**: Board view for job applications with draggable cards.
- **WiseHire (HR SaaS Platform)**: Integrated HR product with AI JD Writer, AI Brief Generator, and Candidate Pipeline Board.
- **WebMCP Integration**: Agent discovery via static files and HTTP headers, plus WebMCP `navigator.modelContext` integration.
- **Analytics Data Lifecycle**: Daily pruning of insert-heavy analytics tables with configurable retention and BRIN indexing.

**Project Structure:**
- `src/`: Frontend code.
- `supabase/`: Edge functions and database migrations.
- `server/`: Express.js backend code.
- `public/`: Static assets.
- `specs/`: Technical specifications.
- `project-governance/`: Architecture documentation.
- `wise-templates/`: Resume templates.

### External Dependencies
- **Kinde Auth**: User authentication and identity management.
- **Supabase**: Backend-as-a-Service (PostgreSQL, Edge Functions, RLS).
- **Drizzle ORM**: PostgreSQL database interaction.
- **Proxycurl**: LinkedIn profile data import.
- **OpenRouter**: AI provider.
- **Groq**: AI provider.
- **Gemini**: AI provider.
- **Sentry**: Error tracking and performance monitoring.
- **GitHub**: Version control, CI/CD, and DevKit integration.
- **Stripe**: Subscription and payment management.
- **Vite**: Frontend build tool.
- **Tailwind CSS**: Utility-first CSS framework.
- **Radix UI**: UI component library.
- **Framer Motion**: Animation library.
- **Zustand**: State management library.
- **TanStack Query (React Query)**: Data fetching and caching library.
- **Expo SDK 51**: Native shell for iOS and Android clients.