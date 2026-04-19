-- Bulletproof email-existence check for WiseHire waitlist join flow.
-- Replaces the undocumented GoTrue ?search= query param with a direct
-- auth.users lookup. SECURITY DEFINER lets the function read auth.users
-- even when called by a non-superuser role; the search_path lock prevents
-- search-path injection attacks.
create or replace function public.check_email_exists(p_email text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(p_email)
  );
$$;

-- Only the service role (used by edge functions) should call this.
revoke execute on function public.check_email_exists(text) from public, anon;
grant  execute on function public.check_email_exists(text) to service_role;
