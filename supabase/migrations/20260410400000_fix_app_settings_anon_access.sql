-- ============================================================
-- Fix: app_settings should be readable by anon sessions too
-- so maintenance_mode and announcement_banner are enforced
-- even before a user logs in (whole-app maintenance mode).
-- ============================================================
-- Also: remove the unused admin_audit_log table that was created
-- in migration 20260410200000 but is superseded by audit_logs
-- (all admin RPCs and redeem_coupon write to audit_logs).
DROP TABLE IF EXISTS public.admin_audit_log;


-- Add anon read policy for non-sensitive keys
DROP POLICY IF EXISTS "anon_read_app_settings" ON public.app_settings;
CREATE POLICY "anon_read_app_settings" ON public.app_settings
  FOR SELECT
  TO anon
  USING (key IN (
    'maintenance_mode',
    'announcement_banner',
    'announcement_enabled',
    'feature_cover_letters',
    'feature_applications',
    'feature_ai_studio',
    'feature_portfolio',
    'feature_interview_coach',
    'feature_career_advisor'
  ));

-- Ensure the authenticated policy also includes announcement_enabled and new features
-- (migration 20260410200000 added this via DROP/CREATE — ensure it's idempotent here)
DROP POLICY IF EXISTS "authenticated_read_app_settings" ON public.app_settings;
CREATE POLICY "authenticated_read_app_settings" ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (key IN (
    'maintenance_mode',
    'announcement_banner',
    'announcement_enabled',
    'feature_cover_letters',
    'feature_applications',
    'feature_ai_studio',
    'feature_portfolio',
    'feature_interview_coach',
    'feature_career_advisor'
  ));
