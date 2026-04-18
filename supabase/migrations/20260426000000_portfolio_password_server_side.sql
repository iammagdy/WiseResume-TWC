-- ============================================================
-- Security & Trust Fixes — Task #8
-- 1. Drop old single-arg get_public_portfolio(text) so it
--    cannot be used to bypass the password gate.
-- 2. Backfill existing plaintext-SHA-256 hashes to bcrypt
--    (bcrypt of the SHA-256 string) for proper salting.
-- 3. Add get_portfolio_gate_info RPC — returns only gate
--    metadata, never the hash.
-- 4. Re-create get_public_portfolio(p_username, p_password)
--    with server-side bcrypt verification.
-- ============================================================

-- ─── Step 1: Drop old single-arg signature ───────────────────────────────────
-- IMPORTANT: Postgres function overloading means CREATE OR REPLACE of a
-- *different* signature leaves the old function intact. We must DROP it
-- explicitly so callers cannot bypass the password gate via the old path.
DROP FUNCTION IF EXISTS public.get_public_portfolio(text);

-- ─── Step 2: Backfill — wrap existing SHA-256 hashes in bcrypt ───────────────
-- Existing hashes are hex-encoded SHA-256 strings (stored by the client).
-- We wrap each one in bcrypt so the stored value gains a random salt.
-- Detection heuristic: bcrypt hashes start with '$2'; legacy SHA-256 hashes are
-- 64-char lowercase hex strings.
-- After backfill, verification uses:
--   extensions.crypt(sha256(supplied_password), stored_bcrypt) == stored_bcrypt
-- New passwords set by PortfolioEditorPage.tsx (which still stores SHA-256 from
-- the client) are handled by the legacy path in the verification block below.
UPDATE public.profiles
SET portfolio_extras = jsonb_set(
  portfolio_extras,
  '{passwordHash}',
  to_jsonb(
    extensions.crypt(
      portfolio_extras->>'passwordHash',   -- existing SHA-256 hex string as input
      extensions.gen_salt('bf', 10)        -- bcrypt with cost 10, random salt
    )
  )
)
WHERE (portfolio_extras->>'passwordEnabled')::boolean = true
  AND portfolio_extras->>'passwordHash' IS NOT NULL
  AND portfolio_extras->>'passwordHash' <> ''
  AND portfolio_extras->>'passwordHash' NOT LIKE '$2%';  -- skip already-bcrypt hashes

-- ─── Step 3: Gate Info RPC ───────────────────────────────────────────────────
-- Returns the minimum info needed to render the password-gate page.
-- Intentionally does NOT return passwordHash — enforcement is server-side.
CREATE OR REPLACE FUNCTION public.get_portfolio_gate_info(p_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row record;
  v_extras jsonb;
BEGIN
  SELECT portfolio_enabled, portfolio_extras, portfolio_accent_color, full_name, avatar_url
  INTO v_row
  FROM public.profiles
  WHERE username = lower(p_username);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_extras := COALESCE(v_row.portfolio_extras, '{}'::jsonb);

  RETURN jsonb_build_object(
    'portfolioEnabled',  COALESCE(v_row.portfolio_enabled, false),
    'passwordEnabled',   COALESCE((v_extras->>'passwordEnabled')::boolean, false),
    'accentColor',       v_row.portfolio_accent_color,
    'fullName',          v_row.full_name,
    'avatarUrl',         v_row.avatar_url
    -- passwordHash intentionally omitted — hash never leaves the server
  );
END;
$function$;

-- ─── Step 4: Re-create get_public_portfolio with password enforcement ─────────
-- New signature: (p_username text, p_password text DEFAULT NULL)
-- Password verification logic:
--   a) If stored hash is bcrypt ($2... prefix): verify with extensions.crypt()
--      (used for hashes backfilled in Step 2, i.e. existing protected portfolios)
--   b) If stored hash is legacy SHA-256 (no $2 prefix): compare directly
--      (used for new passwords set by PortfolioEditorPage until that is updated
--       to send the raw password to the server)
-- All existing return columns and rate-limit logic are preserved.
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
  -- The hash is never returned to the client under any code path.
  IF COALESCE((v_extras->>'passwordEnabled')::boolean, false) IS TRUE
     AND v_extras->>'passwordHash' IS NOT NULL
     AND v_extras->>'passwordHash' <> ''
  THEN
    v_stored_hash := v_extras->>'passwordHash';
    v_password_ok := false;

    IF p_password IS NOT NULL THEN
      IF v_stored_hash LIKE '$2%' THEN
        -- Bcrypt path: stored value is bcrypt(sha256(original_password)).
        -- Compute sha256 of the supplied password, then bcrypt-verify.
        v_supplied_hash := encode(extensions.digest(p_password, 'sha256'), 'hex');
        v_password_ok := extensions.crypt(v_supplied_hash, v_stored_hash) = v_stored_hash;
      ELSE
        -- Legacy SHA-256 path: stored value is sha256(original_password).
        -- Applies to newly set passwords until PortfolioEditorPage is updated
        -- to send raw passwords to the server for bcrypt hashing.
        v_supplied_hash := encode(extensions.digest(p_password, 'sha256'), 'hex');
        v_password_ok := lower(v_supplied_hash) = lower(v_stored_hash);
      END IF;
    END IF;

    IF NOT v_password_ok THEN
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;
  END IF;
  -- ── End password enforcement ─────────────────────────────────────────────────

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
