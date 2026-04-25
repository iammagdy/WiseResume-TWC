# WiseResume — Compressed Project Knowledge Base

### Overview
WiseResume is an AI-powered web application for comprehensive career management. It assists users in creating and tailoring resumes for specific job listings, publishing public portfolios, practicing interview questions, tracking job applications, and managing career goals. The project's vision is to establish a robust, AI-driven platform for job seekers, with future expansion into an HR SaaS product called WiseHire. The application focuses on providing an efficient and intelligent solution for career advancement.

### User Preferences
- **Documentation Rules**: After every completed task, bug fix, or feature, the following documentation updates are mandatory:
    - Add an entry to `CHANGELOG.md` detailing technical changes (files, functions, DB migrations, behavior) in English, without plain-language explanations.
    - Add a plain-language entry to `Project Atlas/04-For You (Plain Language)/` in the appropriate file (`current-features.md`, `stability-improvements.md`, or `coming-soon.md`), focusing on user benefits without jargon or file names. Update the "Last verified" timestamp.
    - Update relevant reference cards in `Project Atlas/01-Currently Implemented/` (e.g., database tables, critical systems, hooks, pages, stability fixes). Update the "Last verified" timestamp on touched cards.
    - Update `replit.md` only for changes in architecture, infrastructure, or key patterns (new endpoint, DB table, shared cache key, env var), skipping routine bug fixes.
- **No `any` casts** — TypeScript strict mode enforced.
- **Never change primary key column types** — destructive and breaks existing data.
- **Never invent marketing stats** — always source from `src/pages/Index.tsx`.
- **`user.id` = bridge UUID only** — never raw Kinde `kp_xxx` ID.
- **`creditUtils.ts`**: Derive daily limit from plan at runtime. Priority chain (highest wins): (1) global cap `global_daily_limit` in `app_settings`, (2) per-user override in `ai_credits.daily_limit`, (3) plan-level cap override `daily_cap_free|trial|pro` in `app_settings`, (4) per-plan default from `planLimits.ts`. All override lookups are non-fatal fail-open.
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

### System Architecture

**Tech Stack:**
- **Frontend**: React 18, TypeScript 5, Vite 6
- **Styling**: Tailwind CSS, Radix UI, Framer Motion
- **State Management**: Zustand, TanStack Query (React Query)
- **Authentication**: Kinde Auth (JWT verified server-side via JWKS)
- **Database**: Supabase Postgres via Drizzle ORM (schema: `server/schema.ts`)
- **Backend**: Supabase Edge Functions for business logic, AI calls, and auth helpers. Express.js server (`server/index.ts`, port 5001) acts as a dev proxy, PDF exporter, and admin bridge.
- **Mobile**: Capacitor 8 for native mobile builds.
- **Hosting**: Hostinger for static frontend, Replit for development environment.

**Authentication Flow:**
Users authenticate via Kinde, receiving an access token. The client exchanges this token with the Express server at `POST /api/fn/token-exchange`. The server validates the Kinde JWT, generates a deterministic UUID for the user, upserts profile data in the Supabase database, and issues a short-lived session JWT. This session JWT is then used for all subsequent `/api/*` calls and validated server-side.

**Replit Deployment:**
- **Development**: Vite dev server (port 5000) for frontend, `tsx` server (port 5001) for Express API. Vite proxies `/api/*` to port 5001.
- **Production**: Frontend built into `dist/`, Express server bundled to `dist/server.mjs`. Production server runs on `NODE_ENV=production API_PORT=5000 node dist/server.mjs`, serving static SPA files and Express `/api/*` routes on the same port.
- `src/lib/apiFnUrl.ts` handles environment-specific routing: `/api/fn/<name>` in dev (Vite → Express) and `${VITE_SUPABASE_URL}/functions/v1/<name>` in production (Hostinger static deploy → Supabase Edge Functions directly).

