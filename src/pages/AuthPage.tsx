import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { login: kindeLogin, register: kindeRegister } = useKindeAuth();
  const triggered = useRef(false);

  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const mode = searchParams.get('mode');

  useEffect(() => {
    if (searchParams.get('reason') === 'session_expired') {
      toast.info('Your session has expired. Please sign in again.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    navigate(redirectTo, { replace: true });
  }, [isAuthenticated, authLoading, navigate, redirectTo]);

  useEffect(() => {
    if (authLoading || isAuthenticated || mode) return;
    navigate('/', { replace: true });
  }, [authLoading, isAuthenticated, mode, navigate]);

  useEffect(() => {
    if (authLoading || isAuthenticated || triggered.current || !mode) return;
    triggered.current = true;

    if (mode === 'login') {
      kindeLogin();
    } else {
      kindeRegister();
    }
  }, [authLoading, isAuthenticated, mode, kindeLogin, kindeRegister]);

  return (
    <div className="relative isolate min-h-[100dvh] flex flex-col overflow-hidden bg-background">
      <OfflineBanner />
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4 px-8 py-8 rounded-2xl bg-card border border-border shadow-soft-lg">
          <MiniSpinner size={28} />
          <p className="text-sm font-medium text-foreground">
            {mode === 'login' ? 'Signing you in\u2026' : mode === 'signup' ? 'Creating your account\u2026' : 'Redirecting\u2026'}
          </p>
        </div>
      </div>
    </div>
  );
}
