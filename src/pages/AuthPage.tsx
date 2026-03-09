import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, User, KeyRound, Check } from 'lucide-react';
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
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { lovable } from '@/integrations/lovable/index';

type Mode = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password';
type SignUpStep = 'form' | 'method';
type VerifyMethod = 'otp' | 'link';

const LOVABLE_ORIGIN = 'https://wiseresume.lovable.app';
const isCustomDomain = !window.location.hostname.endsWith('.lovable.app')
  && window.location.hostname !== 'localhost';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const rawMode = searchParams.get('mode');
  const initialMode: Mode =
    rawMode === 'signup' ? 'sign-up'
    : rawMode === 'forgot' ? 'forgot-password'
    : rawMode === 'reset' ? 'reset-password'
    : 'sign-in';

  // Redirect if already authenticated
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    // Cross-domain OAuth: redirect back to custom domain with session tokens
    const returnOrigin = sessionStorage.getItem('oauth-return-origin');
    if (returnOrigin && window.location.origin !== returnOrigin) {
      sessionStorage.removeItem('oauth-return-origin');
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          const { access_token, refresh_token } = data.session;
          window.location.href = `${returnOrigin}/auth/callback#access_token=${encodeURIComponent(access_token)}&refresh_token=${encodeURIComponent(refresh_token)}`;
        } else {
          navigate(redirectTo, { replace: true });
        }
      });
      return;
    }

    navigate(redirectTo, { replace: true });
  }, [isAuthenticated, authLoading, navigate, redirectTo]);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecoveryVerified, setIsRecoveryVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signUpStep, setSignUpStep] = useState<SignUpStep>('form');
  const [verifyMethod, setVerifyMethod] = useState<VerifyMethod>('otp');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // Show session expired toast if redirected with reason
  useEffect(() => {
    if (searchParams.get('reason') === 'session_expired') {
      toast.info('Your session has expired. Please sign in again.');
    }
  }, [searchParams]);

  // Handle recovery token verification for reset-password mode
  useEffect(() => {
    if (mode !== 'reset-password') return;

    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');

    if (tokenHash && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        .then(({ error }) => {
          if (error) {
            toast.error(error.message || 'Invalid or expired reset link');
            setMode('forgot-password');
          } else {
            setIsRecoveryVerified(true);
          }
        });
    }

    // Also listen for PASSWORD_RECOVERY event as fallback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryVerified(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [mode, searchParams]);

  const handleResetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message || 'Failed to reset password');
      } else {
        toast.success('Password updated successfully!');
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  }, [newPassword, navigate]);

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
      if (verifyMethod === 'otp') {
        // OTP mode: call custom edge function that creates user + sends OTP email
        const { data, error } = await edgeFunctions.functions.invoke('send-signup-otp', {
          body: { email, password, fullName },
        });
        if (error || (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>))) {
          const msg = (data as any)?.error || (error as any)?.message || 'Sign-up failed';
          toast.error(msg);
          if ((error as any)?.status === 409 || msg.includes('already exists')) setMode('sign-in');
          setIsLoading(false);
          return;
        } else {
          navigate('/auth/confirm-email', { state: { email, verifyMethod: 'otp', password, fullName }, replace: true });
        }
      } else {
        // Link mode: standard Supabase signUp (triggers Lovable webhook → confirmation link)
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}`,
          },
        });
        if (error) {
          toast.error(error.message || 'Sign-up failed');
        } else if (data.user?.identities?.length === 0) {
          toast.error('An account with this email already exists. Please sign in.');
          setMode('sign-in');
        } else {
          navigate('/auth/confirm-email', { state: { email, verifyMethod: 'link' }, replace: true });
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Sign-up failed');
    } finally {
      setIsLoading(false);
    }
  }, [email, password, fullName, verifyMethod, navigate]);

  const handleForgotPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
      if (error) {
        toast.error(error.message || 'Failed to send reset email');
      } else {
        toast.success('If an account exists with that email, you\'ll receive a reset link shortly');
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
    setConfirmPassword('');
    setShowConfirmPassword(false);
    setSignUpStep('form');
    setVerifyMethod('otp');
    setAcceptedTerms(false);
    setCaptchaVerified(false);
  };

  const headingText: Record<Mode, string> = {
    'sign-in': 'Welcome back',
    'sign-up': 'Create your account',
    'forgot-password': 'Reset your password',
    'reset-password': 'Set new password',
  };
  const subtitleText: Record<Mode, string> = {
    'sign-in': 'Sign in to continue to WiseResume',
    'sign-up': 'Get started with WiseResume',
    'forgot-password': "Enter your email and we\u2019ll send a reset link",
    'reset-password': 'Choose a new password for your account',
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
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative isolate min-h-[100dvh] flex flex-col overflow-hidden"
    >
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
            background: 'linear-gradient(135deg, hsl(355 85% 52% / 0.7), hsl(270 70% 55% / 0.5), hsl(185 90% 45% / 0.4))',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full space-y-6 rounded-[calc(1rem-1px)] p-6 relative overflow-hidden"
            style={{
              background: 'hsl(var(--card) / 0.25)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid hsl(0 0% 100% / 0.12)',
              boxShadow: '0 0 60px -10px hsl(355 85% 52% / 0.35), 0 25px 50px -12px rgba(0,0,0,0.7)',
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

              {/* ── reset-password ── */}
              {mode === 'reset-password' && (
                <motion.div
                  key="reset-password"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {!isRecoveryVerified ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <MiniSpinner size={24} />
                      <p className="text-sm text-muted-foreground">Verifying reset link...</p>
                    </div>
                  ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <PasswordInput
                        id="new-password"
                        label="New password"
                        value={newPassword}
                        onChange={setNewPassword}
                        show={showNewPassword}
                        onToggleShow={() => setShowNewPassword(!showNewPassword)}
                        autoComplete="new-password"
                        placeholder="Choose a new password"
                        required
                      />
                      <PasswordStrengthMeter password={newPassword} />
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-12 text-base font-semibold gradient-primary glow-primary"
                        disabled={isLoading || !newPassword}
                      >
                        {isLoading ? <MiniSpinner size={20} /> : 'Set new password'}
                      </Button>
                    </form>
                  )}
                </motion.div>
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
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (mode === 'sign-up' && signUpStep === 'form') {
                      setSignUpStep('method');
                      return;
                    }
                    if (mode === 'sign-in') {
                      handleEmailSignIn(e);
                    } else {
                      handleEmailSignUp(e);
                    }
                  }} className="space-y-4">
                    {mode === 'sign-up' && signUpStep === 'method' ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium">How would you like to verify your account?</h3>
                          <div className="space-y-2">
                            <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-muted/50 transition-colors">
                              <input 
                                type="radio" 
                                name="verifyMethod" 
                                value="otp" 
                                checked={verifyMethod === 'otp'} 
                                onChange={(e) => setVerifyMethod(e.target.value as VerifyMethod)}
                                className="w-4 h-4 text-primary"
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">6-digit Code (Recommended)</span>
                                <span className="text-xs text-muted-foreground">Receive a code in your email</span>
                              </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-muted/50 transition-colors">
                              <input 
                                type="radio" 
                                name="verifyMethod" 
                                value="link" 
                                checked={verifyMethod === 'link'} 
                                onChange={(e) => setVerifyMethod(e.target.value as VerifyMethod)}
                                className="w-4 h-4 text-primary"
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">Magic Link</span>
                                <span className="text-xs text-muted-foreground">Click a secure link in your email</span>
                              </div>
                            </label>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setSignUpStep('form')}
                            disabled={isLoading}
                          >
                            Back
                          </Button>
                          <Button
                            type="submit"
                            className="flex-[2] h-10 font-semibold gradient-primary glow-primary"
                            disabled={isLoading}
                          >
                            {isLoading ? <MiniSpinner size={20} /> : 'Create Account'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
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
                        <div className="space-y-4">
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
                            {mode === 'sign-in' && (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => setMode('forgot-password')}
                                  className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                                >
                                  Forgot password?
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {mode === 'sign-up' && (
                            <div className="space-y-1">
                              <PasswordInput
                                id="confirm-password"
                                label="Confirm Password"
                                value={confirmPassword}
                                onChange={setConfirmPassword}
                                show={showConfirmPassword}
                                onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
                                autoComplete="new-password"
                                required
                              />
                              {password && confirmPassword && password !== confirmPassword && (
                                <p className="text-xs text-destructive">Passwords do not match</p>
                              )}
                              <div className="pt-2">
                                <PasswordStrengthMeter password={password} />
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          type="submit"
                          size="lg"
                          className="w-full h-12 text-base font-semibold gradient-primary glow-primary"
                          disabled={
                            isLoading || 
                            !email || 
                            !password || 
                            (mode === 'sign-up' && (!fullName || !confirmPassword || password !== confirmPassword))
                          }
                        >
                          {isLoading ? <MiniSpinner size={20} /> : mode === 'sign-in' ? 'Sign In' : 'Continue'}
                        </Button>
                      </>
                    )}
                  </form>

                  <div className="relative flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full h-12 text-base font-medium gap-3"
                    disabled={isLoading}
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        if (isCustomDomain) {
                          sessionStorage.setItem('oauth-return-origin', window.location.origin);
                        }
                        const result = await lovable.auth.signInWithOAuth("google", {
                          redirect_uri: isCustomDomain ? LOVABLE_ORIGIN : window.location.origin,
                        });
                        if (result?.error) {
                          sessionStorage.removeItem('oauth-return-origin');
                          toast.error('Google sign-in failed. Please try again.');
                        }
                      } catch {
                        sessionStorage.removeItem('oauth-return-origin');
                        toast.error('Google sign-in failed. Please try again.');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </Button>

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
    </motion.div>
  );
}
