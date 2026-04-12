import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { LogIn, UserPlus } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { Button } from '@/components/ui/button';
import { AppIcon } from '@/components/brand/AppIcon';
import { useTheme } from '@/hooks/use-theme';
import { Sun, Moon } from 'lucide-react';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { login: kindeLogin, register: kindeRegister } = useKindeAuth();
  const { isDark, toggleTheme } = useTheme();
  const triggered = useRef(false);

  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const mode = searchParams.get('mode');
  const plan = searchParams.get('plan');
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(mode === 'login' ? 'login' : 'signup');

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
    if (authLoading || isAuthenticated || triggered.current || (!mode && !plan)) return;
    triggered.current = true;

    if (mode === 'login') {
      kindeLogin();
    } else {
      if (plan) {
        try { sessionStorage.setItem('wr-intent-plan', plan); } catch { /* ignore */ }
      }
      kindeRegister();
    }
  }, [authLoading, isAuthenticated, mode, plan, kindeLogin, kindeRegister]);

  const handleAction = () => {
    if (activeTab === 'login') {
      kindeLogin();
    } else {
      kindeRegister();
    }
  };

  if ((mode || plan) && triggered.current) {
    return (
      <div className="relative isolate min-h-[100dvh] flex flex-col overflow-hidden bg-background">
        <OfflineBanner />
        <div className="flex-1 flex flex-col items-center justify-center">
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

  return (
    <div className="relative isolate min-h-[100dvh] flex flex-col overflow-hidden bg-background">
      <a
        href="#auth-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:m-2"
      >
        Skip to content
      </a>
      <OfflineBanner />

      <div className="flex justify-end px-4 pt-3">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <div id="auth-main" className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <AppIcon size={56} />
            <h1 className="mt-4 text-2xl font-bold text-foreground tracking-tight">
              {activeTab === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {activeTab === 'login'
                ? 'Sign in to continue to WiseResume'
                : 'Start building your career with AI'}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-soft-lg p-6">
            <div className="flex rounded-xl bg-muted p-1 mb-6">
              <button
                onClick={() => setActiveTab('login')}
                className={`flex-1 text-sm font-medium py-2 rounded-lg transition-all ${
                  activeTab === 'login'
                    ? 'bg-background text-foreground shadow-soft-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab('signup')}
                className={`flex-1 text-sm font-medium py-2 rounded-lg transition-all ${
                  activeTab === 'signup'
                    ? 'bg-background text-foreground shadow-soft-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign Up
              </button>
            </div>

            <div className="space-y-3">
              <Button
                size="lg"
                variant="outline"
                className="w-full h-12 text-sm font-medium rounded-xl"
                onClick={handleAction}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs text-muted-foreground bg-card">or</span>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full h-12 text-sm font-semibold rounded-xl"
                onClick={handleAction}
              >
                {activeTab === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In with Email
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Sign Up with Email
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <a href="/terms-of-service" className="text-primary hover:underline">Terms</a>
            {' '}and{' '}
            <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
