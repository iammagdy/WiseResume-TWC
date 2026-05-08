# 15 — Cron jobs + scheduled edge functions

**Last verified:** 2026-05-08
**Type:** critical-system card
**Sources:** `supabase/migrations/20260505000001_create_cron_jobs_weekly_digest_and_wisehire_reminder.sql`, `supabase/migrations/20260606000000_configure_ai_model_catalog_cron.sql`, `supabase/migrations/20260607000002_visitor_purge_cron.sql`, `supabase/migrations/20260607000003_fix_visitor_purge_cron.sql`, `supabase/migrations/20260503000002_repoint_resume_reminder_cron.sql`, `supabase/functions/_shared/webhookAuth.ts`, `replit.md`.

**Canonical owner:** `pg_cron` schedules in Supabase Postgres (`cron.job` table) + `_shared/webhookAuth.ts` → `requireCronSecretOrVault` for HTTP-triggered jobs.

---

WiseResume runs scheduled work via the Supabase `pg_cron` extension. Two patterns:

- **HTTP pattern**: cron uses `pg_net` to POST an edge fn with `x-cron-secret` (or `x-cron-secret` header injected from `vault.cron_secret`).
- **Direct DB pattern**: cron calls a `public.*` function directly — no HTTP, no shared secret. Used when the work is a SQL operation.

Every HTTP-triggered cron auth path resolves through `_shared/webhookAuth.ts` → `requireCronSecretOrVault`: env-var fast path **or** the Vault RPC fallback (`public.get_cron_secret_internal()`, `service_role` only). Both are tolerated during a rotation window so deploys never break (`replit.md`).

## Registered cron jobs

| `cron.job.jobname` | Schedule (UTC) | Pattern | Target | Purpose |
|---|---|---|---|---|
| `weekly_digest` | `0 9 * * 1` (Mon 09:00) | HTTP | `weekly-digest` edge fn | Weekly digest emails per user; pushes via `send-push` for users with the `account` push pref. |
| `wisehire_invite_reminder` | `5 * * * *` (every hour at :05) | HTTP | `wisehire-invite-reminder` edge fn | Resends WiseHire invite reminders. |
| `refresh_ai_test_models` | nightly 03:17 UTC | HTTP | `admin-ai-ops` edge fn (`refresh_ai_test_models` action) | Refreshes the DevKit AI-test model allow-list from each provider's `/models`. Curators in `_shared/aiTestModelCatalog.ts`. Persists to `app_settings.ai_test_model_allowlist`. (Task #15.) |
| `purge-old-visitor-events-daily` | daily 03:00 UTC | Direct DB | `public.purge_old_visitor_events()` | Sweeps stale `visitor_events`. Replaced an earlier broken HTTP-based version (see migration `20260607000003`). |

Additionally, Task #55 repointed any pre-existing `send-resume-reminder` cron command at the merged `transactional-email` fn (migration `20260503000002_repoint_resume_reminder_cron.sql`) — no new schedule was created; the migration only rewrites the URL inside any existing matching `cron.job.command`.

## Singleton / lock primitives
- `analytics_sweep_lock` — singleton row, only one analytics sweep runs at a time.
- Each cron should call `recordOpsHealthEvent()` on degraded paths (`replit.md`).

## Hard rules
- **Auth (HTTP pattern):** every scheduled fn MUST go through `requireCronSecretOrVault` — never accept an unsigned trigger.
- **Direct-DB pattern:** prefer this when the work is a SQL operation — eliminates the shared-secret surface entirely (see `purge-old-visitor-events-daily`).
- **Idempotency:** crons may fire twice during deploys; every job must be safe to repeat.
- **Rotation window:** when rotating `CRON_SECRET`, set the new value in Vault first, then env-var second; the helper accepts either during the window.
- **Stability fix Task #15** governs the `refresh_ai_test_models` cron — see `stability-fixes/task-15-ai-model-catalog-cron.md`.
