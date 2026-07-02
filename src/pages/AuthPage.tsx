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

  const [forgotStep, setForgotStep] = useState<'email' | 'otp'>('email');
  const [otp, setOtp] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [doneSlot, setDoneSlot] = useState<React.ReactNode | null>(null);

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
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
    if (m === 'signup') setMode('signup');
    else if (m === 'forgot') {
      setMode('forgot');
      setForgotStep('email');
    }
    else if (m === 'login' || !m) setMode('signin');
  }, [searchParams]);

  useEffect(() => {
    setError(null);
    if (mode !== 'forgot') {
      setForgotStep('email');
      setOtp('');
    }
    if (mode !== 'reset') {
      setDoneSlot(null);
    }
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

  const doSendPasswordResetOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: fnError } = await appwriteFunctions.invoke('email-service', {
        body: { action: 'send-password-reset-otp', email, locale },
      });
      if (fnError) throw new Error(fnError.message);
      toast.success(locale === 'ar' 
        ? 'تم إرسال رمز التحقق! يرجى التحقق من بريدك الإلكتروني.' 
        : 'Verification code sent! Please check your email.');
      setForgotStep('otp');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification code';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const doVerifyPasswordResetOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await appwriteFunctions.invoke<{ success: boolean; challengeToken: string }>('email-service', {
        body: { action: 'verify-password-reset-otp', email, otp },
      });
      if (fnError) throw new Error(fnError.message);
      if (!data?.challengeToken) throw new Error('Challenge token not received from server');
      
      setChallengeToken(data.challengeToken);
      setMode('reset');
      toast.success(locale === 'ar'
        ? 'تم التحقق من الرمز بنجاح! يرجى تعيين كلمة مرور جديدة.'
        : 'Verification successful! Please choose a new password.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify verification code';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const doResetPasswordWithOtp = async () => {
    if (password !== confirm) {
      setError(locale === 'ar' ? 'كلمتا المرور غير متطابقتين.' : "Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError(locale === 'ar' ? 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.' : 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: fnError } = await appwriteFunctions.invoke('email-service', {
        body: { action: 'reset-password-with-otp', email, challengeToken, password, locale },
      });
      if (fnError) throw new Error(fnError.message);
      
      toast.success(locale === 'ar'
        ? 'تم تحديث كلمة المرور بنجاح!'
        : 'Password updated successfully!');
        
      setDoneSlot(
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '10px 0' }}>
          <div style={{ display: 'inline-flex', padding: 14, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%', color: '#22c55e' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 11 2 2 4-4" />
            </svg>
          </div>
          <p style={{ fontSize: 15, color: 'var(--fg)', fontWeight: 600, margin: 0 }}>
            {locale === 'ar' ? 'تمت إعادة تعيين كلمة المرور بنجاح!' : 'Password reset successful!'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--sub)', margin: 0, maxWidth: 280 }}>
            {locale === 'ar' ? 'يرجى تسجيل الدخول باستخدام كلمة المرور الجديدة.' : 'You can now sign in using your new password.'}
          </p>
          <button
            type="button"
            onClick={() => setMode('signin')}
            style={{
              width: '100%',
              height: 48,
              border: 'none',
              borderRadius: 12,
              background: '#9E1B22',
              color: '#fff',
              font: '700 14px Inter, sans-serif',
              cursor: 'pointer',
              marginTop: 8,
              transition: 'background 0.2s',
            }}
          >
            {locale === 'ar' ? 'العودة إلى تسجيل الدخول' : 'Back to sign in'}
          </button>
        </div>
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password';
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
    if (mode === 'forgot') {
      if (forgotStep === 'email') return doSendPasswordResetOtp();
      if (forgotStep === 'otp') return doVerifyPasswordResetOtp();
    }
    if (mode === 'reset') return doResetPasswordWithOtp();
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
        forgotStep={forgotStep}
        otp={otp}
        onOtpChange={setOtp}
        doneSlot={doneSlot}
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
