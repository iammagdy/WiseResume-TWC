-- Performance indexes from the 2026-05-02 backend audit (M-2 + M-3).
--
-- M-2: error_log lookups by user are issued by the DevKit user-detail panel
-- (admin-devkit-data) filtered by user_id and ordered by created_at DESC.
-- Without a composite index this is an index-scan on created_at followed by a
-- per-row filter on user_id. The retention sweep from Task #20 caps the table
-- size, but the panel still benefits from an index-only access path.
--
-- M-3: wisehire_pipeline_events is filtered by event_type for funnel-analytics
-- queries (e.g. "how many candidates moved from contacted -> replied"). The
-- column has moderate cardinality and the queries scan the whole table today.
--
-- Both statements use IF NOT EXISTS so the migration is safe to re-run and
-- safe to land on environments that may have created the indexes manually.

CREATE INDEX IF NOT EXISTS error_log_user_id_created_at_idx
  ON public.error_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wisehire_pipeline_events_event_type_idx
  ON public.wisehire_pipeline_events (event_type);
