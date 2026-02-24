-- Add views column to profiles table
ALTER TABLE public.profiles ADD COLUMN views BIGINT DEFAULT 0;

-- Update get_public_portfolio RPC to include new social links, contact email, theme, and views
CREATE OR REPLACE FUNCTION public.get_public_portfolio(p_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_profile record;
  v_resume record;
  v_job_title text;
BEGIN
  SELECT id, user_id, full_name, avatar_url, job_title, industry, career_level, location, linkedin_url, github_url, website_url, twitter_url, contact_email, theme, portfolio_bio, username, portfolio_resume_id, views
  INTO v_profile
  FROM public.profiles
  WHERE username = lower(p_username)
    AND portfolio_enabled = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 1. Try user-selected portfolio resume
  IF v_profile.portfolio_resume_id IS NOT NULL THEN
    SELECT * INTO v_resume
    FROM public.resumes
    WHERE id = v_profile.portfolio_resume_id
      AND user_id = v_profile.user_id;
  END IF;

  -- 2. Fallback to primary resume
  IF NOT FOUND OR v_resume IS NULL THEN
    SELECT * INTO v_resume
    FROM public.resumes
    WHERE user_id = v_profile.user_id
      AND is_primary = true
    LIMIT 1;
  END IF;

  -- 3. Fallback to most recent resume
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

  -- Job title: use profile\'s job_title, fallback to first experience position
  v_job_title := v_profile.job_title;
  IF v_job_title IS NULL AND v_resume.experience IS NOT NULL AND jsonb_array_length(v_resume.experience) > 0 THEN
    v_job_title := v_resume.experience->0->>
'position';
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
      'theme', v_profile.theme,
      'portfolioBio', v_profile.portfolio_bio,
      'username', v_profile.username,
      'views', v_profile.views
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
      'hobbies', v_resume.hobbies
    )
  );
END;
$$;

-- Create or replace function to increment portfolio views
CREATE OR REPLACE FUNCTION public.increment_portfolio_views(p_username text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET views = views + 1
  WHERE username = lower(p_username);
END;
$$;
