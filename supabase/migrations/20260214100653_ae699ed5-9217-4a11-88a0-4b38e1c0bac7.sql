-- Remove the overly permissive public SELECT policy that exposes contact_info
DROP POLICY IF EXISTS "Public resumes are viewable by anyone" ON public.resumes;