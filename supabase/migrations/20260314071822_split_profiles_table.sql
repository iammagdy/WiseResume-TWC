-- US1: Split Monolithic profiles table
-- Created: 2026-03-14

-- 1. Create portfolio_settings table
CREATE TABLE public.portfolio_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL UNIQUE,
    theme public.theme_enum DEFAULT 'minimal',
    accent_color TEXT DEFAULT '#3b82f6',
    font TEXT DEFAULT 'Inter',
    style TEXT DEFAULT 'modern',
    layout TEXT DEFAULT 'single',
    sections JSONB DEFAULT '{"experience":true,"education":true,"skills":true,"projects":true,"certifications":true,"awards":true,"publications":true,"volunteering":true}'::jsonb,
    enabled BOOLEAN DEFAULT true,
    resume_id UUID,
    sync_mode TEXT DEFAULT 'auto',
    meta_title TEXT,
    meta_description TEXT,
    extras JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create social_links table (Key-Value)
CREATE TABLE public.social_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    platform_key TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, platform_key)
);

-- 3. Create user_gamification table
CREATE TABLE public.user_gamification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL UNIQUE,
    views INTEGER DEFAULT 0,
    last_active_at TIMESTAMPTZ,
    login_streak INTEGER DEFAULT 0,
    last_login_date DATE,
    hired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS and set policies
ALTER TABLE public.portfolio_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own portfolio settings" ON public.portfolio_settings 
    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own social links" ON public.social_links 
    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own gamification data" ON public.user_gamification 
    FOR ALL USING (auth.uid() = user_id);

-- 5. Data Migration Logic
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM public.profiles LOOP
        -- Migrate Portfolio Settings
        INSERT INTO public.portfolio_settings (
            user_id, theme, accent_color, font, style, layout, sections, 
            enabled, resume_id, sync_mode, meta_title, meta_description, extras
        ) VALUES (
            r.user_id, 
            COALESCE(r.portfolio_theme::public.theme_enum, 'minimal'), 
            r.portfolio_accent_color, r.portfolio_font, r.portfolio_style, 
            r.portfolio_layout, r.portfolio_sections, r.portfolio_enabled, 
            r.portfolio_resume_id, r.portfolio_sync_mode, 
            r.portfolio_meta_title, r.portfolio_meta_description, r.portfolio_extras
        ) ON CONFLICT (user_id) DO NOTHING;

        -- Migrate Social Links (Transforming fixed columns to KV)
        IF r.linkedin_url IS NOT NULL THEN
            INSERT INTO public.social_links (user_id, platform_key, url) VALUES (r.user_id, 'linkedin', r.linkedin_url);
        END IF;
        IF r.github_url IS NOT NULL THEN
            INSERT INTO public.social_links (user_id, platform_key, url) VALUES (r.user_id, 'github', r.github_url);
        END IF;
        IF r.twitter_url IS NOT NULL THEN
            INSERT INTO public.social_links (user_id, platform_key, url) VALUES (r.user_id, 'twitter', r.twitter_url);
        END IF;
        IF r.website_url IS NOT NULL THEN
            INSERT INTO public.social_links (user_id, platform_key, url) VALUES (r.user_id, 'website', r.website_url);
        END IF;

        -- Migrate Gamification
        INSERT INTO public.user_gamification (
            user_id, views, last_active_at, login_streak, last_login_date, hired_at
        ) VALUES (
            r.user_id, r.views, r.last_active_at, r.login_streak, r.last_login_date, r.hired_at
        ) ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
END $$;

-- 6. Update New User Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.portfolio_settings (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.user_gamification (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Drop Redundant Columns (Delayed to ensure verification, but scripted here)
-- ALTER TABLE public.profiles 
-- DROP COLUMN IF EXISTS portfolio_theme,
-- DROP COLUMN IF EXISTS portfolio_accent_color,
-- DROP COLUMN IF EXISTS portfolio_font,
-- DROP COLUMN IF EXISTS portfolio_style,
-- DROP COLUMN IF EXISTS portfolio_layout,
-- DROP COLUMN IF EXISTS portfolio_sections,
-- DROP COLUMN IF EXISTS portfolio_enabled,
-- DROP COLUMN IF EXISTS portfolio_resume_id,
-- DROP COLUMN IF EXISTS portfolio_sync_mode,
-- DROP COLUMN IF EXISTS portfolio_meta_title,
-- DROP COLUMN IF EXISTS portfolio_meta_description,
-- DROP COLUMN IF EXISTS portfolio_extras,
-- DROP COLUMN IF EXISTS linkedin_url,
-- DROP COLUMN IF EXISTS github_url,
-- DROP COLUMN IF EXISTS twitter_url,
-- DROP COLUMN IF EXISTS website_url,
-- DROP COLUMN IF EXISTS views,
-- DROP COLUMN IF EXISTS last_active_at,
-- DROP COLUMN IF EXISTS login_streak,
-- DROP COLUMN IF EXISTS last_login_date,
-- DROP COLUMN IF EXISTS hired_at;

COMMENT ON TABLE public.portfolio_settings IS 'Splitted portfolio configurations.';
COMMENT ON TABLE public.social_links IS 'KV store for social platforms.';
COMMENT ON TABLE public.user_gamification IS 'User engagement and gamification metrics.';
