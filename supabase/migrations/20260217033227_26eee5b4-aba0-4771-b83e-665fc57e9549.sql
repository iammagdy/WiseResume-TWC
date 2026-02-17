
-- Add portfolio_resume_id column to profiles
ALTER TABLE public.profiles ADD COLUMN portfolio_resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL;

-- Update get_public_portfolio RPC to use portfolio_resume_id
CREATE OR REPLACE FUNCTION public.get_public_portfolio(p_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile record;
  v_resume record;
BEGIN
  SELECT id, user_id, full_name, avatar_url, job_title, industry, career_level, location, linkedin_url, portfolio_bio, username, portfolio_resume_id
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
$function$;
