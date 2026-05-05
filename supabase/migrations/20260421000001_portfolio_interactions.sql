-- portfolio_interactions: stores recruiter interest events with a token for idempotency.
-- The token is a client-generated UUID stored in localStorage; subsequent submissions
-- with the same token are silently deduplicated by the edge function.

create table if not exists public.portfolio_interactions (
  id                uuid        primary key default gen_random_uuid(),
  token             text        not null unique,           -- client UUID, dedupe key
  portfolio_username text       not null,
  interaction_type  text        not null default 'interested' check (interaction_type in ('interested')),
  referrer_hostname text,
  created_at        timestamptz not null default now()
);

alter table public.portfolio_interactions enable row level security;

-- Insert-only from service-role context (edge function uses service key).
-- Explicitly scoped TO service_role so anon/authenticated cannot write directly
-- and bypass edge-function rate limiting.
DROP POLICY IF EXISTS "service_role_insert_portfolio_interactions" ON public.portfolio_interactions;
create policy "service_role_insert_portfolio_interactions"
  on public.portfolio_interactions for insert
  to service_role
  with check (true);

-- Portfolio owners can read interactions on their own username.
DROP POLICY IF EXISTS "owner_read_portfolio_interactions" ON public.portfolio_interactions;
create policy "owner_read_portfolio_interactions"
  on public.portfolio_interactions for select
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.username = portfolio_username
    )
  );

-- Index for fast lookup by portfolio_username and deduplication by token.
create index if not exists portfolio_interactions_username_idx
  on public.portfolio_interactions (portfolio_username, created_at desc);
