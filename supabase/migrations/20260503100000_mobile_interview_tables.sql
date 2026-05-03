-- =============================================================================
-- Mobile interview practice — question bank + per-attempt log
-- =============================================================================
-- Backs the `mobile-api` actions `interview-next-question` (reads bank,
-- writes attempt placeholder) and `interview-grade-answer` (updates the
-- attempt with transcript / score / feedback).
--
-- Both tables are additive. RLS:
--   * interview_question_bank — public read for any authenticated user
--     (bank is shared content). Writes restricted to service role only.
--   * interview_attempts      — strict per-user (auth.uid() = user_id).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- interview_question_bank
-- ---------------------------------------------------------------------------
create table if not exists public.interview_question_bank (
  id          uuid        primary key default gen_random_uuid(),
  track       text        not null,
  prompt      text        not null,
  category    text,
  difficulty  text        check (difficulty in ('easy', 'medium', 'hard')),
  metadata    jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists interview_question_bank_track_idx
  on public.interview_question_bank (track, created_at desc);

create or replace function public._interview_question_bank_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists interview_question_bank_touch on public.interview_question_bank;
create trigger interview_question_bank_touch
  before update on public.interview_question_bank
  for each row execute function public._interview_question_bank_touch();

alter table public.interview_question_bank enable row level security;

drop policy if exists "interview_question_bank read" on public.interview_question_bank;
create policy "interview_question_bank read"
  on public.interview_question_bank
  for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies → service role only via edge functions.

comment on table public.interview_question_bank is
  'Shared interview question pool read by mobile-api interview-next-question. Writes are service-role only (populated offline / by admin tools).';

-- ---------------------------------------------------------------------------
-- interview_attempts
-- ---------------------------------------------------------------------------
create table if not exists public.interview_attempts (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(user_id) on delete cascade,
  session_id   uuid,
  track        text        not null,
  question_id  text        not null,
  prompt       text        not null,
  transcript   text,
  audio_url    text,
  score        integer     check (score is null or (score between 0 and 100)),
  feedback     jsonb,
  asked_at     timestamptz not null default now(),
  graded_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists interview_attempts_user_id_idx
  on public.interview_attempts (user_id, asked_at desc);

create index if not exists interview_attempts_question_id_idx
  on public.interview_attempts (user_id, question_id);

create or replace function public._interview_attempts_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists interview_attempts_touch on public.interview_attempts;
create trigger interview_attempts_touch
  before update on public.interview_attempts
  for each row execute function public._interview_attempts_touch();

alter table public.interview_attempts enable row level security;

drop policy if exists "interview_attempts self read" on public.interview_attempts;
create policy "interview_attempts self read"
  on public.interview_attempts
  for select
  using (auth.uid() = user_id);

drop policy if exists "interview_attempts self insert" on public.interview_attempts;
create policy "interview_attempts self insert"
  on public.interview_attempts
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "interview_attempts self update" on public.interview_attempts;
create policy "interview_attempts self update"
  on public.interview_attempts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "interview_attempts self delete" on public.interview_attempts;
create policy "interview_attempts self delete"
  on public.interview_attempts
  for delete
  using (auth.uid() = user_id);

comment on table public.interview_attempts is
  'One row per question asked in the mobile interview practice flow. Updated by mobile-api interview-grade-answer with transcript + score + feedback.';
