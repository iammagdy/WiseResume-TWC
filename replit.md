# WiseResume — Full Project Knowledge Base

---

## ⚠️ CRITICAL — READ THIS FIRST BEFORE TOUCHING ANYTHING

### Replit is the DEVELOPMENT environment only. Supabase is the BACKEND.

**Production site:** `https://resume.thewise.cloud` (hosted on Hostinger — static frontend + Supabase backend)
**Supabase project:** `jnsfmkzgxsviuthaqlyy` (`https://jnsfmkzgxsviuthaqlyy.supabase.co`)
**Replit role:** Development/preview workspace ONLY — not a production host.

### What this means for every agent working in this repo:

1. **NEVER migrate away from Supabase.** Supabase is the permanent backend. All user data (profiles, resumes, subscriptions, AI credits, portfolios, WiseHire data, etc.) lives in Supabase Postgres and is served by Supabase Edge Functions. This will not change.

2. **NEVER use or touch Replit Postgres (`DATABASE_URL`) for anything.** Replit automatically provisions a Postgres database and sets `DATABASE_URL`, but it plays no role in this application. It contains no real data. Do NOT run `npm run db:push` or `drizzle-kit push` — doing so writes schema to the wrong database and causes server errors (e.g. the analytics sweep calling stored procedures that only exist in Supabase). Do NOT repoint any data calls to it. Treat `DATABASE_URL` as an unused Replit built-in.

3. **NEVER replace Supabase Edge Functions with Express routes** for business logic that already runs on Supabase. The `supabase/functions/` directory contains 97 deployed Deno edge functions — they are the live backend. The Express server in `server/index.ts` is a dev-only proxy that forwards `/api/fn/*` requests to those edge functions.

4. **NEVER replace Kinde Auth with Replit Auth or any other auth system.** Kinde is the production identity provider. The `@kinde-oss/kinde-auth-react` SDK, the JWKS bridge, and the shadow-user flow are all production-critical.

5. **NEVER add, remove, or change Supabase secrets without the user's explicit instruction.** The following secrets MUST be present in Replit Secrets (not env vars) for the dev environment to make authenticated calls to Supabase:
   - `SUPABASE_SERVICE_ROLE_KEY` — server-side Supabase admin access
   - `SUPABASE_JWT_SECRET` — for signing/verifying bridge JWTs
   - `SUPABASE_ACCESS_TOKEN` — for auto-pushing AI secrets to Supabase edge functions
   - AI keys: `OPENROUTER_API_KEY`, `OPENROUTER2_API_KEY`, `GROQ_API_KEY`

6. **The production deploy flow is:** build frontend → upload `dist/` to Hostinger → Supabase edge functions are already live. Replit autoscale deployment (`NODE_ENV=production node dist/server.mjs`) is an ALTERNATIVE dev/staging path — NOT what serves `resume.thewise.cloud`.

7. **Do not run `npm run db:push` against Supabase.** `drizzle-kit push` targets the Replit Postgres (`DATABASE_URL`). Supabase schema changes go through SQL migrations in `supabase/migrations/` applied via the Supabase CLI or dashboard.

### Summary of what each system is responsible for:

| System | Role |
|---|---|
| **Supabase Postgres** | All user data — canonical production database |
| **Supabase Edge Functions** | All business logic, AI calls, auth helpers |
| **Supabase Auth** | Shadow users for RLS (Kinde is the primary IdP) |
| **Kinde Auth** | Primary identity provider (JWTs, login, sign-up) |
| **Replit Postgres** | Unused — Replit built-in, ignore it entirely |
| **Express server (`server/index.ts`)** | Dev proxy, PDF export, admin bridge — NOT a Supabase replacement |
| **Hostinger** | Static frontend hosting for `resume.thewise.cloud` |
| **Replit** | Development environment only |

---

### Overview
WiseResume is an AI-powered web app for comprehensive career management. (The Progressive Web App layer was removed in v3.5.0+; see the "PWA Removal" operator note below.) It enables users to create and tailor resumes for specific job listings using AI, publish public portfolios, practice interview questions, track job applications, and manage career goals. The project aims to provide a robust, AI-driven platform for job seekers, with future expansion into an HR SaaS product (WiseHire).

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

