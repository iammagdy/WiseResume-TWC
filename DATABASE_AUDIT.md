# Database Audit — WiseResume / WiseHire (Supabase)

**Project:** `jnsfmkzgxsviuthaqlyy` (eu-central-1)  
**Postgres:** 17.6.1 (current)  
**Status:** ACTIVE_HEALTHY — auth, db, realtime, REST, storage all healthy  
**Audit date:** April 20, 2026

---

## Executive summary

| Severity | Count | Category |
|---|---|---|
| 🔴 ERROR  | 1   | Security — privilege escalation risk |
| 🟠 WARN   | 13  | Security — search_path, open RLS, public buckets, password policy |
| 🟡 INFO   | 7   | Security — tables with RLS but no policies (likely broken access) |
| 🟠 WARN   | 128 | Performance — slow RLS, unindexed FKs |
| 🟡 INFO   | 65  | Performance — unused indexes |

**Headline issues you should act on first:**

1. **Privilege-escalation hole on `messages` table** (1 ERROR)
2. **7 tables are unreachable from the client** because RLS is on but no policies exist
3. **No database backups exist** (`backups: []`, PITR disabled)
4. **33 foreign keys have no supporting index** — every cascade-delete and join scans the table
5. **43 RLS policies wrap `auth.uid()` incorrectly** — re-evaluated per row, kills performance on large reads

---

## 🔴 1 ERROR — Critical

### `messages` table — admin policy is exploitable
```
public.messages → "Admins can manage all messages"
references auth.user_metadata
```
`user_metadata` is **editable by the end user themselves** via the Auth API. Any authenticated user can call `supabase.auth.updateUser({ data: { role: 'admin' } })` and instantly satisfy this policy, gaining read/write to every message in the table.

**Fix:** Move the admin flag to `app_metadata` (server-only) or to your `profiles.role` column, and reference that instead. Pattern:

```sql
USING (
  EXISTS (SELECT 1 FROM public.profiles
          WHERE id = (SELECT auth.uid()) AND role = 'admin')
)
```

---

## 🟠 13 WARNINGS — Security

### A. Mutable `search_path` on 8 functions (search-path injection)
```
soft_delete_record, handle_updated_at, check_email_rate_limit,
deduct_ai_credits, increment_short_link_clicks,
wisehire_redeem_early_access_code,
atomic_attempt_and_deduct_credit, upsert_ai_credits_limit
```
A user with permission to create objects in any schema on the search path can shadow built-in functions/operators these functions call.

**Fix:** add `SET search_path = public, pg_temp` to each:
```sql
ALTER FUNCTION public.deduct_ai_credits(...) SET search_path = public, pg_temp;
```

