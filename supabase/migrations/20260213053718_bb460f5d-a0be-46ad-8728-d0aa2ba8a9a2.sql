
ALTER TABLE public.resumes ADD COLUMN is_public boolean NOT NULL DEFAULT false;

CREATE POLICY "Public resumes are viewable by anyone"
  ON public.resumes FOR SELECT
  USING (is_public = true);
