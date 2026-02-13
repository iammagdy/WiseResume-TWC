
-- 1. Security definer function to fetch shared resume (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_shared_resume(share_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_share record;
  v_resume record;
  v_result jsonb;
BEGIN
  -- Find the share
  SELECT * INTO v_share
  FROM public.resume_shares
  WHERE token = share_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Fetch the resume (bypasses RLS via security definer)
  SELECT * INTO v_resume
  FROM public.resumes
  WHERE id = v_share.resume_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Return combined result
  RETURN jsonb_build_object(
    'share', jsonb_build_object(
      'resume_id', v_share.resume_id,
      'is_active', v_share.is_active,
      'expires_at', v_share.expires_at,
      'password', v_share.password,
      'view_count', v_share.view_count
    ),
    'resume', row_to_json(v_resume)::jsonb
  );
END;
$$;

-- 2. Notification trigger for job application changes
CREATE OR REPLACE FUNCTION public.notify_application_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      'application',
      'Application Created',
      'You applied to ' || NEW.job_title || ' at ' || NEW.company,
      '/application/' || NEW.id
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      'application',
      'Status Updated: ' || initcap(NEW.status),
      NEW.job_title || ' at ' || NEW.company || ' moved to ' || initcap(NEW.status),
      '/application/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_application_change
  AFTER INSERT OR UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_change();

-- 3. Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
