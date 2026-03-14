-- US4: Enforce Strict Typings
-- Created: 2026-03-14

-- 1. Profiles transformations
-- Industry
ALTER TABLE public.profiles 
ALTER COLUMN industry TYPE public.industry_enum 
USING (
    CASE 
        WHEN industry ILIKE '%tech%' THEN 'Technology'::public.industry_enum
        WHEN industry ILIKE '%health%' THEN 'Healthcare'::public.industry_enum
        WHEN industry ILIKE '%finance%' THEN 'Finance'::public.industry_enum
        WHEN industry ILIKE '%edu%' THEN 'Education'::public.industry_enum
        WHEN industry IS NOT NULL THEN 'Other'::public.industry_enum
        ELSE NULL
    END
);

-- Career Level
ALTER TABLE public.profiles 
ALTER COLUMN career_level TYPE public.career_level_enum 
USING (
    CASE 
        WHEN career_level ILIKE '%entry%' THEN 'Entry'::public.career_level_enum
        WHEN career_level ILIKE '%mid%' THEN 'Mid'::public.career_level_enum
        WHEN career_level ILIKE '%senior%' THEN 'Senior'::public.career_level_enum
        WHEN career_level ILIKE '%lead%' THEN 'Lead'::public.career_level_enum
        WHEN career_level ILIKE '%exec%' THEN 'Executive'::public.career_level_enum
        WHEN career_level IS NOT NULL THEN 'Mid'::public.career_level_enum
        ELSE NULL
    END
);

-- 2. Portfolio Settings transformations
ALTER TABLE public.portfolio_settings 
ALTER COLUMN theme TYPE public.theme_enum 
USING (COALESCE(theme::text, 'minimal')::public.theme_enum);

-- 3. URL CHECK Constraints
ALTER TABLE public.social_links 
ADD CONSTRAINT social_url_check CHECK (url ~* '^https?://[a-z0-9-]+(\.[a-z0-9-]+)+.*$');

ALTER TABLE public.profiles 
ADD CONSTRAINT avatar_url_check CHECK (avatar_url IS NULL OR avatar_url ~* '^https?://.*$');

COMMENT ON COLUMN public.profiles.industry IS 'Constrained industry category.';
COMMENT ON COLUMN public.profiles.career_level IS 'Constrained career level.';
COMMENT ON COLUMN public.portfolio_settings.theme IS 'Strictly typed portfolio theme.';
