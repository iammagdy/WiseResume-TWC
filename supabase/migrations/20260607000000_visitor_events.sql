-- visitor_events: stores every tracked page view, click, section scroll, and
-- feature use from both anonymous and authenticated visitors. No JWT required
-- for inserts (enforced by RLS policy below).

create table if not exists public.visitor_events (
  id           uuid primary key default gen_random_uuid(),
  anon_id      uuid not null,
  user_id      uuid references auth.users(id) on delete set null,
  session_id   uuid not null,
  event_type   text not null check (event_type in ('page_view', 'click', 'section_view', 'feature_use')),
  page         text,
  target       text,
  section      text,
  country      text,
  city         text,
  device_type  text check (device_type in ('mobile', 'desktop', 'tablet')),
  browser      text,
  os           text,
  referrer     text,
  created_at   timestamptz not null default now()
);

-- Indexes for common query patterns
create index if not exists visitor_events_anon_id_idx       on public.visitor_events(anon_id);
create index if not exists visitor_events_user_id_idx       on public.visitor_events(user_id);
create index if not exists visitor_events_session_id_idx    on public.visitor_events(session_id);
create index if not exists visitor_events_created_at_idx    on public.visitor_events(created_at desc);
create index if not exists visitor_events_event_type_page   on public.visitor_events(event_type, page);
create index if not exists visitor_events_country_idx       on public.visitor_events(country);

-- Enable RLS
alter table public.visitor_events enable row level security;

-- Anonymous insert: anyone can insert (no JWT required) — used by track-visitor-event
-- service_role bypasses RLS so the edge function service client can insert freely.
create policy "anon_insert_visitor_events" on public.visitor_events
  for insert to anon, authenticated with check (true);

-- Only service_role can read (enforced by absence of select policy for anon/authenticated).
-- service_role bypasses RLS entirely.

-- Retention helper function: called by purge-old-visitor-events cron
create or replace function public.purge_old_visitor_events()
returns integer
language plpgsql
security definer
as $$
declare
  deleted_count integer;
begin
  delete from public.visitor_events
  where created_at < now() - interval '365 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
