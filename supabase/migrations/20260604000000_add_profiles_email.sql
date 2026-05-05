-- Migration: add profiles.email column
-- Adds the email column that all admin functions expect, backfills from auth.users,
-- creates a trigger to keep it in sync, and applies the unique index that the
-- schema_hardening migration (20260418195800) was waiting for.

-- 1. Add the column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Backfill from auth.users for all existing rows
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.user_id
  AND p.email IS NULL;

-- 3. Trigger function: keep profiles.email in sync when auth.users.email changes
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE user_id = NEW.id
    AND (email IS DISTINCT FROM NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_email ON auth.users;
CREATE TRIGGER trg_sync_profile_email
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email();

-- 4. Unique index (schema_hardening migration was a no-op until this column existed)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_profiles_email_lower
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL;
