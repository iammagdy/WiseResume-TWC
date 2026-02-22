import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock } from 'lucide-react';
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
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { Mail } from 'lucide-react';
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

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'magic-link';

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

// sessionStorage-backed cooldown
function readCooldown(): { failedAttempts: number; cooldownUntil: number | null } {
  try {
    const raw = sessionStorage.getItem(COOLDOWN_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { failedAttempts: 0, cooldownUntil: null };
}

function writeCooldown(failedAttempts: number, cooldownUntil: number | null) {
  sessionStorage.setItem(COOLDOWN_KEY, JSON.stringify({ failedAttempts, cooldownUntil }));
}

function clearCooldown() {
  sessionStorage.removeItem(COOLDOWN_KEY);
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  useGuestMigration(session);

  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  // Reset-password form state
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetTouched, setResetTouched] = useState({ password: false, confirm: false });

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

  // Detect password reset callback
  useEffect(() => {
    if (searchParams.get('reset') === 'true') {
      setMode('reset-password');
      window.history.replaceState({}, '', window.location.pathname);
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset-password');
        window.history.replaceState({}, '', window.location.pathname);
      }
    });
    return () => subscription.unsubscribe();
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
    if (session && mode !== 'reset-password') navigate('/dashboard', { replace: true });
  }, [session, navigate, mode]);

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
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
      setTimeout(() => navigate(redirectTo), 600);
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
        // Generic message to prevent email enumeration
        if (error.message.includes('already registered')) {
          toast.success("If this email is not already registered, you'll receive a verification link shortly.");
        } else {
          toast.error(error.message);
        }
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
        const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
        setTimeout(() => navigate(redirectTo), 600);
      } else {
        toast.success("If this email is not already registered, you'll receive a verification link shortly.");
        setMode('login');
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
    const err = !forgotEmail ? 'Email is required' : undefined;
    try { emailSchema.parse(forgotEmail); } catch { if (!err) { setIsLoading(false); return; } }
    if (err) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      if (error) { toast.error(error.message); return; }
      logAudit('auth', 'password_reset_requested', { email: forgotEmail });
      toast.success('Check your email for the reset link!');
      setMode('login');
    } catch { toast.error('An unexpected error occurred.'); }
    finally { setIsLoading(false); }
  };

  const getResetPasswordError = () => {
    if (!resetPassword) return 'Password is required';
    try { signupPasswordSchema.parse(resetPassword); return undefined; }
    catch (e) { return e instanceof z.ZodError ? e.errors[0]?.message : 'Invalid password'; }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetTouched({ password: true, confirm: true });
    if (getResetPasswordError()) return;
    if (resetPassword !== resetConfirm) { toast.error('Passwords do not match'); return; }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: resetPassword });
      if (error) { toast.error(error.message); return; }
      logAudit('auth', 'password_updated', {});
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/dashboard'), 600);
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
    try { await signInWithGoogle(); } catch { /* handled */ }
    finally { setTimeout(() => setSocialLoading(null), 2000); }
  };

  const handleAppleSignIn = async () => {
    setSocialLoading('apple');
    logAudit('auth', 'login_attempted', { method: 'apple' });
    try { await signInWithApple(); } catch { /* handled */ }
    finally { setTimeout(() => setSocialLoading(null), 2000); }
  };

  const isForgotPassword = mode === 'forgot-password';
  const isResetPassword = mode === 'reset-password';
  const isMagicLink = mode === 'magic-link';
  const resetPasswordError = getResetPasswordError();
  const forgotEmailError = !forgotEmail ? 'Email is required' : (() => { try { emailSchema.parse(forgotEmail); return undefined; } catch { return 'Please enter a valid email'; } })();

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
          {/* App Icon */}
          <motion.div className="flex justify-center mb-4" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
            <AppIcon size={48} className="drop-shadow-[0_0_8px_rgba(139,92,246,0.35)]" />
          </motion.div>

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-display font-bold mb-1">
              {isResetPassword ? 'Set New Password' : isForgotPassword ? 'Reset Password' : isMagicLink ? 'Sign In with Email Link' : mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isResetPassword ? 'Enter your new password below' : isForgotPassword ? "We'll send you a reset link" : isMagicLink ? "We'll send a link to your inbox" : mode === 'login' ? 'Sign in to access your resumes' : 'Sign up to save your work'}
            </p>
          </div>

          {/* Forms */}
          {isResetPassword ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <PasswordInput
                  id="new-password" label="New Password"
                  value={resetPassword} onChange={setResetPassword}
                  onBlur={() => setResetTouched(p => ({ ...p, password: true }))}
                  show={showResetPassword} onToggleShow={() => setShowResetPassword(!showResetPassword)}
                  autoComplete="new-password"
                  error={resetPasswordError} touched={resetTouched.password} required
                />
                <div className="mt-2">
                  <PasswordStrengthMeter password={resetPassword} />
                </div>
              </div>
              <PasswordInput
                id="confirm-password" label="Confirm Password"
                value={resetConfirm} onChange={setResetConfirm}
                onBlur={() => setResetTouched(p => ({ ...p, confirm: true }))}
                show={showResetConfirm} onToggleShow={() => setShowResetConfirm(!showResetConfirm)}
                autoComplete="new-password"
                error={resetTouched.confirm && resetConfirm && resetPassword !== resetConfirm ? 'Passwords do not match' : undefined}
                touched={resetTouched.confirm} required
              />
              <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold gradient-primary glow-primary" disabled={isLoading}>
                {isLoading ? <><MiniSpinner size={20} className="mr-2" />Updating...</> : 'Update Password'}
              </Button>
            </form>
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

          {/* "Explore without account" - hidden on reset-password */}
          {mode !== 'reset-password' && (
            <motion.div className="mt-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground text-sm">
                Explore without account
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </MobileLayout>
  );
}
