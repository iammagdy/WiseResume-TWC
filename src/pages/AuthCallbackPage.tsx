import { useEffect } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';

/**
 * Auth callback page — handles Kinde OAuth redirect.
 * After Kinde processes the code, redirects to /dashboard.
 * Falls back to hard-redirect after 8s to avoid infinite loading.
 */
export default function AuthCallbackPage() {
  const { isAuthenticated, isLoading } = useKindeAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      window.location.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        window.location.replace('/dashboard');
      } else {
        window.location.replace('/auth?mode=login');
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  return <PageLoadingSpinner />;
}
