-- Harden existing functions to be idempotent
-- This is necessary because some migrations were partially applied or functions were not idempotent

-- Harden handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.portfolio_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_gamification (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Harden record_portfolio_visit
CREATE OR REPLACE FUNCTION public.record_portfolio_visit(
  p_username text,
  p_country text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_short_link_id text DEFAULT NULL,
  p_sections_viewed jsonb DEFAULT '[]'::jsonb,
  p_time_spent_seconds integer DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = lower(p_username) AND portfolio_enabled = true
  ) THEN
    RETURN;
  END IF;
  INSERT INTO public.portfolio_visits (username, country, city, referrer, short_link_id, sections_viewed, time_spent_seconds)
  VALUES (lower(p_username), p_country, p_city, p_referrer, p_short_link_id, p_sections_viewed, p_time_spent_seconds)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Harden initialize_subscription
CREATE OR REPLACE FUNCTION public.initialize_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subscriptions (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
