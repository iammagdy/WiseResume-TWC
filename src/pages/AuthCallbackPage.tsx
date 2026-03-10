import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useAuth } from '@/hooks/useAuth';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';

/**
 * Auth callback page — handles:
 * 1. Kinde OAuth redirect (isAuthenticated from Kinde)
 * 2. Supabase OAuth token exchange (hash tokens)
 * 3. Error detection and normal auth resolution redirects
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isAuthenticated: supabaseAuthenticated, loading: supabaseLoading } = useAuth();
  const { isAuthenticated: kindeAuthenticated, isLoading: kindeLoading } = useKindeAuth();
  const handled = useRef(false);

  // Handle errors and Supabase hash tokens
  useEffect(() => {
    if (handled.current) return;

    // Check for error in query params
    const searchParams = new URLSearchParams(window.location.search);
    const errorDesc = searchParams.get('error_description') || searchParams.get('error');
    if (errorDesc) {
      handled.current = true;
      toast.error(errorDesc.replace(/\+/g, ' '));
      navigate('/auth', { replace: true });
      return;
    }

    // Check for Supabase tokens in hash (OAuth redirect)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      handled.current = true;
      window.history.replaceState(null, '', window.location.pathname);
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => navigate('/dashboard', { replace: true }))
        .catch(() => {
          toast.error('Failed to complete sign-in. Please try again.');
          navigate('/auth', { replace: true });
        });
      return;
    }
  }, [navigate]);

  // Handle Kinde redirect and fallback resolution
  useEffect(() => {
    if (handled.current) return;
    if (kindeLoading || supabaseLoading) return;

    // Kinde authenticated — redirect to dashboard
    if (kindeAuthenticated) {
      handled.current = true;
      navigate('/dashboard', { replace: true });
      return;
    }

    // Supabase authenticated — redirect to dashboard
    if (supabaseAuthenticated) {
      handled.current = true;
      navigate('/dashboard', { replace: true });
      return;
    }

    // Neither authenticated — back to auth
    navigate('/auth', { replace: true });
  }, [kindeLoading, supabaseLoading, kindeAuthenticated, supabaseAuthenticated, navigate]);

  return <PageLoadingSpinner />;
}
