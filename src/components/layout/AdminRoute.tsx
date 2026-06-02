import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminStatus } from '@/hooks/useIsAdmin';

export function AdminRoute() {
  const location = useLocation();
  const { isAdmin, isLoading } = useAdminStatus();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background p-4 space-y-4 animate-pulse">
        <div className="h-10 w-32 rounded-lg bg-muted" />
        <div className="h-6 w-48 rounded bg-muted" />
        <div className="space-y-3 mt-6">
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-24 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
