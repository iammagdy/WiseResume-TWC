import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { AuthBold, type AuthBoldMode, type AuthSubmitValues } from '@/components/auth/AuthBold';
import { account as appwriteAccount, ID } from '@/lib/appwrite';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { upsertProfileIdentity } from '@/lib/profileSeed';
import { useLocale } from '@/i18n/LocaleProvider';
import { clearAllPersistedCaches } from '@/lib/persistedQueryCache';
import { clearAllCachedScores } from '@/hooks/useResumeScore';
import { clearAllEditorSessions } from '@/lib/editorSession';
import { clearPlanCache } from '@/lib/planCache';
import { safeInternalRedirect } from '@/lib/security/safeInternalRedirect';
import { authErrorMessage, classifyAuthError } from '@/lib/authError';

const SIGNUP_PLAN_KEY = 'signup_plan_intent';

export default function AuthPage() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
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

  const redirectTo = safeInternalRedirect(searchParams.get('redirect'));

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
    const rawError = searchParams.get('error');
    if (!rawError) return;

    let errorStr = '';
    try {
      const parsed = JSON.parse(decodeURIComponent(rawError));
      if (parsed && typeof parsed === 'object') {
        errorStr = parsed.message || parsed.type || JSON.stringify(parsed);
      } else {
        errorStr = String(parsed);
      }
    } catch {
      errorStr = rawError;
    }

    const isDuplicate = [
      'already exists',
      'user already exists',
      'email already exists',
      'A user with the same',
      'same email',
      'duplicate',
      'conflict',
      '409',
      'user_already_exists',
      'user_email_already_exists'
    ].some(term => errorStr.toLowerCase().includes(term.toLowerCase()));

    const isScopeError = [
      'unauthorized_scope_error',
      'openid'
    ].some(term => errorStr.toLowerCase().includes(term.toLowerCase()));

    const isCancelled = [
      'access_denied',
      'cancelled',
      'denied'
    ].some(term => errorStr.toLowerCase().includes(term.toLowerCase()));

    const isSessionCompletionError = [
      'oauth_session_completion',
      'session completion',
      'session hydration',
    ].some(term => errorStr.toLowerCase().includes(term.toLowerCase()));

    const isProviderUnavailable = [
      'provider unavailable',
      'temporarily unavailable',
      'service unavailable',
    ].some(term => errorStr.toLowerCase().includes(term.toLowerCase()));

    let friendlyError = '';
    if (isDuplicate) {
      friendlyError = locale === 'ar'
        ? 'البريد الإلكتروني ده مسجل بالفعل في WiseResume. سجّل الدخول بالإيميل والباسورد، أو استخدم استعادة كلمة المرور إذا احتجت.'
        : 'This email is already registered with WiseResume. Please sign in using your email and password, or reset your password if needed.';
    } else if (isScopeError) {
      friendlyError = locale === 'ar'
        ? 'تسجيل الدخول عبر LinkedIn غير مكتمل الإعداد حاليًا. جرّب لاحقًا أو سجّل الدخول بالإيميل والباسورد.'
        : 'LinkedIn sign-in is not fully enabled yet. Please try again later or sign in with email and password.';
    } else if (isCancelled) {
      friendlyError = locale === 'ar'
        ? 'تم إلغاء تسجيل الدخول عبر LinkedIn. يمكنك المحاولة مرة أخرى أو تسجيل الدخول بالإيميل والباسورد.'
        : 'LinkedIn sign-in was cancelled. You can try again or sign in with email and password.';
    } else if (isSessionCompletionError) {
      friendlyError = locale === 'ar'
        ? 'تمت العودة من LinkedIn، لكن لم نتمكن من إكمال جلسة WiseResume. سجّل الدخول مرة أخرى.'
        : 'LinkedIn returned successfully, but we could not complete your WiseResume session. Please sign in again.';
    } else if (isProviderUnavailable) {
      friendlyError = locale === 'ar'
        ? 'خدمة تسجيل الدخول عبر LinkedIn غير متاحة مؤقتًا. حاول مرة أخرى لاحقًا أو استخدم البريد الإلكتروني وكلمة المرور.'
        : 'LinkedIn sign-in is temporarily unavailable. Please try again later or use email and password.';
    } else {
      friendlyError = locale === 'ar'
        ? 'فشل تسجيل الدخول عبر LinkedIn. حاول مرة أخرى أو سجّل الدخول بالإيميل والباسورد.'
        : 'LinkedIn sign-in failed. Please try again or sign in with email and password.';
    }

    setError(friendlyError);
    toast.error(friendlyError);
    setMode('signin');

    // Clean the raw error from the URL
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('error');
    const newSearch = newParams.toString();
    const cleanUrl = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;
    navigate(cleanUrl, { replace: true });
  }, [searchParams, locale, navigate, location.pathname]);

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

  const doLogin = async (submittedValues?: AuthSubmitValues) => {
    setLoading(true);
    setError(null);
    const submittedEmail = (submittedValues?.email ?? email).trim();
    const submittedPassword = submittedValues?.password ?? password;
    try {
      await appwriteAccount.createEmailPasswordSession(submittedEmail, submittedPassword);
      // Clear caches only after successful session creation
      queryClient.clear();
      clearAllPersistedCaches();
      clearAllCachedScores();
      clearAllEditorSessions();
      clearPlanCache();
      try {
        await refreshSession();
      } catch {
        // Session was created successfully; hydration failed. useAuth's reactive
        // effect will re-hydrate on the next render cycle. Navigate anyway.
        console.warn('[AuthPage] refreshSession failed after successful login — proceeding to dashboard');
        const msg = 'Signed in, but we could not refresh your workspace. Please reload the page if anything looks wrong.';
        toast.warning(msg);
      }
      sessionStorage.removeItem(SIGNUP_PLAN_KEY);
      setSignupPlanIntent(null);
      toast.success('Logged in successfully!');
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      const classified = classifyAuthError(err);
      console.warn('[AuthPage] email/password sign-in failed', {
        stage: 'create-email-password-session',
        kind: classified.kind,
        status: classified.status,
        code: classified.code,
        type: classified.type,
        requestId: classified.requestId,
      });
      const msg = authErrorMessage(classified.kind);
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
      // Clear caches only after successful session creation
      queryClient.clear();
      clearAllPersistedCaches();
      clearAllCachedScores();
      clearAllEditorSessions();
      clearPlanCache();
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
        const { data, error: fnError } = await appwriteFunctions.invoke<{
          success?: boolean;
          delivery?: 'appwrite';
          providerAccepted?: boolean;
          alreadyVerified?: boolean;
          error?: string;
        }>(
          'email-service',
          { body: { action: 'send-verification', locale } },
        );
        if (fnError || data?.error || data?.success !== true || data.delivery !== 'appwrite' || data.providerAccepted !== true) {
          throw new Error(fnError?.message || data?.error || 'Verification email could not be sent.');
        }
      } catch {
        emailSent = false;
      }
      if (emailSent) {
        toast.success('Account created! We requested a verification email.');
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

  const doLinkedInLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://wiseresume.app';
      const successUrl = `${origin}${locale === 'ar' ? '/ar' : ''}/auth/callback`;
      const failureUrl = `${origin}${locale === 'ar' ? '/ar' : ''}/auth?error=oauth_provider_failure`;
      await appwriteAccount.createOAuth2Session('linkedin', successUrl, failureUrl);
    } catch (err: unknown) {
      console.error('[AuthPage] LinkedIn OAuth redirect failed');
      const msg = 'LinkedIn sign-in failed. Please try again.';
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  const onSubmit = (submittedValues?: AuthSubmitValues) => {
    if (mode === 'signin') return doLogin(submittedValues);
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
        onLinkedInLogin={doLinkedInLogin}
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
