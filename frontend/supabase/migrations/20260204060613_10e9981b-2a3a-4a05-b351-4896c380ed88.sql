-- Add parent_resume_id for master/tailored hierarchy
ALTER TABLE public.resumes 
ADD COLUMN parent_resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL;

-- Create index for efficient hierarchy queries
CREATE INDEX idx_resumes_parent_id ON public.resumes(parent_resume_id);

-- Create AI usage logs table for analytics
CREATE TABLE public.ai_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'enhance', 'generate', 'tailor', 'analyze', 'suggest'
  section TEXT, -- 'summary', 'experience', 'skills', 'education', 'contact'
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context like prompt length, result quality
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ai_usage_logs
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own usage logs
CREATE POLICY "Users can view own AI usage logs"
ON public.ai_usage_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own usage logs
CREATE POLICY "Users can insert own AI usage logs"
ON public.ai_usage_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_action_type ON public.ai_usage_logs(action_type);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);