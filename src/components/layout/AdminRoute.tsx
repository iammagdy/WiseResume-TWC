import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_EMAIL } from '@/hooks/useIsAdmin';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Renders children only when the signed-in user is the application admin.
 * Any other visitor — authenticated or not — is silently redirected to /.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <PageLoadingSpinner />
      </div>
    );
  }

  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
