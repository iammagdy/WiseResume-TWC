-- error_log table: captures runtime errors from edge functions and client diagnostics.
-- Rows are insert-only from service-role context; RLS enforces admin-only reads.

create table if not exists public.error_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  source      text not null,
  message     text not null,
  details     jsonb,
  user_id     uuid references auth.users(id) on delete set null,
  resolved    boolean not null default false
);

alter table public.error_log enable row level security;

-- Only service-role can insert (edge functions use service key)
create policy "service_role_insert_error_log"
  on public.error_log for insert
  to service_role
  with check (true);

-- Admins can read all error log rows (admin role determined by app_metadata)
create policy "admin_read_error_log"
  on public.error_log for select
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Admins can mark rows as resolved
create policy "admin_update_error_log"
  on public.error_log for update
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (true);

comment on table public.error_log is
  'Runtime error log for edge functions and client diagnostics. Admin-readable, service-role writable.';
