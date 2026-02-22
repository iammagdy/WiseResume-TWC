import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';
import { ThemeDropdown } from '@/components/settings/ThemeDropdown';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 1. Check for PKCE code in query params
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            navigate('/dashboard', { replace: true });
            return;
          }
          console.error('PKCE exchange failed:', error);
        }

        // 2. Check for hash fragment tokens (implicit flow)
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error) {
            navigate('/dashboard', { replace: true });
            return;
          }
          console.error('setSession failed:', error);
        }

        // 3. Fallback — check if session already exists
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data?.session) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/auth', { replace: true });
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        navigate('/auth', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <ThemeDropdown />
      </div>
      <PageLoadingSpinner />
    </>
  );
}
