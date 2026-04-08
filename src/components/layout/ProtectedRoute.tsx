import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const LOADING_TIMEOUT_MS = 12_000;

export function ProtectedRoute() {
  const { isAuthenticated, loading, supabaseSettled } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticatedRef = useRef(isAuthenticated);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Safety net: if loading/supabaseSettled haven't resolved within LOADING_TIMEOUT_MS,
  // stop blocking the UI. Resets on every navigation so each page gets a fresh timer.
  useEffect(() => {
    setLoadingTimedOut(false);
    const timer = setTimeout(() => setLoadingTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
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
    <div className="min-h-[100dvh] bg-transparent p-4 space-y-4 animate-pulse">
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
  return <Outlet />;
}
