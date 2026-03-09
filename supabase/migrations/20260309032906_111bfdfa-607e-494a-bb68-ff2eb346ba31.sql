
CREATE TABLE public.contact_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  route text,
  user_agent text,
  app_version text DEFAULT '1.0.0',
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own contact inquiries"
  ON public.contact_inquiries FOR INSERT TO authenticated
  WITH CHECK ((get_clerk_user_id() = user_id) OR (safe_uid() = user_id));

CREATE POLICY "Users can view own contact inquiries"
  ON public.contact_inquiries FOR SELECT TO authenticated
  USING ((get_clerk_user_id() = user_id) OR (safe_uid() = user_id));
