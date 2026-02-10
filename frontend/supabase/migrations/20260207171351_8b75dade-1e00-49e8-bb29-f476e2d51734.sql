-- Fix: Restrict avatar storage access to authenticated users only
-- This prevents public enumeration of user avatars and user IDs

-- Drop the existing overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- Create authenticated-only SELECT policy for avatars
-- Users can view any avatar when authenticated (needed for PDF generation)
CREATE POLICY "Authenticated users can view avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');