
CREATE TABLE public.career_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resume_id uuid,
  result jsonb NOT NULL DEFAULT '{}',
  quiz_answers jsonb NOT NULL DEFAULT '{}',
  completed_milestones jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.career_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessments"
ON public.career_assessments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessments"
ON public.career_assessments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessments"
ON public.career_assessments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assessments"
ON public.career_assessments FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_career_assessments_updated_at
BEFORE UPDATE ON public.career_assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