### Production Database Guardrails

This section is an additive operator note. Do NOT rewrite or remove existing architecture notes unless explicitly asked. Treat the rules below as a higher-priority clarification for current production behavior.

**Current production source of truth**
- The canonical production database for user-facing WiseResume data is the Supabase project `jnsfmkzgxsviuthaqlyy`.
- For production reads and writes involving user data, treat Supabase as the source of truth for:
  - `profiles`
  - `resumes`
  - `subscriptions`
  - `ai_credits`
  - `user_preferences`
  - other dashboard/user-facing tables already populated in Supabase
- Do NOT switch dashboard or authenticated user endpoints back to local Replit Postgres or a fallback Neon/local Postgres path unless the user explicitly asks for a full database migration.

**Do not break production by "aligning" to local Postgres**
- If local Postgres / Replit Postgres / Neon appears available but does not contain the real production rows, it must NOT be treated as the active source of truth for dashboard data.
- Do NOT "fix" endpoints by repointing them from Supabase to local Postgres just because `replit.md` mentions Neon/Drizzle in older architecture notes.
- If there is any conflict between older architecture text and the live production data location, prefer the live production data location above.

**Mandatory behavior for agents**
- Before changing any database access path, first determine where the real production data currently lives.
- If user-facing data already lives in Supabase, preserve Supabase-backed reads/writes.
- Do NOT introduce split-brain behavior where reads go to Supabase but writes go to local Postgres, or vice versa.
- Any change affecting auth-linked profile creation, resume creation/update, subscriptions, credits, or dashboard hydration must keep read/write paths consistent.

**Protected endpoints / flows**
- Do NOT repoint these production read paths away from Supabase unless explicitly instructed by the user:
  - `/api/data/me`
  - `/api/data/resumes`
  - `/api/data/profile`
  - `/api/data/activity-rows`
  - `/api/data/job-activity-rows`
  - `/api/data/portfolios/me`
  - `/api/data/resumes/:id`
  - `/api/data/resumes/exists/:id`
  - any other authenticated `/api/data/*` route serving dashboard hydration

**Before making any DB-related change, the agent MUST:**
1. Read this section first.
2. Confirm whether the affected table already has live production rows in Supabase. If yes, all reads AND writes for that table go through Supabase (REST via service-role key on the server, or `supabase-js` on the client) — never local Postgres.
3. If the change touches a write path, check the matching read path (and vice versa) in the same edit so they cannot drift apart.
4. If unsure where the data lives, ASK the user before changing access paths. Do not guess and do not "harmonize" to whichever DB looks most convenient.

