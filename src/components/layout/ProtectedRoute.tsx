import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle } from 'lucide-react';

const LOADING_TIMEOUT_MS = 6_000;
const SLOW_HINT_MS = 3_000;

export function ProtectedRoute() {
  const { isAuthenticated, loading, supabaseSettled, supabaseReady, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticatedRef = useRef(isAuthenticated);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [showSlowHint, setShowSlowHint] = useState(false);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Safety net: if loading/supabaseSettled haven't resolved within LOADING_TIMEOUT_MS,
  // stop blocking the UI. Resets on every navigation so each page gets a fresh timer.
  // Also show a "still loading" hint after SLOW_HINT_MS so users know the app is working.
  useEffect(() => {
    setLoadingTimedOut(false);
    setShowSlowHint(false);
    const hintTimer = setTimeout(() => setShowSlowHint(true), SLOW_HINT_MS);
    const timeoutTimer = setTimeout(() => setLoadingTimedOut(true), LOADING_TIMEOUT_MS);
    return () => { clearTimeout(hintTimer); clearTimeout(timeoutTimer); };
  }, [location.key]);

  // Listen for unexpected session expiry and redirect with reason param
  // Skip navigation if the user is already not-authenticated (signing out)
  useEffect(() => {
    const handleSessionExpired = () => {
      if (!isAuthenticatedRef.current) return;
      navigate('/auth?mode=login&reason=session_expired', { replace: true });
    };
    window.addEventListener('app:session-expired', handleSessionExpired);
    return () => window.removeEventListener('app:session-expired', handleSessionExpired);
  }, [navigate]);

  // Always wait for Kinde auth loading (never redirect prematurely).
  // Only time-box the Supabase bridge wait so a hanging bridge doesn't block forever.
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
  // The user is authenticated via Kinde but the bridge exchange definitively
  // failed (supabaseSettled=true, supabaseReady=false). Rendering the protected
  // page in this state causes "Welcome, Guest" and empty data since the bridge
  // token is missing. Show a clear error card instead so the user can recover.
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
  return <Outlet />;
}
