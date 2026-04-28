-- Fix admin email in messages RLS policy.
-- The original policy in 20260314072049_consolidate_messaging.sql used
-- admin@thewise.cloud, which does not exist. The only contact email is
-- contact@thewise.cloud. Drop and recreate the policy with the correct address.

DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;

CREATE POLICY "Admins can view all messages" ON public.messages
    FOR SELECT USING (auth.jwt() ->> 'email' = 'contact@thewise.cloud');
