import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, ArrowLeft, Eye, EyeOff, User, Phone, WifiOff } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { InputFormField } from '@/components/ui/form-field';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/safeClient';
import { signInWithGoogle, signInWithApple } from '@/lib/socialAuth';
import { useAuth } from '@/hooks/useAuth';
import { useGuestMigration } from '@/hooks/useGuestMigration';
import { toast } from 'sonner';
import { z } from 'zod';
import { AppIcon } from '@/components/brand/AppIcon';

const emailSchema = z.string().email('Please enter a valid email');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

// Retry helper for transient network errors (cold connection)
async function withNetworkRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const isNetwork = err instanceof Error &&
      (err.message.includes('Failed to fetch') ||
       err.message.includes('NetworkError') ||
       err.message.includes('Load failed'));
    if (isNetwork && retries > 0) {
      await new Promise(r => setTimeout(r, 1500));
      return withNetworkRetry(fn, retries - 1);
    }
    throw err;
  }
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  useGuestMigration(session);
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [touched, setTouched] = useState<{ email: boolean; password: boolean; confirmPassword: boolean; fullName: boolean; phoneNumber: boolean }>({
    email: false,
    password: false,
    confirmPassword: false,
    fullName: false,
    phoneNumber: false,
  });

  // Validation
  const getEmailError = (): string | undefined => {
    if (!email) return 'Email is required';
    try { emailSchema.parse(email); return undefined; }
    catch (e) { return e instanceof z.ZodError ? e.errors[0]?.message : 'Invalid email'; }
  };

  const getFullNameError = (): string | undefined => {
    if (!fullName.trim()) return 'Full name is required';
    if (fullName.trim().length < 2) return 'Name must be at least 2 characters';
    return undefined;
  };

  const getPhoneError = (): string | undefined => {
    if (!phoneNumber) return undefined; // optional
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!/^\+?\d{7,15}$/.test(cleaned)) return 'Please enter a valid phone number';
    return undefined;
  };

  const getPasswordError = (): string | undefined => {
    if (!password) return 'Password is required';
    try { passwordSchema.parse(password); return undefined; }
    catch (e) { return e instanceof z.ZodError ? e.errors[0]?.message : 'Invalid password'; }
  };

  const emailError = getEmailError();
  const passwordError = getPasswordError();
  const fullNameError = mode === 'signup' ? getFullNameError() : undefined;
  const phoneError = mode === 'signup' ? getPhoneError() : undefined;

  // Show session-expired banner if redirected here due to token expiry
  useEffect(() => {
    if (searchParams.get('reason') === 'session_expired') {
      toast.info('Your session expired. Please sign in again — your work is saved.', {
        duration: 6000,
        icon: '🔐',
      });
      // Clean the URL without full reload
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

  // Read ?mode= param on mount to support direct links to signup/forgot
  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'signup') setMode('signup');
    else if (modeParam === 'forgot') setMode('forgot-password');
    if (modeParam) window.history.replaceState({}, '', window.location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (session && mode !== 'reset-password') navigate('/dashboard', { replace: true });
  }, [session, navigate, mode]);

  const validateInputs = (): boolean => {
    setTouched({ email: true, password: true, confirmPassword: false, fullName: mode === 'signup', phoneNumber: mode === 'signup' });
    if (mode === 'signup') {
      return !emailError && !passwordError && !fullNameError && !phoneError;
    }
    return !emailError && !passwordError;
  };

  const validateEmail = (): boolean => {
    setTouched(prev => ({ ...prev, email: true }));
    return !emailError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    // Immediate offline guard
    if (!navigator.onLine) {
      toast.error("You're offline — please check your connection and try again.");
      return;
    }

    setIsLoading(true);
    setIsSlowConnection(false);

    // Show slow-connection hint after 15s
    const slowTimer = setTimeout(() => setIsSlowConnection(true), 15_000);

    try {
      if (mode === 'login') {
        const { error } = await withNetworkRetry(() =>
          supabase.auth.signInWithPassword({ email, password })
        );
        if (error) {
          toast.error(error.message.includes('Invalid login credentials') ? 'Invalid credentials' : error.message);
          return;
        }
        toast.success('Welcome back!');
        setTimeout(() => navigate('/dashboard'), 600);
      } else {
        const { data, error } = await withNetworkRetry(() =>
          supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
              data: {
                full_name: fullName.trim(),
                phone_number: phoneNumber.trim() || null,
              },
            },
          })
        );
        if (error) {
          toast.error(error.message.includes('already registered') ? 'Already registered. Please sign in.' : error.message);
          return;
        }
        // Save name/phone to profile
        if (data.user) {
          await supabase.from('profiles').upsert(
            {
              user_id: data.user.id,
              full_name: fullName.trim(),
              phone_number: phoneNumber.trim() || null,
            },
            { onConflict: 'user_id' }
          );
        }
        if (data.session) {
          toast.success('Account created!');
          setTimeout(() => navigate('/dashboard'), 600);
        } else {
          toast.success('Account created! Check your email to verify, then sign in.');
          setMode('login');
        }
      }
    } catch (err) {
      const isNetworkErr = err instanceof Error &&
        (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Load failed'));
      toast.error(isNetworkErr
        ? 'Connection failed — check your network and try again.'
        : 'Something went wrong. Please try again.');
    } finally {
      clearTimeout(slowTimer);
      setIsSlowConnection(false);
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail()) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      if (error) { toast.error(error.message); return; }
      toast.success('Check your email for the reset link!');
      setMode('login');
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(prev => ({ ...prev, password: true, confirmPassword: true }));
    if (passwordError) return;
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { toast.error(error.message); return; }
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/dashboard'), 600);
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    try { await signInWithGoogle(); }
    catch { /* handled in helper */ }
    finally { setTimeout(() => setSocialLoading(null), 2000); }
  };

  const handleAppleSignIn = async () => {
    setSocialLoading('apple');
    try { await signInWithApple(); }
    catch { /* handled in helper */ }
    finally { setTimeout(() => setSocialLoading(null), 2000); }
  };

  const isLogin = mode === 'login';
  const isForgotPassword = mode === 'forgot-password';
  const isResetPassword = mode === 'reset-password';

  return (
    <MobileLayout>
      <div className="flex-1 flex flex-col px-4 py-6 pb-safe">
        <motion.button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground mb-4 min-h-[44px] touch-manipulation active:opacity-70"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-base">Back</span>
        </motion.button>

        <motion.div
          className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* App Icon */}
          <motion.div
            className="flex justify-center mb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <AppIcon size={48} className="drop-shadow-[0_0_8px_rgba(139,92,246,0.35)]" />
          </motion.div>

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-display font-bold mb-1">
              {isResetPassword ? 'Set New Password' : isForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isResetPassword
                ? 'Enter your new password below'
                : isForgotPassword
                ? "We'll send you a reset link"
                : isLogin
                ? 'Sign in to access your resumes'
                : 'Sign up to save your work'}
            </p>
          </div>

          {/* Reset Password */}
          {isResetPassword ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <InputFormField
                id="new-password" label="New Password"
                type={showPassword ? 'text' : 'password'}
                icon={<Lock className="w-4 h-4" />}
                value={password} onChange={setPassword}
                onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                placeholder="••••••••" autoComplete="new-password"
                error={passwordError} touched={touched.password} required
                rightElement={
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />
              <InputFormField
                id="confirm-password" label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                icon={<Lock className="w-4 h-4" />}
                value={confirmPassword} onChange={setConfirmPassword}
                onBlur={() => setTouched(prev => ({ ...prev, confirmPassword: true }))}
                placeholder="••••••••" autoComplete="new-password"
                error={touched.confirmPassword && confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined}
                touched={touched.confirmPassword} required
                rightElement={
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />
              <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold gradient-primary glow-primary" disabled={isLoading}>
                {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Updating...</> : 'Update Password'}
              </Button>
            </form>
          ) : isForgotPassword ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <InputFormField
                id="reset-email" label="Email" type="email"
                icon={<Mail className="w-4 h-4" />}
                value={email} onChange={setEmail}
                onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                placeholder="you@example.com" autoComplete="email"
                error={emailError} touched={touched.email} required
              />
              <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold gradient-primary glow-primary" disabled={isLoading}>
                {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Sending...</> : 'Send Reset Link'}
              </Button>
              <div className="text-center">
                <button type="button" onClick={() => setMode('login')} className="text-primary hover:underline text-sm min-h-[44px] touch-manipulation">
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div>
                      <InputFormField
                        id="fullName" label="Full Name" type="text"
                        icon={<User className="w-4 h-4" />}
                        value={fullName} onChange={setFullName}
                        onBlur={() => setTouched(prev => ({ ...prev, fullName: true }))}
                        placeholder="John Doe" autoComplete="name"
                        error={fullNameError} touched={touched.fullName} required
                      />
                    </div>
                    <div>
                      <InputFormField
                        id="phoneNumber" label="Phone Number" type="tel"
                        inputMode="tel"
                        icon={<Phone className="w-4 h-4" />}
                        value={phoneNumber} onChange={setPhoneNumber}
                        onBlur={() => setTouched(prev => ({ ...prev, phoneNumber: true }))}
                        placeholder="+1 (555) 123-4567" autoComplete="tel"
                        error={phoneError} touched={touched.phoneNumber}
                      />
                    </div>
                  </>
                )}
                <div>
                  <InputFormField
                    id="email" label="Email" type="email"
                    icon={<Mail className="w-4 h-4" />}
                    value={email} onChange={setEmail}
                    onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                    placeholder="you@example.com" autoComplete="email"
                    error={emailError} touched={touched.email} required
                  />
                </div>

                <div>
                  <InputFormField
                    id="password" label="Password"
                    type={showPassword ? 'text' : 'password'}
                    icon={<Lock className="w-4 h-4" />}
                    value={password} onChange={setPassword}
                    onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                    placeholder="••••••••"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    error={passwordError} touched={touched.password} required
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    }
                  />
                </div>

                {isLogin && (
                  <div className="text-right">
                    <button type="button" onClick={() => setMode('forgot-password')} className="text-sm text-muted-foreground hover:text-primary transition-colors touch-manipulation">
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button
                  type="submit" size="lg"
                  className="w-full h-12 text-base font-semibold gradient-primary glow-primary mt-2"
                  disabled={isLoading || socialLoading !== null}
                >
                  {isLoading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{isLogin ? 'Signing In...' : 'Creating Account...'}</>
                  ) : (
                    isLogin ? 'Sign In' : 'Create Account'
                  )}
                </Button>

                {/* Slow-connection hint (appears after 15s of loading) */}
                {isSlowConnection && isLoading && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground text-center"
                  >
                    <WifiOff className="w-3 h-3" />
                    This is taking longer than usual — please check your connection.
                  </motion.p>
                )}
              </form>

              {/* Social Divider */}
              <div className="my-5 flex items-center gap-4">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              {/* Social Buttons */}
              <div className="space-y-3">
                <Button type="button" variant="outline" size="lg" className="w-full h-12 text-base font-medium gap-3" onClick={handleGoogleSignIn} disabled={isLoading || socialLoading !== null}>
                  {socialLoading === 'google' ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  Continue with Google
                </Button>

                <Button type="button" variant="outline" size="lg" className="w-full h-12 text-base font-medium gap-3 bg-black text-white hover:bg-black/90 hover:text-white border-black" onClick={handleAppleSignIn} disabled={isLoading || socialLoading !== null}>
                  {socialLoading === 'apple' ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                  )}
                  Continue with Apple
                </Button>
              </div>

              {/* Toggle login/signup */}
              <div className="mt-6 text-center">
                <button type="button" onClick={() => setMode(isLogin ? 'signup' : 'login')} className="text-primary hover:underline text-sm min-h-[44px] touch-manipulation">
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </div>
            </>
          )}

          {/* Skip */}
          <motion.div className="mt-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground text-sm">
              Explore without account
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </MobileLayout>
  );
}
