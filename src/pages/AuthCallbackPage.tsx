import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase automatically picks up tokens from the URL hash
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

  return <PageLoadingSpinner />;
}
