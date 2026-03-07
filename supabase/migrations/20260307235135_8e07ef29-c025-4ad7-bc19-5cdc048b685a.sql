CREATE OR REPLACE FUNCTION public.get_clerk_user_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (auth.jwt()->>'supabaseUuid')::uuid,
    CASE
      WHEN auth.uid()::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN auth.uid()
      ELSE NULL
    END
  );
$function$