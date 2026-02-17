
CREATE OR REPLACE FUNCTION public.check_username_available(p_username text, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = lower(p_username)
      AND user_id != p_user_id
  );
END;
$$;
