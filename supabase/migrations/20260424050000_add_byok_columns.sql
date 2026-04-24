-- Add the BYOK (Bring Your Own Key) columns that the `me` and
-- `manage-api-keys` edge functions have been querying.
--
-- BACKGROUND
-- ----------
-- `supabase/functions/manage-api-keys/index.ts` reads/writes:
--   * user_api_keys.key_hint        (TEXT, nullable — short last-N hint shown in UI)
--   * user_api_keys.is_active       (BOOLEAN, defaults to TRUE — toggle for the key)
--   * user_preferences.byok_enabled (BOOLEAN, defaults to FALSE — is BYOK on)
--   * user_preferences.byok_provider(TEXT, nullable  — which provider's key to use)
--
-- `supabase/functions/me/index.ts` selects byok_enabled / byok_provider as
-- part of the bootstrap payload returned to the SPA.
--
-- These columns were referenced in code but no migration ever created
-- them, so every PostgREST call from the edge functions came back with
-- HTTP 400 ("column does not exist"). After the v3.5.5 sign-in fix
-- restored token-exchange, real users started reaching the UIs that
-- depend on these columns and the failures surfaced as "AI / members /
-- resumes unavailable".
--
-- IDEMPOTENT: uses ADD COLUMN IF NOT EXISTS so re-runs are safe and so
-- this migration is harmless in environments where the columns somehow
-- already exist.

ALTER TABLE public.user_api_keys
  ADD COLUMN IF NOT EXISTS key_hint TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS byok_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS byok_provider TEXT;

COMMENT ON COLUMN public.user_api_keys.key_hint  IS 'Short hint (e.g. last 4 chars) of the API key, safe to display in the UI.';
COMMENT ON COLUMN public.user_api_keys.is_active IS 'Whether this stored key is currently selected for use by the BYOK provider.';
COMMENT ON COLUMN public.user_preferences.byok_enabled  IS 'When true, AI calls use the user''s own provider key instead of the platform default.';
COMMENT ON COLUMN public.user_preferences.byok_provider IS 'Which provider key to use when byok_enabled is true (e.g. openai, anthropic, groq).';
