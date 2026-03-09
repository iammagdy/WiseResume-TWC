
CREATE OR REPLACE FUNCTION public.soft_delete_resume(p_resume_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.resumes
  SET deleted_at = now()
  WHERE id = p_resume_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resume not found or already deleted';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_resumes(p_resume_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.resumes
  SET deleted_at = now()
  WHERE id = ANY(p_resume_ids)
    AND user_id = auth.uid()
    AND deleted_at IS NULL;
    
  GET DIAGNOSTICS affected = ROW_COUNT;
  
  IF affected = 0 THEN
    RAISE EXCEPTION 'No resumes found to delete';
  END IF;
  
  RETURN affected;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_resume(p_resume_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.resumes
  SET deleted_at = NULL
  WHERE id = p_resume_id
    AND user_id = auth.uid()
    AND deleted_at IS NOT NULL;
END;
$$;
