import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { InputFormField } from '@/components/ui/form-field';
import { supabase } from '@/integrations/supabase/safeClient';
import { signInWithGoogle, signInWithApple } from '@/lib/socialAuth';
import { useAuth } from '@/hooks/useAuth';
import { useGuestMigration } from '@/hooks/useGuestMigration';
import { toast } from 'sonner';
import { z } from 'zod';
import { AppIcon } from '@/components/brand/AppIcon';
import { logAudit } from '@/lib/auditLogger';
import { MagicLinkForm } from '@/components/auth/MagicLinkForm';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { VerifyEmailScreen } from '@/components/auth/VerifyEmailScreen';
import { Mail } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import haptics from '@/lib/haptics';

const emailSchema = z.string().email('Please enter a valid email');
const signupPasswordSchema = z.string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[0-9]/, 'Include a number');

const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;
const COOLDOWN_KEY = 'wr-auth-cooldown';

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'magic-link' | 'verify-email' | 'email-not-confirmed';

// Retry helper for transient network errors
async function withNetworkRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try { return await fn(); }
  catch (err) {
    const isNetwork = err instanceof Error &&
      (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Load failed'));
    if (isNetwork && retries > 0) {
      await new Promise(r => setTimeout(r, 1500));
      return withNetworkRetry(fn, retries - 1);
    }
    throw err;
  }
}

// localStorage-backed cooldown (survives tab closes)
function readCooldown(): { failedAttempts: number; cooldownUntil: number | null } {
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Clear expired cooldown
      if (data.cooldownUntil && Date.now() >= data.cooldownUntil) {
        localStorage.removeItem(COOLDOWN_KEY);
        return { failedAttempts: 0, cooldownUntil: null };
      }
      return data;
    }
  } catch { /* ignore */ }
  return { failedAttempts: 0, cooldownUntil: null };
}

function writeCooldown(failedAttempts: number, cooldownUntil: number | null) {
  localStorage.setItem(COOLDOWN_KEY, JSON.stringify({ failedAttempts, cooldownUntil }));
}

