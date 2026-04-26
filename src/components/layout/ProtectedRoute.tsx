import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMe } from '@/hooks/useMe';
import { AlertTriangle } from 'lucide-react';

const LOADING_TIMEOUT_MS = 6_000;
const SLOW_HINT_MS = 3_000;

/**
 * Returns true when a profile row indicates the user's email does NOT need
 * verification — i.e., they are already verified, use SSO (placeholder email),
 * or email_verified has not been provisioned yet (null/undefined guard).
 */
function isEmailVerifiedOrExempt(profile: Record<string, unknown> | null | undefined): boolean {
  if (!profile) return true; // profile not loaded yet — don't block
  if (profile.email_verified === true) return true;
  // SSO users have a @kinde.placeholder auth email — they never need email verification.
  const email = (profile.contact_email as string | undefined) || (profile.email as string | undefined) || '';
  if (email.endsWith('@kinde.placeholder')) return true;
  if (!email) return true; // no email on file — can't verify
  // email_verified is explicitly false and email is a real address → needs verification
  return profile.email_verified !== false;
}

export function ProtectedRoute() {
  const { isAuthenticated, loading, supabaseSettled, supabaseReady, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticatedRef = useRef(isAuthenticated);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [showSlowHint, setShowSlowHint] = useState(false);

  // Load user profile data — used for email-verified gate.
  const { data: meData } = useMe();

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    setLoadingTimedOut(false);
    setShowSlowHint(false);
    const hintTimer = setTimeout(() => setShowSlowHint(true), SLOW_HINT_MS);
    const timeoutTimer = setTimeout(() => setLoadingTimedOut(true), LOADING_TIMEOUT_MS);
    return () => { clearTimeout(hintTimer); clearTimeout(timeoutTimer); };
  }, [location.key]);

  useEffect(() => {
    const handleSessionExpired = () => {
      if (!isAuthenticatedRef.current) return;
      navigate('/auth?mode=login&reason=session_expired', { replace: true });
    };
    window.addEventListener('app:session-expired', handleSessionExpired);
    return () => window.removeEventListener('app:session-expired', handleSessionExpired);
  }, [navigate]);

  if (loading || (!loadingTimedOut && isAuthenticated && !supabaseSettled)) return (
    <div className="min-h-[100dvh] bg-background p-4 space-y-4 animate-pulse">
      <div className="h-10 w-32 rounded-lg bg-muted" />
      <div className="h-6 w-48 rounded bg-muted" />
      <div className="space-y-3 mt-6">
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
      </div>
      {showSlowHint && (
        <p className="text-xs text-muted-foreground text-center pt-2 animate-in fade-in duration-500">
          Still setting up your session…
        </p>
      )}
    </div>
  );

  if (!isAuthenticated) {
    const intendedPath = location.pathname + location.search;
    const redirectParam = intendedPath !== '/' && intendedPath !== '/dashboard'
      ? `&redirect=${encodeURIComponent(intendedPath)}`
      : '';
    return <Navigate to={`/auth?mode=login${redirectParam}`} replace />;
  }

  if (supabaseSettled && !supabaseReady) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-background">
        <div className="max-w-sm w-full rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-500/10 p-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Sign-in incomplete</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your account was verified but we couldn't finish setting up your session.
            Signing out and back in usually resolves this.
          </p>
          <button
            onClick={signOut}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
          >
            Sign Out and Try Again
          </button>
        </div>
      </div>
    );
  }

  // Email verification gate — only applies to authenticated users who:
  //   1. have a real email address (not a @kinde.placeholder SSO address)
  //   2. have explicitly email_verified = false in their profile
  // We only enforce this after meData has loaded (profile is non-null) to
  // avoid a flash redirect on the very first render.
  const alreadyOnVerifyPage = location.pathname === '/auth/verify-email';
  if (
    !alreadyOnVerifyPage &&
    meData?.profile &&
    !isEmailVerifiedOrExempt(meData.profile)
  ) {
    return <Navigate to="/auth/verify-email" replace />;
  }

  return <Outlet />;
}
