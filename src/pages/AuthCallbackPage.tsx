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
 * Falls back to hard-redirect after 8s to avoid infinite loading.
 */
export default function AuthCallbackPage() {
  const { isAuthenticated, isLoading } = useKindeAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const wiseHireRedirect = sessionStorage.getItem(WH_SIGNUP_REDIRECT_KEY);
      if (wiseHireRedirect) {
        window.location.replace(`${wiseHireRedirect}?complete=1`);
      } else {
        window.location.replace('/dashboard');
      }
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        const wiseHireRedirect = sessionStorage.getItem(WH_SIGNUP_REDIRECT_KEY);
        if (wiseHireRedirect) {
          window.location.replace(`${wiseHireRedirect}?complete=1`);
        } else {
          window.location.replace('/dashboard');
        }
      } else {
        window.location.replace('/');
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  return <PageLoadingSpinner />;
}
