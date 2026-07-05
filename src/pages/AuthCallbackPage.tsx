import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { upsertProfileIdentity } from '@/lib/profileSeed';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';
import { clearAllPersistedCaches } from '@/lib/persistedQueryCache';
import { clearAllCachedScores } from '@/hooks/useResumeScore';
import { clearAllEditorSessions } from '@/lib/editorSession';
import { clearPlanCache } from '@/lib/planCache';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshSession } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    const handleCallback = async () => {
      try {
        // Clear caches prior to refreshing session (OAuth returns with session created)
        queryClient.clear();
        clearAllPersistedCaches();
        clearAllCachedScores();
        clearAllEditorSessions();
        clearPlanCache();

        const sessionUser = await refreshSession();
        if (!active) return;
        if (sessionUser) {
          try {
            await upsertProfileIdentity({
              userId: sessionUser.id,
              email: sessionUser.email,
              fullName: sessionUser.name ?? null,
            });
          } catch (seedErr) {
            console.warn('[AuthCallbackPage] Seeding profile failed:', seedErr);
          }
          navigate('/dashboard', { replace: true });
        } else {
          const isArabic = location.pathname.startsWith('/ar');
          navigate(isArabic ? '/ar/auth?error=oauth_failed' : '/auth?error=oauth_failed', { replace: true });
        }
      } catch (err) {
        if (!active) return;
        const isArabic = location.pathname.startsWith('/ar');
        navigate(isArabic ? '/ar/auth?error=oauth_failed' : '/auth?error=oauth_failed', { replace: true });
      }
    };

    void handleCallback();
    return () => {
      active = false;
    };
  }, [navigate, location.pathname, refreshSession, queryClient]);

  return <PageLoadingSpinner />;
}
