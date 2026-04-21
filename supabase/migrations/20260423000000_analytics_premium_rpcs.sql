-- DevKit Analytics premium RPCs
-- All functions are SECURITY DEFINER so the edge function (which uses the
-- service role key anyway) gets fast pre-aggregated rows without pulling
-- raw event data over the wire. Each function REVOKEs EXECUTE from public
-- and only GRANTs it to service_role at the bottom of this migration so
-- anon/authenticated callers cannot bypass DevKit admin auth.

-- ---------------------------------------------------------------------------
-- Defensive prerequisite: portfolio_visits.device was added in
-- 20260412000000_add_device_to_portfolio_visits.sql, but generated Supabase
-- types may be stale and downstream environments may have applied migrations
-- in a different order. The IF NOT EXISTS guards make the function definition
-- below safe to run unconditionally.
-- ---------------------------------------------------------------------------
alter table public.portfolio_visits
  add column if not exists device text;

-- ---------------------------------------------------------------------------
-- 1. Daily activity buckets (page views proxy + DAU per day)
-- ---------------------------------------------------------------------------
create or replace function get_usage_activity_daily(p_start timestamptz, p_end timestamptz)
returns table(bucket_date date, total bigint, distinct_users bigint)
language sql
security definer
as $$
  select
    (created_at at time zone 'UTC')::date as bucket_date,
    count(*)::bigint as total,
    count(distinct user_id)::bigint as distinct_users
  from usage_events
  where created_at >= p_start and created_at < p_end
    and user_id is not null
  group by 1
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- 2. Hourly activity buckets (used when range = today)
-- ---------------------------------------------------------------------------
create or replace function get_usage_activity_hourly(p_start timestamptz, p_end timestamptz)
returns table(bucket_hour timestamptz, total bigint, distinct_users bigint)
language sql
security definer
as $$
  select
    date_trunc('hour', created_at) as bucket_hour,
    count(*)::bigint as total,
    count(distinct user_id)::bigint as distinct_users
  from usage_events
  where created_at >= p_start and created_at < p_end
    and user_id is not null
  group by 1
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- 3. Day-of-week x hour-of-day activity matrix (UTC)
-- ---------------------------------------------------------------------------
create or replace function get_dow_hour_activity(p_start timestamptz, p_end timestamptz)
returns table(dow int, hod int, total bigint)
language sql
security definer
as $$
  select
    extract(dow from created_at)::int as dow,
    extract(hour from created_at)::int as hod,
    count(*)::bigint as total
  from usage_events
  where created_at >= p_start and created_at < p_end
    and user_id is not null
  group by 1, 2
  order by 1, 2;
$$;

-- ---------------------------------------------------------------------------
-- 4. Top features with daily trend (trend returned as JSON array of counts
--    aligned to the daily bucket boundaries the caller computed)
-- ---------------------------------------------------------------------------
create or replace function get_top_features_with_trend(
  p_start timestamptz,
  p_end timestamptz,
  p_top_n int default 8
)
returns table(event_type text, total bigint, trend jsonb)
language sql
security definer
as $$
  with windowed as (
    select event_type, (created_at at time zone 'UTC')::date as d
    from usage_events
    where created_at >= p_start and created_at < p_end
      and event_type is not null
  ),
  totals as (
    select event_type, count(*)::bigint as total
    from windowed
    group by event_type
    order by count(*) desc
    limit p_top_n
  ),
  daily as (
    select w.event_type, w.d, count(*)::bigint as c
    from windowed w
    join totals t on t.event_type = w.event_type
    group by w.event_type, w.d
  )
  select
    t.event_type::text,
    t.total,
    coalesce(
      (select jsonb_agg(jsonb_build_object('d', d::text, 'c', c) order by d)
        from daily where event_type = t.event_type),
      '[]'::jsonb
    ) as trend
  from totals t
  order by t.total desc;
$$;

-- ---------------------------------------------------------------------------
-- 5. New vs returning daily split.
--    "new" = profile.created_at falls in the day; "returning" = users with
--    activity that day whose profile predates the day.
-- ---------------------------------------------------------------------------
create or replace function get_new_vs_returning_daily(p_start timestamptz, p_end timestamptz)
returns table(bucket_date date, new_users bigint, returning_users bigint)
language sql
security definer
as $$
  with day_users as (
    select
      (ue.created_at at time zone 'UTC')::date as d,
      ue.user_id,
      p.created_at as profile_created
    from usage_events ue
    join profiles p on p.user_id = ue.user_id
    where ue.created_at >= p_start and ue.created_at < p_end
      and ue.user_id is not null
    group by 1, 2, 3
  )
  select
    d as bucket_date,
    count(distinct user_id) filter (where (profile_created at time zone 'UTC')::date = d)::bigint as new_users,
    count(distinct user_id) filter (where (profile_created at time zone 'UTC')::date < d)::bigint as returning_users
  from day_users
  group by d
  order by d;
$$;

