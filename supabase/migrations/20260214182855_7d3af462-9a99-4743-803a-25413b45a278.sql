
-- Create share_comments table for feedback on shared resumes
CREATE TABLE public.share_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES public.resume_shares(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  section text,
  content text NOT NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.share_comments ENABLE ROW LEVEL SECURITY;

-- Public can insert comments on active shares (no auth required)
CREATE POLICY "Anyone can add comments on active shares"
ON public.share_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.resume_shares rs
    WHERE rs.id = share_id
      AND rs.is_active = true
      AND (rs.expires_at IS NULL OR rs.expires_at > now())
  )
);

-- Owner can read comments on their shares
CREATE POLICY "Share owners can view comments"
ON public.share_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.resume_shares rs
    WHERE rs.id = share_id AND rs.user_id = auth.uid()
  )
);

-- Public can also read comments on active shares (for display on share page)
CREATE POLICY "Public can view comments on active shares"
ON public.share_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.resume_shares rs
    WHERE rs.id = share_id
      AND rs.is_active = true
      AND (rs.expires_at IS NULL OR rs.expires_at > now())
  )
);

-- Owner can update (resolve) comments on their shares
CREATE POLICY "Share owners can update comments"
ON public.share_comments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.resume_shares rs
    WHERE rs.id = share_id AND rs.user_id = auth.uid()
  )
);

-- Owner can delete comments on their shares
CREATE POLICY "Share owners can delete comments"
ON public.share_comments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.resume_shares rs
    WHERE rs.id = share_id AND rs.user_id = auth.uid()
  )
);

-- RPC to add comment with validation and rate limiting
CREATE OR REPLACE FUNCTION public.add_share_comment(
  p_share_token text,
  p_author_name text,
  p_content text,
  p_section text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_share record;
  v_comment_count integer;
  v_new_comment record;
BEGIN
  -- Validate inputs
  IF length(p_author_name) < 1 OR length(p_author_name) > 100 THEN
    RAISE EXCEPTION 'Author name must be 1-100 characters';
  END IF;
  IF length(p_content) < 1 OR length(p_content) > 1000 THEN
    RAISE EXCEPTION 'Comment must be 1-1000 characters';
  END IF;

  -- Find active share
  SELECT * INTO v_share
  FROM public.resume_shares
  WHERE token = p_share_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Share not found or expired';
  END IF;

  -- Rate limit: max 10 comments per share per hour
  SELECT count(*) INTO v_comment_count
  FROM public.share_comments
  WHERE share_id = v_share.id
    AND created_at > now() - interval '1 hour';

  IF v_comment_count >= 10 THEN
    RAISE EXCEPTION 'Too many comments. Please try again later.';
  END IF;

  -- Insert comment
  INSERT INTO public.share_comments (share_id, author_name, section, content)
  VALUES (v_share.id, p_author_name, p_section, p_content)
  RETURNING * INTO v_new_comment;

  RETURN jsonb_build_object(
    'id', v_new_comment.id,
    'author_name', v_new_comment.author_name,
    'section', v_new_comment.section,
    'content', v_new_comment.content,
    'created_at', v_new_comment.created_at
  );
END;
$$;

-- RPC to get comments for a share by token (public)
CREATE OR REPLACE FUNCTION public.get_share_comments(p_share_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_share record;
  v_comments jsonb;
BEGIN
  SELECT * INTO v_share
  FROM public.resume_shares
  WHERE token = p_share_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', sc.id,
      'author_name', sc.author_name,
      'section', sc.section,
      'content', sc.content,
      'is_resolved', sc.is_resolved,
      'created_at', sc.created_at
    ) ORDER BY sc.created_at DESC
  ), '[]'::jsonb) INTO v_comments
  FROM public.share_comments sc
  WHERE sc.share_id = v_share.id;

  RETURN v_comments;
END;
$$;
