
-- Fix the security definer view warning by recreating with SECURITY INVOKER
ALTER VIEW public.user_api_keys_safe SET (security_invoker = on);
