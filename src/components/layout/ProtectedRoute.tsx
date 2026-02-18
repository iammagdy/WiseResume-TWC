import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';

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

  if (loading) return <PageLoadingSpinner />;
  if (!user) return <Navigate to="/auth" replace />;
  return <Outlet />;
}
