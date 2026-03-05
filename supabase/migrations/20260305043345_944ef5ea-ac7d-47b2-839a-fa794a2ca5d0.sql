CREATE POLICY "Users can view own feature requests"
ON public.feature_requests
FOR SELECT
USING (auth.uid() = user_id);