import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoadingSpinner />;
  if (!user) return <Navigate to="/auth" replace />;
  return <Outlet />;
}
