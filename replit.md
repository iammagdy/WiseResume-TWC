# WiseResume — Full Project Knowledge Base

### Overview
WiseResume is an AI-powered Progressive Web App (PWA) designed for comprehensive career management. It enables users to create and tailor resumes for specific job listings using AI, publish public portfolios, practice interview questions, track job applications, and manage career goals. The project aims to provide a robust, AI-driven platform for job seekers, with future expansion into an HR SaaS product (WiseHire).

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
- **`creditUtils.ts`**: Derive daily limit from plan at runtime — never trust `ai_credits.daily_limit` column.
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
- **Database**: Neon PostgreSQL via Drizzle ORM (schema: `server/schema.ts`)
- **Backend**: Express.js server (`server/index.ts`, port 5001)
- **PWA**: Capacitor 8, vite-plugin-pwa
- **Hosting**: Replit (autoscale deployment)

**Authentication Flow:**
Users log in via Kinde, receiving a Kinde access token. The client exchanges this token with the Express server at `POST /api/fn/token-exchange`. The server verifies the Kinde JWT, derives a deterministic UUID for the user, upserts profile data in Neon DB, and signs a short-lived session JWT. This session JWT is then used for all subsequent `/api/*` calls and validated locally by the server.

**Core Features & Implementations:**
- **AI Career Management**: Resume building, AI tailoring, public portfolios, interview practice, job tracking, career goal management.
- **AI System**: Utilizes OpenRouter and Groq as primary AI providers (free tiers), with a central AI client (`supabase/functions/_shared/aiClient.ts`) for dispatching calls. Supports "Bring Your Own Key" (BYOK) for various providers (OpenAI, Anthropic, Gemini, Groq, etc.).
- **AI Error Handling**: A structured error chain from Supabase Edge Function to user-facing toasts, with frontend and backend utilities for parsing and handling `AIError` types.
- **Agentic Chat**: Multi-turn AI assistant with persistent sessions and tool-calling capabilities (e.g., `update_summary`, `get_company_briefing`, `open_job_tracker`). Tools leverage a `tool_cache` DB table for output caching.
- **Subscription & Credits**: `free`, `pro`, `premium` plans with daily AI credit limits derived dynamically from the user's active plan.
- **Design System**: Features a consistent UI with Deep Indigo primary and Warm Amber accent colors, Inter typography, solid backgrounds (no glassmorphism except for specific components), custom shadow scales, and light/dark/system themes.
- **Navigation**: `DesktopNav` and `BottomTabBar` provide intuitive access to features. Locked tabs display upgrade toasts and navigate to the subscription page.
- **Admin DevKit**: A password-protected admin panel with tabs for Analytics, Live Activity, Deployment, and Audit Log. Features include GitHub commit status, environment variable checks, AI provider status, and analytics retention sweep status.
- **Server-side LinkedIn Importer**: `POST /api/linkedin-profile` endpoint leveraging Proxycurl for structured profile data import, with rate limiting and quota management.
- **Kanban Job Tracker**: Board view for job applications with draggable cards, inline quick add, and optimistic updates with server sync.
- **WiseHire (HR SaaS Platform)**: A separate product for HR users, embedded in the same workspace, featuring an AI JD Writer, AI Brief Generator, and Candidate Pipeline Board.
- **WebMCP Integration**: Agent discovery surface via static files (`sitemap.xml`, `robots.txt`, `.well-known/*`) and HTTP headers for AI agents, along with WebMCP `navigator.modelContext` integration for skill registration.
- **Analytics Data Lifecycle**: Daily pruning of insert-heavy analytics tables (`portfolio_visits`, `error_log`, `audit_logs`, `admin_audit_log`) with configurable retention and BRIN indexing for performance.

**Project Structure:**
- `src/`: Frontend code (components, hooks, lib, pages, store).
- `supabase/`: Edge functions and database migrations.
- `server/`: Express.js backend code.
- `public/`: Static assets and PWA manifest.
- `specs/`: Technical specifications.
- `project-governance/`: Architecture documentation.
- `wise-templates/`: Resume templates.

