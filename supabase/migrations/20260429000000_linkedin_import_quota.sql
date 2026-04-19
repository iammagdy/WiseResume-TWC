-- linkedin_import_quota: server-side monthly per-user LinkedIn import counter.
--
-- Access model
-- ────────────
-- This table is written and read exclusively by the Express API server, which
-- connects to Postgres using the DATABASE_URL connection string (direct/service
-- connection). That connection runs as a superuser or the postgres role, both of
-- which bypass RLS in Postgres by default — no explicit GRANT or policy is
-- required for server-side access.
--
-- Row-Level Security is enabled below with NO permissive policies for the anon or
-- authenticated roles. This means:
--   • anon role (Supabase public API)       — blocked (no policy → default deny)
--   • authenticated role (PostgREST users)  — blocked (no policy → default deny)
--   • service_role (Supabase service key)   — bypasses RLS by Postgres design;
--     this is documented Supabase behaviour and requires no explicit policy.
--
-- In Postgres, the service_role bypass is a role-level privilege (`BYPASSRLS`),
-- not an RLS policy, so there is no SQL policy to write for it. The absence of
-- client-facing policies IS the access control for this table.

CREATE TABLE IF NOT EXISTS public.linkedin_import_quota (
  user_id UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month   TEXT    NOT NULL, -- YYYY-MM (UTC)
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);

ALTER TABLE public.linkedin_import_quota ENABLE ROW LEVEL SECURITY;

-- No permissive policies — see access model above.
