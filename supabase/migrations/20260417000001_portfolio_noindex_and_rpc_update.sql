-- ============================================================
-- Portfolio SEO & PII: Add seo_noindex, show_contact_email + update public RPC
-- ============================================================
-- seo_noindex: opt-in search engine exclusion for privacy-conscious users.
-- show_contact_email: explicit opt-in before contactEmail is returned from
--   the public portfolio RPC. Defaults to false (PII hidden by default).
-- ============================================================

-- 1. Add seo_noindex column to portfolio_settings
ALTER TABLE public.portfolio_settings
  ADD COLUMN IF NOT EXISTS seo_noindex BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.portfolio_settings.seo_noindex IS
  'When true, the public portfolio page renders <meta name="robots" content="noindex, nofollow">. '
  'Allows privacy-conscious users to hide their portfolio from search engines without disabling it.';

-- 2. Add show_contact_email column (PII gating)
ALTER TABLE public.portfolio_settings
  ADD COLUMN IF NOT EXISTS show_contact_email BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.portfolio_settings.show_contact_email IS
  'When false (default), contactEmail is omitted from the get_public_portfolio RPC response. '
  'Users must explicitly opt in before their email is visible on their public portfolio.';

-- 3. Rebuild get_public_portfolio to include seo_noindex + gated contactEmail
-- The profile query now also reads from portfolio_settings for seo_noindex
-- and show_contact_email.
CREATE OR REPLACE FUNCTION public.get_public_portfolio(p_username text)
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
  v_seo_noindex boolean;
  v_show_contact_email boolean;
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

  SELECT p.id, p.user_id, p.full_name, p.avatar_url, p.job_title, p.industry, p.career_level, p.location,
         p.linkedin_url, p.portfolio_bio, p.username, p.portfolio_resume_id,
         p.github_url, p.website_url, p.twitter_url, p.contact_email, p.portfolio_theme, p.views,
         p.portfolio_sections, p.portfolio_meta_title, p.portfolio_meta_description,
         p.portfolio_layout, p.portfolio_accent_color, p.portfolio_font, p.portfolio_style,
         p.open_to_work, p.availability_headline, p.last_active_at,
         COALESCE(p.portfolio_extras, '{}'::jsonb) as portfolio_extras,
         COALESCE(p.portfolio_sync_mode, 'auto') as portfolio_sync_mode,
         COALESCE(p.github_projects_cache, '[]'::jsonb) as github_projects_cache,
         COALESCE(ps.seo_noindex, false) as seo_noindex,
         COALESCE(ps.show_contact_email, false) as show_contact_email
  INTO v_profile
  FROM public.profiles p
  LEFT JOIN public.portfolio_settings ps ON ps.user_id = p.user_id
  WHERE p.username = lower(p_username)
    AND p.portfolio_enabled = true
    AND p.is_deleted = false;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_extras := v_profile.portfolio_extras;
  v_github_cache := v_profile.github_projects_cache;
  v_seo_noindex := v_profile.seo_noindex;
  v_show_contact_email := v_profile.show_contact_email;

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
    'contactEmail', CASE WHEN v_show_contact_email THEN v_profile.contact_email ELSE NULL END,
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
    'githubProjectsCache', v_github_cache,
    'seoNoindex', v_seo_noindex
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
      'experience', COALESCE(v_resume.experience, '[]'::jsonb),
      'education', COALESCE(v_resume.education, '[]'::jsonb),
      'skills', COALESCE(v_resume.skills, '[]'::jsonb),
      'projects', COALESCE(v_resume.projects, '[]'::jsonb),
      'certifications', COALESCE(v_resume.certifications, '[]'::jsonb),
      'awards', COALESCE(v_resume.awards, '[]'::jsonb),
      'publications', COALESCE(v_resume.publications, '[]'::jsonb),
      'volunteering', COALESCE(v_resume.volunteering, '[]'::jsonb),
      'hobbies', COALESCE(v_resume.hobbies, '[]'::jsonb),
      'templateId', v_resume.template_id
    )
  );
END;
$function$;