function clearCooldown() {
  localStorage.removeItem(COOLDOWN_KEY);
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  useGuestMigration(session);

  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  // Store pending verification email for verify-email and email-not-confirmed screens
  const [pendingEmail, setPendingEmail] = useState('');

  // Preserve redirect param across mode changes (survives query param cleanup)
  const redirectRef = useRef<string | null>(null);
  useEffect(() => {
    const redirect = searchParams.get('redirect');
    if (redirect) redirectRef.current = redirect;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // Forgot-password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotTouched, setForgotTouched] = useState(false);

  // Session-expired banner
  useEffect(() => {
    if (searchParams.get('reason') === 'session_expired') {
      toast.info('Your session expired. Please sign in again — your work is saved.', { duration: 6000, icon: '🔐' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);


  // Read ?mode= param
  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'signup') setMode('signup');
    else if (modeParam === 'forgot') setMode('forgot-password');
    if (modeParam) window.history.replaceState({}, '', window.location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect authenticated users
  useEffect(() => {
    if (session) {
      navigate(redirectRef.current || '/dashboard', { replace: true });
    }
  }, [session, navigate, mode]);

  // Show loading skeleton while auth is resolving (prevents flash of login form)
  if (authLoading) {
    return (
      <MobileLayout>
        <div className="flex-1 flex flex-col px-4 py-6 pb-safe">
          <div className="flex items-center gap-2 mb-4 min-h-[44px]">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="w-12 h-4 rounded" />
          </div>
          <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-6">
            <Skeleton className="w-12 h-12 rounded-xl mx-auto" />
            <div className="space-y-2 text-center">
              <Skeleton className="w-40 h-7 rounded mx-auto" />
              <Skeleton className="w-56 h-4 rounded mx-auto" />
            </div>
            <div className="space-y-4">
              <Skeleton className="w-full h-12 rounded-lg" />
              <Skeleton className="w-full h-12 rounded-lg" />
              <Skeleton className="w-full h-12 rounded-lg" />
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // --- Helpers ---
  const getRedirect = () => redirectRef.current || '/dashboard';

  // --- Handlers ---

  const handleLoginSubmit = async (email: string, password: string) => {
    const { failedAttempts, cooldownUntil } = readCooldown();
    if (cooldownUntil && Date.now() < cooldownUntil) {
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
      toast.error(`Too many failed attempts. Try again in ${remaining}s.`);
      return;
    }
    if (!navigator.onLine) { toast.error("You're offline — please check your connection and try again."); return; }

    setIsLoading(true);
    setIsSlowConnection(false);
    logAudit('auth', 'login_attempted', { method: 'email' });
    const slowTimer = setTimeout(() => setIsSlowConnection(true), 15_000);

    try {
      const { error } = await withNetworkRetry(() => supabase.auth.signInWithPassword({ email, password }));
      if (error) {
        haptics.error();
        logAudit('auth', 'login_failed', { method: 'email', reason: error.message });

        // Handle "Email not confirmed" specifically
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setPendingEmail(email);
          setMode('email-not-confirmed');
          return;
        }

        const newAttempts = failedAttempts + 1;
        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          const until = Date.now() + COOLDOWN_SECONDS * 1000;
          writeCooldown(0, until);
          toast.error(`Too many failed attempts. Please wait ${COOLDOWN_SECONDS}s before trying again.`);
        } else {
          writeCooldown(newAttempts, null);
          toast.error(error.message.includes('Invalid login credentials') ? 'Invalid credentials' : error.message);
        }
        return;
      }
      clearCooldown();
      logAudit('auth', 'login_succeeded', { method: 'email' });
      toast.success('Welcome back!');
      setTimeout(() => navigate(getRedirect()), 600);
    } catch (err) {
      const isNetworkErr = err instanceof Error && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Load failed'));
      haptics.error();
      toast.error(isNetworkErr ? 'Connection failed — check your network and try again.' : 'Something went wrong. Please try again.');
    } finally {
      clearTimeout(slowTimer);
      setIsSlowConnection(false);
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (email: string, password: string, fullName: string, phoneNumber: string) => {
    if (!navigator.onLine) { toast.error("You're offline — please check your connection and try again."); return; }

    setIsLoading(true);
    setIsSlowConnection(false);
    const slowTimer = setTimeout(() => setIsSlowConnection(true), 15_000);

    try {
      const { data, error } = await withNetworkRetry(() =>
        supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { full_name: fullName.trim(), phone_number: phoneNumber.trim() || null },
          },
        })
      );
      if (error) {
        haptics.error();

        // Handle pwned/weak password explicitly
        if (
          (error as any).code === 'weak_password' ||
          (error as any).status === 422 ||
          error.message?.toLowerCase().includes('weak') ||
          error.message?.toLowerCase().includes('pwned')
        ) {
          toast.error(
            'This password has been found in a data breach. Please choose a stronger, unique password.',
            { duration: 6000 }
          );
          return;
        }

        // Generic message to prevent email enumeration
        if (error.message.includes('already registered')) {
          toast.success("If this email is not already registered, you'll receive a verification link shortly.");
        } else {
          toast.error(error.message || 'Signup failed. Please try again.');
        }
        return;
      }
      // Handle soft warning: signup succeeded but password is weak/pwned
      if ((data as any)?.weakPassword) {
        haptics.error();
        toast.error(
          'This password has been found in a data breach. Please choose a different one.',
          { duration: 6000 }
        );
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }
      if (data.user) {
        await supabase.from('profiles').upsert(
          { user_id: data.user.id, full_name: fullName.trim(), phone_number: phoneNumber.trim() || null },
          { onConflict: 'user_id' }
        );
      }
      logAudit('auth', 'signup_succeeded', { method: 'email', confirmed: !!data.session });
      if (data.session) {
        toast.success('Account created!');
        setTimeout(() => navigate(getRedirect()), 600);
      } else {
        // Show verify-email screen instead of just toasting
        setPendingEmail(email);
        setMode('verify-email');
      }
    } catch (err) {
      const isNetworkErr = err instanceof Error && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Load failed'));
      haptics.error();
      toast.error(isNetworkErr ? 'Connection failed — check your network and try again.' : 'Something went wrong. Please try again.');
    } finally {
      clearTimeout(slowTimer);
      setIsSlowConnection(false);
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotTouched(true);

    // Validate email before proceeding
    if (!forgotEmail) return;
    try {
      emailSchema.parse(forgotEmail);
    } catch {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) { toast.error(error.message); return; }
      logAudit('auth', 'password_reset_requested', { email: forgotEmail });
      toast.success('Check your email for the reset link!');
      setMode('login');
    } catch { toast.error('An unexpected error occurred.'); }
    finally { setIsLoading(false); }
  };


  const handleMagicLink = async (email: string) => {
    if (!navigator.onLine) { toast.error("You're offline — please check your connection and try again."); return; }
    setIsLoading(true);
    setIsSlowConnection(false);
    const slowTimer = setTimeout(() => setIsSlowConnection(true), 15_000);
    try {
      const { error } = await withNetworkRetry(() =>
        supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
      );
      if (error) { haptics.error(); toast.error(error.message); return; }
      logAudit('auth', 'magic_link_requested', { method: 'magic_link' });
      toast.success('Check your email for the sign-in link!');
      setMode('login');
    } catch (err) {
      const isNetworkErr = err instanceof Error && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Load failed'));
      haptics.error();
      toast.error(isNetworkErr ? 'Connection failed — check your network and try again.' : 'Something went wrong. Please try again.');
    } finally {
      clearTimeout(slowTimer);
      setIsSlowConnection(false);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    logAudit('auth', 'login_attempted', { method: 'google' });
    try {
      await signInWithGoogle();
      // Only keep timeout on success path (page will redirect)
      setTimeout(() => setSocialLoading(null), 2000);
    } catch {
      setSocialLoading(null); // Clear immediately on error
    }
  };

  const handleAppleSignIn = async () => {
    setSocialLoading('apple');
    logAudit('auth', 'login_attempted', { method: 'apple' });
    try {
      await signInWithApple();
      setTimeout(() => setSocialLoading(null), 2000);
    } catch {
      setSocialLoading(null); // Clear immediately on error
    }
  };

  const isForgotPassword = mode === 'forgot-password';
  const isMagicLink = mode === 'magic-link';
  const isVerifyEmail = mode === 'verify-email';
  const isEmailNotConfirmed = mode === 'email-not-confirmed';
  const forgotEmailError = !forgotEmail ? 'Email is required' : (() => { try { emailSchema.parse(forgotEmail); return undefined; } catch { return 'Please enter a valid email'; } })();

  // Header text
  const getHeaderTitle = () => {
    if (isForgotPassword) return 'Reset Password';
    if (isMagicLink) return 'Sign In with Email Link';
    if (isVerifyEmail || isEmailNotConfirmed) return '';
    return mode === 'login' ? 'Welcome Back' : 'Create Account';
  };

  const getHeaderSubtitle = () => {
    if (isForgotPassword) return "We'll send you a reset link";
    if (isMagicLink) return "We'll send a link to your inbox";
    if (isVerifyEmail || isEmailNotConfirmed) return '';
    return mode === 'login' ? 'Sign in to access your resumes' : 'Sign up to save your work';
  };

  return (
    <MobileLayout>
      <div className="flex-1 flex flex-col px-4 py-6 pb-safe">
        <motion.button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground mb-4 min-h-[44px] touch-manipulation active:opacity-70"
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-base">Back</span>
        </motion.button>

        <motion.div
          className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        >
          {/* App Icon - hidden on verify screens */}
          {!isVerifyEmail && !isEmailNotConfirmed && (
            <motion.div className="flex justify-center mb-4" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
              <AppIcon size={48} className="drop-shadow-[0_0_8px_rgba(139,92,246,0.35)]" />
            </motion.div>
          )}

          {/* Header - hidden on verify screens (they have their own) */}
          {getHeaderTitle() && (
            <div className="text-center mb-6">
              <h1 className="text-2xl font-display font-bold mb-1">{getHeaderTitle()}</h1>
              <p className="text-sm text-muted-foreground">{getHeaderSubtitle()}</p>
            </div>
          )}

          {/* Forms */}
          {isVerifyEmail ? (
            <VerifyEmailScreen
              email={pendingEmail}
              onBackToLogin={() => setMode('login')}
              variant="post-signup"
            />
          ) : isEmailNotConfirmed ? (
            <VerifyEmailScreen
              email={pendingEmail}
              onBackToLogin={() => setMode('login')}
              variant="not-confirmed"
            />
          ) : isForgotPassword ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <InputFormField
                id="reset-email" label="Email" type="email"
                icon={<Mail className="w-4 h-4" />}
                value={forgotEmail} onChange={setForgotEmail}
                onBlur={() => setForgotTouched(true)}
                placeholder="you@example.com" autoComplete="email"
                error={forgotEmailError} touched={forgotTouched} required
              />
              <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold gradient-primary glow-primary" disabled={isLoading}>
                {isLoading ? <><MiniSpinner size={20} className="mr-2" />Sending...</> : 'Send Reset Link'}
              </Button>
              <div className="text-center">
                <button type="button" onClick={() => setMode('login')} className="text-primary hover:underline text-sm min-h-[44px] touch-manipulation">
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : isMagicLink ? (
            <MagicLinkForm
              onSubmit={handleMagicLink}
              onBackToLogin={() => setMode('login')}
              isLoading={isLoading}
              isSlowConnection={isSlowConnection}
            />
          ) : mode === 'login' ? (
            <LoginForm
              onSubmit={handleLoginSubmit}
              onForgotPassword={() => setMode('forgot-password')}
              onSwitchToSignup={() => setMode('signup')}
              onMagicLink={() => setMode('magic-link')}
              onGoogleSignIn={handleGoogleSignIn}
              onAppleSignIn={handleAppleSignIn}
              isLoading={isLoading}
              isSlowConnection={isSlowConnection}
              socialLoading={socialLoading}
            />
          ) : (
            <SignupForm
              onSubmit={handleSignupSubmit}
              onSwitchToLogin={() => setMode('login')}
              onGoogleSignIn={handleGoogleSignIn}
              onAppleSignIn={handleAppleSignIn}
              isLoading={isLoading}
              isSlowConnection={isSlowConnection}
              socialLoading={socialLoading}
            />
          )}
        </motion.div>
      </div>
    </MobileLayout>
  );
}
