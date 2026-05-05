# WiseResume

WiseResume is an AI-powered web application that helps users manage their careers through resume tailoring, portfolio publishing, interview practice, and job application tracking.

## Run & Operate

To run the application locally, execute:
```bash
npm run server:dev & npm run dev
```
The frontend will be available on port 5000 and the Express backend on port 5001.

**Environment Variables (Supabase Secrets):**
- `DEV_KIT_PASSWORD`: Password for accessing the `/devkit` admin panel.
- `CRON_SECRET`: Secret for cron job authentication.
- `WISE_ENV`: Set to `production` for production environments, `dev` otherwise.

## Stack

- **Frontend**: React 18, TypeScript 5, Vite 6
- **Styling**: Tailwind CSS, Radix UI, Framer Motion
- **State Management**: Zustand, TanStack Query
- **Authentication**: Kinde Auth (JWT), `auth.thewise.cloud` custom domain
- **Database**: Supabase Postgres with Drizzle ORM
- **Backend**: Supabase Edge Functions, Express.js (dev proxy, PDF export, admin bridge)
- **Mobile**: Expo SDK 51, Expo Router 3.5 (iOS/Android)
- **Hosting**: Hostinger (static frontend)

## Where things live

- `src/`: Frontend source code.
- `supabase/`: Supabase Edge Functions, database migrations, and schema definition.
- `server/`: Express.js backend code.
- `mobile/`: Native iOS + Android client.
- `public/`: Static assets.
- `Project Atlas/`: Living knowledge base and documentation.
- `wise-templates/`: Resume templates.
- `supabase/functions/_shared/creditLimits.json`: Source of truth for credit limits.
- `supabase/config.toml`: Supabase Edge Function configurations.
- `src/lib/apiFnUrl.ts`: API endpoint routing logic.

## Architecture decisions

- **Supabase as Primary Infrastructure**: Supabase is the sole source of truth for production data and secrets, serving all production API traffic via Edge Functions. The Replit environment is for development only.
- **AI Provider Routing & Fallback**: AI requests are routed through a pool of OpenRouter, Groq, and DeepSeek keys, with per-feature configuration via `ai_routing_config` and cross-provider fallback.
- **Credit System Source of Truth**: Credit limits are defined centrally in `supabase/functions/_shared/creditLimits.json` and imported by both frontend and edge function logic to ensure consistency.
- **Dedicated Admin DevKit**: A password-protected `/devkit` provides comprehensive administrative tools, analytics, and observability, with granular control over AI routing, feature flags, and user management.
- **Server-Side PDF Export**: PDF generation for resumes and portfolios is handled server-side using Puppeteer (`POST /api/export/pdf-native`) to ensure consistent rendering.

## Product

- **Career Management Suite**: AI-powered resume builder, tailoring for job listings, public portfolio publishing, interview practice, job application tracking, and career goal management.
- **WiseHire HR SaaS**: Integrated platform for recruiters including talent search, bulk screening, job description writing, and candidate scorecards.
- **Mobile Applications**: Native iOS and Android clients integrating with the core platform for on-the-go access.
- **Admin DevKit**: Comprehensive internal tool for monitoring system health, managing users, auditing activity, and configuring platform settings.
- **AI Studio**: Centralized hub for various AI tools, including agentic chat with persistent sessions and tool-calling capabilities.

## User preferences

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

## Gotchas

- **Kinde Authentication Flow**: Client exchanges Kinde token with Express at `POST /api/fn/token-exchange` to get a Supabase session JWT. Direct Kinde logins don't immediately grant Supabase access.
- **BYOK Removal**: Bring-Your-Own-Key (BYOK) AI credit bypass has been fully removed; all AI requests deduct credits from a managed pool.
- **AI Circuit Breaker No-Op**: The `recordBreakerEvent` function is a no-op stub and does not actively manage AI circuit breaking.
- **Email Verification**: New email/password sign-ups require email verification before access.
- **Admin Authentication**: Access to `/devkit` requires `DEV_KIT_PASSWORD` and `requireAdminAuth` for specific edge functions.
- **Mobile Push Notifications**: Requires `register-push-token` edge function and `device_push_tokens` table for functionality.

## Pointers

- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **Kinde Auth Docs**: [https://kinde.com/docs](https://kinde.com/docs)
- **Drizzle ORM Docs**: [https://orm.drizzle.team/docs](https://orm.drizzle.team/docs)
- **Tailwind CSS Docs**: [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
- **TanStack Query Docs**: [https://tanstack.com/query/latest](https://tanstack.com/query/latest)
- **Expo Docs**: [https://docs.expo.dev/](https://docs.expo.dev/)
- **OpenRouter Docs**: [https://openrouter.ai/docs](https://openrouter.ai/docs)
- **Groq Docs**: [https://groq.com/docs](https://groq.com/docs)
- **Resend Docs**: [https://resend.com/docs](https://resend.com/docs)