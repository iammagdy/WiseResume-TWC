# Unused-index audit (Apr 21, 2026)

The Supabase performance advisor flagged **32** indexes in `public` as
`unused_index` (zero scans in `pg_stat_user_indexes`). This document records
the per-index classification done for task #14, the snapshot the decision was
based on, and why no `DROP INDEX` migration is being shipped right now.

## Snapshot

- Raw `pg_stat_user_indexes` rows for the 32 candidates: `.local/db-analysis/pg_stat_user_indexes.json`.
- Database-wide stats reset time: **2025-12-08 11:03:29 UTC** (≈ 4.5 months
  before the audit). On its own that is a large enough window for the
  "unused" verdict to be meaningful — see the caveat below.

## Why nothing is being dropped yet

Every table on the candidate list is currently **empty or near-empty in
production** at the time of the audit:

| table | live rows | table bytes |
|---|---|---|
| `admin_user_notes`, `cover_letters`, `job_applications`, `portfolio_visits`, `resignation_letters`, `resume_shares`, `wisehire_applications`, `wisehire_candidate_notes`, `wisehire_clients`, `wisehire_outreach_emails`, `wisehire_pipeline_events`, `wisehire_roles`, `wisehire_saved_searches`, `wisehire_scorecard_templates` | 0 | 0 |
| `discount_codes` | 1 | 8 KB |
| `talent_pool_views`, `wisehire_candidates` | 1–2 | 8 KB |
| `talent_pool_profiles`, `wisehire_candidate_briefs` | 2 | 8 KB |
| `bug_reports` | 5 | 16 KB |
| `profiles`, `resumes` | 15 | 24 KB |

For tables with this few rows the Postgres planner will always pick a
sequential scan over an index seek, regardless of whether the index exists.
That is *expected* and explains every `idx_scan = 0` here — it is not
evidence the indexes are unneeded.

In addition, the **WiseHire feature set was launched on 2026-04-20**, the
day before this audit. All `wisehire_*` and `talent_pool_*` indexes have
effectively had ~24 hours of production exposure on a feature that is
gradually rolling out. They fall into category (c) of the task description:
"keep — newly created and not yet exercised."

Each candidate index is also tiny (8–16 KB). There is no meaningful storage
or write-amplification cost to keeping them while we wait for tables to
grow. Re-evaluate after the tables have non-trivial row counts and the
wisehire feature has had ≥ 2 weeks of normal traffic.

## Classification of every candidate

Format: `index — table.column(s) — backs which query — verdict`.

All 32 are classified as **(b) keep — backs a known query** or **(c) keep — newly
created**. None are classified as (a) safe to drop now.

### Category (c) — newly created (WiseHire / Talent Pool, < 1 week old)

These were added in migrations dated 2026-04-20 (`wisehire_*`) and the
related talent-pool / scorecards work. The feature is in early rollout, so
no scans yet is expected.

- `wisehire_roles_owner_idx` — `wisehire_roles(owner_id)` — owner-scoped role list (RLS + UI list).
- `idx_roles_client` — `wisehire_roles(client_id)` — list roles for a given client (Phase-2 client view).
- `wisehire_candidates_owner_idx` — `wisehire_candidates(owner_id)` — owner-scoped candidate list.
- `wisehire_candidates_role_idx` — `wisehire_candidates(role_id)` — pipeline board "candidates per role" join.
- `idx_candidates_client` — `wisehire_candidates(client_id)` — client-scoped candidate filter.
- `wisehire_briefs_owner_idx` — `wisehire_candidate_briefs(owner_id)` — owner brief list.
- `wisehire_briefs_candidate_idx` — `wisehire_candidate_briefs(candidate_id)` — candidate detail page brief lookup.
- `wisehire_briefs_token_idx` — `wisehire_candidate_briefs(share_token)` — public brief share-link resolver (single-row lookup; index is mandatory once data exists).
- `wisehire_pipeline_events_candidate_idx` — `wisehire_pipeline_events(candidate_id)` — candidate timeline / activity log query.
- `idx_applications_role` — `wisehire_applications(role_id)` — applications-for-role join.
- `idx_applications_applicant` — `wisehire_applications(applicant_id)` — "my applications" lookup.
- `idx_outreach_candidate` — `wisehire_outreach_emails(candidate_id)` — per-candidate outreach history.
- `idx_outreach_owner` — `wisehire_outreach_emails(owner_id)` — recruiter outreach inbox.
- `idx_notes_candidate` — `wisehire_candidate_notes(candidate_id)` — notes panel on candidate detail page.
- `idx_notes_owner` — `wisehire_candidate_notes(owner_id)` — owner-scoped notes feed.
- `idx_saved_searches_owner` — `wisehire_saved_searches(owner_id)` — saved-search list for current recruiter.
- `idx_clients_owner` — `wisehire_clients(owner_id)` — client list for current recruiter.
- `idx_sc_templates_owner` — `wisehire_scorecard_templates(owner_id)` — scorecard template picker.
- `idx_talent_pool_opted_in` — `talent_pool_profiles(opted_in)` partial — search-eligible candidates filter (`wisehire-talent-search` edge fn).
- `idx_talent_pool_experience` — `talent_pool_profiles(experience_years)` — talent search range filter.
- `idx_talent_pool_views_profile` — `talent_pool_views(profile_id)` — "who viewed me" / view-history join.

### Category (b) — backs a known (often rare or admin) query

- `idx_resumes_user_id` — `resumes(user_id)` — every per-user resume list query (RLS + UI). Will be hot once we have > a few thousand resumes; planner skips it today because the table is 24 KB.
- `idx_job_applications_user_id` — `job_applications(user_id)` — "my applications" tracker query and Kanban board fetch.
- `idx_bug_reports_status` — `bug_reports(status)` — admin DevKit bug-report queue filter (`status = 'open'`); admin-only and rare.
- `idx_portfolio_visits_username` — `portfolio_visits(username)` — public-portfolio analytics group-by; backs the analytics retention sweep and per-portfolio visit charts.
- `idx_resume_shares_token` — `resume_shares(share_token)` — single-row lookup on the public share URL; **must** be indexed once shares exist.
- `admin_user_notes_created_at_idx` — `admin_user_notes(created_at DESC)` — admin user-detail timeline pagination.
- `discount_codes_is_active_idx` — `discount_codes(is_active)` partial — coupon validation hot path (`validate-coupon`, `redeem-coupon`); only one row exists today so planner picks seq scan.
- `idx_cover_letters_resume_id` — `cover_letters(resume_id)` — join to surface a resume's cover letters in the job-application activity timeline.
- `idx_cover_letters_job_application_id` — `cover_letters(job_application_id)` — application detail page reverse lookup.
- `idx_resignation_letters_user_updated` — `resignation_letters(user_id, updated_at DESC)` — "recent resignation letters" list view.
- `idx_profiles_portfolio_draft_not_null` — `profiles(id) WHERE portfolio_draft IS NOT NULL` partial — admin "portfolios with unsaved drafts" report.

## Re-evaluation criteria

Open this audit again when **either** of these is true:

1. The tables in question have grown by ~2 orders of magnitude (e.g. > 1k
   rows) so that the planner would actually consider an index seek, **and**
   the advisor still reports them as unused after ≥ 2 weeks of post-growth
   traffic.
2. Storage / write-amplification on any one of these tables becomes a
   bottleneck (none today — total combined index size is < 400 KB).

If a future re-run finds genuinely unused indexes, drop them with
`DROP INDEX CONCURRENTLY IF EXISTS <name>;` in a dedicated migration
(no transaction wrapper around the statement) and re-run the advisor.
