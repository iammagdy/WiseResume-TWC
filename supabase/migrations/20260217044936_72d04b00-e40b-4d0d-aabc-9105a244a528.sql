
CREATE OR REPLACE FUNCTION public.increment_portfolio_views(p_username text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET views = COALESCE(views, 0) + 1
  WHERE username = lower(p_username)
    AND portfolio_enabled = true;
END;
$function$;
