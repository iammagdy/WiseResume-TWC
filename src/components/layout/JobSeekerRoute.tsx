import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccountType } from '@/hooks/wisehire/useAccountType';
import { useAdminStatus } from '@/hooks/useIsAdmin';

/**
 * Wraps job-seeker-only routes.
 * HR users (account_type = 'hr') are redirected to /wisehire/dashboard.
 * Shows a loading skeleton while the account type query is in-flight so
 * users never see a blank page after sign-in.
 */
export function JobSeekerRoute() {
  const { isAuthenticated, authSettled } = useAuth();
  const { accountType, isLoading, timedOut } = useAccountType();
  const { isAdmin, isLoading: adminStatusLoading } = useAdminStatus();

  // Not authenticated — let ProtectedRoute handle it upstream
  if (!isAuthenticated) return <Outlet />;

  // Wait for bridge + account type, but show a skeleton instead of null
  if (!authSettled || adminStatusLoading || (isLoading && !timedOut)) {
    return (
      <div className="min-h-[100dvh] bg-transparent p-4 space-y-4 animate-pulse">
        <div className="h-10 w-32 rounded-lg bg-muted" />
        <div className="h-6 w-48 rounded bg-muted" />
        <div className="space-y-3 mt-6">
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-24 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  // HR user — redirect away from job seeker product
  if (!isAdmin && accountType === 'hr') {
    return <Navigate to="/wisehire/dashboard" replace />;
  }

  return <Outlet />;
}
