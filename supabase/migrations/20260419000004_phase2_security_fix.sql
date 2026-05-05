-- Phase 2 security fix: restrict interview_report_tokens public access to token-scoped RPC
-- Drop the table-wide anonymous read policy that exposed all non-expired report rows
DROP POLICY IF EXISTS "Anyone can read non-expired report tokens" ON public.interview_report_tokens;

-- Create a SECURITY DEFINER RPC so the public page can fetch exactly one report by token.
-- The function checks expiry and returns NULL if the token is missing or expired, so callers
-- can never enumerate other users' report data through this path.
CREATE OR REPLACE FUNCTION public.get_interview_report(p_token text)
RETURNS SETOF public.interview_report_tokens
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT *
  FROM public.interview_report_tokens
  WHERE token = p_token
    AND expires_at > now()
  LIMIT 1;
$$;

-- Ensure only authenticated owners can still manage their tokens via the table directly.
-- (The existing "Users can manage own report tokens" ALL policy already covers this.)
-- Grant execute on the function to anon/authenticated so the public report page can call it.
GRANT EXECUTE ON FUNCTION public.get_interview_report(text) TO anon, authenticated;
