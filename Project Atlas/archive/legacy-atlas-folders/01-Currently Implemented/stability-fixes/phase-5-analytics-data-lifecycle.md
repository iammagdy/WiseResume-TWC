# Phase 5 — Analytics Data Lifecycle (Retention Sweeps + BRIN Indexes)

**Last verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `.local/tasks/phase-5-data-lifecycle.md`
- `server/schema.ts` (BRIN indexes on `created_at` for high-volume tables)
- `server/index.ts` (daily retention sweep job + admin status endpoint)
- `replit.md` (retention policy documentation)
- `project-governance/CHANGELOG.md` entry dated 2026-04-18 — Phase 5

**Canonical owner:** `.local/tasks/phase-5-data-lifecycle.md` (task brief) + `server/schema.ts` and `server/index.ts` (live truth) + `replit.md` (operator-facing policy).

---

**What it is:** Caps unbounded growth on the three insert-heavy analytics tables (`portfolio_visits`, `error_log`, `audit_logs`) with time-based retention sweeps, and right-sizes their `created_at` indexes to BRIN — which is roughly 10× smaller than B-tree and ideal for append-only timestamped data.

**Where it lives:** Drizzle schema (BRIN indexes), Express scheduled job in `server/index.ts`, env-var configuration, admin status endpoint, and `replit.md` for the policy itself.

**Key facts:**
- BRIN index on `created_at` added to `portfolio_visits`, `error_log`, `audit_logs`. → `server/schema.ts`
- Daily retention sweep runs once per day in the existing Express process. Deletes rows older than the per-table window in batches of 10,000 to avoid long locks. → `server/index.ts`
- Default retention windows: **`portfolio_visits` 90 days, `error_log` 30 days, `audit_logs` 365 days**. → `.local/tasks/phase-5-data-lifecycle.md`
- Windows are env-tunable: `PORTFOLIO_VISITS_RETENTION_DAYS`, `ERROR_LOG_RETENTION_DAYS`, `AUDIT_LOGS_RETENTION_DAYS`. → `server/index.ts`
- Observability: each sweep logs deleted-row counts per table; a small admin-gated endpoint surfaces the latest sweep status so the team can confirm the job is running. → `server/index.ts`
- Operator policy + restore-from-Neon-PITR procedure are documented in `replit.md`. → `replit.md`

**Trial resume purge extension (Tasks #18, #22, #24 — 2026-04-26):**
- `purge_expired_trial_resumes(p_batch_size)` SECURITY DEFINER function added (`supabase/migrations/20260426000001_delete_expired_trial_resumes.sql`). Deletes rows where `is_trial = TRUE AND trial_expires_at < now() - INTERVAL '3 days'` using `FOR UPDATE SKIP LOCKED`. Leverages partial index `idx_resumes_trial_expires`.
- `runAnalyticsSweep()` extended to call this function in the same batched loop, using shared `ANALYTICS_SWEEP_BATCH_SIZE` / `ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE` constants. `SweepResult` now includes `trial_resumes_deleted`.
- Admin sweep dashboard (`DeploymentPanel`) now displays `trial_resumes_deleted` alongside the three analytics table counts.
- The 3-day purge threshold intentionally matches the client-side grace filter in `useResumes.ts` — both layers agree on the window.

**Out of scope on this card:** moving cold data to object storage, dashboard reporting on the analytics tables, and any schema changes outside the three analytics tables + `resumes`.

**Related cards:** `./phase-1-db-integrity-and-indexes.md` (FK and B-tree baseline this layers onto), the per-table cards under `../database-tables/` for `portfolio_visits`, `error_log`, `audit_logs`, and `../database-tables/resumes.md` (trial columns).
