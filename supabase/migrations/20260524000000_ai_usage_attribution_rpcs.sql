-- AI usage attribution RPCs.
--
-- These read-only RPCs power the DevKit "AI Cost" panel. They aggregate
-- ai_usage_logs (the existing source of every AI invocation) into the
-- shapes the panel needs without ever pulling raw rows back to the edge
-- function — keeps the dashboard fast (<1.5s) for a 30-day window.
--
-- IMPORTANT: there is no USD cost or token-count column on ai_usage_logs
-- today, so "spend" here is expressed as invocation count (1 row = 1 call,
-- which is what the credit ledger charges for). The panel labels this
-- honestly. Adding USD/token columns would be a separate schema task and
-- is explicitly out of scope for task #29.
--
-- All functions are SECURITY DEFINER and granted only to service_role —
-- the DevKit edge function (admin-devkit-data) calls them via the service
-- client behind requireAdminAuth.

-- ---------------------------------------------------------------------------
-- 1. Daily totals (and distinct active users) in window
-- ---------------------------------------------------------------------------
create or replace function get_ai_usage_daily_totals(
  p_start timestamptz,
  p_end   timestamptz
)
returns table(bucket_date date, invocations bigint, distinct_users bigint)
language sql
security definer
set search_path = public
as $$
  select
    date_trunc('day', created_at at time zone 'UTC')::date as bucket_date,
    count(*)::bigint                                       as invocations,
    count(distinct user_id)::bigint                        as distinct_users
  from public.ai_usage_logs
  where created_at >= p_start and created_at < p_end
  group by 1
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- 2. Single-window total (used to compute prev-period delta cheaply)
-- ---------------------------------------------------------------------------
create or replace function get_ai_usage_window_total(
  p_start timestamptz,
  p_end   timestamptz
)
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.ai_usage_logs
  where created_at >= p_start and created_at < p_end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Top-N users by invocation count (returns user_id only — the edge
--    function resolves emails via auth.admin.getUserById to avoid coupling
--    this RPC to the profiles.email column, which is conditional across
--    environments per the schema-hardening migration).
-- ---------------------------------------------------------------------------
create or replace function get_ai_usage_top_users(
  p_start timestamptz,
  p_end   timestamptz,
  p_top_n int default 10
)
returns table(user_id uuid, invocations bigint)
language sql
security definer
set search_path = public
as $$
  select user_id, count(*)::bigint as invocations
  from public.ai_usage_logs
  where created_at >= p_start and created_at < p_end
    and user_id is not null
  group by user_id
  order by count(*) desc
  limit p_top_n;
$$;

-- ---------------------------------------------------------------------------
-- 4. Spend breakdown by feature (action_type)
-- ---------------------------------------------------------------------------
create or replace function get_ai_usage_by_feature(
  p_start timestamptz,
  p_end   timestamptz
)
returns table(action_type text, invocations bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(nullif(trim(action_type), ''), 'unknown')::text as action_type,
    count(*)::bigint                                          as invocations
  from public.ai_usage_logs
  where created_at >= p_start and created_at < p_end
  group by 1
  order by count(*) desc;
$$;

-- ---------------------------------------------------------------------------
-- 5. Spend breakdown by provider (read from metadata->>'provider', which
--    edge functions populate as `<provider>:<keyIndex>` e.g. 'openrouter:0',
--    'groq:1', 'byok:openrouter'. We collapse the key-slot suffix so the
--    panel groups by provider family rather than per-key.
-- ---------------------------------------------------------------------------
create or replace function get_ai_usage_by_provider(
  p_start timestamptz,
  p_end   timestamptz
)
returns table(provider text, invocations bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(
      nullif(split_part(coalesce(metadata->>'provider', ''), ':', 1), ''),
      'unknown'
    )::text                          as provider,
    count(*)::bigint                 as invocations
  from public.ai_usage_logs
  where created_at >= p_start and created_at < p_end
  group by 1
  order by count(*) desc;
$$;

-- ---------------------------------------------------------------------------
-- 6. Window-level distinct active users (TRUE union, not max-of-day).
--    The daily-totals RPC reports per-day distincts; that approximation
--    undercounts true window-level distincts when the same user appears
--    on multiple days. This RPC is the source of truth for the KPI strip.
-- ---------------------------------------------------------------------------
create or replace function get_ai_usage_distinct_users(
  p_start timestamptz,
  p_end   timestamptz
)
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(distinct user_id)::bigint
  from public.ai_usage_logs
  where created_at >= p_start and created_at < p_end
    and user_id is not null;
$$;

-- ---------------------------------------------------------------------------
-- 7. Hourly totals (used only for the 'today' range so the sparkline shows
--    real intra-day fidelity instead of a single-point daily bar).
-- ---------------------------------------------------------------------------
create or replace function get_ai_usage_hourly_totals(
  p_start timestamptz,
  p_end   timestamptz
)
returns table(bucket_hour timestamptz, invocations bigint)
language sql
security definer
set search_path = public
as $$
  select
    date_trunc('hour', created_at) as bucket_hour,
    count(*)::bigint               as invocations
  from public.ai_usage_logs
  where created_at >= p_start and created_at < p_end
  group by 1
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- Grants — service_role only (DevKit pattern)
-- ---------------------------------------------------------------------------
revoke execute on function get_ai_usage_daily_totals(timestamptz, timestamptz)        from public, anon, authenticated;
revoke execute on function get_ai_usage_window_total(timestamptz, timestamptz)        from public, anon, authenticated;
revoke execute on function get_ai_usage_top_users(timestamptz, timestamptz, int)      from public, anon, authenticated;
revoke execute on function get_ai_usage_by_feature(timestamptz, timestamptz)          from public, anon, authenticated;
revoke execute on function get_ai_usage_by_provider(timestamptz, timestamptz)         from public, anon, authenticated;
revoke execute on function get_ai_usage_distinct_users(timestamptz, timestamptz)      from public, anon, authenticated;
revoke execute on function get_ai_usage_hourly_totals(timestamptz, timestamptz)       from public, anon, authenticated;

grant  execute on function get_ai_usage_daily_totals(timestamptz, timestamptz)        to service_role;
grant  execute on function get_ai_usage_window_total(timestamptz, timestamptz)        to service_role;
grant  execute on function get_ai_usage_top_users(timestamptz, timestamptz, int)      to service_role;
grant  execute on function get_ai_usage_by_feature(timestamptz, timestamptz)          to service_role;
grant  execute on function get_ai_usage_by_provider(timestamptz, timestamptz)         to service_role;
grant  execute on function get_ai_usage_distinct_users(timestamptz, timestamptz)      to service_role;
grant  execute on function get_ai_usage_hourly_totals(timestamptz, timestamptz)       to service_role;
