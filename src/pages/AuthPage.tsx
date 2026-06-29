import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { AuthBold, type AuthBoldMode } from '@/components/auth/AuthBold';
import { account as appwriteAccount, ID } from '@/lib/appwrite';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { upsertProfileIdentity } from '@/lib/profileSeed';
import { useLocale } from '@/i18n/LocaleProvider';

const SIGNUP_PLAN_KEY = 'signup_plan_intent';

export default function AuthPage() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading, refreshSession } = useAuth();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<AuthBoldMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    const m = searchParams.get('mode');
    if (m === 'signup') setMode('signup');
    else if (m === 'login' || !m) setMode('signin');
  }, [searchParams]);

  useEffect(() => {
    setError(null);
  }, [mode]);

  const doLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await appwriteAccount.createEmailPasswordSession(email, password);
      await refreshSession();
      sessionStorage.removeItem(SIGNUP_PLAN_KEY);
      setSignupPlanIntent(null);
      toast.success('Logged in successfully!');
      navigate(redirectTo, { replace: true });
    } catch {
      const msg = 'Invalid email or password. You can reset your password if needed.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const doForgot = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: fnError } = await appwriteFunctions.invoke('email-service', {
        body: { action: 'send-password-reset', email, locale },
      });
      if (fnError) throw new Error(fnError.message);
      toast.success('Reset link sent! Check your inbox.');
      setMode('signin');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const doRegister = async () => {
    setLoading(true);
    setError(null);
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
        await appwriteFunctions.invoke('email-service', { body: { action: 'send-verification', locale } });
      } catch {
        emailSent = false;
      }
      if (emailSent) {
        toast.success('Account created! Check your email to verify your account.');
      } else {
        toast.warning(
          'Account created! We had trouble sending the verification email — you can resend it from the next page.',
        );
      }
      const planIntent = sessionStorage.getItem(SIGNUP_PLAN_KEY);
      if (planIntent) {
        const label = planIntent.charAt(0).toUpperCase() + planIntent.slice(1);
        toast.message(
          `You're signing up for the ${label} plan. Choose your subscription after verifying email.`,
        );
      }
      navigate('/auth/verify-email', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = () => {
    if (mode === 'signin') return doLogin();
    if (mode === 'signup') return doRegister();
    if (mode === 'forgot') return doForgot();
    return undefined;
  };

  return (
    <>
      <OfflineBanner />
      <AuthBold
        mode={mode}
        onModeChange={setMode}
        name={name}
        onNameChange={setName}
        email={email}
        onEmailChange={setEmail}
        password={password}
        onPasswordChange={setPassword}
        confirm={confirm}
        onConfirmChange={setConfirm}
        remember={remember}
        onRememberChange={setRemember}
        loading={loading}
        error={error}
        notice={
          signupPlanIntent && mode === 'signup'
            ? (
                <>
                  You&apos;re signing up for the{' '}
                  <strong style={{ textTransform: 'capitalize' }}>{signupPlanIntent}</strong> plan.
                </>
              )
            : undefined
        }
        onSubmit={onSubmit}
      />
    </>
  );
}
