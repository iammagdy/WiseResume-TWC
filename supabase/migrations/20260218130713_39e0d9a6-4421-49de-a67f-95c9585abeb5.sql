
-- Add portfolio_extras JSONB column to store case studies, services, and locked snapshots
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS portfolio_extras jsonb DEFAULT '{}'::jsonb;

-- Add portfolio_sync_mode text column: 'auto' (default) or 'locked'
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS portfolio_sync_mode text DEFAULT 'auto'::text;

-- Update get_public_portfolio RPC to include new fields
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
BEGIN
  SELECT id, user_id, full_name, avatar_url, job_title, industry, career_level, location,
         linkedin_url, portfolio_bio, username, portfolio_resume_id,
         github_url, website_url, twitter_url, contact_email, portfolio_theme, views,
         portfolio_sections, portfolio_meta_title, portfolio_meta_description,
         portfolio_layout, portfolio_accent_color, portfolio_font, portfolio_style,
         open_to_work, availability_headline,
         COALESCE(portfolio_extras, '{}'::jsonb) as portfolio_extras,
         COALESCE(portfolio_sync_mode, 'auto') as portfolio_sync_mode
  INTO v_profile
  FROM public.profiles
  WHERE username = lower(p_username)
    AND portfolio_enabled = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_extras := v_profile.portfolio_extras;

  -- If sync mode is 'locked' and a snapshot exists, use the snapshot resume data
  IF v_profile.portfolio_sync_mode = 'locked' AND v_extras ? 'portfolioSnapshot' AND v_extras->>'portfolioSnapshot' IS NOT NULL THEN
    v_snapshot := v_extras->'portfolioSnapshot';
    v_job_title := v_profile.job_title;
    IF v_job_title IS NULL AND v_snapshot->'experience' IS NOT NULL AND jsonb_array_length(v_snapshot->'experience') > 0 THEN
      v_job_title := v_snapshot->'experience'->0->>'position';
    END IF;
    RETURN jsonb_build_object(
      'profile', jsonb_build_object(
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
        'portfolioExtras', v_extras,
        'portfolioSyncMode', v_profile.portfolio_sync_mode
      ),
      'resume', v_snapshot
    );
  END IF;

  -- Auto mode: resolve live resume
  IF v_profile.portfolio_resume_id IS NOT NULL THEN
    SELECT * INTO v_resume
    FROM public.resumes
    WHERE id = v_profile.portfolio_resume_id
      AND user_id = v_profile.user_id;
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
    RETURN NULL;
  END IF;

  v_job_title := v_profile.job_title;
  IF v_job_title IS NULL AND v_resume.experience IS NOT NULL AND jsonb_array_length(v_resume.experience) > 0 THEN
    v_job_title := v_resume.experience->0->>'position';
  END IF;

  RETURN jsonb_build_object(
    'profile', jsonb_build_object(
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
      'portfolioExtras', v_extras,
      'portfolioSyncMode', v_profile.portfolio_sync_mode
    ),
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
