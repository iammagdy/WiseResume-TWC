-- Phase 2 Foundational Fixes

-- 1. NOT NULL constraints for messages (T001)
-- Handle existing rows with nulls by setting defaults first if needed before applying constraint
UPDATE public.messages SET full_name = 'Unknown' WHERE full_name IS NULL;
UPDATE public.messages SET subject = 'No Subject' WHERE subject IS NULL;
UPDATE public.messages SET status = 'unread' WHERE status IS NULL;

ALTER TABLE public.messages
  ALTER COLUMN full_name SET NOT NULL,
  ALTER COLUMN subject SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

-- 2. Indexes for rate limiting, reporting, and profiles (T002)
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_composite ON public.ai_usage_logs (user_id, action_type, created_at);
CREATE INDEX IF NOT EXISTS idx_portfolio_visits_username ON public.portfolio_visits (username);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);

-- 3. Secure messages RLS policies (T003)
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;

CREATE POLICY "Admins can manage all messages" ON public.messages 
    FOR ALL USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR 
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );


-- US1: Filter is_deleted=false
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
BEGIN
  -- Rate limiting check: 60 requests per minute per IP
  -- We wrap only the header-read in a nested block; insert/count errors surface normally
  BEGIN
    v_ip := current_setting('request.headers', true)::json->>'x-forwarded-for';
  EXCEPTION WHEN OTHERS THEN
    -- Headers not available (e.g. called internally via service-role) — skip rate limiting
    v_ip := NULL;
  END;

  IF v_ip IS NOT NULL THEN
    -- Get just the first IP in case of X-Forwarded-For chain
    v_ip := split_part(v_ip, ',', 1);
    
    SELECT count(*) INTO v_request_count
    FROM public.rpc_rate_limits
    WHERE ip_address = v_ip 
      AND endpoint = 'get_public_portfolio' 
      AND created_at > now() - interval '1 minute';
      
    IF v_request_count >= 60 THEN
      RAISE EXCEPTION 'Rate limit exceeded for get_public_portfolio';
    END IF;
    
    -- Log request
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
    AND portfolio_enabled = true
    AND is_deleted = false;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_extras := v_profile.portfolio_extras;
  v_github_cache := v_profile.github_projects_cache;

  -- Build reusable profile JSON
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

  -- Empty resume fallback
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

  -- If sync mode is 'locked' and a snapshot exists, use the snapshot resume data
  IF v_profile.portfolio_sync_mode = 'locked' AND v_extras ? 'portfolioSnapshot' AND v_extras->>'portfolioSnapshot' IS NOT NULL THEN
    v_snapshot := v_extras->'portfolioSnapshot';
    IF v_job_title IS NULL AND v_snapshot->'experience' IS NOT NULL AND jsonb_array_length(v_snapshot->'experience') > 0 THEN
      v_profile_json := jsonb_set(v_profile_json, '{jobTitle}', to_jsonb(v_snapshot->'experience'->0->>'position'));
    END IF;
    RETURN jsonb_build_object('profile', v_profile_json, 'resume', v_snapshot);
  END IF;

  -- Auto mode: resolve live resume
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

  -- No resume found — return profile with empty resume instead of NULL
  IF NOT FOUND OR v_resume IS NULL THEN
    RETURN jsonb_build_object('profile', v_profile_json, 'resume', v_empty_resume);
  END IF;

  -- Update job title from resume if needed
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


-- US1: Atomic click increment RPC
CREATE OR REPLACE FUNCTION public.increment_short_link_clicks(p_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.short_links
  SET click_count = click_count + 1
  WHERE id = p_id;
END;
$$;
