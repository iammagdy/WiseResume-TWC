-- Create contact_requests table to unify Bug Reports, Feature Requests, and Contact Us
CREATE TABLE IF NOT EXISTS public.contact_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL CHECK (type IN ('bug', 'feature', 'contact')),
    user_id uuid, -- Optional for unauthenticated users
    email text NOT NULL,
    subject text,
    message text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address text, -- For rate limiting
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Allow public (anon/authenticated) to insert
CREATE POLICY "Anyone can insert contact requests" ON public.contact_requests
    FOR INSERT WITH CHECK (true);

-- Only admins/service role can view all (handled via default service role access or explicit policy)
CREATE POLICY "Admins can view all contact requests" ON public.contact_requests
    FOR SELECT USING (auth.role() = 'service_role');

-- Create a helper function for rate limiting check (3 per hour)
CREATE OR REPLACE FUNCTION public.check_email_rate_limit(client_ip text)
RETURNS boolean AS $$
DECLARE
    request_count int;
BEGIN
    SELECT count(*) INTO request_count
    FROM public.contact_requests
    WHERE ip_address = client_ip
    AND created_at > now() - interval '1 hour';
    
    RETURN request_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
