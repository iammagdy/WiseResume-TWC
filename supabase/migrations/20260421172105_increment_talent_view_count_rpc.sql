-- Atomic increment of talent_pool_profiles.view_count for the
-- wisehire-talent-view edge function. The function previously called
-- supabase.rpc('increment_talent_view_count', ...) and silently fell back to
-- a manual SELECT/UPDATE because the RPC did not exist; this restores the
-- fast atomic path. SECURITY DEFINER + locked search_path matches the
-- conventions used by the other RPCs called from edge functions.
create or replace function public.increment_talent_view_count(p_profile_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.talent_pool_profiles
     set view_count    = coalesce(view_count, 0) + 1,
         last_viewed_at = now()
   where id = p_profile_id;
$$;

-- Only the service role (used by edge functions) should call this.
revoke execute on function public.increment_talent_view_count(uuid) from public, anon, authenticated;
grant  execute on function public.increment_talent_view_count(uuid) to service_role;