### External Dependencies
- **Kinde Auth**: For user authentication and identity management.
- **Neon PostgreSQL**: Managed database service.
- **Drizzle ORM**: For interacting with the PostgreSQL database.
- **Supabase**: Used for Edge Functions, RLS, and as a legacy proxy for some client-side calls.
- **Proxycurl**: For LinkedIn profile data import.
- **OpenRouter**: AI provider for various language models.
- **Groq**: AI provider for various language models.
- **Gemini**: AI provider for various language models.
- **Sentry**: For error tracking and performance monitoring.
- **GitHub**: For version control, CI/CD, and DevKit integration.
- **Stripe**: For subscription and payment management (implied by `credit_transactions` and `subscriptions` management).
- **Vite**: Frontend build tool.
- **Tailwind CSS**: Utility-first CSS framework.
- **Radix UI**: UI component library.
- **Framer Motion**: Animation library.
- **Zustand**: State management library.
- **TanStack Query (React Query)**: Data fetching and caching library.
- **Capacitor**: PWA container for native app features.

### Supabase Migration Sync (Operator Note — added 2026-04-21, Task #6)
The production Supabase project (`jnsfmkzgxsviuthaqlyy`) is now sync'd with `supabase/migrations/` for **178 of 187 files (182 distinct version prefixes, 178 applied)**. The remaining **6 files are NOT applied** and reference pre-existing schema gaps — the `public.portfolios` and `public.tailoring_results` tables were never created on this project, and the live app stores portfolio data on `public.profiles` (see the NOTE inside `20260418195801_portfolio_id_columns.sql`).

**Caveat — duplicate version prefixes:** `supabase_migrations.schema_migrations.version` is unique, but several version prefixes are reused by 2–3 files. When one sibling is recorded as applied, version-only checks treat the other siblings as applied even if their SQL was never run. The drift script (`npm run db:check-drift`) explicitly surfaces these cases. Currently affected siblings whose SQL did NOT run on Supabase:

1. `20260416000000_add_performance_indexes.sql` — `idx_portfolios_user_id` line errors on missing `portfolios`. Wrap in `IF EXISTS` guards before re-applying. (Pending by version.)
2. `20260418000000_rls_tailoring_results_and_audit_docs.sql` — fails on missing `public.tailoring_results`. **Hidden by sibling** `20260418000000_portfolio_draft_column.sql` (which did apply). This is RLS-related — re-author against the actual schema before relying on it.
3. `20260418195803_portfolio_id_consumers.sql` — assumes `portfolio_id` columns were back-filled; they weren't, because `portfolios` doesn't exist. (Pending by version.)
4. `20260419000000_drop_legacy_portfolio_username_columns.sql` — references `portfolio_visits.portfolio_id` which was never added. **Hidden by siblings** `_add_company_briefings.sql` and `_phase2_features.sql` (which did apply).
5. `20260423000000_analytics_premium_rpcs.sql` — `get_country_stats` RPC reads `country` from `profiles`, which has no such column. Either add the column or rewrite the RPC against `portfolio_visits.country`. (Pending by version.)
6. `20260507000011_user_api_keys_check_v2.sql` — 1 legacy row has `key_version = 1`; backfill that row to v2 (re-encrypt with per-user salt) before re-applying the `key_version = 2` constraint. (Pending by version.)

Full failure log: `.local/backups/sync-errors.txt`. Successful applies: `.local/backups/sync-results.txt`.

Operator workflow:
- `npm run db:check-drift` → reports pending versions AND duplicate-version warnings (requires `SUPABASE_ACCESS_TOKEN`). Exit code 1 if drift OR duplicates exist, 0 only when fully clean.
- When applying a fixed migration, INSERT into `supabase_migrations.schema_migrations(version, name, statements)` ONLY after the SQL succeeds. Never record a failed run as applied.
- Pre-sync snapshot location: `.local/backups/pre-sync-snapshot-*.json` + `README.md`. Supabase auto daily backups + PITR are the actual recovery path.