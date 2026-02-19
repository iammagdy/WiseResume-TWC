
-- Drop the overly permissive public SELECT policy on profiles
DROP POLICY IF EXISTS "Public can view last_active_at for enabled portfolios" ON public.profiles;

-- Create a secure RPC to return only last_active_at for public portfolios
CREATE OR REPLACE FUNCTION public.get_portfolio_active_status(p_username text)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last_active timestamptz;
BEGIN
  SELECT last_active_at INTO v_last_active
  FROM public.profiles
  WHERE username = lower(p_username)
    AND portfolio_enabled = true;
  RETURN v_last_active;
END;
$$;
