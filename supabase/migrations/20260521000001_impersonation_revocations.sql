-- Task #18: Let admins end an Act As session immediately.
--
-- Per-user revocation timestamps for admin impersonation JWTs. When an admin
-- clicks "End session now" in the ActAsDialog, admin-impersonate {action:
-- 'revoke'} upserts a row here. Both `requireAuth` (edge functions) and
-- `validateSupabaseToken` (Express dev proxy) consult this table after a
-- successful signature/expiry check on tokens carrying `is_impersonation:
-- true`. A token is rejected when its `iat` (issued-at, seconds) is at or
-- before `revoked_at`, so re-issuing impersonation for the same user with a
-- newer `iat` works without first deleting the row.
--
-- One row per target user is sufficient because impersonation is single-
-- session — the spec explicitly excludes "session listing / revocation
-- across users".
--
-- Service-role only (anon/authenticated have no access). RLS is enabled with
-- no policies so PostgREST denies by default; service-role bypasses RLS.
create table if not exists public.impersonation_revocations (
  target_user_id uuid primary key,
  revoked_at     timestamptz not null default now(),
  revoked_by     text
);

alter table public.impersonation_revocations enable row level security;

revoke all on public.impersonation_revocations from anon, authenticated;

comment on table public.impersonation_revocations is
  'Task #18: per-target-user revocation timestamp for admin impersonation JWTs. A token whose iat <= revoked_at must be rejected. Written by admin-impersonate {action: "revoke"}; read by requireAuth / validateSupabaseToken.';
