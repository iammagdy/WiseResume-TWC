
-- Add target_url column for universal short links
ALTER TABLE public.short_links 
  ADD COLUMN target_url TEXT;

-- Make portfolio_username nullable (links can be for any URL now)
ALTER TABLE public.short_links 
  ALTER COLUMN portfolio_username DROP NOT NULL;

-- Backfill existing portfolio links with their target path
UPDATE public.short_links 
  SET target_url = '/p/' || portfolio_username 
  WHERE target_url IS NULL AND portfolio_username IS NOT NULL;

-- Update resolve_short_link to return target_url and increment click_count
CREATE OR REPLACE FUNCTION public.resolve_short_link(p_link_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_link record;
BEGIN
  SELECT id, portfolio_username, label, target_url INTO v_link
  FROM public.short_links
  WHERE id = p_link_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Increment click count
  UPDATE public.short_links SET click_count = click_count + 1 WHERE id = p_link_id;

  RETURN jsonb_build_object(
    'username', v_link.portfolio_username,
    'label',    v_link.label,
    'target_url', v_link.target_url
  );
END;
$function$;
