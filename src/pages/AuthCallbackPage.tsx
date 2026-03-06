import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';

/**
 * Auth callback page — with Clerk, OAuth callbacks are handled by Clerk's
 * own redirect flow. This page simply waits for auth to resolve and redirects.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/auth', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  return <PageLoadingSpinner />;
}
