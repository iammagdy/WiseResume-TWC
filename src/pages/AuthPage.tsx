import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, User, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { AppIcon } from '@/components/brand/AppIcon';
import { useAuth } from '@/hooks/useAuth';
import { InputFormField } from '@/components/ui/form-field';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button } from '@/components/ui/button';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { supabase } from '@/integrations/supabase/safeClient';

type Mode = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const rawMode = searchParams.get('mode');
  const initialMode: Mode =
    rawMode === 'signup' ? 'sign-up'
    : rawMode === 'forgot' ? 'forgot-password'
    : 'sign-in';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, redirectTo]);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Show session expired toast if redirected with reason
  useEffect(() => {
    if (searchParams.get('reason') === 'session_expired') {
      toast.info('Your session has expired. Please sign in again.');
    }
  }, [searchParams]);

  const handleEmailSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message || 'Invalid email or password');
      } else {
        navigate(redirectTo, { replace: true });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Sign-in failed');
    } finally {
      setIsLoading(false);
    }
  }, [email, password, navigate, redirectTo]);

  const handleEmailSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error(error.message || 'Sign-up failed');
      } else if (data.user?.identities?.length === 0) {
        toast.error('An account with this email already exists. Please sign in.');
        setMode('sign-in');
      } else {
        toast.success('Check your email for a confirmation link');
        setMode('sign-in');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Sign-up failed');
    } finally {
      setIsLoading(false);
    }
  }, [email, password, fullName]);

  const handleForgotPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message || 'Failed to send reset email');
      } else {
        toast.success('Check your email for a password reset link');
        setMode('sign-in');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const switchMode = () => {
    setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
    setPassword('');
    setFullName('');
    setShowPassword(false);
  };

  const headingText: Record<Mode, string> = {
    'sign-in': 'Welcome back',
    'sign-up': 'Create your account',
    'forgot-password': 'Reset your password',
  };
  const subtitleText: Record<Mode, string> = {
    'sign-in': 'Sign in to continue to WiseResume',
    'sign-up': 'Get started with WiseResume',
    'forgot-password': "Enter your email and we\u2019ll send a reset link",
  };

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
    <div className="relative isolate min-h-[100dvh] flex flex-col overflow-hidden">
      <OfflineBanner />

      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 z-20 p-2 rounded-xl active:scale-95 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
        style={{
          background: 'hsl(0 0% 100% / 0.15)',
          backdropFilter: 'blur(8px)',
          border: '1px solid hsl(0 0% 100% / 0.25)',
          color: 'hsl(0 0% 100% / 0.85)',
        }}
        aria-label="Back to home"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div
          className="w-full max-w-sm p-[1px] rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, hsl(355 85% 52% / 0.55), hsl(270 70% 55% / 0.35), hsl(185 90% 45% / 0.28))',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full space-y-6 glass-elevated rounded-[calc(1rem-1px)] p-6 relative overflow-hidden"
            style={{ boxShadow: '0 0 60px -10px hsl(355 85% 52% / 0.35), 0 25px 50px -12px rgba(0,0,0,0.7)' }}
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
              <h1 className="text-2xl font-bold gradient-text">{headingText[mode]}</h1>
              <p className="text-sm text-muted-foreground text-center">{subtitleText[mode]}</p>
            </div>

            <AnimatePresence mode="wait">

              {/* ── forgot-password ── */}
              {mode === 'forgot-password' && (
                <motion.form
                  key="forgot-password"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleForgotPassword}
                  className="space-y-4"
                >
                  <InputFormField
                    id="reset-email"
                    label="Email"
                    type="email"
                    icon={<Mail className="w-4 h-4" />}
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 text-base font-semibold gradient-primary glow-primary"
                    disabled={isLoading || !email}
                  >
                    {isLoading ? <MiniSpinner size={20} /> : 'Send reset link'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => setMode('sign-in')}
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to sign in
                  </Button>
                </motion.form>
              )}

              {/* ── sign-in / sign-up ── */}
              {(mode === 'sign-in' || mode === 'sign-up') && (
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: mode === 'sign-in' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === 'sign-in' ? 20 : -20 }}
                  className="space-y-4"
                >
                  <form onSubmit={mode === 'sign-in' ? handleEmailSignIn : handleEmailSignUp} className="space-y-4">
                    {mode === 'sign-up' && (
                      <InputFormField
                        id="full-name"
                        label="Full Name"
                        icon={<User className="w-4 h-4" />}
                        value={fullName}
                        onChange={setFullName}
                        placeholder="John Doe"
                        autoComplete="name"
                        required
                      />
                    )}
                    <InputFormField
                      id="email"
                      label="Email"
                      type="email"
                      icon={<Mail className="w-4 h-4" />}
                      value={email}
                      onChange={setEmail}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                    <div className="space-y-1">
                      <PasswordInput
                        id="password"
                        label="Password"
                        value={password}
                        onChange={setPassword}
                        show={showPassword}
                        onToggleShow={() => setShowPassword(!showPassword)}
                        autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                        required
                      />
                      {mode === 'sign-in' ? (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setMode('forgot-password')}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                          >
                            Forgot password?
                          </button>
                        </div>
                      ) : (
                        <PasswordStrengthMeter password={password} />
                      )}
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-12 text-base font-semibold gradient-primary glow-primary"
                      disabled={isLoading || !email || !password || (mode === 'sign-up' && !fullName)}
                    >
                      {isLoading ? <MiniSpinner size={20} /> : mode === 'sign-in' ? 'Sign In' : 'Create Account'}
                    </Button>
                  </form>

                  <p className="text-center text-sm text-muted-foreground">
                    {mode === 'sign-in' ? "Don't have an account?" : 'Already have an account?'}{' '}
                    <button
                      type="button"
                      onClick={switchMode}
                      className="font-semibold gradient-text hover:opacity-80 transition-opacity"
                    >
                      {mode === 'sign-in' ? 'Sign Up' : 'Sign In'}
                    </button>
                  </p>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
