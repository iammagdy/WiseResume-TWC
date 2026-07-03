# `linkedin_import_quota`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260429000000_linkedin_import_quota.sql`, `server/index.ts` (`/api/linkedin-profile`).

**Canonical owner:** LinkedIn import rate-limiter (Express bridge).

---

Per-user monthly counter for LinkedIn profile imports (cost-control on the upstream scraping API).

## Columns

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid → `auth.users(id)` CASCADE | |
| `month` | text NOT NULL | `YYYY-MM` UTC. |
| `count` | int default 0 | |
| PK | (`user_id`, `month`) | Composite. |

## Hard rules
- Increment is non-fatal fail-open (quota check failure must not block import — error logged via `error_log`).
- Limit is plan-derived; the actual cap lives in `_shared/planLimits.ts` / `creditLimits.json`.
