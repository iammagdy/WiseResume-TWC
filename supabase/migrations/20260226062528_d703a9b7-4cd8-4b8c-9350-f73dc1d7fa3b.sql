
-- Create screenshots storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to screenshots bucket
CREATE POLICY "Public read access for screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'screenshots');

-- Allow service role / edge functions to upload
CREATE POLICY "Service role can upload screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'screenshots');

-- Allow service role to delete screenshots
CREATE POLICY "Service role can delete screenshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'screenshots');

-- Create store_screenshots table
CREATE TABLE public.store_screenshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  headline TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS enabled but allow public read (admin/utility feature)
ALTER TABLE public.store_screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for store_screenshots"
ON public.store_screenshots FOR SELECT
USING (true);

-- Only service role can insert/delete (edge function)
CREATE POLICY "Service role can insert store_screenshots"
ON public.store_screenshots FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can delete store_screenshots"
ON public.store_screenshots FOR DELETE
USING (true);