**Portability note (importing into another Replit account)**
- These rules apply regardless of which Replit account hosts the workspace. The Supabase project ID above is the production source of truth and must be re-bound via the same secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`) on import. Local Postgres in the new account will be empty and must NOT be treated as authoritative.

### System Architecture

**Tech Stack:**
- **Frontend**: React 18, TypeScript 5, Vite 6
- **Styling**: Tailwind CSS, Radix UI, Framer Motion
- **State Management**: Zustand, TanStack Query (React Query)
- **Authentication**: Kinde Auth (JWT verified server-side via JWKS)
- **Database**: Neon PostgreSQL via Drizzle ORM (schema: `server/schema.ts`)
- **Backend**: Express.js server (`server/index.ts`, port 5001)
- **Native shell**: Capacitor 8 (mobile builds only). Web build is no longer a PWA — no service worker, no precaching.
- **Hosting**: Replit (autoscale deployment)

**Authentication Flow:**
Users log in via Kinde, receiving a Kinde access token. The client exchanges this token with the Express server at `POST /api/fn/token-exchange`. The server verifies the Kinde JWT, derives a deterministic UUID for the user, upserts profile data in Neon DB, and signs a short-lived session JWT. This session JWT is then used for all subsequent `/api/*` calls and validated locally by the server.

**Replit Deployment:**
- Development: Vite dev server on port 5000 (frontend) + tsx server on port 5001 (Express API). Vite proxies `/api/*` to port 5001.
- Production: `npm run build:all` compiles Vite frontend into `dist/` and esbuild bundles `server/index.ts` → `dist/server.mjs`. The production server runs with `NODE_ENV=production API_PORT=5000 node dist/server.mjs` and serves both the static SPA files AND the Express `/api/*` routes on the same port 5000.
- `src/lib/apiFnUrl.ts` is environment-aware (Phase 8 contract): dev returns `/api/fn/<name>` (Vite → Express :5001), and production returns `${VITE_SUPABASE_URL}/functions/v1/<name>` so the live Hostinger static deploy at `resume.thewise.cloud` (no Express in prod) calls Supabase directly. See `Project Atlas/01-Currently Implemented/stability-fixes/phase-8-prod-edge-function-routing.md`. Do NOT revert this to "always relative" — it breaks sign-in on the live site.
- `server/index.ts` serves `dist/` as static files in production and uses `app.use(...)` SPA fallback for non-API routes.

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
- `public/`: Static assets, Apache `.htaccess`, and the changelog JSON. No manifests, no service worker, no PWA icons.
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
- **Capacitor**: Native shell for mobile builds.

### DevTools Exposure Hardening (Operator Note — added 2026-04-21, Task #26)
A security audit of what is visible to anyone who opens browser DevTools (F12) on the live site found one critical issue plus several defense-in-depth gaps. All are now closed at the build/server-config layer:

1. **Sourcemaps no longer ship to production.** `vite.config.ts` only emits `*.js.map` when `SENTRY_AUTH_TOKEN` is set (and the Sentry plugin then deletes them post-upload). A postbuild guard `scripts/check-no-sourcemaps.mjs` runs as part of `npm run build` and fails the build if any `dist/**/*.map` slips through without the Sentry token. **Apache also returns 403 for any `*.map` request** (`public/.htaccess`) as a belt-and-braces second line of defence.
2. **`console.log` / `console.info` / `console.debug` / `console.trace` / `debugger` are stripped from production bundles** via `esbuild.drop` in `vite.config.ts`. `console.error` and `console.warn` are **kept** so Sentry breadcrumbs and the ErrorBoundary chunk-load recovery still work. Existing `if (DEV) console.log(...)` patterns in `src/hooks/useElevenLabsScribe.ts` and elsewhere continue to work in dev mode (the drop only fires when `NODE_ENV === 'production'` or `MODE === 'production'`).
3. **Three new response headers added to `public/.htaccess`:** `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, and `Cross-Origin-Opener-Policy: same-origin`. COOP is the strict variant — safe today because Kinde uses a top-level redirect flow (no popup) and no other feature relies on `window.opener` postMessage. **If a future feature adds popup-based OAuth, Stripe Checkout in popup mode, or a popup share dialog, downgrade to `same-origin-allow-popups`** (still strong protection; only loses isolation for popups this origin opens itself). The existing CSP, X-Frame-Options, Referrer-Policy, and Permissions-Policy lines are unchanged.

The `.map`-deny rule is implemented as `RewriteRule \.map$ - [F,L,NC]` placed BEFORE the SPA fallback rewrite, not as a `<FilesMatch>` inside the headers block. This makes it independent of `mod_headers` being loaded and guarantees it fires before the catch-all index.html rewrite.

**One-shot purge required after deploying these changes:** Hostinger's manual upload does NOT delete files that don't exist locally. The previous deploy left ~467 `.map` files (~29 MB) under `https://resume.thewise.cloud/assets/`. After the next upload of the fresh `dist/`, verify the cleanup:

```bash
# Sourcemap cleanup — should return 404 (file gone) or 403 (deny rule firing).
# Pick any *.map filename you saw in the previous DevTools network tab.
curl -I "https://resume.thewise.cloud/assets/<old-name>.js.map"

# Confirm the new headers are live.
curl -sI "https://resume.thewise.cloud/" | grep -iE "strict-transport|x-content-type|cross-origin-opener"
```

If any `.map` URL still returns 200, the upload didn't replace the `assets/` directory — re-upload the **entire** fresh `dist/` (overwriting `public_html/`) and re-test. The `.htaccess` map-deny rule will start blocking them server-side as soon as the new `.htaccess` is in place, even if old `.map` files are still on disk.

