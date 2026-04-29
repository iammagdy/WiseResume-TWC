-- ============================================================
-- Phase 1 — Portfolio password security: server-side bcrypt of raw password
--
-- Background
-- ----------
-- Migration 20260426000000 moved password VERIFICATION server-side and
-- backfilled legacy SHA-256 hashes into bcrypt(sha256(raw_password)) so
-- existing portfolios kept working.  However, the editor still hashed new
-- passwords client-side with unsalted SHA-256 before sending them up
-- (see PortfolioEditorPage.tsx).  That meant identical user-typed
-- passwords across accounts produced identical SHA-256 strings on the
-- wire and at rest beneath the bcrypt wrapper, defeating bcrypt's salt.
--
-- This migration:
--   1. Adds set_portfolio_password(p_password text, p_enabled boolean) — the
--      sole writer of portfolio_extras.passwordHash and passwordEnabled.
--      It bcrypts the raw password directly (no SHA-256 layer), enforces
--      an 8-character minimum, and merges the result into portfolio_extras
--      so other extras keys are preserved.
--   2. Replaces get_public_portfolio's bcrypt verification path so it
--      ACCEPTS BOTH the new format (bcrypt of raw password) and the
--      legacy backfilled format (bcrypt of sha256(raw password)).  This
--      is the only behaviour change to the verify path — the legacy
--      direct-SHA-256 fallback is preserved for any hashes that were not
--      yet upgraded.
--
-- Backward compatibility
-- ----------------------
-- - Portfolios protected before this migration keep working unchanged
--   (their hashes are bcrypt(sha256(raw)) and the dual-bcrypt-attempt
--   verify path still matches them).
-- - Portfolios that set a NEW password after this migration is deployed
--   will have hashes of the form bcrypt(raw) — the new path matches
--   those on the first attempt.
-- - The single-arg get_public_portfolio(text) signature stays dropped.
-- ============================================================

-- ─── Step 1: set_portfolio_password RPC ──────────────────────────────────────
-- Caller must be authenticated.  Updates only the calling user's profile.
-- Merges into portfolio_extras with the || operator so unrelated keys are
-- preserved.  Returns the resulting passwordEnabled flag so the client can
-- update its local state without re-fetching.
CREATE OR REPLACE FUNCTION public.set_portfolio_password(
  p_password text,
  p_enabled  boolean
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_extras  jsonb;
  v_new_hash text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Disable path: clear hash, set passwordEnabled=false.
  IF p_enabled IS NOT TRUE THEN
    UPDATE public.profiles
    SET portfolio_extras = COALESCE(portfolio_extras, '{}'::jsonb)
                            - 'passwordHash'
                            || jsonb_build_object('passwordEnabled', false)
    WHERE user_id = v_user_id;
    RETURN false;
  END IF;

  -- Enable path with a NEW raw password supplied.
  IF p_password IS NOT NULL AND length(p_password) > 0 THEN
    IF length(p_password) < 8 THEN
      RAISE EXCEPTION 'Password must be at least 8 characters' USING ERRCODE = '22023';
    END IF;
    -- Direct bcrypt of the raw password — no SHA-256 wrapping.
    v_new_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));
    UPDATE public.profiles
    SET portfolio_extras = COALESCE(portfolio_extras, '{}'::jsonb)
                            || jsonb_build_object(
                                 'passwordEnabled', true,
                                 'passwordHash',    v_new_hash
                               )
    WHERE user_id = v_user_id;
    RETURN true;
  END IF;

  -- Enable path with NO new password — keep existing hash, just flip the flag.
  -- Reject if no hash is currently set.
  SELECT COALESCE(portfolio_extras, '{}'::jsonb) INTO v_extras
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_extras->>'passwordHash' IS NULL OR v_extras->>'passwordHash' = '' THEN
    RAISE EXCEPTION 'Cannot enable password protection without a password' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET portfolio_extras = COALESCE(portfolio_extras, '{}'::jsonb)
                          || jsonb_build_object('passwordEnabled', true)
  WHERE user_id = v_user_id;
  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_portfolio_password(text, boolean) TO authenticated;

