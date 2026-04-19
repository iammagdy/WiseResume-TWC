-- linkedin_import_quota: server-side monthly per-user LinkedIn import counter.
-- Accessed exclusively via the Express API server using a direct DB connection;
-- never exposed through PostgREST. RLS is enabled with no client-facing policies
-- so the anon and authenticated roles have no access. The service_role (used by
-- the Express server) bypasses RLS automatically in Supabase.

CREATE TABLE IF NOT EXISTS public.linkedin_import_quota (
  user_id UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month   TEXT    NOT NULL, -- YYYY-MM (UTC)
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);

ALTER TABLE public.linkedin_import_quota ENABLE ROW LEVEL SECURITY;

-- No permissive policies are defined intentionally — this table is server-only.
-- service_role bypasses RLS; anon/authenticated PostgREST roles are blocked.
