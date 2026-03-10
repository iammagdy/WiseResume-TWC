import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, User, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { AppIcon } from '@/components/brand/AppIcon';
import { useAuth } from '@/hooks/useAuth';
import { InputFormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { login: kindeLogin, register: kindeRegister } = useKindeAuth();
  const [kindeEmail, setKindeEmail] = useState('');

  const redirectTo = searchParams.get('redirect') || '/dashboard';

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

  if (authLoading) {
    return (
      <div className="relative isolate min-h-[100dvh] flex flex-col overflow-hidden">
        <OfflineBanner />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <MiniSpinner size={32} />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative isolate min-h-[100dvh] flex flex-col overflow-y-auto"
    >
      <OfflineBanner />

      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 z-20 p-2 rounded-xl active:scale-95 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center text-foreground/85 dark:text-white/85"
        style={{
          background: 'hsl(var(--foreground) / 0.08)',
          backdropFilter: 'blur(8px)',
          border: '1px solid hsl(var(--foreground) / 0.12)',
        }}
        aria-label="Back to home"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div
          className="w-full max-w-sm p-[2px] rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, hsl(355 85% 52% / 0.9), hsl(270 70% 55% / 0.7), hsl(185 90% 45% / 0.6), hsl(355 85% 52% / 0.9))',
            boxShadow: '0 0 30px hsl(355 85% 52% / 0.4), 0 0 60px hsl(270 70% 55% / 0.2)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full space-y-6 rounded-[calc(1rem-2px)] p-6 relative overflow-hidden"
            style={{
              background: 'hsl(var(--card) / 0.40)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid hsl(var(--foreground) / 0.1)',
              boxShadow: 'inset 0 1px 0 0 hsl(var(--foreground) / 0.06), 0 20px 40px -12px rgba(0,0,0,0.35)',
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-28 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, hsl(355 85% 52% / 0.07) 0%, transparent 100%)' }}
            />

            {/* Logo + header */}
            <div className="flex flex-col items-center gap-3 relative">
              <div
                className="rounded-2xl"
                style={{ animation: 'pulse-icon 3s ease-in-out infinite', boxShadow: '0 0 0 2px hsl(355 85% 52% / 0.35), 0 0 20px hsl(355 85% 52% / 0.30)' }}
              >
                <AppIcon size={56} />
              </div>
              <h1 className="text-2xl font-bold gradient-text">Welcome to WiseResume</h1>
              <p className="text-sm text-muted-foreground text-center">Sign in or create an account to continue</p>
            </div>

            {/* Google button */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full h-12 text-base font-medium gap-3"
              onClick={() => kindeLogin()}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>

            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or continue with email</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Kinde Email Login */}
            <div className="space-y-3">
              <InputFormField
                id="kinde-email"
                label="Email"
                type="email"
                icon={<Mail className="w-4 h-4" />}
                value={kindeEmail}
                onChange={setKindeEmail}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11 text-sm font-medium"
                  disabled={!kindeEmail}
                  onClick={() => kindeLogin({ loginHint: kindeEmail })}
                >
                  <KeyRound className="w-4 h-4 mr-1.5" />
                  Sign In
                </Button>
                <Button
                  type="button"
                  className="flex-1 h-11 text-sm font-medium gradient-primary glow-primary"
                  disabled={!kindeEmail}
                  onClick={() => kindeRegister({ loginHint: kindeEmail })}
                >
                  <User className="w-4 h-4 mr-1.5" />
                  Sign Up
                </Button>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground pt-2">
              By continuing, you agree to the{' '}
              <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">Privacy Policy</a>
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