### B. Two `WITH CHECK (true)` RLS policies — RLS bypass
- `public.contact_requests · "Anyone can insert contact requests"` — any anon can insert anything
- `public.talent_pool_views · "talent_pool_views_hr_insert"` — any authenticated user can insert (the policy doesn't actually verify HR role)

**Fix:** add a real predicate. For contact_requests at minimum rate-limit by IP/email. For talent_pool_views require the role check the policy name implies.

### C. Public storage buckets allow object listing
- `avatars` (public) — has a SELECT policy that lets anyone list **every avatar in the bucket**
- `screenshots` (public) — same problem

Public buckets don't need a SELECT policy on `storage.objects` for object-URL access to work. The policy turns the bucket into an enumerable directory of all users' files.

**Fix:** drop the broad SELECT policies on those buckets. Keep INSERT/UPDATE/DELETE policies for owners.

### D. Auth — leaked-password protection disabled
HaveIBeenPwned check isn't enabled. Users can register with passwords from known breaches.  
**Fix (Auth → Settings):** turn on "Leaked password protection".

---

## 🟡 7 INFO — Likely broken: RLS on, no policies

These tables have RLS **enabled** but **zero policies**, which means **no one (not even authenticated users) can read or write to them via the API**. If your app uses these from the client, those calls are silently failing.

```
resume_certifications      ← used by resume editor
resume_educations          ← used by resume editor
resume_experiences         ← used by resume editor
resume_skills              ← used by resume editor
rpc_rate_limits
wisehire_invites
wisehire_waitlist
```

The four `resume_*` tables especially look like a real bug — the editor would 0-row everything for them. Worth verifying right now: either the editor accesses them via a SECURITY DEFINER RPC (fine, but then RLS doesn't matter and could be turned off), or you're missing the policies.

---

## 🟠 Performance — 193 findings

### Top hot-spot tables
| Table | WARN | INFO |
|---|---|---|
| `cover_letters` | 28 | 2 |
| `resignation_letters` | 28 | 1 |
| `messages` | 26 | 1 |
| `wisehire_scorecards` | 7 | 3 |
| `wisehire_applications` | 3 | 3 |

### a) 43 policies use `auth.uid()` directly (`auth_rls_initplan`)
Pattern: `USING (user_id = auth.uid())`. Postgres re-runs `auth.uid()` for **every row scanned**.

**Fix:** wrap in a subselect so it's evaluated **once per query**:
```sql
USING (user_id = (SELECT auth.uid()))
```
This is the single highest-impact perf change you can make and it's mechanical — applies across `cover_letters`, `resignation_letters`, `messages`, `wisehire_*`, `resumes`, `profiles`, etc.

### b) 85 "multiple permissive policies" cases
Many tables have several PERMISSIVE policies for the same `role × action` (e.g. `app_settings` has multiple policies for `anon SELECT`). Postgres evaluates **all of them on every row**.

**Fix:** consolidate into one policy using `OR`, or convert role-specific ones to RESTRICTIVE where they're meant as denies.

### c) 33 unindexed foreign keys
Every FK should have a covering index — without it, deletes on the parent table do a sequential scan of the child, and join-on-FK queries are slow. Prominent ones:

```
job_applications.cover_letter_id
job_applications.job_id
profiles.portfolio_resume_id
resume_certifications.resume_id
resume_educations.resume_id
resume_experiences.resume_id
messages.user_id
coupon_redemptions.user_id
credit_transactions.user_id
short_links.owner_user_id
portfolio_visits.short_link_id
wisehire_applications.candidate_id
wisehire_roles.company_id
wisehire_scorecards.brief_id / candidate_id / owner_id
wisehire_pipeline_events.moved_by / owner_id
wisehire_bulk_screen_jobs.owner_id / role_id
wisehire_candidate_briefs.role_id
wisehire_invites.created_by
…and 14 more
```
**Fix:** for each, `CREATE INDEX CONCURRENTLY ON <table>(<fk_col>);`

### d) 32 unused indexes (write overhead, no read benefit)
Across `resumes`, `job_applications`, `bug_reports`, `portfolio_visits`, `resume_shares`, `discount_codes`, `cover_letters`, `resignation_letters`, `profiles`, and many `wisehire_*` tables. Each one slows down every INSERT/UPDATE/DELETE on its table.

**Caveat before dropping:** the advisor reports indexes as "unused" based on `pg_stat_user_indexes`. If your stats were reset recently or these indexes back rare admin queries, double-check before dropping. The full list is in `.local/db-analysis/performance.json`.

**Audit outcome (2026-04-21, Task #14):** all 32 reviewed; **none dropped**. Stats were last reset 2025-12-08 (≈ 4.5 months window), but every flagged table currently holds 0–15 rows, so the planner always seq-scans and `idx_scan = 0` is expected — not evidence of unused indexes. 21 of the 32 belong to WiseHire / talent-pool tables for a feature launched 2026-04-20. The remaining 11 back documented filter / lookup paths (share-token URL resolution, coupon validation, admin queues, analytics group-bys). Per-index classification and re-evaluation criteria: `docs/db-unused-index-analysis.md`. Snapshot: `.local/db-analysis/pg_stat_user_indexes.json`.

---

## 🔥 Operational

### No backups
```
"backups": [],
"pitr_enabled": false,
"walg_enabled": true
```
There are zero point-in-time recovery snapshots and no daily backups listed for this project. `walg_enabled: true` indicates WAL archiving is on at the platform level, but you have no user-visible backups to restore from.

**Fix:** in the Supabase dashboard → Database → Backups, enable PITR (paid feature) or at minimum confirm daily backups are running. For a production app holding resumes + payments + auth data, this is the highest-priority operational gap.

---

## Recommended action order

1. **Today (security):**
   - Patch the `messages` admin RLS policy (the ERROR)
   - Add real predicates to the two `WITH CHECK (true)` policies
   - Drop the broad SELECT policies on `avatars` and `screenshots`
   - Enable leaked-password protection in Auth
   - Decide: are the 4 `resume_*` tables supposed to be readable from the client? If yes, add policies; if no, document that they're RPC-only.

2. **This week (operations):**
   - Enable Point-in-Time Recovery (or confirm daily backups exist)

3. **Next sprint (performance):**
   - Wrap `auth.uid()` in a subselect across all 43 affected policies (mechanical, huge win)
   - Add the 33 missing FK indexes via `CREATE INDEX CONCURRENTLY`
   - Add `SET search_path = public, pg_temp` to the 8 functions
   - Audit and consolidate the 85 multiple-permissive-policy cases
   - Review and drop unused indexes (verify with `pg_stat_user_indexes` first)

---

## Raw data

Full advisor reports saved to:
- `.local/db-analysis/security.json` (21 findings)
- `.local/db-analysis/performance.json` (193 findings)
- `.local/db-analysis/health.json`
- `.local/db-analysis/backups.json`
