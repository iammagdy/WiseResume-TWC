-- Add DELETE policy for ai_usage_logs so users can manage their activity data
CREATE POLICY "Users can delete own AI usage logs"
ON public.ai_usage_logs
FOR DELETE
USING (auth.uid() = user_id);