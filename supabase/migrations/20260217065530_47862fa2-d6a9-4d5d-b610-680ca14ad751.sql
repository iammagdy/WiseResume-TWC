
CREATE TABLE public.feature_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  feature_title text NOT NULL,
  feature_description text NOT NULL,
  route text,
  user_agent text,
  app_version text,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feature requests"
ON public.feature_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);
