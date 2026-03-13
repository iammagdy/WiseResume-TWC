import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';
import { toast } from 'sonner';

/**
 * Auth callback page — handles Kinde OAuth redirect.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isAuthenticated: kindeAuthenticated, isLoading: kindeLoading } = useKindeAuth();
  const handled = useRef(false);
  const wasLoading = useRef(false);

  // Handle errors in query params
  useEffect(() => {
    if (handled.current) return;
    const searchParams = new URLSearchParams(window.location.search);
    const errorDesc = searchParams.get('error_description') || searchParams.get('error');
    if (errorDesc) {
      handled.current = true;
      toast.error(errorDesc.replace(/\+/g, ' '));
      navigate('/auth', { replace: true });
    }
  }, [navigate]);

  // Track when Kinde starts loading (processing the auth code)
  useEffect(() => {
    if (kindeLoading) {
      wasLoading.current = true;
    }
  }, [kindeLoading]);

  // Handle Kinde redirect resolution — only act after loading completes
  useEffect(() => {
    if (handled.current || kindeLoading) return;
    // Only redirect after we've seen a loading state (Kinde processed the code)
    if (!wasLoading.current) return;

    if (kindeAuthenticated) {
      handled.current = true;
      navigate('/dashboard', { replace: true });
      return;
    }
    // Not authenticated after loading — back to auth
    handled.current = true;
    navigate('/auth', { replace: true });
  }, [kindeLoading, kindeAuthenticated, navigate]);

  return <PageLoadingSpinner />;
}
