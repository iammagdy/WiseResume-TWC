import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

import { account as appwriteAccount } from '@/lib/appwrite';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { getAuthEmailCallbackParams } from '@/lib/authEmailCallbackParams';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { AuthBold } from '@/components/auth/AuthBold';
import { useLocale } from '@/i18n/LocaleProvider';

export default function AuthResetPasswordPage() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { userId: callbackUserId, secret: callbackSecret } = getAuthEmailCallbackParams(
    typeof window !== 'undefined' ? window.location.search : searchParams.toString(),
    typeof window !== 'undefined' ? window.location.hash : '',
  );
  const userId = callbackUserId ?? '';
  const secret = callbackSecret ?? '';

  const emailParam = (searchParams.get('email') || '').trim();
  const challengeTokenParam = (searchParams.get('challengeToken') || '').trim();

  const isModeA = Boolean(userId && secret);
  const isModeB = Boolean(emailParam && challengeTokenParam);
  const isValidLink = isModeA || isModeB;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isModeA) {
        await appwriteAccount.updateRecovery(userId, secret, password);
        try {
          await appwriteFunctions.invoke('email-service', {
            body: { action: 'send-password-changed', userId, locale },
          });
        } catch {
          /* notification is non-critical */
        }
      } else if (isModeB) {
        const res = await appwriteFunctions.invoke<{ success?: boolean; error?: string }>('email-service', {
          body: {
            action: 'reset-password-with-otp',
            email: emailParam,
            challengeToken: challengeTokenParam,
            password,
            locale,
          },
        });
        if (res.error?.message) {
          throw new Error(res.error.message);
        }
        if (res.data?.error) {
          throw new Error(res.data.error);
        }
        if (!res.data?.success) {
          throw new Error('Reset failed. The link may have expired or is invalid.');
        }
      }
      setDone(true);
      toast.success('Password updated! Please sign in.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reset failed. The link may have expired.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const backToSignIn = () => navigate(`${locale === 'ar' ? '/ar' : ''}/auth?mode=login`, { replace: true });
  const goToForgotPassword = () => navigate(`${locale === 'ar' ? '/ar' : ''}/auth?mode=forgot`, { replace: true });

  let doneSlot: React.ReactNode | undefined;
  if (!isValidLink) {
    doneSlot = (
      <>
        <AlertTriangle color="#f59e0b" size={32} />
        <p style={{ fontSize: 14, color: 'var(--sub)', margin: 0, maxWidth: 280 }}>
          This link is invalid or has already been used. Please request a new password reset.
        </p>
        <button
          type="button"
          onClick={goToForgotPassword}
          style={{
            width: '100%',
            height: 50,
            border: 'none',
            borderRadius: 15,
            background: '#9E1B22',
            color: '#fff',
            font: '700 15px Inter, sans-serif',
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          Request new reset code
        </button>
      </>
    );
  } else if (done) {
    doneSlot = (
      <>
        <ShieldCheck color="#22c55e" size={36} />
        <p style={{ fontSize: 14, color: 'var(--sub)', margin: 0, maxWidth: 280 }}>
          Your password has been reset. Sign in with your new password to continue.
        </p>
        <button
          type="button"
          onClick={backToSignIn}
          style={{
            width: '100%',
            height: 50,
            border: 'none',
            borderRadius: 15,
            background: '#9E1B22',
            color: '#fff',
            font: '700 15px Inter, sans-serif',
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          Sign in
        </button>
      </>
    );
  }

  return (
    <>
      <OfflineBanner />
      <AuthBold
        mode="reset"
        onModeChange={(m) => {
          if (m === 'signin') backToSignIn();
        }}
        password={password}
        onPasswordChange={setPassword}
        confirm={confirm}
        onConfirmChange={setConfirm}
        loading={loading}
        error={error}
        doneSlot={doneSlot}
        onSubmit={handleReset}
      />
    </>
  );
}
