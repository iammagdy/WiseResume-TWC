# Supabase Backend & Edge Functions Audit
**Date:** 2026-05-02
**Scope:** WiseResume / WiseHire — frontend ↔ Supabase Edge Functions ↔ Postgres
**Method:** Static code analysis only (no live API calls, no production probes)
**Project ref:** `jnsfmkzgxsviuthaqlyy`
**Reviewed:** 99 edge functions, 203 migrations, the Express bridge (`server/index.ts`), and the Vite SPA wiring in `src/integrations/supabase/`

---

## 1. Executive Summary

The app is a Vite React SPA that authenticates through **Kinde** but persists data in **Supabase Postgres** via a "shadow user" pattern: `token-exchange` derives a deterministic UUID v5 from the Kinde `sub` and provisions a matching row in `auth.users`, so RLS works against `auth.uid()`.
The frontend reaches Supabase three ways:
1. Direct PostgREST via `supabase-js` (RLS-guarded reads/writes).
2. `supabase.functions.invoke(...)` to one of 99 edge functions.
3. The Express bridge at `/api/fn/*` (dev-only proxy that injects the service-role key and verifies the bridge JWT).

**Overall posture:** Solid. RLS is enabled on every per-user table I sampled, all 99 edge functions are now wrapped with `wrapHandler` for telemetry (Task #19), and credit/billing writes are gated behind `block_client_*` policies and atomic RPCs. The recent observability and retention work (Tasks #19/#20) closed the biggest blind spots.

**Issues found:** **1 Critical**, **6 High**, **5 Medium**, **4 Low** — plus 3 explorer claims I refuted after manual verification (called out below). None of the findings prevent the current production deploy from running, but the Critical item should be addressed before the next release.

---

## 2. Architecture Map

```
┌──────────────────────┐  Kinde token   ┌────────────────────┐  service-role  ┌──────────────┐
│  Vite React SPA      │  ───────────▶  │  Express bridge    │  ────────────▶ │  Edge Funcs  │
│  src/App.tsx         │   /api/fn/*    │  server/index.ts   │  invoke()      │  /functions/ │
│  - AppLanding.tsx    │   (DEV only)   │  - token-exchange  │                │  v1/<name>   │
│  - AppInterior.tsx   │                │  - analytics-sweep │                └──────┬───────┘
└──────┬───────────────┘                │  - PDF export      │                       │
       │                                └────────────────────┘                       ▼
       │ direct PostgREST (RLS)                                              ┌──────────────┐
       │ supabase-js (anon JWT = bridge JWT)                                 │  Postgres    │
       └─────────────────────────────────────────────────────────────────────│  + RLS       │
                                                                             │  + pg_cron   │
                                                                             └──────────────┘
```

**Key pattern: shadow users.** Kinde owns identity; Supabase owns data. The bridge derives `uuid-v5(kinde_sub, KINDE_NAMESPACE)` and ensures a matching row exists in `auth.users`. The bridge token is a short-lived Supabase JWT signed with `SUPABASE_JWT_SECRET` and carries the shadow UUID as `sub`, so every PostgREST call hits RLS as the right user.

**Production wiring.** In production the SPA bypasses the Express bridge and calls Supabase Edge Functions directly at `${VITE_SUPABASE_URL}/functions/v1/`. The Express bridge runs only in dev and as a one-shot analytics-sweep cron in production (the deployed Hostinger box).

---

## 3. Findings

### 3.1 CRITICAL

#### C-1. `wisehire-talent-view` race condition on view-count fallback
**File:** `supabase/functions/wisehire-talent-view/index.ts:74-79`
**Severity:** Critical (data correctness)
**Evidence:**
```ts
const { error: rpcErr } = await supabase.rpc('increment_talent_view_count', { p_profile_id: profile_id });
if (rpcErr) {
  await supabase.from('talent_pool_profiles')
    .update({ view_count: (tp.view_count ?? 0) + 1, last_viewed_at: new Date().toISOString() })
    .eq('id', profile_id);
}
```
If the atomic RPC ever fails (network blip, transient permission error), the function silently falls back to a classic read-modify-write that loses concurrent increments. The RPC exists (`supabase/migrations/20260421172105_increment_talent_view_count_rpc.sql`) and is the right path; the fallback should not exist.
**Fix:** Remove the fallback `update`. If the RPC fails, log the error and either return 500 or skip the count update — never silently do a non-atomic write.

---

### 3.2 HIGH

#### H-1. `verify-dev-kit` allows the admin login endpoint to be called from any origin (browser-only abuse)
**File:** `supabase/functions/verify-dev-kit/index.ts:7-11`
**Evidence:** The function returns `Access-Control-Allow-Origin: *` on the endpoint that issues the 8h / 30d DevKit admin session token (gated by `ADMIN_EMAILS` + `DEV_KIT_PASSWORD`).
**Note on severity (corrected from initial draft):** CORS does **not** block non-browser callers — a malicious server can call this endpoint regardless. The credential check (email + password) and the 5-failure / 10-minute lockout are the actual access controls and they remain intact. The realistic risk here is **browser-driven nuisance**: a victim admin lands on a hostile page that fires login attempts from their browser, intentionally tripping the lockout to deny legitimate access. That's a real availability concern, not a credential-bypass.
**Fix:** Two changes, in order of impact:
1. Key the lockout by `(email, ip_address)` instead of email alone, so a third party can't lock out an admin from a different IP.
2. Switch to `getCorsHeaders(req.headers.get('origin'))` to remove the easiest in-browser amplification path.

#### H-2. Wide-open CORS on five public-facing edge functions
**Files (each line shown is the literal `'Access-Control-Allow-Origin': '*'`):**
- `supabase/functions/submit-contact-request/index.ts:7`
- `supabase/functions/send-contact-email/index.ts:7`
- `supabase/functions/portfolio-meta/index.ts:7`
- `supabase/functions/portfolio-interest/index.ts:7`
- `supabase/functions/track-portfolio-view/index.ts:8`

**Note on severity (corrected from initial draft):** Same caveat as H-1 — CORS headers don't block non-browser callers. Real exposure is browser-driven CSRF-style abuse, and these endpoints all have bot guards / rate limits / IP rate limits already. The fix below tightens defense-in-depth, not a hard access control.
**Fix:** Switch each to `getCorsHeaders(req.headers.get('origin'))`. If you want true origin enforcement, also add an explicit `if (!isOriginAllowed(origin)) return 403` check at the top of the handler — the CORS header alone only blocks fetch responses, not the request itself.

> `og-image` correctly stays `*` (it returns an image meant to be embedded by any domain).
>
> **Refuted explorer claims:** `auth-email-hook` line 159 is inside the `handlePreview` branch and is gated by `Authorization: Bearer ${RESEND_API_KEY}` (server-to-server). The main hook flow at line 58 already does per-origin allow-list. `resolve-short-link` is a public GET-only redirect — `*` is appropriate. `parse-job` and `generate-cover-letter` ARE wrapped with `wrapHandler` (just using the legacy `serve(...)` alias instead of `Deno.serve(...)`).

#### H-3. `.single()` without explicit `PGRST116` handling on hot paths
**Files:**
- `supabase/functions/wisehire-talent-view/index.ts:28, 39, 52, 63`
- `supabase/functions/admin-save-note/index.ts:105`
- `supabase/functions/admin-update-profile/index.ts:46, 75, 180`

When 0 rows are returned, `.single()` produces an error with code `PGRST116`. The current code paths let this bubble into the generic `catch` block and surface a 500 instead of a clean 404 / `{success:false, error:'not_found'}`. This shows up as noisy entries in `edge_function_logs` and confuses the DevKit user-detail panel.
**Fix:** Use `.maybeSingle()` for "may or may not exist" lookups, or check `error?.code === 'PGRST116'` and return a typed not-found.

#### H-4. `weekly-digest` returns the wrong error shape
**File:** `supabase/functions/weekly-digest/index.ts:61`
**Evidence:**
```ts
return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders });
```
Every other recent function returns `{ success: false, error: string }`. The frontend's `unwrapAdminResponse` / `formatEdgeError` in `src/lib/devkit/edgeResponse.ts` reads the `error` key from either shape, so this doesn't break the UI today, but it's the only outlier and it will trip the next time someone changes the error contract.
**Fix:** Return `{ success: false, error: 'Internal server error' }`.

#### H-5. `error_log` admin policy depends on a JWT claim that may not be injected
**File:** `supabase/migrations/20260420000022_error_log.sql` (`admin_read_error_log` policy)
The policy uses `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`. In this codebase, admin status is determined by **email membership in `ADMIN_EMAILS`**, not by an `app_metadata.role` claim. The bridge JWT does not currently inject this claim, so the policy is effectively a no-op — admins can only read `error_log` via service-role from edge functions (which is what `admin-devkit-data` does). That works, but the policy is misleading dead code that suggests admins can read it directly via PostgREST.
**Fix:** Either inject `app_metadata.role` into the bridge JWT for admins, or replace the policy with `EXISTS (SELECT 1 FROM ... WHERE email = auth.jwt() ->> 'email')` against a real admin source. At minimum, document that the policy is intentionally inert and that all admin reads go through the service-role-backed `admin-devkit-data`.
**Status (Task #23, 2026-05-02):** **Path B (delete + document)** chosen. Migration `20260523000000_drop_misleading_error_log_admin_policies.sql` drops both `admin_read_error_log` and `admin_update_error_log`, leaves the `service_role_insert_error_log` policy in place, and rewrites the table comment to spell out that reads/updates MUST go through the service-role-backed `admin-devkit-data` edge function — there is no direct PostgREST admin path. Path A (injecting `app_metadata.role` into the bridge JWT) was rejected: it would require a new admin source-of-truth surfaced inside the JWT, but no caller actually uses a non-service-role read path against `error_log` today, so the simpler delete-and-document fix matches the production architecture exactly. RLS-default-deny + the existing service-role INSERT policy preserves all current behaviour.

#### H-6. `cover_letters`, `career_assessments`, `interview_sessions` orphan on resume delete
**File:** `supabase/migrations/20260223190000_production_hardening_fk_constraints.sql`
Most resume-related tables were migrated to `ON DELETE CASCADE`, but these three were left at `ON DELETE SET NULL`. The frontend's "linked resume" selector silently treats these as unlinked after deletion, so a user who deletes a resume loses the connection between the resume and any cover letters or career assessments they generated from it — but the cover letter row remains, with a dangling `resume_id = NULL`.
**Fix:** Decide product intent. If the cover letter should outlive the resume, add a snapshot of the resume title onto the cover letter row at write-time so the orphan row is still meaningful. If it shouldn't, change FK to `ON DELETE CASCADE`.
**Status (Task #22, 2026-05-02):** **Option A** chosen — these three tables hold genuine standalone artifacts (full cover letter text, interview transcripts/scores, completed career assessments) that the user spent time/credits creating; cascading the delete would silently destroy real work. Migration `20260522000000_snapshot_resume_title_on_artifacts.sql` adds a `resume_title text` column to all three tables, backfills it from the currently-linked resume, and installs a `BEFORE INSERT OR UPDATE OF resume_id` trigger (`snapshot_resume_title()`) that captures the resume's title at write time. The snapshot is preserved through both manual unlinks and the `ON DELETE SET NULL` FK action, so post-delete rows still display "From: <resume title>". The frontend (`CoverLetterCard`, `CoverLetterEditPage`, `InterviewHistorySheet`) now surfaces the snapshot, with a "(deleted)" suffix when `resume_id IS NULL`. Snapshot is intentionally write-time only — later renames of the resume do not propagate, since the snapshot represents the resume name as it was when the artifact was created.

---

### 3.3 MEDIUM

#### M-1. `admin-devkit-data` derives `isDevEnvironment` from `DENO_DEPLOYMENT_ID`
**File:** `supabase/functions/admin-devkit-data/index.ts:829`
The signal is `!Deno.env.get('DENO_DEPLOYMENT_ID')`. In Supabase Edge Functions production this var is always set, so the heuristic works today, but it's an undocumented Deno Deploy implementation detail. If Supabase changes runtimes, the panel will silently render dev-mode (yellow banner, looser secret classification) in production.
**Fix:** Add an explicit `WISE_ENV=production` Supabase secret and prefer it; fall back to the current heuristic only if missing.
**Status (Task #24, 2026-05-02):** Code fix landed — `admin-devkit-data` now reads `WISE_ENV` first (`'production'` ⇒ prod, anything else ⇒ dev) and only falls back to the `DENO_DEPLOYMENT_ID` heuristic when `WISE_ENV` is unset. **Action required out-of-band:** set the Supabase Edge Function secret `WISE_ENV=production` in the production Supabase project, and `WISE_ENV=dev` in any non-prod Supabase projects. Once set, the legacy heuristic is no longer consulted.

#### M-2. Missing composite index on `error_log(user_id, created_at desc)`
**File:** `supabase/migrations/20260420000022_error_log.sql`
The DevKit user-detail panel paginates `error_log` filtered by `user_id` ordered by `created_at DESC`. Without a composite index, this is an index-scan on `created_at` followed by a row-by-row filter on `user_id`. As `error_log` grows (now bounded by Task #20's retention sweep, but still sized in the tens of thousands), the panel will progressively slow down.
**Fix:** Add `CREATE INDEX IF NOT EXISTS error_log_user_id_created_at_idx ON public.error_log (user_id, created_at DESC);`

#### M-3. `wisehire_pipeline_events.event_type` lacks an index
**File:** `supabase/migrations/20260420000008_wisehire_pipeline_events.sql`
Several admin analytics queries filter by `event_type` (e.g. funnel reports). Currently a sequential scan.
**Fix:** Add a btree index on `event_type` and a partial index for the most queried event types if cardinality is low.

#### M-4. `admin-rotate-totp` silently falls back from `ADMIN_MANAGEMENT_TOKEN` to `SUPABASE_MANAGEMENT_TOKEN`
**File:** `supabase/functions/admin-rotate-totp/index.ts:135-150`
The fallback works, but it conflates two tokens with potentially different scopes. If an admin rotates `ADMIN_MANAGEMENT_TOKEN` and forgets to set the new value, the function will silently use the broader management token, with no telemetry to indicate which one was actually used.
**Fix:** Log (in `edge_function_logs.metadata`) which token source was selected, and harden the fallback by gating it on `WISE_ENV === 'dev'`.

#### M-5. `wisehire-send-outreach` calls AI provider + Resend in series
**File:** `supabase/functions/wisehire-send-outreach/index.ts`
The function awaits each external call serially. For a batch of N candidates this multiplies latency unnecessarily; the AI call and the Resend prefetch (e.g. audience lookup) could happen in parallel where they don't depend on each other.
**Fix:** Profile and `Promise.all` independent calls.

---

### 3.4 LOW

#### L-1. `admin-kinde-reconcile` does not validate `page_size`
**File:** `supabase/functions/admin-kinde-reconcile/index.ts:123`
Trusts the caller-supplied `page_size`. With admin-only auth this is low risk, but a typo could request 100k Kinde records and time out.
**Fix:** Clamp to `[1, 200]`.

#### L-2. `verify-email` falls back to a hard-coded `SITE_URL`
**File:** `supabase/functions/verify-email/index.ts:114`
If `SITE_URL` env var is unset, the function still works but emits a redirect to a hard-coded URL. In a multi-environment deploy this could send dev users to prod or vice versa.
**Fix:** Refuse to start (return 503) if `SITE_URL` is missing.

#### L-3. Some triggers may still resolve names with the caller's `search_path`
Migration `20260502000000_harden_function_search_paths.sql` already pinned `search_path` on the eight functions Supabase's security advisor flagged (`soft_delete_record`, `handle_updated_at`, `check_email_rate_limit`, `deduct_ai_credits`, `increment_short_link_clicks`, `wisehire_redeem_early_access_code`, `atomic_attempt_and_deduct_credit`, `upsert_ai_credits_limit`), and `safe_uid()` was created with `SET search_path = public` from the start. **No CRITICAL search-path issues remain in this repo.**
The low-priority residual: a few non-`SECURITY DEFINER` triggers haven't had their `search_path` explicitly pinned. Risk is low (they run as the caller, not the owner), but it's cheap to add for consistency.
**Fix:** Optional follow-up migration that pins `search_path` on remaining triggers.

#### L-4. `pg_cron` jobs lack retry/dead-letter on `net.http_post` failure
**File:** `supabase/migrations/20260506000000_cron_jobs_x_cron_secret_header.sql`
A 5xx from an edge function called by a cron job is logged to `cron.job_run_details` but not retried. For `weekly-digest` and `purge_expired_trial_resumes` this means a single bad day silently skips that run.
**Fix:** Wrap the `net.http_post` call in a `DO` block that records the result to a small `cron_runs` table and lets the next scheduled run pick up the missed work.

---

## 4. Refuted / Inaccurate Claims (verified false)

These were flagged by the initial automated scan or the report's own first draft; manual code reading shows they are **not** real issues. Listed for transparency:

| Claim | Reality |
| --- | --- |
| `parse-job` and `generate-cover-letter` not wrapped with `wrapHandler` | Both are wrapped at lines 80 and 26 respectively. They use `serve(...)` (legacy Deno alias) instead of `Deno.serve(...)`, but the wrapper is in place. Coverage is **99/99**. |
| `token-exchange/index.ts:195` runs an unbounded `.select()` | The actual code uses `.limit(1).maybeSingle()` — properly bounded. |
| `auth-email-hook` line 159 returns `ACAO: *` on a sensitive endpoint | That line is inside the `handlePreview` branch which requires `Authorization: Bearer ${RESEND_API_KEY}` (server-to-server). The main hook flow at line 58 uses a per-origin allow-list. Not an issue. |
| `resolve-short-link` exposes `ACAO: *` | It's a public GET-only redirect (no body, no side effects) — `*` is appropriate. |
| Multiple older `SECURITY DEFINER` functions lack `SET search_path` (initial-draft Critical) | `soft_delete_record`, `check_email_rate_limit`, `deduct_ai_credits` are all already hardened by `ALTER FUNCTION ... SET search_path = public, pg_temp` in migration `20260502000000_harden_function_search_paths.sql`, and `safe_uid()` was created with `SET search_path = public` in its original migration. No active Critical here. |
| `verify-dev-kit` CORS `*` is a credential-bypass (initial-draft Critical) | CORS doesn't gate non-browser callers, so the password + lockout still apply. The actual risk is browser-driven nuisance lockout — High, not Critical. Captured as H-1. |

---

## 5. Already Fixed (recent context — for reviewer awareness)

- **Task #19** added `wrapHandler` to all 99 edge functions and gave `admin-impersonate` an explicit 503 path when the JWT secret is missing.
- **Task #19** also fixed the DevKit Mission Control payload (5 missing fields, OR2 ping, secret-source classifier).
- **Task #20** added daily retention sweep + BRIN index for `edge_function_logs` so the table doesn't grow unbounded after the new wrapping.

---

## 6. Recommended Follow-Up Tasks

Ordered by impact:

1. **Remove `wisehire-talent-view` race fallback (C-1)**: 6 lines deleted. **High data-quality impact, near-zero risk.**
2. **DevKit lockout hardening + CORS sweep (H-1 + H-2)**: change the `verify-dev-kit` lockout to be keyed by `(email, ip_address)` so external callers can't lock real admins out, and switch the six flagged functions to `getCorsHeaders(origin)`. One PR.
3. **Index follow-up migration (M-2 + M-3)**: two `CREATE INDEX` statements on `error_log(user_id, created_at desc)` and `wisehire_pipeline_events(event_type)`.
4. **`weekly-digest` error-shape fix + `.maybeSingle()` cleanup (H-3 + H-4)**: cosmetic, brings these functions in line with the rest of the codebase.
5. **`error_log` policy cleanup (H-5)**: either inject `app_metadata.role` into the bridge JWT for admins, or replace the policy with an explicit comment that admin reads go through service-role only.

If you want, I can spin these up as project tasks and prioritize them on your queue.

---

## 7. What Was Out of Scope

- Live API probes / runtime testing (per project preference: code-only audit).
- Performance tuning of specific Postgres queries (would need `EXPLAIN ANALYZE` against production).
- Frontend bundle / Vite-side issues.
- Already-merged Task #19 and #20 changes.
- Drizzle ORM schema in `server/schema.ts` (it mirrors Supabase schema and is only used by the Express bridge for its own analytics-sweep tracking).
