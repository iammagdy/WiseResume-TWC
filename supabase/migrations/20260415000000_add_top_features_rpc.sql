-- RPC: get_top_feature_events
-- Returns event_type + count aggregated server-side to avoid large client-side downloads.
-- Used by the DevKit AnalyticsPanel "Top Features" chart.
create or replace function get_top_feature_events(top_n int default 10)
returns table(event_type text, count bigint)
language sql
security definer
set search_path = public
as $$
  select event_type::text, count(*)::bigint
  from usage_events
  where event_type is not null
  group by event_type
  order by count(*) desc
  limit top_n;
$$;

-- Grant execute to service_role only (DevKit admin calls use the service client)
revoke execute on function get_top_feature_events(int) from public, anon, authenticated;
grant execute on function get_top_feature_events(int) to service_role;
