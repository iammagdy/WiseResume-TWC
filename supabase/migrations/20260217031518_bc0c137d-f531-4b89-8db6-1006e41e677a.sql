
-- Add portfolio columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_enabled boolean DEFAULT false;

-- Create index for fast username lookup
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username) WHERE username IS NOT NULL;

-- Create the public portfolio fetcher (SECURITY DEFINER, no auth needed)
CREATE OR REPLACE FUNCTION public.get_public_portfolio(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile record;
  v_resume record;
BEGIN
  -- Find profile by username where portfolio is enabled
  SELECT id, user_id, full_name, avatar_url, job_title, industry, career_level, location, linkedin_url, portfolio_bio, username
  INTO v_profile
  FROM public.profiles
  WHERE username = lower(p_username)
    AND portfolio_enabled = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Fetch the primary resume, or the most recently updated one
  SELECT * INTO v_resume
  FROM public.resumes
  WHERE user_id = v_profile.user_id
    AND is_primary = true
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO v_resume
    FROM public.resumes
    WHERE user_id = v_profile.user_id
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Build response stripping sensitive contact info
  RETURN jsonb_build_object(
    'profile', jsonb_build_object(
      'fullName', v_profile.full_name,
      'avatarUrl', v_profile.avatar_url,
      'jobTitle', v_profile.job_title,
      'industry', v_profile.industry,
      'careerLevel', v_profile.career_level,
      'location', v_profile.location,
      'linkedinUrl', v_profile.linkedin_url,
      'portfolioBio', v_profile.portfolio_bio,
      'username', v_profile.username
    ),
    'resume', jsonb_build_object(
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
