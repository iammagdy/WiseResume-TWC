
CREATE TABLE public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  error_message text NOT NULL,
  error_stack text,
  component_stack text,
  route text,
  session_id text,
  user_agent text,
  additional_context text,
  app_version text DEFAULT '1.0.0',
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own bug reports"
  ON public.bug_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bug reports"
  ON public.bug_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_bug_reports_user_id ON public.bug_reports (user_id);
CREATE INDEX idx_bug_reports_status ON public.bug_reports (status, created_at DESC);
