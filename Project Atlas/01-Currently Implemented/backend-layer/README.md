# Backend layer

**Last verified:** 2026-05-08

The backend layer covers everything outside `src/` that serves runtime traffic.

| Card | Covers |
|---|---|
| `express-server.md` | `server/index.ts`, `server/db.ts`, `server/schema.ts` — the dev-only Express bridge + PDF export. |
| `edge-shared-helpers.md` | `supabase/functions/_shared/` — 36 helper modules used by every edge function. |
| `cloudflare-pages-middleware.md` | `functions/_middleware.ts` — production Cloudflare Pages content-negotiation middleware. |

> Edge-function business logic lives under `01-Currently Implemented/edge-functions/` (one card per fn).
> The Supabase database surface lives under `01-Currently Implemented/database-tables/`.
