-- RPCs used by admin-visitor-analytics for aggregation queries
-- that require service_role access.

-- Count distinct anon_ids (unique visitors) in a time window.
create or replace function public.count_distinct_visitor_anon_ids(p_start timestamptz)
returns bigint
language sql
security definer
stable
as $$
  select count(distinct anon_id)
  from public.visitor_events
  where event_type = 'page_view'
    and created_at >= p_start;
$$;

-- New vs returning visitors: "new" = first time seen in the window
-- (no earlier events), "returning" = seen before the window.
create or replace function public.visitor_new_vs_returning(p_start timestamptz)
returns json
language sql
security definer
stable
as $$
  with window_visitors as (
    select distinct anon_id
    from public.visitor_events
    where event_type = 'page_view'
      and created_at >= p_start
  ),
  first_ever as (
    select anon_id, min(created_at) as first_seen
    from public.visitor_events
    where event_type = 'page_view'
    group by anon_id
  ),
  classified as (
    select
      wv.anon_id,
      case when fe.first_seen >= p_start then 'new' else 'returning' end as status
    from window_visitors wv
    join first_ever fe using (anon_id)
  )
  select json_build_object(
    'new_visitors',       count(*) filter (where status = 'new'),
    'returning_visitors', count(*) filter (where status = 'returning')
  )
  from classified;
$$;
