-- Task #25 / AI-5: operator-visible signal for fail-OPEN events.
--
-- Both userRateLimiter.checkUserRateLimit and aiClient.isBreakerOpen
-- deliberately return "allow" on infrastructure errors. That trade-off is
-- correct (a misbehaving rate-limit table or breaker would otherwise take
-- down every AI feature in the product) but without an external signal
-- both layers can silently degrade abuse prevention indefinitely.
--
-- This table captures one row per fail-open event. Inserts are
-- fire-and-forget from edge functions via _shared/opsHealth.ts and any
-- error inserting is swallowed (a broken health table must NEVER itself
-- cause an outage). The companion `ops_health_recent_counts` view returns
-- per-event totals over the last hour for an on-call dashboard.

create table if not exists public.ops_health_events (
  id        bigserial primary key,
  ts        timestamptz not null default now(),
  event     text not null,
  feature   text,
  reason    text,
  -- Deliberately NO user_id / IP — these rows live in operator land,
  -- not user land, and we do not want to leak identifiers into the
  -- generic health stream.
  constraint ops_health_events_event_len check (char_length(event) <= 64),
  constraint ops_health_events_feature_len check (feature is null or char_length(feature) <= 64),
  constraint ops_health_events_reason_len check (reason is null or char_length(reason) <= 200)
);

create index if not exists ops_health_events_ts_idx on public.ops_health_events (ts desc);
create index if not exists ops_health_events_event_ts_idx on public.ops_health_events (event, ts desc);

-- RLS: deny everything to anon/authenticated. Only the service-role key
-- (used by edge functions) bypasses RLS, which is exactly the surface we
-- want. An admin can query via the SECURITY DEFINER RPC below.
alter table public.ops_health_events enable row level security;

revoke all on public.ops_health_events from anon, authenticated;

-- Hourly bucketed counts for the on-call dashboard. Returns the count
-- per (event, feature) over the last `p_window_minutes` minutes.
create or replace function public.ops_health_recent_counts(
  p_window_minutes integer default 60
)
returns table (
  event   text,
  feature text,
  count   bigint
)
language sql
security definer
set search_path = public
as $$
  select event, feature, count(*)::bigint
  from public.ops_health_events
  where ts >= now() - make_interval(mins => greatest(1, least(1440, p_window_minutes)))
  group by event, feature
  order by count(*) desc, event;
$$;

-- Restrict access to admins. The function runs SECURITY DEFINER so the
-- caller does not need direct table grants, only EXECUTE on the function.
revoke all on function public.ops_health_recent_counts(integer) from public, anon, authenticated;
grant execute on function public.ops_health_recent_counts(integer) to service_role;

comment on table  public.ops_health_events is
  'AI-5: per-event log of fail-open infra events (rate limiter, breaker, admin-settings DB error). Insert-only from edge functions; read via ops_health_recent_counts().';
comment on function public.ops_health_recent_counts(integer) is
  'AI-5: per-(event,feature) count of ops_health_events rows in the last p_window_minutes (default 60).';
