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

  // Handle Kinde redirect resolution
  useEffect(() => {
    if (handled.current || kindeLoading) return;

    if (kindeAuthenticated) {
      handled.current = true;
      navigate('/dashboard', { replace: true });
      return;
    }

    // Not authenticated — back to auth
    navigate('/auth', { replace: true });
  }, [kindeLoading, kindeAuthenticated, navigate]);

  return <PageLoadingSpinner />;
}
