import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

/**
 * AuthPage — thin redirect layer.
 * If already authenticated → redirect to dashboard.
 * If not → auto-trigger Kinde login/register based on ?mode= param.
 */
export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { login: kindeLogin, register: kindeRegister } = useKindeAuth();
  const triggered = useRef(false);

  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const mode = searchParams.get('mode'); // 'login' | 'signup' | null

  // Redirect if already authenticated
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    navigate(redirectTo, { replace: true });
  }, [isAuthenticated, authLoading, navigate, redirectTo]);

  // Show session expired toast if redirected with reason
  useEffect(() => {
    if (searchParams.get('reason') === 'session_expired') {
      toast.info('Your session has expired. Please sign in again.');
    }
  }, [searchParams]);

  // Auto-trigger Kinde auth when not authenticated and not loading
  useEffect(() => {
    if (authLoading || isAuthenticated || triggered.current) return;
    triggered.current = true;

    if (mode === 'login') {
      kindeLogin();
    } else {
      // Default to register for signup or any other mode
      kindeRegister();
    }
  }, [authLoading, isAuthenticated, mode, kindeLogin, kindeRegister]);

  return (
    <div className="relative isolate min-h-[100dvh] flex flex-col overflow-hidden">
      <OfflineBanner />
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <MiniSpinner size={32} />
        <p className="text-sm text-muted-foreground">Redirecting to sign in...</p>
      </div>
    </div>
  );
}
