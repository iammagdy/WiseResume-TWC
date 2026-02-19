import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';


export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const wasLoggedInRef = useRef(false);

  // Listen for unexpected session expiry and redirect with reason param
  useEffect(() => {
    const handleSessionExpired = () => {
      navigate('/auth?reason=session_expired', { replace: true });
    };
    window.addEventListener('app:session-expired', handleSessionExpired);
    return () => window.removeEventListener('app:session-expired', handleSessionExpired);
  }, [navigate]);

  // Track whether user was previously authenticated
  useEffect(() => {
    if (user) wasLoggedInRef.current = true;
  }, [user]);

  if (loading) return (
    <div className="min-h-[100dvh] bg-background p-4 space-y-4 animate-pulse">
      <div className="h-10 w-32 rounded-lg bg-muted" />
      <div className="h-6 w-48 rounded bg-muted" />
      <div className="space-y-3 mt-6">
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
      </div>
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return <Outlet />;
}
