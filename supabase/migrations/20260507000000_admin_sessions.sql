-- AUTH-5: revocable admin sessions for the DevKit/admin Edge Functions.
-- See AUTH_AUDIT.md (H2). The HMAC-signed session token issued by
-- verify-dev-kit now embeds a session id whose row lives here, so we can
-- revoke a leaked token without rotating DEV_KIT_PASSWORD.

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  ip inet,
  user_agent text
);

create index if not exists admin_sessions_email_active_idx
  on public.admin_sessions (email)
  where revoked_at is null;

create index if not exists admin_sessions_expires_at_idx
  on public.admin_sessions (expires_at);

alter table public.admin_sessions enable row level security;
-- No policies: service-role only. anon / authenticated have no access.

comment on table public.admin_sessions is
  'Revocable admin DevKit sessions issued by verify-dev-kit. Service-role only.';
