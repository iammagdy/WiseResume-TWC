CREATE TABLE public.signup_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_code text NOT NULL,
  action_link text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '10 minutes',
  used boolean DEFAULT false
);
ALTER TABLE public.signup_otps ENABLE ROW LEVEL SECURITY;