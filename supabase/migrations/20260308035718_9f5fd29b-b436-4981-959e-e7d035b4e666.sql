
-- Simplify get_clerk_user_id() to just return auth.uid() (Supabase Auth native)
CREATE OR REPLACE FUNCTION public.get_clerk_user_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN auth.uid();
END;
$function$;

-- Simplify safe_uid() to just return auth.uid()
CREATE OR REPLACE FUNCTION public.safe_uid()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN auth.uid();
END;
$function$;
