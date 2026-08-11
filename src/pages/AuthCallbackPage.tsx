import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { upsertProfileIdentity } from '@/lib/profileSeed';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';
import { clearAllPersistedCaches } from '@/lib/persistedQueryCache';
import { clearAllCachedScores } from '@/hooks/useResumeScore';
import { clearAllEditorSessions } from '@/lib/editorSession';
import { clearPlanCache } from '@/lib/planCache';

function oauthAuthErrorPath(pathname: string, code: string): string {
  return pathname.startsWith('/ar') ? `/ar/auth?error=${code}` : `/auth?error=${code}`;
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshSession } = useAuth();
  const queryClient = useQueryClient();
  const [profileSetupFailed, setProfileSetupFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

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
          } catch {
            // Authentication completed successfully. Keep the user in a factual
            // recovery state instead of misreporting this as a LinkedIn failure.
            setProfileSetupFailed(true);
            return;
          }
          navigate('/dashboard', { replace: true });
        } else {
          navigate(oauthAuthErrorPath(location.pathname, 'oauth_session_completion'), { replace: true });
        }
      } catch (err) {
        if (!active) return;
        navigate(oauthAuthErrorPath(location.pathname, 'oauth_session_completion'), { replace: true });
      }
    };

    void handleCallback();
    return () => {
      active = false;
    };
  }, [navigate, location.pathname, refreshSession, queryClient, retryCount]);

  if (profileSetupFailed) {
    return (
      <main className="min-h-[100dvh] grid place-items-center p-6 bg-background text-foreground">
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4 text-center">
          <h1 className="text-lg font-semibold">You’re signed in</h1>
          <p className="text-sm text-muted-foreground">
            We couldn’t finish setting up your profile yet. Your LinkedIn sign-in worked; you can retry setup or continue to your dashboard.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" onClick={() => { setProfileSetupFailed(false); setRetryCount((count) => count + 1); }}>
              Retry setup
            </button>
            <button className="min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-medium" onClick={() => navigate('/dashboard', { replace: true })}>
              Continue to dashboard
            </button>
          </div>
        </section>
      </main>
    );
  }

  return <PageLoadingSpinner />;
}