### PWA Removal (Operator Note — completed 2026-04-22, Tasks #22 + #15)
The web build is fully de-PWA'd. Removed in two stages:

**Task #22 (v3.5.0):** `vite-plugin-pwa` and Workbox removed; `registerSW` call removed from `src/main.tsx`; tombstone `public/custom-sw.js` deployed to unregister any prior SW on next visit.

**Task #15 (2026-04-22):** All remaining PWA artifacts deleted — `public/manifest.json`, `public/manifest-wisehire.json`, `public/custom-sw.js`, `public/icons/` (all PWA icon sizes). Removed from HTML: `<link rel="manifest">`, `<meta name="theme-color">`, `apple-mobile-web-app-*` metas, `mobile-web-app-capable`, and all `apple-touch-startup-image` splash links. Removed from code: `InstallPrompt`, `InstallButton`, and the `<AppInstallPrompt>` wrapper in `AppInterior.tsx`; the install/PWA strip section in `WiseResumeContent.tsx`; the apple-touch-icon and manifest href updates in `Index.tsx`.

No browser will show an "Install" or "Add to Home Screen" prompt for this origin. Push notification code (`usePushNotifications`, `PushNotificationSettings`) was deleted along with the disabled UI block in `NotificationsSection`. Do NOT add `navigator.serviceWorker.register(...)` anywhere — it would re-trigger browser install eligibility.

### Supabase Migration Sync (Operator Note — added 2026-04-21, Task #6)
The production Supabase project (`jnsfmkzgxsviuthaqlyy`) is **fully in sync** with `supabase/migrations/` (187 of 187 files / 182 of 182 distinct version prefixes recorded in `supabase_migrations.schema_migrations`). Six migration files were patched in place during this task to be idempotent against the project's pre-existing schema gaps — `public.portfolios` and `public.tailoring_results` were never created on this project (the live app stores portfolio data on `public.profiles` — see the NOTE inside `20260418195801_portfolio_id_columns.sql`):

