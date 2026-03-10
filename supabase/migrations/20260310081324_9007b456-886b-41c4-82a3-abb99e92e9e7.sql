CREATE TABLE public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage events" ON public.usage_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "No client inserts" ON public.usage_events
  FOR INSERT WITH CHECK (false);