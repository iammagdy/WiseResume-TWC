-- Task #14: audit and drop genuinely unused indexes.
--
-- After reviewing the 32 indexes flagged as `unused_index` by the Supabase
-- performance advisor (snapshot at .local/db-analysis/pg_stat_user_indexes.json,
-- captured 2026-04-21) NO indexes are being dropped in this migration.
--
-- Reason — see docs/db-unused-index-analysis.md for full per-index detail:
--
--   * Database stats were last reset on 2025-12-08 (≈ 4.5 months before the
--     audit), which would normally make the "unused" verdict trustworthy.
--   * However, every flagged table is currently empty or near-empty in
--     production (0–15 rows; total relation size ≤ 24 KB). At those sizes
--     the Postgres planner always chooses a sequential scan, so `idx_scan = 0`
--     is the expected behaviour and is not evidence the indexes are
--     unneeded.
--   * The bulk of the candidates (21 of 32) are on `wisehire_*` and
--     `talent_pool_*` tables for the WiseHire HR product, which launched on
--     2026-04-20 — one day before the advisor was run. They fall under
--     "keep — newly created and not yet exercised" per the task description.
--   * The remaining 11 indexes back documented filter / lookup paths
--     (per-user resume & application lists, share-token URL resolution,
--     coupon validation, admin queues, analytics group-bys). Each one is
--     ≤ 16 KB and adds negligible write overhead on tables that currently
--     receive few writes.
--
-- This migration intentionally has no DDL. It exists only as the canonical
-- audit checkpoint so future advisor runs can reference the classification
-- and the re-evaluation criteria documented in
-- docs/db-unused-index-analysis.md.

DO $$
BEGIN
  RAISE NOTICE 'Task #14: unused-index audit complete; no indexes dropped (see docs/db-unused-index-analysis.md).';
END
$$;
