
-- Create resignation_letters table
CREATE TABLE public.resignation_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  recipient_name text,
  company text,
  position text,
  last_working_day date,
  notice_period text DEFAULT '2_weeks',
  reason text,
  tone text DEFAULT 'professional',
  template_style text DEFAULT 'standard',
  additions jsonb DEFAULT '[]'::jsonb,
  content text NOT NULL,
  checklist_progress jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resignation_letters ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own resignation letters"
  ON public.resignation_letters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resignation letters"
  ON public.resignation_letters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resignation letters"
  ON public.resignation_letters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resignation letters"
  ON public.resignation_letters FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_resignation_letters_updated_at
  BEFORE UPDATE ON public.resignation_letters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
