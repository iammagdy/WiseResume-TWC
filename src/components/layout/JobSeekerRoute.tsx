import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccountType } from '@/hooks/wisehire/useAccountType';

/**
 * Wraps job-seeker-only routes.
 * HR users (account_type = 'hr') are redirected to /wisehire/dashboard.
 * Renders nothing while account type is still loading to avoid flash.
 */
export function JobSeekerRoute() {
  const { isAuthenticated, supabaseSettled } = useAuth();
  const { accountType, isLoading } = useAccountType();

  // Not authenticated — let ProtectedRoute handle it upstream
  if (!isAuthenticated) return <Outlet />;

  // Wait for bridge + account type (briefly)
  if (!supabaseSettled || isLoading) return null;

  // HR user — redirect away from job seeker product
  if (accountType === 'hr') {
    return <Navigate to="/wisehire/dashboard" replace />;
  }

  return <Outlet />;
}
