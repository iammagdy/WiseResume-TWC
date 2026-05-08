# WiseResume

WiseResume is an AI-powered web application that helps users manage their careers through resume tailoring, portfolio publishing, interview practice, and job application tracking.

## Run & Operate

To run the application locally, execute:
```bash
npm run server:dev & npm run dev
```
The frontend will be available on port 5000 and a minimal Express health/PDF stub on port 5001.

**Environment variables (Replit):**
- `VITE_APPWRITE_ENDPOINT` — Appwrite Cloud Feed endpoint (`https://fra.cloud.appwrite.io/v1`).
- `VITE_APPWRITE_PROJECT_ID` — Appwrite project id (`69fd362b001eb325a192`).
- `API_PORT` — Express dev port (default `5001`).

All other secrets (AI provider keys, Resend, devkit password, cron secret, etc.) live in Appwrite Function variables and are never present in Replit env. If a former Supabase/Kinde secret is missing from `process.env`, that is expected and correct.

## Stack

- **Frontend**: React 18, TypeScript 5, Vite 6
- **Styling**: Tailwind CSS, Radix UI, Framer Motion
- **State management**: Zustand, TanStack Query
- **Authentication**: Appwrite Account SDK (`account.get()` / `account.deleteSession()`)
- **AI**: Appwrite `ai-gateway` Function (router for ~24 AI feature names — see `src/lib/appwrite-bridge.ts` `AI_HUB_FUNCTIONS`)
- **Database**: PostgreSQL via Drizzle ORM (Replit-managed dev DB) — production data layer is being rebuilt on Appwrite Databases.
- **Server**: Minimal Express stub (`server/index.ts`, ~80 lines) — health probe + future Puppeteer PDF worker landing pad. The full Express bridge that previously proxied Supabase has been deleted.
- **Mobile**: Expo SDK 51, Expo Router 3.5 (iOS/Android) — *not yet migrated to Appwrite; continues to target the legacy backend.*
- **Hosting**: Hostinger (static frontend)

## Where things live

- `src/` — Frontend source.
- `src/lib/appwrite.ts` — Appwrite client (`account`, `databases`, `functions`, `storage`).
- `src/lib/appwrite-bridge.ts` — `AI_HUB_FUNCTIONS` set + `invokeAppwriteHub()` router for AI features.
- `src/contexts/AuthContext.tsx` — Appwrite-only auth context (`AppUser` shape).
- `src/lib/supabaseBridge.ts`, `src/lib/supabaseAuth.ts`, `src/lib/supabaseConstants.ts`, `src/lib/apiFetch.ts`, `src/lib/apiFnUrl.ts`, `src/integrations/supabase/*` — **legacy throw-stubs**. Filenames preserved so 130+ legacy import sites still compile, but contents have zero Supabase/Kinde dependency. Every runtime call throws `pending_appwrite_migration`. Slated for full deletion once each importer is migrated.
- `appwrite-hubs/` — Appwrite Function source (the new home for what used to live under `supabase/functions/`).
- `server/` — Minimal Express stub (PDF placeholder + health).
- `mobile/` — Native iOS + Android client (legacy backend, unmigrated).
- `public/` — Static assets.
- `Project Atlas/` — Living knowledge base and documentation.
- `wise-templates/` — Resume templates.

## Architecture decisions

- **Appwrite is the production source of truth.** Auth, AI Hub, Functions, Databases and Storage all live in Appwrite Cloud Feed (project `69fd362b001eb325a192`). Replit is a development environment only.
- **AI-Hub routing.** Any feature name in `AI_HUB_FUNCTIONS` is routed by `edgeFunctions.invoke()` (and direct callers) through `invokeAppwriteHub()` → Appwrite `ai-gateway` Function. The Function picks the AI provider, applies feature-level routing config, and returns `{ data, error }`.
- **Scorched-earth Supabase/Kinde removal (2026-05-08).** All Supabase + Kinde code has been removed from the web app. The data layer (`/api/data/*`), the ~60 non-AI edge functions, the admin DevKit, WiseHire, transactional email and portfolio-public surfaces all now throw `pending_appwrite_migration` until they are rebuilt on Appwrite Functions. AI Hub and Auth keep working unchanged.
- **Server-side PDF export** is not yet implemented on Appwrite. `POST /api/export/pdf-native` returns `503` with a friendly migration message; the client should treat this as temporarily unavailable.

