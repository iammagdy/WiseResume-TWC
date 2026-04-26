-- ── Email verification columns + token table ─────────────────────────────────
-- Adds email_verified to profiles and creates email_verification_tokens.
-- Existing users are backfilled to verified=true so no one is locked out.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

-- Backfill: everyone already in the system is considered verified.
UPDATE public.profiles
SET email_verified = true
WHERE email_verified = false;

-- Token storage for the custom verification flow.
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  token       text        NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evt_token   ON public.email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_evt_user_id ON public.email_verification_tokens(user_id);

-- Only the service-role key may touch this table (edge functions use service role).
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;
