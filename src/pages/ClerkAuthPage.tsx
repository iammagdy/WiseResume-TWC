import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSignIn, useSignUp, useClerk } from '@clerk/clerk-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, User } from 'lucide-react';
import { toast } from 'sonner';

import { MobileLayout } from '@/components/layout/MobileLayout';
import { AppIcon } from '@/components/brand/AppIcon';
import { useAuth } from '@/hooks/useAuth';
import { InputFormField } from '@/components/ui/form-field';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MiniSpinner } from '@/components/ui/MiniSpinner';

type Mode = 'sign-in' | 'sign-up' | 'verify-email';

interface AuthStar {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
}

function generateAuthStars(count: number): AuthStar[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.8,
    opacity: Math.random() * 0.4 + 0.4,
    delay: Math.random() * 4,
    duration: 2.5 + Math.random() * 2,
  }));
}

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Animated background layer for the auth page */
function AuthBackground() {
  const starsRef = useRef(generateAuthStars(10));

  return (
    <>
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Deep space base — richer directional gradient with warmth */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(160deg, hsl(240 35% 5%) 0%, hsl(270 40% 7%) 45%, hsl(355 35% 6%) 100%)',
          }}
        />

        {/* Primary blob — top right (brand red) — boosted to 0.35 */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, hsl(355 85% 52% / 0.35) 0%, transparent 70%)',
            animation: prefersReducedMotion ? 'none' : 'auth-float 9s ease-in-out infinite',
          }}
        />

        {/* Cyan blob — bottom left — boosted to 0.28 */}
        <div
          style={{
            position: 'absolute',
            bottom: '-8%',
            left: '-8%',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, hsl(185 90% 45% / 0.28) 0%, transparent 70%)',
            animation: prefersReducedMotion ? 'none' : 'auth-float 11s ease-in-out 2s infinite reverse',
          }}
        />

        {/* Accent purple blob — mid-center — boosted to 0.22 */}
        <div
          style={{
            position: 'absolute',
            top: '35%',
            left: '20%',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, hsl(270 70% 55% / 0.22) 0%, transparent 70%)',
            animation: prefersReducedMotion ? 'none' : 'auth-float 7s ease-in-out 1s infinite',
          }}
        />

        {/* Pink blob — bottom right — boosted to 0.18 */}
        <div
          style={{
            position: 'absolute',
            bottom: '15%',
            right: '5%',
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, hsl(330 80% 60% / 0.18) 0%, transparent 70%)',
            animation: prefersReducedMotion ? 'none' : 'auth-float 8s ease-in-out 4s infinite reverse',
          }}
        />

        {/* Twinkling stars */}
        {starsRef.current.map((star) => (
          <div
            key={star.id}
            style={{
              position: 'absolute',
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              borderRadius: '50%',
              backgroundColor: 'white',
              opacity: star.opacity,
              animation: prefersReducedMotion
                ? 'none'
                : `auth-twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes auth-float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-22px) scale(1.05); }
        }
        @keyframes auth-twinkle {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes pulse-icon {
          0%, 100% { box-shadow: 0 0 0 2px hsl(355 85% 52% / 0.35), 0 0 20px hsl(355 85% 52% / 0.30); }
          50% { box-shadow: 0 0 0 4px hsl(355 85% 52% / 0.55), 0 0 36px hsl(355 85% 52% / 0.50); }
        }
      `}</style>
    </>
  );
}

export default function ClerkAuthPage() {
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { setActive } = useClerk();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const initialMode = searchParams.get('mode') === 'signup' ? 'sign-up' : 'sign-in';

  // Redirect if already fully authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, redirectTo]);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Show session expired toast if redirected with reason
  useEffect(() => {
    if (searchParams.get('reason') === 'session_expired') {
      toast.info('Your session has expired. Please sign in again.');
    }
  }, [searchParams]);

  const isReady = signInLoaded && signUpLoaded;

  const handleGoogleOAuth = useCallback(async () => {
    if (!signIn) return;
    setGoogleLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: `${window.location.origin}/sign-in/sso-callback`,
        redirectUrlComplete: redirectTo,
      });
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.longMessage || 'Google sign-in failed');
      setGoogleLoading(false);
    }
  }, [signIn]);

  const handleEmailSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn || !email || !password) return;
    setIsLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        navigate(redirectTo, { replace: true });
      } else {
        toast.error('Sign-in incomplete. Please try again.');
      }
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.longMessage || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  }, [signIn, email, password, setActive, navigate]);

  const handleEmailSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp || !email || !password || !username) return;
    setIsLoading(true);
    try {
      const result = await signUp.create({ emailAddress: email, password, username, firstName, lastName });
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        navigate(redirectTo, { replace: true });
      } else {
        // Email verification needed
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setMode('verify-email');
        toast.info('Check your email for a verification code');
      }
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.longMessage || 'Sign-up failed');
    } finally {
      setIsLoading(false);
    }
  }, [signUp, email, password, setActive, navigate]);

  const handleVerifyEmail = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp || !verificationCode) return;
    setIsLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verificationCode });
      console.log('[Clerk Verify]', { status: result.status, missingFields: result.missingFields, resultSession: result.createdSessionId, signUpSession: signUp.createdSessionId });
      
      const sessionId = result.createdSessionId || signUp.createdSessionId;
      
      if (result.status === 'complete' && sessionId) {
        await setActive({ session: sessionId });
        navigate(redirectTo, { replace: true });
      } else if (result.status === 'missing_requirements') {
        const missing = result.missingFields?.join(', ') || 'unknown fields';
        toast.error(`Sign-up requires additional info: ${missing}`);
      } else {
        toast.error('Verification incomplete. Please try again.');
      }
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.longMessage || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  }, [signUp, verificationCode, setActive, navigate]);

  const switchMode = () => {
    setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
    setPassword('');
    setUsername('');
    setFirstName('');
    setLastName('');
    setShowPassword(false);
  };

  if (!isReady || authLoading) {
    return (
      <MobileLayout>
        <AuthBackground />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <MiniSpinner size={32} />
          {authLoading && <p className="text-sm text-muted-foreground">Setting up your account...</p>}
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <AuthBackground />
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 py-8">
        {/* Gradient border wrapper */}
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
          {/* Top light tint — card lit from above by brand red */}
          <div
            className="absolute inset-x-0 top-0 h-28 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, hsl(355 85% 52% / 0.07) 0%, transparent 100%)' }}
          />

          {/* Logo */}
          <div className="flex flex-col items-center gap-3 relative">
            <div
              className="rounded-2xl"
              style={{ animation: 'pulse-icon 3s ease-in-out infinite', boxShadow: '0 0 0 2px hsl(355 85% 52% / 0.35), 0 0 20px hsl(355 85% 52% / 0.30)' }}
            >
              <AppIcon size={56} />
            </div>
            <h1 className="text-2xl font-bold gradient-text">
              {mode === 'verify-email' ? 'Verify your email' : mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              {mode === 'verify-email'
                ? `Enter the code sent to ${email}`
                : mode === 'sign-in'
                  ? 'Sign in to continue to WiseResume'
                  : 'Get started with WiseResume'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {mode === 'verify-email' ? (
              <motion.form
                key="verify"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyEmail}
                className="space-y-4"
              >
                <InputFormField
                  id="verification-code"
                  label="Verification code"
                  icon={<Mail className="w-4 h-4" />}
                  value={verificationCode}
                  onChange={setVerificationCode}
                  placeholder="Enter 6-digit code"
                  autoComplete="one-time-code"
                />
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 text-base font-semibold gradient-primary glow-primary"
                  disabled={isLoading || !verificationCode}
                >
                  {isLoading ? <MiniSpinner size={20} /> : 'Verify & Continue'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setMode('sign-up')}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
              </motion.form>
            ) : (
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === 'sign-in' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'sign-in' ? 20 : -20 }}
                className="space-y-4"
              >
                {/* Google OAuth — premium glass treatment */}
                <button
                  type="button"
                  className="w-full h-12 text-base font-medium gap-3 flex items-center justify-center rounded-xl transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, hsl(240 20% 14% / 0.9), hsl(240 20% 10% / 0.7))',
                    border: '1px solid hsl(0 0% 100% / 0.18)',
                    boxShadow: '0 1px 0 hsl(0 0% 100% / 0.06) inset',
                    color: 'hsl(var(--foreground))',
                  }}
                  onClick={handleGoogleOAuth}
                  disabled={googleLoading || isLoading}
                >
                  {googleLoading ? (
                    <MiniSpinner size={20} />
                  ) : (
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  Continue with Google
                </button>

                {/* Divider — warm gradient shimmer */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, hsl(355 80% 50% / 0.35), transparent)' }} />
                  <span className="text-sm text-muted-foreground">or</span>
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, hsl(355 80% 50% / 0.35), transparent)' }} />
                </div>

                {/* Email/Password Form */}
                <form onSubmit={mode === 'sign-in' ? handleEmailSignIn : handleEmailSignUp} className="space-y-4">
                {mode === 'sign-up' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <InputFormField
                          id="first-name"
                          label="First Name"
                          icon={<User className="w-4 h-4" />}
                          value={firstName}
                          onChange={setFirstName}
                          placeholder="John"
                          autoComplete="given-name"
                          required
                        />
                        <InputFormField
                          id="last-name"
                          label="Last Name"
                          value={lastName}
                          onChange={setLastName}
                          placeholder="Doe"
                          autoComplete="family-name"
                          required
                        />
                      </div>
                      <InputFormField
                        id="username"
                        label="Username"
                        value={username}
                        onChange={setUsername}
                        placeholder="johndoe"
                        autoComplete="username"
                        required
                      />
                    </>
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
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 text-base font-semibold gradient-primary glow-primary"
                    disabled={isLoading || !email || !password || (mode === 'sign-up' && (!username || !firstName || !lastName))}
                  >
                    {isLoading ? <MiniSpinner size={20} /> : mode === 'sign-in' ? 'Sign In' : 'Create Account'}
                  </Button>
                </form>

                {/* Toggle */}
                <p className="text-center text-sm text-muted-foreground">
                  {mode === 'sign-in' ? "Don't have an account?" : 'Already have an account?'}{' '}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="font-semibold text-primary hover:underline"
                  >
                    {mode === 'sign-in' ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </MobileLayout>
  );
}