-- ---------------------------------------------------------------------------
-- 6. Distinct user count for an arbitrary window (used for WAU / range DAU
--    rollups so we don't have to pull all events back to the edge fn)
-- ---------------------------------------------------------------------------
create or replace function get_distinct_active_users(p_start timestamptz, p_end timestamptz)
returns bigint
language sql
security definer
as $$
  select count(distinct user_id)::bigint
  from usage_events
  where created_at >= p_start and created_at < p_end
    and user_id is not null;
$$;

-- ---------------------------------------------------------------------------
-- 7. Portfolio referrers in window (top-N) — graceful empty when no data
-- ---------------------------------------------------------------------------
create or replace function get_portfolio_referrers(
  p_start timestamptz,
  p_end timestamptz,
  p_top_n int default 8
)
returns table(referrer text, count bigint)
language sql
security definer
as $$
  select
    coalesce(nullif(trim(referrer), ''), 'direct')::text as referrer,
    count(*)::bigint
  from portfolio_visits
  where visited_at >= p_start and visited_at < p_end
  group by 1
  order by count(*) desc
  limit p_top_n;
$$;

-- ---------------------------------------------------------------------------
-- 8. Portfolio device breakdown in window
-- ---------------------------------------------------------------------------
create or replace function get_portfolio_devices(p_start timestamptz, p_end timestamptz)
returns table(device text, count bigint)
language sql
security definer
as $$
  select
    coalesce(nullif(trim(device), ''), 'unknown')::text as device,
    count(*)::bigint
  from portfolio_visits
  where visited_at >= p_start and visited_at < p_end
  group by 1
  order by count(*) desc;
$$;

-- ---------------------------------------------------------------------------
-- 9. Top pages by views in window. Reads usage_events.metadata->>'path'
--    (or 'route'). Returns empty when the app hasn't started recording
--    page views yet — the panel renders an EmptyState in that case.
-- ---------------------------------------------------------------------------
create or replace function get_top_pages(
  p_start timestamptz,
  p_end timestamptz,
  p_top_n int default 10
)
returns table(path text, count bigint)
language sql
security definer
as $$
  select
    coalesce(metadata->>'path', metadata->>'route') as path,
    count(*)::bigint
  from usage_events
  where created_at >= p_start and created_at < p_end
    and (metadata ? 'path' or metadata ? 'route')
  group by 1
  order by count(*) desc
  limit p_top_n;
$$;

-- ---------------------------------------------------------------------------
-- 10. Country stats: top-N countries plus the *full* distinct country count.
--     Sourced from `portfolio_visits.country` (the canonical visitor-country
--     signal on this project). The original migration read from
--     `profiles.country`, which does not exist on the canonical Supabase
--     project — see the operator note in replit.md (Supabase Migration Sync).
-- ---------------------------------------------------------------------------
create or replace function get_country_stats(p_top_n int default 10)
returns table(country text, count bigint, total_distinct bigint)
language sql
security definer
set search_path = public
as $$
  with per_country as (
    select country, count(*)::bigint as cnt
    from public.portfolio_visits
    where country is not null and trim(country) <> ''
    group by country
  ),
  total as (
    select count(*)::bigint as total_distinct from per_country
  )
  select pc.country::text, pc.cnt as count, t.total_distinct
  from per_country pc, total t
  order by pc.cnt desc
  limit p_top_n;
$$;

-- ---------------------------------------------------------------------------
-- Grants: lock these RPCs down to service_role only. The DevKit
-- admin-analytics edge function uses the service role key, so it can call
-- these. Anon/authenticated clients cannot, even if they discover the names.
-- ---------------------------------------------------------------------------
revoke execute on function get_usage_activity_daily(timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function get_usage_activity_hourly(timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function get_dow_hour_activity(timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function get_top_features_with_trend(timestamptz, timestamptz, int) from public, anon, authenticated;
revoke execute on function get_new_vs_returning_daily(timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function get_distinct_active_users(timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function get_portfolio_referrers(timestamptz, timestamptz, int) from public, anon, authenticated;
revoke execute on function get_portfolio_devices(timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function get_top_pages(timestamptz, timestamptz, int) from public, anon, authenticated;
revoke execute on function get_country_stats(int) from public, anon, authenticated;

grant execute on function get_usage_activity_daily(timestamptz, timestamptz) to service_role;
grant execute on function get_usage_activity_hourly(timestamptz, timestamptz) to service_role;
grant execute on function get_dow_hour_activity(timestamptz, timestamptz) to service_role;
grant execute on function get_top_features_with_trend(timestamptz, timestamptz, int) to service_role;
grant execute on function get_new_vs_returning_daily(timestamptz, timestamptz) to service_role;
grant execute on function get_distinct_active_users(timestamptz, timestamptz) to service_role;
grant execute on function get_portfolio_referrers(timestamptz, timestamptz, int) to service_role;
grant execute on function get_portfolio_devices(timestamptz, timestamptz) to service_role;
grant execute on function get_top_pages(timestamptz, timestamptz, int) to service_role;
grant execute on function get_country_stats(int) to service_role;
