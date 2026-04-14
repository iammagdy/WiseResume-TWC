create table if not exists public.company_briefings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  company_name text not null,
  briefing jsonb not null,
  created_at timestamptz default now() not null
);

alter table public.company_briefings enable row level security;

create policy "Users can view own briefings"
  on public.company_briefings for select
  using (auth.uid() = user_id);

create policy "Users can insert own briefings"
  on public.company_briefings for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own briefings"
  on public.company_briefings for delete
  using (auth.uid() = user_id);

create index if not exists company_briefings_user_id_idx on public.company_briefings(user_id);
