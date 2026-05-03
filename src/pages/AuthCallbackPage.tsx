import { useEffect } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';
import { WH_SIGNUP_REDIRECT_KEY } from '@/lib/wisehire/inviteTokenClient';

/**
 * Auth callback page — handles Kinde OAuth redirect.
 *
 * After Kinde processes the code:
 * - If a WiseHire sign-up was in progress (sessionStorage flag), redirects to
 *   /wisehire/signup?complete=1 so the signup completion flow can run.
 * - Otherwise redirects to /dashboard as normal.
 *
 * Fallback behaviour:
 * - Primary effect fires immediately once isLoading=false AND isAuthenticated=true.
 * - Soft fallback (8 s): fires only when Kinde has definitively finished loading
 *   (isLoading=false). If isAuthenticated is still false at that point, the code
 *   exchange genuinely failed → send user back to landing. If Kinde is still
 *   loading we do NOT redirect — the primary effect handles success once the
 *   exchange completes.
 * - Hard failsafe (30 s): covers the case where isLoading stays true indefinitely
 *   (Kinde SDK hang). Redirects to landing so the user is never stuck forever.
 *
 * Root-cause fix (2026-05-03): the previous 8 s timer lacked an isLoading check.
 * On slow mobile connections the React bundle + KindeProvider initialisation
 * consumed most of the 8 s window, the timer fired while isLoading was still true,
 * and the user was sent back to the landing page even though auth would have
 * succeeded moments later.
 */
export default function AuthCallbackPage() {
  const { isAuthenticated, isLoading } = useKindeAuth();

  function getRedirectTarget(): string {
    const wiseHireRedirect = sessionStorage.getItem(WH_SIGNUP_REDIRECT_KEY);
    return wiseHireRedirect ? `${wiseHireRedirect}?complete=1` : '/dashboard';
  }

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      window.location.replace(getRedirectTarget());
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    const softTimer = setTimeout(() => {
      if (isAuthenticated) {
        window.location.replace(getRedirectTarget());
      } else if (!isLoading) {
        window.location.replace('/');
      }
    }, 8000);
    return () => clearTimeout(softTimer);
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    const hardTimer = setTimeout(() => {
      if (!isAuthenticated) {
        window.location.replace('/');
      }
    }, 30000);
    return () => clearTimeout(hardTimer);
  }, []);

  return <PageLoadingSpinner />;
}
