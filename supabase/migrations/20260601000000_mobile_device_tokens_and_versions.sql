-- =============================================================================
-- Mobile app: device push tokens + version manifest
-- =============================================================================
-- Adds the two tables the new Expo mobile app (Task #34) needs:
--   * device_push_tokens — Expo / FCM / APNs push tokens, one row per
--     (user, device).  Written by `register-push-token`, read by
--     `send-push`.
--   * mobile_app_versions — minimum-supported / latest version manifest
--     read by the `mobile-config` endpoint at cold-start.  Powers
--     force-update and in-app banners without an EAS Update push.
--
-- Both tables are additive and use UUID primary keys — no existing
-- column types are touched.  RLS is enabled so users can only read /
-- write their own tokens; service-role edge functions bypass RLS by
-- design.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- device_push_tokens
-- ---------------------------------------------------------------------------
create table if not exists public.device_push_tokens (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(user_id) on delete cascade,
  token           text        not null,
  platform        text        not null check (platform in ('ios', 'android', 'web')),
  app_version     text,
  device_id       text,
  locale          text,
  notification_prefs jsonb    not null default jsonb_build_object(
                                'interview',   true,
                                'application', true,
                                'resume',      true,
                                'account',     true,
                                'broadcast',   true
                              ),
  last_seen_at    timestamptz not null default now(),
  revoked_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists device_push_tokens_user_id_idx
  on public.device_push_tokens (user_id) where revoked_at is null;

create index if not exists device_push_tokens_platform_idx
  on public.device_push_tokens (platform) where revoked_at is null;

-- Reuse the project-wide updated_at trigger if present, otherwise inline.
create or replace function public._device_push_tokens_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists device_push_tokens_touch on public.device_push_tokens;
create trigger device_push_tokens_touch
  before update on public.device_push_tokens
  for each row execute function public._device_push_tokens_touch();

alter table public.device_push_tokens enable row level security;

drop policy if exists "device_push_tokens self read" on public.device_push_tokens;
create policy "device_push_tokens self read"
  on public.device_push_tokens
  for select
  using (auth.uid() = user_id);

drop policy if exists "device_push_tokens self upsert" on public.device_push_tokens;
create policy "device_push_tokens self upsert"
  on public.device_push_tokens
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "device_push_tokens self update" on public.device_push_tokens;
create policy "device_push_tokens self update"
  on public.device_push_tokens
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "device_push_tokens self delete" on public.device_push_tokens;
create policy "device_push_tokens self delete"
  on public.device_push_tokens
  for delete
  using (auth.uid() = user_id);

comment on table  public.device_push_tokens is
  'Push notification tokens for the Expo mobile app. Written by register-push-token edge function; read by send-push.';
comment on column public.device_push_tokens.notification_prefs is
  'Per-category opt-in flags. send-push checks the requested category before delivering.';

-- ---------------------------------------------------------------------------
-- mobile_app_versions
-- ---------------------------------------------------------------------------
create table if not exists public.mobile_app_versions (
  id                      uuid        primary key default gen_random_uuid(),
  platform                text        not null check (platform in ('ios', 'android')),
  min_supported_version   text        not null,
  latest_version          text        not null,
  release_notes           text,
  is_force_update         boolean     not null default false,
  banner_message          text,
  banner_severity         text        check (banner_severity in ('info', 'warning', 'critical')),
  released_at             timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists mobile_app_versions_platform_updated_idx
  on public.mobile_app_versions (platform, updated_at desc);

create or replace function public._mobile_app_versions_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists mobile_app_versions_touch on public.mobile_app_versions;
create trigger mobile_app_versions_touch
  before update on public.mobile_app_versions
  for each row execute function public._mobile_app_versions_touch();

-- Read-only to anonymous clients; writes go through service role.
alter table public.mobile_app_versions enable row level security;

drop policy if exists "mobile_app_versions public read" on public.mobile_app_versions;
create policy "mobile_app_versions public read"
  on public.mobile_app_versions
  for select
  using (true);

comment on table public.mobile_app_versions is
  'Per-platform version manifest read by the mobile-config edge function at app cold-start.';

-- Seed the initial 1.0.0 row for both platforms so the mobile-config
-- endpoint never returns a "no row" branch on day one. Idempotent
-- because of the unique platform+latest_version pair check below.
insert into public.mobile_app_versions
  (platform, min_supported_version, latest_version, release_notes, is_force_update)
select 'ios', '1.0.0', '1.0.0', 'Initial release.', false
where not exists (
  select 1 from public.mobile_app_versions where platform = 'ios'
);

insert into public.mobile_app_versions
  (platform, min_supported_version, latest_version, release_notes, is_force_update)
select 'android', '1.0.0', '1.0.0', 'Initial release.', false
where not exists (
  select 1 from public.mobile_app_versions where platform = 'android'
);
