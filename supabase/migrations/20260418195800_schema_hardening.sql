-- =========================================================================
-- Phase 2 of Task #1 (Backend Remediation) — Schema constraint hardening.
-- All statements are idempotent so re-running the migration is a no-op.
--
-- Safe to apply via `supabase db push` or pasted into Supabase Studio SQL.
-- =========================================================================

-- ── 1. subscriptions(user_id) UNIQUE ──────────────────────────────────────
-- Each user can only have one subscription row. Currently enforced only at
-- the app layer (UPSERT on user_id), which loses races. Backfill collapses
-- accidental duplicates by keeping the most recently updated row.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (
      SELECT user_id FROM public.subscriptions GROUP BY user_id HAVING COUNT(*) > 1
    ) dups
  ) THEN
    DELETE FROM public.subscriptions s
    USING (
      SELECT user_id, MAX(updated_at) AS keep_updated
      FROM public.subscriptions
      GROUP BY user_id
    ) keepers
    WHERE s.user_id = keepers.user_id
      AND s.updated_at < keepers.keep_updated;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_user_id_key' AND conrelid = 'public.subscriptions'::regclass
  ) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- ── 2. ai_credits(user_id) UNIQUE ─────────────────────────────────────────
-- Daily-usage rows MUST be 1-per-user (the daily reset rotates `usage_date`
-- in place). The current ON CONFLICT (user_id) DO UPDATE relies on this.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (
      SELECT user_id FROM public.ai_credits GROUP BY user_id HAVING COUNT(*) > 1
    ) dups
  ) THEN
    DELETE FROM public.ai_credits c
    USING (
      SELECT user_id, MAX(updated_at) AS keep_updated
      FROM public.ai_credits
      GROUP BY user_id
    ) keepers
    WHERE c.user_id = keepers.user_id
      AND c.updated_at < keepers.keep_updated;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_credits_user_id_key' AND conrelid = 'public.ai_credits'::regclass
  ) THEN
    ALTER TABLE public.ai_credits ADD CONSTRAINT ai_credits_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- ── 3. resumes — at most one primary per user ─────────────────────────────
-- Partial unique index. Prevents the "multiple primary resumes" bug if app
-- logic regresses. Backfill demotes all but the most recently updated primary.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC, id DESC) AS rn
  FROM public.resumes
  WHERE is_primary = TRUE
)
UPDATE public.resumes r
SET is_primary = FALSE
FROM ranked
WHERE r.id = ranked.id AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_resumes_primary_per_user
  ON public.resumes (user_id)
  WHERE is_primary = TRUE;

-- ── 4. profiles.email UNIQUE ──────────────────────────────────────────────
-- Email is used for admin merge / lookup. Backfill: keep the most recent
-- profile with each email (by updated_at), null out the older duplicates so
-- they don't block the unique index. We do not delete them — admins may want
-- to investigate why two profiles existed.
-- NOTE: The canonical Supabase schema does not (yet) carry an `email` column
-- on `profiles` — only `contact_email`. We gate the dedup + unique index on
-- the column actually existing so this migration is a no-op until the column
-- is introduced. Once added, re-running this migration will apply the index.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    EXECUTE $sql$
      WITH dup_emails AS (
        SELECT lower(email) AS lemail
        FROM public.profiles
        WHERE email IS NOT NULL AND length(trim(email)) > 0
        GROUP BY lower(email) HAVING COUNT(*) > 1
      ),
      losers AS (
        SELECT p.id
        FROM public.profiles p
        JOIN dup_emails d ON lower(p.email) = d.lemail
        WHERE p.id <> (
          SELECT p2.id
          FROM public.profiles p2
          WHERE lower(p2.email) = d.lemail
          ORDER BY p2.updated_at DESC NULLS LAST, p2.created_at DESC NULLS LAST
          LIMIT 1
        )
      )
      UPDATE public.profiles
      SET email = NULL,
          admin_notes = COALESCE(admin_notes, '') ||
            E'\n[2026-04-18 schema_hardening] email cleared — duplicate of canonical row, see audit log.'
      WHERE id IN (SELECT id FROM losers);
    $sql$;

    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uniq_profiles_email_lower
      ON public.profiles (lower(email)) WHERE email IS NOT NULL';
  END IF;
END $$;

-- ── 5. wisehire_candidates.tags type sanity ───────────────────────────────
-- The Drizzle schema declares text[]. If the deployed DB ever drifted to a
-- non-array text column the cast below restores the contract. Wrapped in DO
-- $$ so a no-op (already text[]) does not error.
DO $$
DECLARE
  current_type TEXT;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'wisehire_candidates'
    AND column_name = 'tags';

  IF current_type IS NOT NULL AND current_type <> 'ARRAY' THEN
    ALTER TABLE public.wisehire_candidates
      ALTER COLUMN tags TYPE text[]
      USING CASE
        WHEN tags IS NULL OR length(trim(tags::text)) = 0 THEN '{}'::text[]
        ELSE string_to_array(tags::text, ',')
      END;
  END IF;

  IF current_type IS NOT NULL THEN
    ALTER TABLE public.wisehire_candidates
      ALTER COLUMN tags SET DEFAULT '{}'::text[];
    -- Backfill any historical NULLs to the empty-array default before
    -- enforcing NOT NULL so this migration cannot fail on legacy rows.
    UPDATE public.wisehire_candidates SET tags = '{}'::text[] WHERE tags IS NULL;
    ALTER TABLE public.wisehire_candidates ALTER COLUMN tags SET NOT NULL;
  END IF;
END $$;
