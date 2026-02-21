
CREATE OR REPLACE FUNCTION public.cleanup_stale_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.ai_usage_logs WHERE created_at < now() - interval '90 days';
  DELETE FROM public.notifications WHERE is_read = true AND created_at < now() - interval '30 days';
  DELETE FROM public.resume_versions
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY resume_id ORDER BY version_number DESC) as rn
      FROM public.resume_versions
    ) ranked WHERE rn > 50
  );
  DELETE FROM public.audit_logs WHERE created_at < now() - interval '90 days';
  DELETE FROM public.resume_shares WHERE is_active = false AND created_at < now() - interval '30 days';
END;
$function$;
