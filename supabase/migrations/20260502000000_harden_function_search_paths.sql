-- Harden 8 public functions flagged by the Supabase security advisor as
-- having a mutable `search_path`. A mutable search_path lets a user with
-- CREATE rights on any schema on the resolved path shadow the built-in
-- functions / operators these SECURITY DEFINER (and trigger) functions call,
-- enabling search-path injection.
--
-- Fix: bake `search_path = public, pg_temp` into each function so name
-- resolution is deterministic regardless of the caller's session settings.
-- pg_temp is appended last (rather than first, the default) so a malicious
-- temp object can't shadow public objects.
--
-- This is a metadata-only change (ALTER FUNCTION ... SET); function bodies
-- and call signatures are untouched, so callers continue to behave identically.

ALTER FUNCTION public.soft_delete_record()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.handle_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.check_email_rate_limit(text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.deduct_ai_credits(integer, text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.increment_short_link_clicks(text)
  SET search_path = public, pg_temp;

-- wisehire_redeem_early_access_code(text) was created out-of-band via
-- the Supabase dashboard and is therefore not present in this repo's
-- migration history. Wrap the ALTER in a DO block (Postgres does not
-- support `ALTER FUNCTION IF EXISTS`) so a fresh-DB rebuild from
-- migrations doesn't fail when the function legitimately doesn't exist
-- yet. On the live project the function does exist, so the ALTER runs.
DO $do$
BEGIN
  IF to_regprocedure('public.wisehire_redeem_early_access_code(text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.wisehire_redeem_early_access_code(text) '
         || 'SET search_path = public, pg_temp';
  END IF;
END
$do$;

ALTER FUNCTION public.atomic_attempt_and_deduct_credit(uuid, integer, integer)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.upsert_ai_credits_limit(uuid, integer, date)
  SET search_path = public, pg_temp;
