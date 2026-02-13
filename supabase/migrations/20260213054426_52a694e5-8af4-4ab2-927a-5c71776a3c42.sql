
-- ============================================================
-- 1. NEW TABLE: jobs
-- ============================================================
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  company text NOT NULL,
  company_logo text,
  description text NOT NULL DEFAULT '',
  requirements text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  salary_range text,
  job_type text NOT NULL DEFAULT 'full-time',
  posted_date timestamptz NOT NULL DEFAULT now(),
  source_url text,
  is_saved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON public.jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own jobs" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jobs" ON public.jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own jobs" ON public.jobs FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. NEW TABLE: notifications
-- ============================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 3. NEW TABLE: resume_shares
-- ============================================================
CREATE TABLE public.resume_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  token text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  password text,
  expires_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resume_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage own shares" ON public.resume_shares
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view active shares" ON public.resume_shares
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Security definer function to increment view count without auth
CREATE OR REPLACE FUNCTION public.increment_share_view_count(share_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.resume_shares
  SET view_count = view_count + 1
  WHERE token = share_token AND is_active = true;
END;
$$;

-- ============================================================
-- 4. ALTER cover_letters: add title + updated_at
-- ============================================================
ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TRIGGER update_cover_letters_updated_at
  BEFORE UPDATE ON public.cover_letters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. ALTER job_applications: add job_id FK
-- ============================================================
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL;