-- ─── Step 2: Update get_public_portfolio bcrypt verify path ───────────────────
-- Accept BOTH bcrypt(raw_password) (new) and bcrypt(sha256(raw_password))
-- (legacy backfilled).  Try the new format first since most new traffic
-- will use it; fall back to the legacy form on miss.  All other code paths
-- (rate limiting, sanitisation, fallbacks, return shape) are preserved
-- byte-for-byte from migration 20260426000000.
CREATE OR REPLACE FUNCTION public.get_public_portfolio(p_username text, p_password text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile record;
  v_resume record;
  v_job_title text;
  v_extras jsonb;
  v_snapshot jsonb;
  v_github_cache jsonb;
  v_profile_json jsonb;
  v_empty_resume jsonb;
  v_ip text;
  v_request_count int;
  v_stored_hash text;
  v_supplied_hash text;
  v_password_ok boolean;
BEGIN
  -- Rate limiting check: 60 requests per minute per IP
  BEGIN
    v_ip := current_setting('request.headers', true)::json->>'x-forwarded-for';
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  IF v_ip IS NOT NULL THEN
    v_ip := split_part(v_ip, ',', 1);

    SELECT count(*) INTO v_request_count
    FROM public.rpc_rate_limits
    WHERE ip_address = v_ip
      AND endpoint = 'get_public_portfolio'
      AND created_at > now() - interval '1 minute';

    IF v_request_count >= 60 THEN
      RAISE EXCEPTION 'Rate limit exceeded for get_public_portfolio';
    END IF;

    INSERT INTO public.rpc_rate_limits (ip_address, endpoint) VALUES (v_ip, 'get_public_portfolio');
  END IF;

  SELECT id, user_id, full_name, avatar_url, job_title, industry, career_level, location,
         linkedin_url, portfolio_bio, username, portfolio_resume_id,
         github_url, website_url, twitter_url, contact_email, portfolio_theme, views,
         portfolio_sections, portfolio_meta_title, portfolio_meta_description,
         portfolio_layout, portfolio_accent_color, portfolio_font, portfolio_style,
         open_to_work, availability_headline, last_active_at,
         COALESCE(portfolio_extras, '{}'::jsonb) as portfolio_extras,
         COALESCE(portfolio_sync_mode, 'auto') as portfolio_sync_mode,
         COALESCE(github_projects_cache, '[]'::jsonb) as github_projects_cache
  INTO v_profile
  FROM public.profiles
  WHERE username = lower(p_username)
    AND portfolio_enabled = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_extras := v_profile.portfolio_extras;

  -- ── Server-side password enforcement ────────────────────────────────────────
  -- Read hash before sanitisation; never returned to client (sanitised below).
  IF COALESCE((v_extras->>'passwordEnabled')::boolean, false) IS TRUE
     AND v_extras->>'passwordHash' IS NOT NULL
     AND v_extras->>'passwordHash' <> ''
  THEN
    v_stored_hash := v_extras->>'passwordHash';
    v_password_ok := false;

    IF p_password IS NOT NULL THEN
      IF v_stored_hash LIKE '$2%' THEN
        -- New format: bcrypt of the raw password.  Try this first.
        v_password_ok := extensions.crypt(p_password, v_stored_hash) = v_stored_hash;

        -- Legacy backfilled format: bcrypt of sha256(raw password).
        -- Tried only if the new-format check failed, so existing portfolios
        -- created before this migration continue to unlock unchanged.
        IF NOT v_password_ok THEN
          v_supplied_hash := encode(extensions.digest(p_password, 'sha256'), 'hex');
          v_password_ok := extensions.crypt(v_supplied_hash, v_stored_hash) = v_stored_hash;
        END IF;
      ELSE
        -- Pre-backfill legacy: stored value is plain sha256(raw password).
        v_supplied_hash := encode(extensions.digest(p_password, 'sha256'), 'hex');
        v_password_ok := lower(v_supplied_hash) = lower(v_stored_hash);
      END IF;
    END IF;

    IF NOT v_password_ok THEN
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;
  END IF;
  -- ── End password enforcement ─────────────────────────────────────────────────

  -- Strip sensitive password fields before returning anything to the client.
  v_extras := v_extras - 'passwordHash' - 'passwordEnabled';

  v_github_cache := v_profile.github_projects_cache;
  v_job_title := v_profile.job_title;

  v_profile_json := jsonb_build_object(
    'fullName', v_profile.full_name,
    'avatarUrl', v_profile.avatar_url,
    'jobTitle', v_job_title,
    'industry', v_profile.industry,
    'careerLevel', v_profile.career_level,
    'location', v_profile.location,
    'linkedinUrl', v_profile.linkedin_url,
    'githubUrl', v_profile.github_url,
    'websiteUrl', v_profile.website_url,
    'twitterUrl', v_profile.twitter_url,
    'contactEmail', v_profile.contact_email,
    'portfolioBio', v_profile.portfolio_bio,
    'theme', v_profile.portfolio_theme,
    'views', COALESCE(v_profile.views, 0),
    'username', v_profile.username,
    'portfolioSections', COALESCE(v_profile.portfolio_sections, '{"experience":true,"education":true,"skills":true,"projects":true,"certifications":true,"awards":true,"publications":true,"volunteering":true}'::jsonb),
    'metaTitle', v_profile.portfolio_meta_title,
    'metaDescription', v_profile.portfolio_meta_description,
    'portfolioStyle', COALESCE(v_profile.portfolio_style, 'minimal'),
    'portfolioLayout', COALESCE(v_profile.portfolio_layout, 'single'),
    'portfolioAccentColor', v_profile.portfolio_accent_color,
    'portfolioFont', COALESCE(v_profile.portfolio_font, 'inter'),
    'openToWork', COALESCE(v_profile.open_to_work, false),
    'availabilityHeadline', v_profile.availability_headline,
    'lastActiveAt', v_profile.last_active_at,
    'portfolioExtras', v_extras,
    'portfolioSyncMode', v_profile.portfolio_sync_mode,
    'githubProjectsCache', v_github_cache
  );

  v_empty_resume := jsonb_build_object(
    'id', null,
    'title', 'Untitled',
    'summary', null,
    'experience', '[]'::jsonb,
    'education', '[]'::jsonb,
    'skills', '[]'::jsonb,
    'projects', '[]'::jsonb,
    'certifications', '[]'::jsonb,
    'awards', '[]'::jsonb,
    'publications', '[]'::jsonb,
    'volunteering', '[]'::jsonb,
    'hobbies', '[]'::jsonb,
    'templateId', null
  );

  IF v_profile.portfolio_sync_mode = 'locked' AND v_extras ? 'portfolioSnapshot' AND v_extras->>'portfolioSnapshot' IS NOT NULL THEN
    v_snapshot := v_extras->'portfolioSnapshot';
    IF v_job_title IS NULL AND v_snapshot->'experience' IS NOT NULL AND jsonb_array_length(v_snapshot->'experience') > 0 THEN
      v_profile_json := jsonb_set(v_profile_json, '{jobTitle}', to_jsonb(v_snapshot->'experience'->0->>'position'));
    END IF;
    RETURN jsonb_build_object('profile', v_profile_json, 'resume', v_snapshot);
  END IF;

  IF v_profile.portfolio_resume_id IS NOT NULL THEN
    SELECT * INTO v_resume
    FROM public.resumes
    WHERE id = v_profile.portfolio_resume_id
      AND user_id = v_profile.user_id
      AND (
        jsonb_array_length(COALESCE(skills, '[]'::jsonb)) > 0
        OR jsonb_array_length(COALESCE(experience, '[]'::jsonb)) > 0
        OR jsonb_array_length(COALESCE(education, '[]'::jsonb)) > 0
      );
  END IF;

  IF NOT FOUND OR v_resume IS NULL THEN
    SELECT * INTO v_resume
    FROM public.resumes
    WHERE user_id = v_profile.user_id
      AND is_primary = true
    LIMIT 1;
  END IF;

  IF NOT FOUND OR v_resume IS NULL THEN
    SELECT * INTO v_resume
    FROM public.resumes
    WHERE user_id = v_profile.user_id
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF NOT FOUND OR v_resume IS NULL THEN
    RETURN jsonb_build_object('profile', v_profile_json, 'resume', v_empty_resume);
  END IF;

  IF v_job_title IS NULL AND v_resume.experience IS NOT NULL AND jsonb_array_length(v_resume.experience) > 0 THEN
    v_profile_json := jsonb_set(v_profile_json, '{jobTitle}', to_jsonb(v_resume.experience->0->>'position'));
  END IF;

  RETURN jsonb_build_object(
    'profile', v_profile_json,
    'resume', jsonb_build_object(
      'id', v_resume.id,
      'title', v_resume.title,
      'summary', v_resume.summary,
      'experience', v_resume.experience,
      'education', v_resume.education,
      'skills', v_resume.skills,
      'projects', v_resume.projects,
      'certifications', v_resume.certifications,
      'awards', v_resume.awards,
      'publications', v_resume.publications,
      'volunteering', v_resume.volunteering,
      'hobbies', v_resume.hobbies,
      'templateId', v_resume.template_id
    )
  );
END;
$function$;