## Product

- **Career Management Suite** — AI resume builder, tailoring, public portfolios, interview practice, job tracker, career goals.
- **WiseHire HR SaaS** — talent search, bulk screening, JD writer, scorecards. *Currently throws `pending_appwrite_migration` until rebuilt on Appwrite.*
- **Mobile applications** — native iOS/Android clients (legacy backend, unmigrated).
- **Admin DevKit** — internal monitoring and configuration. *Currently throws `pending_appwrite_migration` until rebuilt on Appwrite.*
- **AI Studio** — agentic chat, tool-calling, persistent sessions (working via Appwrite AI Hub).

## User preferences

- **Appwrite is the sole production source of truth.** Replit is dev-only. Production secrets live in Appwrite Function variables; never propose storing production secrets in Replit.
- **Documentation rules** — after every completed task, bug fix, or feature:
    - Add an entry to `CHANGELOG.md` (technical, English, files/functions/behaviour).
    - Add a plain-language entry under `Project Atlas/04-For You (Plain Language)/` (`current-features.md`, `stability-improvements.md`, or `coming-soon.md`). Update the "Last verified" timestamp.
    - Update affected reference cards under `Project Atlas/01-Currently Implemented/`. Update each touched card's "Last verified" timestamp.
    - Update `replit.md` only for changes to architecture, infrastructure, or key patterns (new endpoint, new env var, new shared module). Skip routine bug fixes.
- **No `any` casts in production code.** TypeScript strict mode is enforced. The throw-stubs under `src/lib/supabase*` and `src/integrations/supabase/*` are explicitly excepted — they are pending-deletion shims and use `any` to keep 130+ legacy importers compiling. New production code must not.
- **Never change primary key column types.**
- **Never invent marketing stats** — always source from `src/pages/Index.tsx`.
- **`user.id` is the Appwrite `$id`.**
- **Portfolio `pf-*` CSS** — never touch; used by public portfolio pages.
- **Template photo elements** — `<img>` tags inside `[data-resume-template]` (currently `CreativeTemplate` and `DesignerTemplate`) MUST set `crossOrigin="anonymous"` and MUST NOT use `loading="lazy"`. The Appwrite Storage bucket serving `photoUrl` must respond with `Access-Control-Allow-Origin: *`.

## Gotchas

- **Most data-layer features are intentionally broken right now.** `/api/data/*` and most `edgeFunctions.invoke()` calls return `pending_appwrite_migration`. This is the expected post-cutover state until the Appwrite Functions are written.
- **Mobile app targets the legacy backend.** Do not delete or stub anything under `mobile/` while doing further Supabase/Kinde cleanup on the web app.
- **PDF export returns 503.** Until the Puppeteer worker is rebuilt as an Appwrite Function, expect "PDF export is being rebuilt" toasts.
- **Express server is minimal.** It only serves `/api/health` and a `503` PDF placeholder. Anything else under `/api/*` is a `503 pending_appwrite_migration` catch-all.

## Pointers

- **Appwrite Docs**: [https://appwrite.io/docs](https://appwrite.io/docs)
- **Drizzle ORM**: [https://orm.drizzle.team/docs](https://orm.drizzle.team/docs)
- **Tailwind CSS**: [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
- **TanStack Query**: [https://tanstack.com/query/latest](https://tanstack.com/query/latest)
- **Expo**: [https://docs.expo.dev/](https://docs.expo.dev/)
- **OpenRouter**: [https://openrouter.ai/docs](https://openrouter.ai/docs)
- **Groq**: [https://groq.com/docs](https://groq.com/docs)
- **Resend**: [https://resend.com/docs](https://resend.com/docs)
