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
The production Supabase project (`jnsfmkzgxsviuthaqlyy`) is **fully in sync** with `supabase/migrations/` (187 of 187 files / 182 of 182 distinct version prefixes recorded in `supabase_migrations.schema_migrations`). Six migration files were patched in place during this task to be idempotent against the project's pre-existing schema gaps — `public.portfolios` and `public.tailoring_results` were never created on this project (the live app stores portfolio data on `public.profiles` — see the NOTE inside `20260418195801_portfolio_id_columns.sql`):

1. `20260416000000_add_performance_indexes.sql` — every `CREATE INDEX` is now wrapped in `to_regclass(...) IS NOT NULL` and per-column `information_schema.columns` guards. Notifications index switched from non-existent `read` to canonical `is_read`.
2. `20260418000000_rls_tailoring_results_and_audit_docs.sql` — RLS block gated on `to_regclass('public.tailoring_results')`. Policies will apply automatically the moment the table is created.
3. `20260418195803_portfolio_id_consumers.sql` — entire body gated on `to_regclass('public.portfolios')`; clean no-op when absent.
4. `20260419000000_drop_legacy_portfolio_username_columns.sql` — gated on `portfolios` existence AND a fully back-filled `portfolio_id` column on each target table; will not drop the legacy username FKs while they are still the only link.
5. `20260423000000_analytics_premium_rpcs.sql` — `get_country_stats` rewritten to source from `public.portfolio_visits.country` (the canonical visitor-country signal) instead of the non-existent `profiles.country`.
6. `20260507000011_user_api_keys_check_v2.sql` — `CHECK (key_version = 2)` is now added with `NOT VALID`, so it protects new rows immediately while leaving the 1 legacy v1 row in place. Run `ALTER TABLE public.user_api_keys VALIDATE CONSTRAINT user_api_keys_key_version_v2_only` after re-encrypting that row (follow-up Task #8).

Operator workflow:
- `npm run db:check-drift` → exit 0 = in sync, exit 1 = pending migrations on disk. Always also surfaces a WARNING for any reused version prefixes (`supabase_migrations.schema_migrations.version` is unique, so once one sibling is recorded the other siblings are silently treated as applied — you must verify each sibling individually). Requires `SUPABASE_ACCESS_TOKEN`.
- When applying a migration, INSERT into `supabase_migrations.schema_migrations(version, name, statements)` ONLY after the SQL succeeds. Never record a failed run as applied.
- Sync state log: `.local/backups/sync-results.txt` (OK) and `.local/backups/sync-errors.txt` (FAIL — historical, all entries now resolved).
- Pre-sync snapshot location: `.local/backups/pre-sync-snapshot-*.json` + `README.md`. Supabase auto daily backups + PITR are the actual recovery path.

### Managed AI Keys (Operator Note — added 2026-04-21, Task #10)
The managed AI providers used by `_shared/aiClient.ts` (`callWiseresumeAI`) read three env vars: `OPENROUTER_API_KEY` (primary), `OPENROUTER2_API_KEY` (failover OpenRouter account, used by the `openrouter2` engine and the `auto` chain), and `GROQ_API_KEY` (final fallback). All three live in **two places**, kept in lock-step:

1. **Replit Secrets** — read by the Express server at boot. Their absence triggers the `[server] No managed AI keys present in Replit env (...)` warning and means every managed-mode AI call returns "AI is not configured".
2. **Supabase Edge Function secrets** — read by the deployed edge functions via `Deno.env.get(...)`. They are pushed automatically at server boot by `bootstrapSupabaseSecrets()` in `server/index.ts` via `POST https://api.supabase.com/v1/projects/{ref}/secrets` using `SUPABASE_ACCESS_TOKEN`. The push is idempotent (Supabase upserts by name) and only fires for keys actually present in the Replit env, so partial sets are fine.

To rotate: update the value in **Replit Secrets**, restart the `Start application` workflow, and confirm the boot log line `[server] Pushed managed AI secrets to Supabase Edge Functions: ...` lists the rotated key. The bootstrap will overwrite the Supabase-side value with the new one. To verify end-to-end, hit `ai-health` (badge probe) or `ai-test` (DevKit AI Provider panel) — both walk the same `openrouter → openrouter2 → groq` chain that real chat traffic does, so the badge will go green as long as at least one link works. Free-tier OpenRouter accounts can return 429 on burst traffic; this is expected and is exactly why the failover chain exists.

**Verification recorded 2026-04-21 (Task #10 close-out):**
- Server boot log after secrets were added (warning gone, push succeeded):
  - `[server] Pushed managed AI secrets to Supabase Edge Functions: OPENROUTER_API_KEY, OPENROUTER2_API_KEY, GROQ_API_KEY`
  - The previous `[server] No managed AI keys present in Replit env (...)` line is no longer emitted.
- Upstream key validity (direct curl):
  - `OPENROUTER_API_KEY` → `GET https://openrouter.ai/api/v1/auth/key` → HTTP 200 (free tier; chat-completions can return 429 on burst, failover handles it).
  - `OPENROUTER2_API_KEY` → `POST .../chat/completions` with `openrouter/elephant-alpha` → HTTP 200.
  - `GROQ_API_KEY` → `POST https://api.groq.com/openai/v1/chat/completions` with `qwen/qwen3-32b` → HTTP 200.
- Deployed Supabase Edge Function smoke tests (called with a JWT minted from `SUPABASE_JWT_SECRET` for an existing auth user):
  - `POST /functions/v1/ai-health` → HTTP 200, `{"status":"healthy","latencyMs":580,"provider":"wiseresume","errorCode":null}`.
  - `POST /functions/v1/ai-test` → HTTP 200, `{"success":true,"providerUsed":"wiseresume/openrouter2:openrouter/elephant-alpha","response":"Hello! I'm Wise Resume AI","model":"openrouter/elephant-alpha","fallbackUsed":false}` — confirms a real managed-mode chat completion is now flowing for non-BYOK users via the failover chain.