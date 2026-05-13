import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle } from 'lucide-react';

const FALLBACK_TIMEOUT_MS = 8_000;

export function ProtectedRoute() {
  const { isAuthenticated, isImpersonating, loading, authSettled, authReady, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticatedRef = useRef(isAuthenticated);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Safety fallback: if auth is still loading after 8s, force redirect to login
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setTimedOut(true), FALLBACK_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (timedOut && !isAuthenticated) {
      navigate('/auth?mode=login', { replace: true });
    }
  }, [timedOut, isAuthenticated, navigate]);

  useEffect(() => {
    const handleSessionExpired = () => {
      if (!isAuthenticatedRef.current) return;
      navigate('/auth?mode=login&reason=session_expired', { replace: true });
    };
    window.addEventListener('app:session-expired', handleSessionExpired);
    return () => window.removeEventListener('app:session-expired', handleSessionExpired);
  }, [navigate]);

  if (loading && !timedOut) return (
    <div className="min-h-[100dvh] bg-background p-4 space-y-4 animate-pulse">
      <div className="h-10 w-32 rounded-lg bg-muted" />
      <div className="h-6 w-48 rounded bg-muted" />
      <div className="space-y-3 mt-6">
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
      </div>
    </div>
  );

  if (!isAuthenticated) {
    const intendedPath = location.pathname + location.search;
    const redirectParam = intendedPath !== '/' && intendedPath !== '/dashboard'
      ? `&redirect=${encodeURIComponent(intendedPath)}`
      : '';
    return <Navigate to={`/auth?mode=login${redirectParam}`} replace />;
  }

  if (authSettled && !authReady) {
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
