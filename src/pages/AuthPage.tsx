import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

/**
 * AuthPage — thin redirect layer.
 *
 * Behaviour by ?mode param:
 *   mode=login   → auto-trigger Kinde login
 *   mode=signup  → auto-trigger Kinde register
 *   (no mode)    → redirect to landing page (covers post-signout case)
 *
 * If already authenticated → redirect to dashboard (or ?redirect= target).
 */
export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { login: kindeLogin, register: kindeRegister } = useKindeAuth();
  const triggered = useRef(false);

  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const mode = searchParams.get('mode'); // 'login' | 'signup' | null

  // Show session expired toast if redirected with reason
  useEffect(() => {
    if (searchParams.get('reason') === 'session_expired') {
      toast.info('Your session has expired. Please sign in again.');
    }
  }, [searchParams]);

  // Already authenticated → go to intended destination
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    navigate(redirectTo, { replace: true });
  }, [isAuthenticated, authLoading, navigate, redirectTo]);

  // No explicit mode → no intent to sign in (post-signout redirect).
  // Navigate to landing page instead of triggering Kinde.
  useEffect(() => {
    if (authLoading || isAuthenticated || mode) return;
    navigate('/', { replace: true });
  }, [authLoading, isAuthenticated, mode, navigate]);

  // Auto-trigger Kinde auth when mode is explicitly set
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
    <div className="relative isolate min-h-[100dvh] flex flex-col overflow-hidden">
      <OfflineBanner />
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Semi-transparent card ensures text is always readable over the wallpaper */}
        <div className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl bg-background/70 backdrop-blur-md shadow-lg border border-border/40">
          <MiniSpinner size={28} />
          <p className="text-sm font-medium text-foreground">
            {mode === 'login' ? 'Signing you in…' : mode === 'signup' ? 'Creating your account…' : 'Redirecting…'}
          </p>
        </div>
      </div>
    </div>
  );
}
