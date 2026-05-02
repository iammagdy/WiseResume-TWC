-- Audit item H-5 (2026-05-02 backend audit): clean up misleading admin
-- policies on public.error_log.
--
-- The original migration (20260420000022_error_log.sql) declared two
-- "admin" RLS policies that gated SELECT and UPDATE on the JWT claim
-- `app_metadata.role = 'admin'`. This codebase determines admin status
-- via email membership in the ADMIN_EMAILS env var, NOT via that claim:
--
--   * `server/index.ts` signs the bridge JWT (signSupabaseToken path)
--     with the shadow-user UUID, email, and a hard-coded
--     `role: 'authenticated'`. It never injects `app_metadata.role`.
--   * Every admin read of error_log goes through the service-role-backed
--     `supabase/functions/admin-devkit-data/index.ts` (resource =
--     'error_log', obs_action = 'get_error_stream' / 'mark_reviewed').
--     The service role bypasses RLS entirely, so these policies have
--     never been on the hot path.
--
-- Net effect: the two admin policies are dead code. They suggest a
-- direct PostgREST admin path that does not exist and will mislead the
-- next person to read the schema. Drop them, leave the service-role
-- INSERT policy in place, and rely on RLS-default-deny for everything
-- else. Admin reads/updates remain available exclusively through the
-- service-role-backed admin panel, which is the architecturally correct
-- path documented here for posterity.

drop policy if exists "admin_read_error_log"   on public.error_log;
drop policy if exists "admin_update_error_log" on public.error_log;

comment on table public.error_log is
  'Runtime error log for edge functions and client diagnostics. '
  'Service-role writable (see service_role_insert_error_log policy). '
  'Reads and updates are admin-only and MUST go through the '
  'service-role-backed admin-devkit-data edge function — there is no '
  'direct PostgREST admin path. RLS denies all non-service-role access '
  'by default; do not add an "admin" SELECT/UPDATE policy unless the '
  'bridge JWT in server/index.ts is also taught to inject a real admin '
  'claim (see audit item H-5, 2026-05-02).';
