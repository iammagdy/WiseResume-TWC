import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccountType } from '@/hooks/wisehire/useAccountType';
import { useWiseHireAccount } from '@/hooks/wisehire/useWiseHireAccount';
import { ContactUsLockout } from '@/components/wisehire/ContactUsLockout';
import { useAdminStatus } from '@/hooks/useIsAdmin';

const LOADING_TIMEOUT_MS = 12_000;

/**
 * Route guard for all /wisehire/* protected pages.
 *
 * Rules:
 *  1. Not authenticated → redirect to /auth?mode=login
 *  2. Authenticated but account_type !== 'hr' → redirect to /dashboard (job seeker product)
 *  3. HR user with expired trial and no plan → show ContactUsLockout
 *  4. HR user on active trial or paid plan → render children
 */
export function WiseHireGuard() {
  const { isAuthenticated, loading, authSettled } = useAuth();
  const { accountType, isLoading: accountTypeLoading } = useAccountType();
  const { data: whAccount, isLoading: whAccountLoading } = useWiseHireAccount();
  const { isAdmin, isLoading: adminStatusLoading } = useAdminStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticatedRef = useRef(isAuthenticated);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    setLoadingTimedOut(false);
    const timer = setTimeout(() => setLoadingTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [location.key]);

  useEffect(() => {
    const handleSessionExpired = () => {
      if (!isAuthenticatedRef.current) return;
      navigate('/auth?mode=login&reason=session_expired', { replace: true });
    };
    window.addEventListener('app:session-expired', handleSessionExpired);
    return () => window.removeEventListener('app:session-expired', handleSessionExpired);
  }, [navigate]);

  // Wait for auth loading
  if (loading) return <WiseHireLoadingSkeleton />;

  // Not authenticated → send to login
  if (!isAuthenticated) {
    const intendedPath = location.pathname + location.search;
    const redirectParam = intendedPath !== '/'
      ? `&redirect=${encodeURIComponent(intendedPath)}`
      : '';
    return <Navigate to={`/auth?mode=login${redirectParam}`} replace />;
  }

  // Wait for account type to resolve (with timeout)
  if (!loadingTimedOut && (!authSettled || accountTypeLoading || adminStatusLoading)) {
    return <WiseHireLoadingSkeleton />;
  }

  // Wrong product — redirect job seekers back to their dashboard
  if (!isAdmin && accountType !== null && accountType !== 'hr') {
    return <Navigate to="/dashboard" replace />;
  }

  // Wait for WiseHire account data (with timeout)
  if (!loadingTimedOut && whAccountLoading) {
    return <WiseHireLoadingSkeleton />;
  }

  // Trial expired + no paid plan → full-screen lockout
  // Allow access to /wisehire/subscription so they can apply a coupon
  const isSubscriptionPage = location.pathname === '/wisehire/subscription';
  if (!isAdmin && whAccount?.isExpiredWithNoPlan && !isSubscriptionPage) {
    return <ContactUsLockout />;
  }

  return <Outlet />;
}

function WiseHireLoadingSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-[#f0f5ff] dark:bg-[#00061a] p-4 space-y-4 animate-pulse">
      <div className="h-10 w-36 rounded-lg bg-blue-200/60 dark:bg-blue-900/30" />
      <div className="h-6 w-52 rounded bg-blue-200/40 dark:bg-blue-900/20" />
      <div className="space-y-3 mt-6">
        <div className="h-24 rounded-xl bg-blue-200/40 dark:bg-blue-900/20" />
        <div className="h-24 rounded-xl bg-blue-200/40 dark:bg-blue-900/20" />
      </div>
    </div>
  );
}
