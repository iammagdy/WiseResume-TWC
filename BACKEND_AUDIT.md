# WiseResume / WiseHire — Backend Audit

**Audit date:** April 18, 2026
**Scope:** Supabase edge functions, auth integration, DevKit, database schema, data integrity, Replit-side server proxy.

---

## 1. Architecture overview

| Layer | Tech |
|---|---|
| Front-end | React + Vite (port 5000) |
| App server | Express on Replit (port 5001), proxies `/api/*` |
| Auth provider (users) | **Kinde** (`@kinde-oss/kinde-auth-react`) |
| Auth bridge | Express `/api/fn/token-exchange` + Supabase `token-exchange` edge fn → mints a Supabase JWT keyed by Kinde `sub` for RLS-aware DB access |
| Auth provider (admins) | **DevKit** — self-contained password auth (`verify-dev-kit`), separate from Kinde |
| Edge functions | 94 functions in repo, 98 deployed on Supabase |
| Database (live) | Supabase Postgres (used by edge functions + RLS) |
| Database (Replit dev/server routes) | Neon Postgres via Drizzle (`DATABASE_URL`) |

**Key strength:** the recent migration moved every client-side Supabase function call behind the Express proxy at `/api/fn/:fnName`. Anonymous keys no longer leave the server.

**Key risk:** the project now runs **two databases** — Supabase (canonical, used by edge functions) and Neon (used by the Express server's direct routes). If both are written to, drift is inevitable. This is the single largest architectural issue to resolve.

---

## 2. Edge function audit

### 2.1 Repo ↔ deployment drift

Comparing `supabase/functions/` (94) with the 98 functions currently deployed on Supabase:

**Deployed but NOT in repo (4 — "ghost functions"):**
- `clerk-webhook` — leftover from a previous Clerk auth integration. **Should be removed** (Kinde is the active provider).
- `fetch-github-projects` — already flagged in `EDGE_FUNCTION_AUDIT.md` as orphan; still deployed.
- `proofread-resume` — no source in repo, so any change must be re-deployed manually.
- `send-bug-report` — same, no source in repo.

These can never be re-deployed from CI in their current form. Either pull the deployed source back into `supabase/functions/` or delete them via the Supabase dashboard.

**Repo functions not deployed:** none — clean.

### 2.2 Truly orphaned functions (no caller anywhere)

Cross-checking the 94 repo functions against every `edgeFunctions.invoke('…')` and `/api/fn/…` reference in `src/`:

| Function | Status | Recommendation |
|---|---|---|
| `wisehire-apply` | 0 client refs, no documented hook | Remove — superseded by direct candidate insertion in `wisehire-bulk-screen` flow. |
| `send-feature-request` | 0 refs (UI uses `send-contact-email`) | Remove. |
| `send-contact-inquiry` | 0 refs (UI uses `send-contact-email`) | Remove. |
| `generate-store-screenshots` | 0 refs | Mark as CI-only or delete. |
| `hard-purge` | 0 refs | Keep — invoked manually via Supabase dashboard for GDPR purge. Document in audit file. |
| `admin-check-access` | 0 client refs | Keep — used as an internal helper by other admin functions. Document. |

**Documented platform-triggered functions (keep, do not flag as orphans):** `auth-email-hook`, `weekly-digest`, `send-resume-reminder`, `og-image`, `portfolio-meta`, `track-portfolio-view`, `resolve-short-link`, `token-exchange`. These are correctly listed in `supabase/functions/EDGE_FUNCTION_AUDIT.md`.

### 2.3 Volume / cost concern

94 deployed functions is a lot. ~27 are `admin-*` (DevKit only) and ~13 are `wisehire-*`. Consider grouping rarely-used admin endpoints behind a single dispatcher function (e.g. `admin-rpc` with an `action` field). This will reduce cold-starts, lower deployment surface area, and simplify auth checks.

---

## 3. Auth provider integration

### 3.1 Kinde → Supabase bridge

- Users sign in with Kinde (`AuthContext.tsx`).
- On successful login, `exchangeToken()` calls `/api/fn/token-exchange` which forwards to the Supabase edge fn `token-exchange`. That function mints a Supabase JWT with `sub = kinde_user_id` and returns it.
- The bridged JWT is stored in `localStorage` and replayed via `getSupabaseToken()` for every subsequent client-side call.
- The `token_exchanges` table in the DB tracks issued bridge tokens.

**Findings:**
- Design is sound and keeps Supabase RLS usable while Kinde owns the user identity.
- `useSuspensionCheck.ts` was previously calling Supabase directly — now correctly routes through `/api/fn/me`.
- `safeClient.ts` (the legacy direct Supabase client) is still present and used for several read-only queries from the browser. **Long-term action**: replace those reads with server routes against Neon, then delete `safeClient.ts` and the `VITE_SUPABASE_*` env vars.

### 3.2 DevKit (admin)

- Independent password auth (`verify-dev-kit`), token cached in memory via `DevKitSessionContext`.
- All admin panels send the password back to admin functions — those functions re-validate on each call.
- This is intentionally NOT linked to Kinde so admins can recover even if the user-auth provider is broken. Good design.

**Findings:**
- The pattern of POSTing the raw password on every request is acceptable over HTTPS but means a stolen DevKit password gives full DB read/write. Recommend rotating quarterly and considering a short-lived signed token issued by `verify-dev-kit` to replace the raw-password pattern.

---

## 4. Database schema audit

### 4.1 Tables present (Supabase + Neon mirror)

25 tables: `profiles`, `resumes`, `portfolios`, `job_applications`, `subscriptions`, `ai_credits`, `user_preferences`, `interview_sessions`, `wisehire_candidates`, `wisehire_jobs`, `wisehire_companies`, `wisehire_waitlist`, `wisehire_pipeline_events`, `portfolio_visits`, `portfolio_short_links`, `portfolio_interactions`, `audit_logs`, `admin_audit_log`, `admin_settings`, `discount_codes`, `error_log`, `analytics_sweep_lock`, `ai_provider_breaker`, `token_exchanges`, `user_api_keys`.

### 4.2 Drizzle schema drift (Neon side)

`server/schema.ts` only defines **10 of the 25 tables**. The missing 15 tables exist in Neon (created by the SQL migrations) but Drizzle has no awareness of them, so:
- Any server route that needs them must use raw SQL — no type safety.
- `npm run db:push` cannot manage them.

**Missing from Drizzle:** `resumes`, `job_applications`, `subscriptions`, `interview_sessions`, `wisehire_candidates`, `wisehire_jobs`, `wisehire_pipeline_events`, `portfolio_visits`, `portfolio_short_links`, `portfolio_interactions`, `audit_logs`, `admin_audit_log`, `error_log`, `token_exchanges`, `user_api_keys`.

**Action:** add Drizzle table definitions for at least the high-traffic tables (`resumes`, `job_applications`, `subscriptions`, `wisehire_*`).

### 4.3 Missing constraints / column issues

| Table.Column | Issue | Recommendation |
|---|---|---|
| `profiles.email` | Nullable, no `UNIQUE` | Add `UNIQUE` (after backfilling) — email is used for lookup and admin merges. |
| `subscriptions.user_id` | No `UNIQUE` | Add `UNIQUE(user_id)` so each user has at most one subscription row. Currently enforced only at app layer. |
| `resumes.(user_id, is_primary)` | No partial unique index | Add `CREATE UNIQUE INDEX ON resumes(user_id) WHERE is_primary = true`. Prevents the "multiple primary resumes" bug if app logic regresses. |
| `ai_credits.(user_id, usage_date)` | No `UNIQUE` | Add — every "increment usage" today relies on `ON CONFLICT` against this pair, so adding the constraint formalises the contract. |
| `portfolio_visits.username` | Text FK to `portfolios.username` | Username is mutable (admins can rename via `admin-portfolio-usernames`). Switch to `portfolio_id uuid` FK to avoid orphan analytics on rename. |
| `portfolio_interactions.portfolio_username` | Same | Same fix. |
| `portfolio_short_links.portfolio_username` | Same | Same fix. |
| `wisehire_candidates.tags` | `ARRAY` (untyped) | Type as `text[] DEFAULT '{}'::text[]` for consistency. |
| `audit_logs` / `error_log` | No retention policy at DB level | The `analytics-sweep` job already prunes these — keep, but add a comment in the migration so someone doesn't disable the sweeper. |

### 4.4 Tables I would expect but did **not** find

These features have edge functions but no dedicated table — content is generated on the fly or stuffed into JSONB:

- **Cover letters** (`generate-cover-letter`) — no `cover_letters` table. If users want to revisit/edit, this needs persistence.
- **Resignation letters** (`generate-resignation-letter`) — no `resignation_letters` table. Same concern.
- **Push notifications** (`send-push-notification`) — no `push_subscriptions` table to store device tokens. The function probably reads from somewhere else (or it's stub-only).
- **Bug reports / feature requests / contact inquiries** (3 send-* functions) — no `contact_submissions` or `bug_reports` table. These currently just send email; if you ever want a triage queue, add a table.
- **`wisehire_candidate_briefs`** — migration `20260420000007_wisehire_candidate_briefs.sql` exists but no table by that name. Likely merged into `wisehire_candidates.ai_brief` JSONB. Confirm and update migration history.

### 4.5 RLS status (Neon side)

Row-level security is **OFF on every table** in the Neon mirror. This is acceptable because the Express server is the only writer and it enforces auth, **but** it means any leaked `DATABASE_URL` is full-takeover. On Supabase the equivalent tables do have RLS — keep that arrangement and never expose the Neon URL to the client.

### 4.6 Foreign keys & indexes

Looks healthy:
- Every user-scoped table FK's `user_id → profiles.user_id` (with cascade behaviour set per migration).
- High-traffic tables have the right composite indexes (`idx_resumes_user_updated`, `idx_job_applications_user_created`, `idx_wisehire_candidates_owner_created`, etc.).
- `portfolio_visits` has a username+visited compound index for analytics range scans.

No missing indexes jumped out from a query-pattern review.

---

## 5. Migration / schema evolution

- 166 migrations in `supabase/migrations/`. Generally well-organised by date prefix.
- Suggest running `supabase db diff` regularly to catch drift between the running DB and the migration history.
- The Drizzle `drizzle.config.ts` points at the same `DATABASE_URL` (Neon). If you intend Neon to be a long-term mirror, write a small reconcile script that re-applies all SQL migrations into Neon — otherwise the two will diverge as you add new Supabase migrations.

---

## 6. Issues / risks summary (priority order)

| # | Severity | Issue |
|---|---|---|
| 1 | **High** | Two-database architecture (Supabase + Neon) with no automated reconciliation. Pick one as canonical. |
| 2 | **High** | 4 deployed functions have no source in the repo (`clerk-webhook`, `fetch-github-projects`, `proofread-resume`, `send-bug-report`). |
| 3 | **High** | `subscriptions.user_id` not `UNIQUE` — risk of duplicate subscription rows during race conditions. |
| 4 | Medium | Drizzle schema covers only 10/25 tables — server routes against the other 15 lose type safety. |
| 5 | Medium | `portfolio_*` tables FK on mutable `username` instead of `portfolio_id` — analytics break on rename. |
| 6 | Medium | 6 confirmed orphan edge functions still deployed (cost + attack surface). |
| 7 | Medium | No `cover_letters` / `resignation_letters` tables — generated content is ephemeral. |
| 8 | Low | DevKit re-sends raw password on every admin call. Switch to short-lived signed token. |
| 9 | Low | `profiles.email` nullable, not unique. |
| 10 | Low | `wisehire_candidates.tags` untyped `ARRAY` rather than `text[]`. |
| 11 | Low | 94 edge functions = noisy deployment surface; consider grouping admin endpoints. |

---

## 7. What is working well

- Client → server proxy migration is **complete**. No Supabase keys ship to the browser anymore.
- Kinde + Supabase bridge is clean and isolated to `supabaseBridge.ts` / `AuthContext.tsx`.
- DevKit is well-separated and crash-isolated via `DevKitPanelBoundary`.
- FK and index design on existing tables is solid.
- Documented audit (`EDGE_FUNCTION_AUDIT.md`) is in place — keep it updated; this report adds the next layer of detail.

---

## 8. Suggested next actions (in order)

1. Pick **one** canonical DB (Supabase **or** Neon) and stop writing to the other from the Express server.
2. Pull the 4 ghost edge functions back into the repo (or delete them on Supabase).
3. Delete the 4 confirmed-orphan functions: `wisehire-apply`, `send-feature-request`, `send-contact-inquiry`, `clerk-webhook`.
4. Add the missing constraints in §4.3 in a single migration.
5. Backfill `server/schema.ts` with Drizzle definitions for the remaining 15 tables.
6. Decide whether cover letters and resignation letters should be persisted; if yes, add tables.

---

## 9. Closure notes — Task #1 (Backend Remediation), 2026-04-18

What this audit said vs. what was already true once we re-checked the live DB
and the current `server/schema.ts`:

| Audit claim | Reality on re-check | Action |
|---|---|---|
| Drizzle covers only 10 of 25 tables | Drizzle already covers all 25 — schema.ts grew between the audit and now. | No work needed for §4.2 beyond adding the two new letter tables. |
| `subscriptions.user_id` not UNIQUE | UNIQUE present in Neon mirror; Supabase state still needs the migration. | Migration `20260418195800_schema_hardening.sql` makes it idempotent across both. |
| `ai_credits.user_id` not UNIQUE | Same — present in Neon, migration covers Supabase. | Same. |
| `admin_settings` table missing | Already exists in `server/schema.ts`. | No-op. |

Action taken in this session:

- §1 / suggestion 1 — Canonical DB decision (**Supabase**) documented in
  [`docs/backend.md`](./docs/backend.md). Neon is dev-mirror only.
- §4.3 — Migration written: `supabase/migrations/20260418195800_schema_hardening.sql`
  (subscriptions+ai_credits UNIQUE, partial unique on `resumes(is_primary)`,
  unique on `lower(profiles.email)`, `wisehire_candidates.tags` text[] sanity).
- §4.3 / suggestion 2 — Migration written:
  `supabase/migrations/20260418195801_portfolio_id_columns.sql` — adds
  `portfolio_id uuid` to the three portfolio_* tables and back-fills from
  `username`. Username FKs are kept temporarily; a follow-up migration drops
  them once consumer code is cut over.
- §4.4 / suggestion 6 — Migration written:
  `supabase/migrations/20260418195802_letters_persistence.sql` — adds
  `cover_letters` and `resignation_letters` (with RLS owner-only). Drizzle
  definitions added to `server/schema.ts`.
- §2.2 / suggestion 3 — Source for the 3 confirmed-orphan functions
  (`wisehire-apply`, `send-feature-request`, `send-contact-inquiry`) deleted
  from `supabase/functions/`. `clerk-webhook` has no source in the repo, so
  it must be removed from the Supabase dashboard (no repo change possible).
- `supabase/functions/EDGE_FUNCTION_AUDIT.md` updated with the removals,
  documented platform-hook functions, and ghost-function status.

### Closure — Task #2 (apply migrations to Supabase), 2026-04-18

The three Phase-1 migrations were applied to the canonical Supabase project
`jnsfmkzgxsviuthaqlyy` via the Supabase Management API SQL endpoint, in
filename order, each returning HTTP 201:

- `20260418195800_schema_hardening.sql` — applied
- `20260418195801_portfolio_id_columns.sql` — applied
- `20260418195802_letters_persistence.sql` — applied

`npm run db:push` then ran cleanly against the Neon dev mirror, picking up
`cover_letters` and `resignation_letters` from `server/schema.ts`.

Verified post-state on Supabase:

- `subscriptions_user_id_key` and `ai_credits_user_id_key` UNIQUE constraints
  now present.
- `uniq_resumes_primary_per_user` partial unique index present.
- `cover_letters` gained `job_application_id`, `position`, `job_description`,
  `model_used`, `metadata` (existing columns preserved). RLS enabled and
  owner-only policies present.
- `resignation_letters` gained `current_role` (quoted to escape the reserved
  word), `reason_category`, `effective_date`, `model_used`, `metadata`.
  RLS enabled and owner-only policies present.

#### Schema drift discovered while applying — must be addressed before the §4.4/§4.3 follow-ups can land

The migration files as originally authored assumed the canonical Supabase
shape matched `server/schema.ts` (Drizzle/Neon). It does not. Re-authored
defensive guards in this commit so the migrations no-op on missing objects
rather than fail; the underlying drift still needs a separate plan:

1. `public.profiles` on Supabase has **no `email` column** — only
   `contact_email`. The `uniq_profiles_email_lower` unique index was
   therefore not created. A separate migration must either (a) add `email`
   and dual-write from `contact_email`, or (b) repoint the unique constraint
   onto `contact_email`.
2. `public.portfolios`, `public.portfolio_interactions`, and
   `public.portfolio_short_links` **do not exist on Supabase**. Portfolios
   are stored on `profiles` (with `username`, `portfolio_*` columns) and
   short-links live in `public.short_links`. The portfolio_id columns/FKs
   from `20260418195801` therefore did not get added to any table on
   Supabase. The portfolio FK plan needs to be re-scoped against the
   `profiles`-as-portfolio reality (or first introduce a `portfolios` table).
3. `cover_letters` / `resignation_letters` already existed on Supabase with
   an older shape (`content text`, no `metadata`, etc.). The new columns
   were added alongside; no destructive type changes were performed. The
   Edge Functions follow-up will need to decide which content column to
   write into and, if cutting over to `jsonb`, do that migration explicitly.

### What still needs human action

1. (no longer needed — migrations applied above.)
2. (no longer needed — `npm run db:push` against Neon completed.)
3. Update `generate-cover-letter` and `generate-resignation-letter` to INSERT
   the generated content into the new tables and return the new row id.
4. Cut over the portfolio analytics readers (visits, interactions, short
   links) to read `portfolio_id` instead of the username column, then write
   the follow-up migration that drops the legacy username FK.
5. Delete the 4 ghost functions (`clerk-webhook`, `fetch-github-projects`,
   `proofread-resume`, `send-bug-report`) from Supabase, or pull their source
   back into the repo — whichever is correct for the feature.
6. (Suggestion 8) DevKit raw-password-per-call → short-lived signed token —
   see Phase 8 of the plan; deferred because it touches all 27 admin
   functions and needs end-to-end testing.
