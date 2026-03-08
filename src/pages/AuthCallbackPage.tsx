import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';
import { supabase } from '@/integrations/supabase/safeClient';

/**
 * Auth callback page — handles cross-domain OAuth token exchange
 * and normal auth resolution redirects.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    // Check for tokens in hash (cross-domain OAuth redirect)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      handled.current = true;
      // Clear hash for security
      window.history.replaceState(null, '', window.location.pathname);
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => navigate('/dashboard', { replace: true }))
        .catch(() => navigate('/auth', { replace: true }));
      return;
    }
  }, [navigate]);

  useEffect(() => {
    if (handled.current || loading) return;

    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/auth', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  return <PageLoadingSpinner />;
}
