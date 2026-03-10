CREATE TABLE public.token_exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kinde_sub text NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'success',
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.token_exchanges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access" ON public.token_exchanges
  FOR ALL TO public USING (false) WITH CHECK (false);