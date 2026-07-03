# WiseResume / WiseHire — Backend Architecture

**Status:** Canonical as of 2026-04-18.
**Owner of this document:** main agent / backend remediation Task #1, Phase 1.

---

## 1. Database — single source of truth

> **Decision: Supabase Postgres is the canonical database.**
> Neon (`DATABASE_URL` on Replit) is a **dev mirror only** — never the source of truth.

### Why Supabase wins

- 94+ Supabase Edge Functions read and write the production data; they can only
  reach the Supabase project via `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
- Row-Level Security policies, the auth-email hook, cron jobs (weekly digest,
  resume reminder, analytics sweep), Realtime subscriptions, and Storage all
  live inside the Supabase project. Migrating off would mean rebuilding all of
  that.
- 166 SQL migrations in `supabase/migrations/` are authored against Supabase.

### Why Neon stays around

- Local Replit Express routes (`server/index.ts`) and Drizzle (`server/db.ts`,
  `server/schema.ts`) need a Postgres they can hit without burning Supabase
  service-role rate limits during dev.
- Drizzle Kit (`npm run db:push`) gives instant schema iteration on Neon, then
  the equivalent SQL is hand-promoted into a `supabase/migrations/` file once
  the shape is settled.

### Operating rules

1. **All schema changes start in `supabase/migrations/`.** That file is the
   law. Then mirror into `server/schema.ts` so Drizzle stays in lockstep.
2. **The Express server may only read/write Neon for dev-only or ephemeral
   bookkeeping** (e.g. in-memory rate-limit overflow, cached lookups). Anything
   user-visible — profiles, resumes, subscriptions, applications, portfolios,
   wisehire records — goes through an Edge Function that targets Supabase.
3. **Never expose `DATABASE_URL` to the browser.** RLS is OFF on Neon, so a
   leak is a full-takeover. Supabase RLS protects the canonical store.
4. **`npm run db:push` targets Neon.** To sync schema to Supabase, write a
   migration file under `supabase/migrations/` and run `supabase db push`
   (Supabase CLI) or apply via the Supabase Studio SQL editor.

### Reconciliation workflow

When you change the schema:

```
1. Edit server/schema.ts.
2. Run `npm run db:push` to apply to Neon.
3. Author an equivalent SQL file in supabase/migrations/<timestamp>_<name>.sql.
4. Run `supabase db push` (or paste into Supabase Studio) to apply to Supabase.
5. Commit both files together.
```

This is manual on purpose — automating it requires a Supabase service-role
secret in CI, which we have explicitly chosen not to grant the Replit
environment.

---

## 2. Auth

| Concern | Provider |
|---|---|
| End users | Kinde (`@kinde-oss/kinde-auth-react`) |
| Bridge to Supabase RLS | `token-exchange` Edge Function — mints a Supabase JWT keyed by `sub = kinde_user_id` |
| Admins / DevKit | Self-contained password auth via `verify-dev-kit` Edge Function. Intentionally NOT linked to Kinde so admin recovery survives an outage of the user-auth provider. |

The Express proxy at `/api/fn/:fnName` forwards whatever Bearer token the client
holds. Server-only Supabase secrets never leave the Replit container.

---

## 3. Server proxy boundary

- Frontend code **MUST NOT** import `@supabase/supabase-js` directly. All
  edge-function calls go through `/api/fn/...`.
- The legacy `safeClient.ts` Supabase browser client is being phased out; new
  features are forbidden from using it.
- Any new server route added to `server/index.ts` that talks to Supabase must
  validate the user's bearer token via `requireAuthHeader` (which calls
  Supabase `/auth/v1/user` with cache).

---

## 4. Where each kind of data lives

| Data | Canonical store | Why |
|---|---|---|
| Profiles, resumes, applications, portfolios, ai_credits, subscriptions, wisehire_* | Supabase | Edge functions + RLS |
| Admin audit log, ai_provider_breaker, analytics_sweep_lock | Supabase | Same — these are written by Edge Functions / cron |
| Express in-memory rate-limit buckets, auth token cache | Process memory only | Per-instance, never persisted |
| Drizzle types referenced by server routes | `server/schema.ts` mirror | Type safety only — the DB it points at (Neon) is the dev mirror |

---

## 5. Things that are explicitly **not** OK

- Writing user data directly to Neon from the Express server.
- Adding columns to Neon without a matching `supabase/migrations/` file.
- Issuing a Supabase service-role JWT to the browser.
- Using Drizzle migrations (`drizzle-kit migrate`) against Supabase. We use
  `supabase db push` for that.
