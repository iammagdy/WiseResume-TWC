import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { Button } from '@/components/ui/button';
import { CheckCircle, ShieldCheck } from 'lucide-react';

type FromContext = 'verify-email' | 'reset-password' | null;

const FROM_CONFIG: Record<
  NonNullable<FromContext>,
  { icon: React.ReactNode; title: string; body: string; cta: string }
> = {
  'verify-email': {
    icon: (
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>
    ),
    title: 'Check your inbox to verify your email',
    body: 'We sent a verification link to your email address. Click the link to verify and then sign in.',
    cta: 'Sign In',
  },
  'reset-password': {
    icon: (
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
        <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      </div>
    ),
    title: 'Check your inbox to reset your password',
    body: 'We sent a password reset link to your email address. Follow the link to set a new password.',
    cta: 'Sign In',
  },
};

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { login: kindeLogin, register: kindeRegister } = useKindeAuth();
  const triggered = useRef(false);

  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const mode = searchParams.get('mode');
  const plan = searchParams.get('plan');
  const fromParam = searchParams.get('from') as FromContext;
  const fromConfig = fromParam && FROM_CONFIG[fromParam] ? FROM_CONFIG[fromParam] : null;

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
    // When a ?from= context is present, don't auto-trigger Kinde — show the
    // contextual message card and let the user choose to sign in manually.
    if (fromConfig) return;
    if (authLoading || isAuthenticated || triggered.current) return;
    triggered.current = true;

    if (plan) {
      try { sessionStorage.setItem('wr-intent-plan', plan); } catch { }
    }

    try {
      if (mode === 'login') {
        kindeLogin();
      } else {
        kindeRegister();
      }
    } catch (err) {
      console.error('[AuthPage] Kinde auth error:', err);
      toast.error('Authentication is not available right now. Please try again later.');
    }
  }, [authLoading, isAuthenticated, mode, plan, kindeLogin, kindeRegister, fromConfig]);

  if (fromConfig) {
    return (
      <div className="relative isolate min-h-[100dvh] flex flex-col overflow-hidden bg-background">
        <OfflineBanner />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="flex flex-col items-center gap-6 px-8 py-10 rounded-2xl bg-card border border-border shadow-soft-lg max-w-sm w-full text-center">
            {fromConfig.icon}
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-foreground">{fromConfig.title}</h1>
              <p className="text-sm text-muted-foreground">{fromConfig.body}</p>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                triggered.current = false;
                try {
                  kindeLogin();
                } catch (err) {
                  console.error('[AuthPage] Kinde login error:', err);
                  toast.error('Unable to sign in. Please try again or contact support.');
                }
              }}
            >
              {fromConfig.cta}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate flex flex-col overflow-y-auto bg-background" style={{ maxHeight: '100dvh', height: '100dvh' }}>
      <OfflineBanner />
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-8">
        <div className="flex flex-col items-center gap-4 px-8 py-8 rounded-2xl bg-card border border-border shadow-soft-lg">
          <MiniSpinner size={28} />
          <p className="text-sm font-medium text-foreground">
            {mode === 'login' ? 'Signing you in\u2026' : 'Creating your account\u2026'}
          </p>
        </div>
      </div>
    </div>
  );
}
