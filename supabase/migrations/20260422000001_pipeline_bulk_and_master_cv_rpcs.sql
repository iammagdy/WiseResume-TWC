-- Task #11: Performance — bulk-update RPCs
--
-- 1) bulk_update_pipeline_stage(p_candidate_ids, p_to_stage)
--    Moves N candidates to a stage in a single round-trip and records
--    one pipeline_event per moved candidate. Replaces the N-call loop
--    in usePipeline.bulkUpdatePipelineStage.
-- 2) set_master_cv(p_resume_id)
--    Atomically clears all is_primary=true rows for the caller and
--    sets the target row to is_primary=true in one transactional RPC.

create or replace function public.bulk_update_pipeline_stage(
  p_candidate_ids uuid[],
  p_to_stage text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_moved integer := 0;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_candidate_ids is null or array_length(p_candidate_ids, 1) is null then
    return 0;
  end if;

  -- Snapshot prior stages BEFORE updating so the audit trail can record
  -- an accurate from_stage->to_stage transition per candidate. We then
  -- update only the rows whose stage actually changes (skipping no-ops)
  -- and insert one history event per moved row.
  with prev as (
    select id, pipeline_stage as from_stage
      from public.wisehire_candidates
     where id = any(p_candidate_ids)
       and owner_id = v_user_id
       and pipeline_stage is distinct from p_to_stage
     for update
  ),
  moved as (
    update public.wisehire_candidates c
       set pipeline_stage = p_to_stage,
           updated_at     = now()
      from prev
     where c.id = prev.id
       and c.owner_id = v_user_id
    returning c.id, prev.from_stage
  ),
  events as (
    insert into public.wisehire_pipeline_events (owner_id, candidate_id, from_stage, to_stage, moved_by)
    select v_user_id, m.id, m.from_stage, p_to_stage, v_user_id
      from moved m
    returning 1
  )
  select count(*) into v_moved from moved;

  return coalesce(v_moved, 0);
end;
$$;

grant execute on function public.bulk_update_pipeline_stage(uuid[], text) to authenticated;

create or replace function public.set_master_cv(p_resume_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_owns boolean;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Validate ownership BEFORE clearing existing primary rows. Without
  -- this guard, an unowned/missing p_resume_id would still match the
  -- "is_primary = true" branch and clear the user's current primary,
  -- leaving them with zero primary CVs.
  select exists(
    select 1 from public.resumes
     where id = p_resume_id and user_id = v_user_id
  ) into v_owns;

  if not v_owns then
    raise exception 'resume_not_found_or_not_owned';
  end if;

  update public.resumes
     set is_primary = (id = p_resume_id)
   where user_id = v_user_id
     and (is_primary = true or id = p_resume_id);
end;
$$;

grant execute on function public.set_master_cv(uuid) to authenticated;
