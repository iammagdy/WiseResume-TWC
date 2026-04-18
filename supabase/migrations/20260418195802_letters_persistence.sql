-- =========================================================================
-- Phase 5 of Task #1 (Backend Remediation) — letters persistence.
--
-- Adds `cover_letters` and `resignation_letters` so users can revisit and
-- edit generated content. The matching Edge Functions (`generate-cover-letter`
-- and `generate-resignation-letter`) need to be updated in a follow-up to
-- INSERT into these tables once they exist on Supabase.
--
-- Safe to apply via `supabase db push`. Idempotent.
--
-- NOTE (2026-04-18 application closure): On the canonical Supabase project
-- both tables already exist with an OLDER shape (text content, no metadata,
-- no model_used, etc.). To avoid destructive type changes the existing
-- columns are LEFT IN PLACE; the new columns from this migration are ADDED
-- alongside them as nullable. Indexes are gated on column existence so the
-- migration succeeds regardless of the starting state. Note also that the
-- column originally named `current_role` is reserved in Postgres and is
-- created here as the quoted identifier "current_role".
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.cover_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  resume_id uuid REFERENCES public.resumes(id) ON DELETE SET NULL,
  job_application_id uuid REFERENCES public.job_applications(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Cover Letter',
  company text,
  "position" text,
  job_description text,
  tone text DEFAULT 'professional',
  content jsonb NOT NULL,
  model_used text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bring an older / drifted cover_letters table up to the new shape.
ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Cover Letter';
ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS resume_id uuid;
ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS job_application_id uuid;
ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS "position" text;
ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS job_description text;
ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS tone text DEFAULT 'professional';
ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS model_used text;
ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='cover_letters' AND column_name='updated_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_cover_letters_user_updated
      ON public.cover_letters (user_id, updated_at DESC)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='cover_letters' AND column_name='resume_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_cover_letters_resume_id
      ON public.cover_letters (resume_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='cover_letters' AND column_name='job_application_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_cover_letters_job_application_id
      ON public.cover_letters (job_application_id)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.resignation_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Resignation Letter',
  recipient_name text,
  "current_role" text,
  company text,
  notice_period text,
  reason_category text,
  tone text DEFAULT 'professional',
  effective_date date,
  content jsonb NOT NULL,
  model_used text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bring an older / drifted resignation_letters table up to the new shape.
ALTER TABLE public.resignation_letters ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Resignation Letter';
ALTER TABLE public.resignation_letters ADD COLUMN IF NOT EXISTS recipient_name text;
ALTER TABLE public.resignation_letters ADD COLUMN IF NOT EXISTS "current_role" text;
ALTER TABLE public.resignation_letters ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.resignation_letters ADD COLUMN IF NOT EXISTS notice_period text;
ALTER TABLE public.resignation_letters ADD COLUMN IF NOT EXISTS reason_category text;
ALTER TABLE public.resignation_letters ADD COLUMN IF NOT EXISTS tone text DEFAULT 'professional';
ALTER TABLE public.resignation_letters ADD COLUMN IF NOT EXISTS effective_date date;
ALTER TABLE public.resignation_letters ADD COLUMN IF NOT EXISTS model_used text;
ALTER TABLE public.resignation_letters ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.resignation_letters ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.resignation_letters ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='resignation_letters' AND column_name='updated_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_resignation_letters_user_updated
      ON public.resignation_letters (user_id, updated_at DESC)';
  END IF;
END $$;

-- ── RLS — owner-only access ──────────────────────────────────────────────
ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resignation_letters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='cover_letters' AND policyname='cover_letters_owner_select'
  ) THEN
    CREATE POLICY cover_letters_owner_select ON public.cover_letters
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='cover_letters' AND policyname='cover_letters_owner_insert'
  ) THEN
    CREATE POLICY cover_letters_owner_insert ON public.cover_letters
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='cover_letters' AND policyname='cover_letters_owner_update'
  ) THEN
    CREATE POLICY cover_letters_owner_update ON public.cover_letters
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='cover_letters' AND policyname='cover_letters_owner_delete'
  ) THEN
    CREATE POLICY cover_letters_owner_delete ON public.cover_letters
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='resignation_letters' AND policyname='resignation_letters_owner_select'
  ) THEN
    CREATE POLICY resignation_letters_owner_select ON public.resignation_letters
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='resignation_letters' AND policyname='resignation_letters_owner_insert'
  ) THEN
    CREATE POLICY resignation_letters_owner_insert ON public.resignation_letters
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='resignation_letters' AND policyname='resignation_letters_owner_update'
  ) THEN
    CREATE POLICY resignation_letters_owner_update ON public.resignation_letters
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='resignation_letters' AND policyname='resignation_letters_owner_delete'
  ) THEN
    CREATE POLICY resignation_letters_owner_delete ON public.resignation_letters
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
