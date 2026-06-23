import { useEffect, useState, type FormEvent } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Sparkles, FileText, Rocket, Check } from 'lucide-react';


import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { AppIcon } from '@/components/brand/AppIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { account as appwriteAccount, ID } from '@/lib/appwrite';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { upsertProfileIdentity } from '@/lib/profileSeed';

const HERO_GRADIENT = 'linear-gradient(135deg, #0a0a1a 0%, #0f1525 25%, #12101e 50%, #0d1520 75%, #0a0a1a 100%)';

const SIGNUP_PLAN_KEY = 'signup_plan_intent';

const BRAND_FEATURES = [
  { icon: Sparkles, label: 'AI-assisted tailoring, rewriting & analysis' },
  { icon: FileText, label: 'ATS-ready templates & one-click exports' },
  { icon: Rocket, label: 'Portfolio publishing & career workflows' },
] as const;

type View = 'login' | 'register' | 'claim-account' | 'forgot-password';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading, refreshSession } = useAuth();
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupPlanIntent, setSignupPlanIntent] = useState<string | null>(
    () => (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SIGNUP_PLAN_KEY) : null),
  );

  const redirectTo = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam) {
      sessionStorage.setItem(SIGNUP_PLAN_KEY, planParam);
      setSignupPlanIntent(planParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated && !authLoading) navigate(redirectTo, { replace: true });
  }, [isAuthenticated, authLoading, navigate, redirectTo]);

  // Handle mode parameter from URL (?mode=signup or ?mode=login)
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      setView('register');
    } else if (mode === 'login' || !mode) {
      setView('login');
    }
  }, [searchParams]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    try {
      await appwriteAccount.createEmailPasswordSession(email, password);
      await refreshSession();
      sessionStorage.removeItem(SIGNUP_PLAN_KEY);
      setSignupPlanIntent(null);
      toast.success('Logged in successfully!');
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      const msg = 'Invalid email or password. You can reset your password if needed.';
      setLoginError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Send branded password-reset email via email-service function (bypasses Appwrite template).
      const { error: fnError } = await appwriteFunctions.invoke('email-service', {
        body: { action: 'send-password-reset', email },
      });
      if (fnError) throw new Error(fnError.message);
      toast.success('Reset link sent! Check your inbox.');
      setView('login');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimAccount = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Send branded password-reset email via email-service function (bypasses Appwrite template).
      const { error: fnError } = await appwriteFunctions.invoke('email-service', {
        body: { action: 'send-password-reset', email },
      });
      if (fnError) throw new Error(fnError.message);
      toast.success('Reset link sent! Check your email to set your new password.');
      setView('login');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await appwriteAccount.create(ID.unique(), email, password, name);
      await appwriteAccount.createEmailPasswordSession(email, password);
      const sessionUser = await refreshSession();
      try {
        await upsertProfileIdentity({
          userId: sessionUser?.id ?? (await appwriteAccount.get()).$id,
          email,
          fullName: name,
        });
        await queryClient.invalidateQueries({ queryKey: ['profile'] });
      } catch (seedErr) {
        console.warn('[AuthPage] profile seed after signup failed:', seedErr);
      }
      let emailSent = true;
      try {
        // Send branded verification email via email-service function (bypasses Appwrite template).
        await appwriteFunctions.invoke('email-service', { body: { action: 'send-verification' } });
      } catch {
        emailSent = false;
      }
      if (emailSent) {
        toast.success('Account created! Check your email to verify your account.');
      } else {
        toast.warning('Account created! We had trouble sending the verification email — you can resend it from the next page.');
      }
      const planIntent = sessionStorage.getItem(SIGNUP_PLAN_KEY);
      if (planIntent) {
        const label = planIntent.charAt(0).toUpperCase() + planIntent.slice(1);
        toast.message(`You're signing up for the ${label} plan. Choose your subscription after verifying email.`);
      }
      navigate('/auth/verify-email', { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const headings = (): { title: string; subtitle: string } => {
    switch (view) {
      case 'register':
        return { title: 'Create your account', subtitle: 'Start building smarter resumes in minutes.' };
      case 'forgot-password':
        return { title: 'Reset password', subtitle: "Enter your email and we'll send you a reset link." };
      case 'claim-account':
        return { title: 'Claim your account', subtitle: 'Secure your migrated data with a new password.' };
      case 'login':
      default:
        return { title: 'Welcome back', subtitle: 'Log in to continue building.' };
    }
  };

  const { title, subtitle } = headings();

  return (
    <div className="relative isolate min-h-[100dvh] flex overflow-hidden" style={{ background: HERO_GRADIENT }}>
      <OfflineBanner />

      {/* Brand panel — desktop only */}
      <aside className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden px-14 py-12">
        {/* ambient decorative glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.35), transparent 70%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(56,108,255,0.22), transparent 70%)' }}
        />

        <motion.div
          className="relative z-10 flex items-center gap-3"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <AppIcon size={40} />
          <span className="text-lg font-semibold tracking-tight text-white">WiseResume AI</span>
        </motion.div>

        <motion.div
          className="relative z-10 max-w-md"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h2 className="text-4xl font-bold leading-tight text-white">
            Build smarter resumes with AI.
          </h2>
          <p className="mt-4 text-base text-white/60">
            Structured editing, AI tailoring, and one-click exports — all in one Appwrite-native workspace.
          </p>

          <ul className="mt-8 space-y-4">
            {BRAND_FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-white/75">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <Icon size={18} className="text-primary" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-white/40">
          <Check size={14} className="text-primary" />
          Trusted by thousands of job seekers · resume.thewise.cloud
        </div>
      </aside>

      {/* Form panel */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-10 lg:w-1/2 lg:bg-black/20 lg:backdrop-blur-sm">
        <motion.div
          className="flex w-full max-w-sm flex-col gap-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
            <AppIcon size={48} className="lg:hidden" />
            <div>
              <h1 className="text-2xl font-bold text-white">{title}</h1>
              <p className="mt-1.5 text-sm text-white/50">{subtitle}</p>
            </div>
          </div>

          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <p id="login-error" role="alert" className="text-sm text-red-400 text-center px-1">{loginError}</p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="sr-only">Email</Label>
                <Input id="login-email" type="email" placeholder="Email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setLoginError(null); }} required aria-describedby={loginError ? 'login-error' : undefined} className="bg-white/5 border-white/10 text-white placeholder:text-white/40" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="login-password" className="sr-only">Password</Label>
                <Input id="login-password" type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required aria-describedby={loginError ? 'login-error' : undefined} className="bg-white/5 border-white/10 text-white placeholder:text-white/40" />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setView('forgot-password')}
                    className="text-xs text-white/40 hover:text-white/70 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <MiniSpinner size={18} className="mr-2" /> : 'Login'}
              </Button>
              <p className="text-xs text-center text-white/40">
                Don't have an account?{' '}
                <button type="button" onClick={() => setView('register')} className="text-primary hover:underline">
                  Sign up
                </button>
              </p>
            </form>
          )}

          {view === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email" className="sr-only">Email</Label>
                <Input id="forgot-email" type="email" placeholder="Email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-white/5 border-white/10 text-white placeholder:text-white/40" />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <MiniSpinner size={18} className="mr-2" /> : 'Send Reset Link'}
              </Button>
              <p className="text-xs text-center text-white/40">
                Remembered it?{' '}
                <button type="button" onClick={() => setView('login')} className="text-primary hover:underline">
                  Back to Login
                </button>
              </p>
            </form>
          )}

          {view === 'claim-account' && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-white/60">We found your migrated data. To keep it secure, please set a new password.</p>
              <Button onClick={handleClaimAccount} className="w-full h-11" disabled={loading}>
                {loading ? <MiniSpinner size={18} className="mr-2" /> : 'Send Reset Link'}
              </Button>
              <button onClick={() => setView('login')} className="text-xs text-white/30 hover:underline">Back to Login</button>
            </div>
          )}

          {view === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              {signupPlanIntent && (
                <p className="text-sm text-center text-primary/90 px-1" role="status">
                  You&apos;re signing up for the{' '}
                  <span className="font-semibold capitalize">{signupPlanIntent}</span> plan
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="register-name" className="sr-only">Full Name</Label>
                <Input id="register-name" placeholder="Full Name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} required className="bg-white/5 border-white/10 text-white placeholder:text-white/40" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="register-email" className="sr-only">Email</Label>
                <Input id="register-email" type="email" placeholder="Email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-white/5 border-white/10 text-white placeholder:text-white/40" />
              </div>
              <div>
                <Label htmlFor="register-password" className="sr-only">Password</Label>
                <Input id="register-password" type="password" placeholder="Password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-white/5 border-white/10 text-white placeholder:text-white/40" />
                <p className="text-xs text-white/40 mt-1">At least 8 characters.</p>
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <MiniSpinner size={18} className="mr-2" /> : 'Create Account'}
              </Button>
              <p className="text-xs text-center text-white/40">
                Already have an account?{' '}
                <button type="button" onClick={() => setView('login')} className="text-primary hover:underline">
                  Login
                </button>
              </p>
            </form>
          )}
        </motion.div>
      </main>
    </div>
  );
}