**Core Features & Implementations:**
- **AI Career Management**: AI-powered resume building, tailoring for job listings, public portfolios, interview practice, job tracking, and career goal management.
- **AI System**: Centralized AI client (`supabase/functions/_shared/aiClient.ts`) dispatches calls to OpenRouter and Groq (primary providers). Supports "Bring Your Own Key" (BYOK) for various providers (OpenAI, Anthropic, Gemini, Groq). Per-feature routing config stored in `ai_routing_config` table; pass `featureName` to `callAI`/`callAIWithRetry` to activate routing. Supports A/B splits via `ab_secondary_provider`+`ab_split_pct` fields.
- **AI Error Handling**: Structured error chain from Supabase Edge Functions to user-facing toasts, with utilities for parsing `AIError` types.
- **Agentic Chat**: Multi-turn AI assistant with persistent sessions and tool-calling capabilities (e.g., `update_summary`, `get_company_briefing`, `open_job_tracker`). Uses a `tool_cache` DB table for output caching.
- **Subscription & Credits**: `free`, `pro`, `premium` plans with dynamic daily AI credit limits.
- **Design System**: Consistent UI with Deep Indigo primary, Warm Amber accent colors, Inter typography, custom shadow scales, and light/dark/system themes.
- **Navigation**: `DesktopNav` and `BottomTabBar` for intuitive feature access; locked tabs guide users to subscription page for upgrades.
- **Admin DevKit**: Password-protected admin panel with Mission Control, Analytics, Live Activity, Deployment, Audit Log, AI Provider panels (OpenRouter/Groq key slots), AI Routing (per-feature provider config, A/B splits, plan spend caps), Feature Flags, Owner Ops (broadcasts, maintenance), and User management. New edge functions: `admin-ai-routing` (CRUD on `ai_routing_config`) and `admin-ai-caps` (get/set `daily_cap_*` keys in `app_settings`).
- **Server-side LinkedIn Importer**: `POST /api/linkedin-profile` endpoint uses Proxycurl for structured profile data import with rate limiting.
- **Kanban Job Tracker**: Board view for job applications with draggable cards, inline quick add, and optimistic updates.
- **WiseHire (HR SaaS Platform)**: Integrated HR product with AI JD Writer, AI Brief Generator, and Candidate Pipeline Board.
- **WebMCP Integration**: Agent discovery via static files (`sitemap.xml`, `robots.txt`, `.well-known/*`) and HTTP headers, plus WebMCP `navigator.modelContext` integration for skill registration.
- **Analytics Data Lifecycle**: Daily pruning of insert-heavy analytics tables (`portfolio_visits`, `error_log`, `audit_logs`, `admin_audit_log`) with configurable retention and BRIN indexing.

**Project Structure:**
- `src/`: Frontend code (components, hooks, lib, pages, store).
- `supabase/`: Edge functions and database migrations.
- `server/`: Express.js backend code.
- `public/`: Static assets, Apache `.htaccess`, and changelog JSON.
- `specs/`: Technical specifications.
- `project-governance/`: Architecture documentation.
- `wise-templates/`: Resume templates.

### External Dependencies
- **Kinde Auth**: User authentication and identity management.
- **Supabase**: Backend-as-a-Service providing PostgreSQL, Edge Functions, and RLS.
- **Drizzle ORM**: PostgreSQL database interaction.
- **Proxycurl**: LinkedIn profile data import.
- **OpenRouter**: AI provider for various language models.
- **Groq**: AI provider for various language models.
- **Gemini**: AI provider for various language models.
- **Sentry**: Error tracking and performance monitoring.
- **GitHub**: Version control, CI/CD, and DevKit integration.
- **Stripe**: Subscription and payment management (implied).
- **Vite**: Frontend build tool.
- **Tailwind CSS**: Utility-first CSS framework.
- **Radix UI**: UI component library.
- **Framer Motion**: Animation library.
- **Zustand**: State management library.
- **TanStack Query (React Query)**: Data fetching and caching library.
- **Capacitor**: Native shell for mobile builds.