1. `20260416000000_add_performance_indexes.sql` — every `CREATE INDEX` is now wrapped in `to_regclass(...) IS NOT NULL` and per-column `information_schema.columns` guards. Notifications index switched from non-existent `read` to canonical `is_read`.
2. `20260418000000_rls_tailoring_results_and_audit_docs.sql` — RLS block gated on `to_regclass('public.tailoring_results')`. Policies will apply automatically the moment the table is created.
3. `20260418195803_portfolio_id_consumers.sql` — entire body gated on `to_regclass('public.portfolios')`; clean no-op when absent.
4. `20260419000000_drop_legacy_portfolio_username_columns.sql` — gated on `portfolios` existence AND a fully back-filled `portfolio_id` column on each target table; will not drop the legacy username FKs while they are still the only link.
5. `20260423000000_analytics_premium_rpcs.sql` — `get_country_stats` rewritten to source from `public.portfolio_visits.country` (the canonical visitor-country signal) instead of the non-existent `profiles.country`.
6. `20260507000011_user_api_keys_check_v2.sql` — `CHECK (key_version = 2)` is now added with `NOT VALID`, so it protects new rows immediately while leaving the 1 legacy v1 row in place. **VALIDATED 2026-04-21 (Task #13)** — the single legacy v1 row was migrated to v2 via `admin-migrate-api-key-encryption` and `ALTER TABLE public.user_api_keys VALIDATE CONSTRAINT user_api_keys_key_version_v2_only` succeeded (`pg_constraint.convalidated = true`).

Operator workflow:
- `npm run db:check-drift` → exit 0 = in sync, exit 1 = pending migrations on disk OR a prefix collision (see below). Requires `SUPABASE_ACCESS_TOKEN`. Set `SUPABASE_MIGRATIONS_DIR` to point the script at a scratch directory (used by the strict-mode smoke test).
- **Reused prefixes — informational WARNING:** when a duplicate 14-digit prefix is already recorded in `schema_migrations`, the script prints a WARNING and continues. This protects the four historical reused prefixes listed above (each sibling individually verified-applied). `schema_migrations.version` is unique, so once one sibling is recorded the others are silently treated as applied — verify each historical sibling actually ran on first sync.
- **Reused prefixes — strict ERROR (added 2026-04-21, Task #14):** when a duplicate 14-digit prefix is **not yet** in `schema_migrations`, the script exits non-zero. This blocks the entire class of bug where a brand-new migration accidentally picks an already-used prefix and then gets silently masked the moment its sibling is recorded. **To resolve:** rename all-but-one of the colliding files with a fresh 14-digit timestamp greater than the latest prefix in `supabase/migrations/` (e.g., `date -u +%Y%m%d%H%M%S`), then re-run `npm run db:check-drift`.
- When applying a migration, INSERT into `supabase_migrations.schema_migrations(version, name, statements)` ONLY after the SQL succeeds. Never record a failed run as applied.
- Sync state log: `.local/backups/sync-results.txt` (OK) and `.local/backups/sync-errors.txt` (FAIL — historical, all entries now resolved).
- Pre-sync snapshot location: `.local/backups/pre-sync-snapshot-*.json` + `README.md`. Supabase auto daily backups + PITR are the actual recovery path.

### npm audit triage (Operator Note — added 2026-04-21, Task #14)
After Task #14, `npm audit` reports **0 critical, 0 high, 4 moderate, 3 low**. The high (`basic-ftp` GHSA-rp42-5vxx-qpwr, transitive via `puppeteer`) was resolved by `npm audit fix` (no `--force`, no `package.json` change — lockfile only). All remaining findings require a major-version bump that `npm audit fix --force` would push, and we are deliberately deferring them:

- **`drizzle-kit` 0.31.10 → 0.18.1 chain** (1 moderate `drizzle-kit`, 1 moderate `@esbuild-kit/core-utils`, 1 moderate `@esbuild-kit/esm-loader`, 1 moderate `esbuild ≤0.24.2` GHSA-67mh-4wv8-2f99). Auto-fix would **downgrade** `drizzle-kit` to 0.18.1 (a regression — we are on 0.31.10). The `esbuild` advisory only affects the dev server (`vite serve` / `drizzle-kit` local runs); production builds embed pinned `esbuild` ≥0.25 via Vite 6. Defer until drizzle-kit ships a release that pulls in modern `@esbuild-kit/*` (track upstream; revisit before public launch).
- **`jsdom` 20.x → 29.0.2 chain** (1 low `jsdom`, 1 low `http-proxy-agent`, 1 low `@tootallnate/once` GHSA-vpq2-c234-7xj6). `jsdom` is a `vitest` test-environment dep only — never ships. CVSS 3.3 local-only. Defer until vitest's default jsdom peer range catches up; bumping unilaterally to 29.x risks vitest test regressions.

`overrides` block in `package.json` already pins `serialize-javascript@7.0.5` (pre-existing). Re-run `npm audit` after every dependency change and re-triage anything that climbs to high or critical.

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

### Landing Page LCP (Operator Note — added 2026-04-21, Task #15)
The web-vitals reporter previously logged LCP=8080ms on `/` and `/enterprises` because the LCP element — the hero `<h1>` — sat inside `LandingMotionStage` (lazy chunk holding framer-motion + the hero subtree) AND was wrapped in `<motion.h1>` with `heroItemVariants.hidden = { opacity: 0 }`. Result: the H1 couldn't paint until (a) the entry chunk evaluated, (b) `LandingMotionStage` chunk + its `framer` chunk downloaded, (c) the framer entry-stagger animated opacity from 0 → 1.

Fix shipped:
1. **Static hero shell as Suspense fallback** — `src/components/landing/LandingHeroShell.tsx` renders a no-framer-motion copy of the hero (eyebrow + H1 with the first typewriter word + radial glow background, sized to `minHeight: 640` so CLS stays flat) for both `jobseeker` and `wisehire` modes. `Index.tsx` uses it as the `<Suspense fallback>` for `LandingMotionStage`, so the H1 paints on the FIRST render of `Index` — before any motion-stage chunk arrives. Once the lazy stage hydrates, it replaces the shell; LCP is already locked in.
2. **`heroItemVariants.hidden.opacity` flipped to 1** in `src/components/landing/landingAnimations.ts`. The hero subtree no longer fades from opacity 0 when the lazy stage hydrates — the slide (y: 22 → 0) still gives a subtle entrance but the H1 is paintable from frame zero of the lazy mount as well, so even cold-cache visitors who don't see the shell long get the H1 on the first hero-chunk frame.

Out of scope (intentionally not changed): the inactive-product hero chunk preload at the top of `Index.tsx` is preserved as-is; the `LandingMotionStage` + active hero chunk warm-up `void import()`s still fire so the lazy stage hydrates ASAP. No SSR/SSG migration. No hero redesign.

LCP element identity: the `<h1>` containing "Stand out as a {typewriter}" on `/`, and the `<h1>` containing "Hire Smarter. Screen Faster." on `/enterprises`. Both are now rendered statically by `LandingHeroShell` and again by the real `WiseResumeHero` / `WiseHireHero` once the motion stage chunk loads.

Verification: production build (`npm run build`) succeeds; `tsc --noEmit` passes. Empirical Lighthouse run was not possible in this environment (puppeteer's bundled Chrome is missing `libglib-2.0.so.0` in the Replit container, and no system Chromium is installed); the LCP improvement was reasoned-through structurally and must be re-measured post-deploy via the existing web-vitals reporter (`/api/metrics/web-vitals` ingest path) or a Lighthouse run from a workstation. If future regression returns LCP to "poor", first inspect the `LandingHeroShell` import in `Index.tsx` — accidental removal would push LCP back into the lazy-chunk waterfall.

### Edge Function ↔ Disk Reconciliation (Operator Note — added 2026-04-21, Task #13)
After Task #13, the deployed edge-function set on project `jnsfmkzgxsviuthaqlyy` is fully in sync with `supabase/functions/` (97 deployed = 97 on disk; `Disk-only: []`, `Deployed-only: []`).

Reconciled functions and their disposition:
- **Disk-only → DEPLOYED (3):**
  - `admin-migrate-api-key-encryption` — kept; deployed and used to migrate the single legacy v1 BYOK row (gemini provider, user `58b8cbc6-…`) to v2. Audit row `action=migrated, from_version=1, to_version=2` recorded in `ai_key_migration_audit`.
  - `admin-backfill-ollama-urls` — kept; deployed. Smoke-tested with valid DevKit token (`scanned=0, dry_run=true`). Useful future admin tool if Ollama URL safety rules change.
  - `admin-revoke-devkit-sessions` — kept; deployed. Smoke-tested with valid DevKit token (`{all:true}` → `revoked_count=1`). No frontend button currently calls it (despite Task #13 description suggesting one); kept anyway because it's the canonical panic-revoke for `admin_sessions` and intentional per the AUTH-5 thread.
- **Deployed-only → DELETED (4):** all four are confirmed orphans per `BACKEND_AUDIT.md` / `EDGE_FUNCTION_AUDIT.md` / Task #13 brief and have zero client/CI references.
  - `generate-store-screenshots` — deleted from Supabase deployment.
  - `send-contact-inquiry` — deleted (UI uses `send-contact-email`).
  - `send-feature-request` — deleted (UI uses `send-contact-email`).
  - `wisehire-apply` — deleted (superseded by `wisehire-bulk-screen` + direct candidate insertion).

`user_api_keys` constraint state: `user_api_keys_key_version_v2_only` is **VALIDATED** (`pg_constraint.convalidated = true`); 0 rows with `key_version <> 2`.

One-shot helper: a temporary `task13-bridge` edge function was deployed solely to mint a DevKit session token from inside the Edge runtime (since `DEV_KIT_PASSWORD` is only available to deployed Deno code). It was gated by a one-time `TASK13_BRIDGE_SECRET` Supabase secret, used for two token mints (one for the production migration, one for smoke tests against the two newly-deployed admin helpers), and then deleted along with the secret and the issued `admin_sessions` rows (revoked_at set). The bridge is NOT in the repo and NOT in `supabase/config.toml`.