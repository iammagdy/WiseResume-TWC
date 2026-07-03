# Express server (`server/`)

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `server/index.ts` (5 576 lines), `server/db.ts`, `server/schema.ts`, `replit.md`.

**Canonical owner:** Replit dev environment + DevKit admin bridge + native PDF export.

---

> The Express server is **dev infrastructure + DevKit bridge + PDF renderer**, not production API. All production API traffic is served by Appwrite Functions and the Appwrite-native web stack. Never reposition this server as production infrastructure.

## Files

| File | Purpose |
|---|---|
| `server/db.ts` | Drizzle ORM client over node-postgres. Connects to `DATABASE_URL` (Replit Postgres in dev, Neon in some setups). 10-conn pool. SSL gated on connection-string content. |
| `server/schema.ts` | Drizzle schema definitions for the dev/Replit Postgres mirror (subset of the Supabase schema needed by Express data routes). Hand-maintained — keep in sync with Supabase migrations for tables exposed via `/api/data/*`. |
| `server/index.ts` | Express app: PDF export, dev proxy, DevKit admin bridge, data endpoints, AI/health endpoints. |

## Endpoint groups

| Group | Examples | Notes |
|---|---|---|
| Health | `GET /api/health`, `GET /api/ai-health`, `GET /api/db-health` | Open. |
| Auth | `POST /api/fn/token-exchange`, `POST /api/auth/reset-password` | Token-exchange is the canonical Kinde→Supabase JWT bridge (`replit.md` Gotcha). |
| PDF export | `POST /api/export/pdf-native` (50 MB body limit) | Server-side Puppeteer (`replit.md` architecture decision). |
| DevKit admin bridge | `app.all('/api/fn/admin-*')` (~50 routes) | Forwards to backend admin handlers used for local/dev bridging. Exhaustive list in `server/index.ts`. |
| Generic edge bridge | `app.all('/api/fn/:fnName')` | Catch-all proxy for non-admin local bridge traffic. |
| Data API | `app.get/post/delete('/api/data/*')` (resumes, jobs, notifications, profile, portfolios, hr-analytics, …) | Reads via `db.ts` Drizzle. Auth via `requireAuthHeader`. |
| Tooling | `POST /api/fetch-url` (rate-limited), `POST /api/linkedin-profile` (quota-tracked via `linkedin_import_quota`), `POST /api/track-handle-interest` | |

## Hard rules
- **Replit-dev only**: never store production secrets in this process; never expose `/api/data/*` outside dev.
- PDF export is the **only** server-side rendering path (`POST /api/export/pdf-native`). The portfolio + resume PDF flows must continue to use it (`replit.md` architecture decision).
- Express must allow all hosts so the Replit preview iframe works (`replit.md` preview-debugging rules).
- DevKit admin routes must enforce `requireAdminAuth` server-side — bridge cannot trust the client.
- Drizzle `schema.ts` is a **subset** mirror; never declare authoritative schema here — authoritative production schema lives in Appwrite.
