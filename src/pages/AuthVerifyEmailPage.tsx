import { useCallback, useEffect, useRef, useState } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Mail, RotateCcw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { AppwriteException } from 'appwrite';
import { useAuth } from '@/hooks/useAuth';
import { useMe } from '@/hooks/useMe';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { account } from '@/lib/appwrite';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { getAuthEmailCallbackParams } from '@/lib/authEmailCallbackParams';
import { useLocale } from '@/i18n/LocaleProvider';

const HERO_GRADIENT = 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0d0d1e 100%)';

type PageMode = 'pending' | 'ready-to-confirm' | 'confirming' | 'confirmed' | 'error';

/**
 * AuthVerifyEmailPage — dual-mode email verification page.
 *
 * Mode 1 — Pending (no ?secret= in URL):
 *   User just signed up and needs to check their inbox.
 *
 * Mode 2 — Confirm (userId + secret in URL):
 *   User clicked the email link. They must click "Verify my email" so link
 *   scanners (Outlook Safe Links) do not consume the token on page load.
 */
export default function AuthVerifyEmailPage() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { data: meData, refetch: refetchMe } = useMe();
  const queryClient = useQueryClient();

  const callbackQuery = searchParams.toString();
  const { userId, secret } = getAuthEmailCallbackParams(
    callbackQuery ? `?${callbackQuery}` : '',
    typeof window !== 'undefined' ? window.location.hash : '',
  );
  const hasCallbackParams = Boolean(userId && secret);
  const [mode, setMode] = useState<PageMode>(hasCallbackParams ? 'ready-to-confirm' : 'pending');
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(() => {
    try {
      const ts = localStorage.getItem('wr_verify_resend_ts');
      if (!ts) return 0;
      const remaining = 60 - Math.floor((Date.now() - Number(ts)) / 1000);
      return remaining > 0 ? remaining : 0;
    } catch {
      return 0;
    }
  });
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const persistVerifiedSession = useCallback(async () => {
    try {
      const fresh = await account.get();
      sessionStorage.setItem(
        'wr_auth_user',
        JSON.stringify({
          $id: fresh.$id,
          email: fresh.email,
          name: fresh.name,
          emailVerification: fresh.emailVerification,
        }),
      );
      return fresh.emailVerification === true;
    } catch {
      return false;
    }
  }, []);

  const finishConfirmed = useCallback(async () => {
    await persistVerifiedSession();
    await queryClient.invalidateQueries({ queryKey: ['me'] });
    await refetchMe();
    setMode('confirmed');
    void appwriteFunctions.invoke('email-service', { body: { action: 'send-welcome', locale } }).catch(() => {
      // Non-fatal
    });
    setTimeout(() => {
      try { sessionStorage.removeItem('wr_auth_user'); } catch { /* ignore */ }
      window.location.replace('/dashboard');
    }, 2200);
  }, [persistVerifiedSession, queryClient, refetchMe]);

  // If the email link included userId, check Appwrite (no secret needed) so we can
  // redirect when the token was already consumed by a scanner or an old auto-verify page.
  useEffect(() => {
    if (!userId || authLoading) return;

    void (async () => {
      try {
        const { data, error: fnError } = await appwriteFunctions.invoke<{
          emailVerification?: boolean;
        }>('email-service', {
          body: { action: 'get-verification-status', userId, locale },
        });
        if (!fnError && data?.emailVerification === true) {
          toast.info('Your email is already verified. Taking you to the dashboard…');
          await finishConfirmed();
        }
      } catch {
        // Non-fatal — user can still click Verify my email
      }
    })();
  }, [userId, authLoading, finishConfirmed]);

  // Redirect already-verified users (Appwrite account is source of truth).
  useEffect(() => {
    if (authLoading) return;

    void (async () => {
      try {
        const acct = await account.get();
        if (acct.emailVerification === true) {
          try {
            sessionStorage.setItem(
              'wr_auth_user',
              JSON.stringify({
                $id: acct.$id,
                email: acct.email,
                name: acct.name,
                emailVerification: true,
              }),
            );
          } catch {
            // ignore
          }
          navigate('/dashboard', { replace: true });
          return;
        }
      } catch {
        // not logged in — stay on verify page
      }

      if (!isAuthenticated || !meData?.profile) return;
      const profile = meData.profile as Record<string, unknown>;
      if (profile.email_verified === true || user?.emailVerification === true) {
        navigate('/dashboard', { replace: true });
      }
    })();
  }, [authLoading, isAuthenticated, meData, navigate, user?.emailVerification]);

  const handleConfirmLink = useCallback(async () => {
    if (!userId || !secret || mode === 'confirming') return;

    setMode('confirming');
    try {
      const { data, error: fnError } = await appwriteFunctions.invoke<{
        success?: boolean;
        alreadyVerified?: boolean;
        error?: string;
      }>('email-service', {
        body: { action: 'complete-email-verification', userId, secret, locale },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      if (data?.success || data?.alreadyVerified) {
        if (data.alreadyVerified) {
          toast.info('Your email is already verified. Taking you to the dashboard…');
        }
        await finishConfirmed();
        return;
      }

      throw new Error('Verification failed. Please request a new link.');
    } catch (err) {
      const verified = await persistVerifiedSession();
      if (verified) {
        toast.info('Your email is already verified. Taking you to the dashboard…');
        await finishConfirmed();
        return;
      }

      console.error('[AuthVerifyEmailPage] confirm failed:', err);
      const rawMsg =
        err instanceof AppwriteException
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Verification failed. The link may have expired — request a new one below.';
      const msg = /rate limit/i.test(rawMsg)
        ? 'Too many verification attempts. Wait about an hour, or sign in if you already verified.'
        : rawMsg;
      toast.error(msg);
      setMode('error');
    }
  }, [userId, secret, mode, finishConfirmed, persistVerifiedSession]);

  const startCooldown = useCallback((seconds: number) => {
    setResendCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  const handleResend = useCallback(async () => {
    if (resending || resendCooldown > 0) return;
    setResending(true);
    try {
      const { data, error: fnError } = await appwriteFunctions.invoke<{ alreadyVerified?: boolean; message?: string }>(
        'email-service',
        { body: { action: 'send-verification', locale } },
      );
      if (fnError) throw new Error(fnError.message);
      if (data?.alreadyVerified) {
        toast.info(data.message || 'Your email is already verified. Redirecting…');
        navigate('/dashboard', { replace: true });
        return;
      }
      toast.success('Verification email sent — check your inbox.');
      try { localStorage.setItem('wr_verify_resend_ts', String(Date.now())); } catch { /* ignore */ }
      startCooldown(60);
    } catch (err) {
      const msg =
        err instanceof AppwriteException
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Could not send email. Please try again.';
      toast.error(msg);
    } finally {
      setResending(false);
    }
  }, [resending, resendCooldown, startCooldown, navigate]);

  if (authLoading) return null;

  return (
    <div
      className="relative isolate min-h-[100dvh] flex flex-col overflow-hidden"
      style={{ background: HERO_GRADIENT }}
    >
      <div
        className="pointer-events-none absolute"
        style={{
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
      <OfflineBanner />
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <AnimatePresence mode="wait">
          {mode === 'pending' && (
            <motion.div
              key="pending"
              className="flex flex-col items-center gap-6 px-8 py-10 rounded-2xl max-w-sm w-full text-center"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: 'rgba(230,57,70,0.15)' }}
              >
                <Mail className="h-8 w-8 text-red-400" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-white">Check your inbox</h1>
                {(() => {
                  const userEmail =
                    (meData?.profile as Record<string, unknown> | undefined)?.contact_email as string | undefined ||
                    (meData?.profile as Record<string, unknown> | undefined)?.email as string | undefined;
                  return (
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      We sent a verification link to{' '}
                      {userEmail ? (
                        <span className="font-medium" style={{ color: 'rgba(255,255,255,0.80)' }}>{userEmail}</span>
                      ) : (
                        'your email address'
                      )}
                      . Open the email and click the button to activate your account.
                    </p>
                  );
                })()}
              </div>
              <div className="w-full space-y-3">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleResend}
                  disabled={resending || resendCooldown > 0}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    borderColor: 'rgba(255,255,255,0.12)',
                    color: resendCooldown > 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)',
                  }}
                >
                  {resending ? (
                    <span className="flex items-center gap-2">
                      <MiniSpinner size={16} />
                      Sending…
                    </span>
                  ) : resendCooldown > 0 ? (
                    <span className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Resend verification email
                    </span>
                  )}
                </Button>
              </div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Didn't get it? Check your spam folder.
              </p>
            </motion.div>
          )}

          {mode === 'ready-to-confirm' && (
            <motion.div
              key="ready-to-confirm"
              className="flex flex-col items-center gap-6 px-8 py-10 rounded-2xl max-w-sm w-full text-center"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: 'rgba(230,57,70,0.15)' }}
              >
                <Mail className="h-8 w-8 text-red-400" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-white">Confirm your email</h1>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Click the button below to finish verifying your account. This extra step keeps
                  email security scanners from using your link before you do.
                </p>
              </div>
              <Button className="w-full" onClick={handleConfirmLink}>
                Verify my email
              </Button>
            </motion.div>
          )}

          {mode === 'confirming' && (
            <motion.div
              key="confirming"
              className="flex flex-col items-center gap-6 px-8 py-10 rounded-2xl max-w-sm w-full text-center"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <MiniSpinner size={48} className="text-red-400" />
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-white">Verifying your email…</h1>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Just a moment.
                </p>
              </div>
            </motion.div>
          )}

          {mode === 'confirmed' && (
            <motion.div
              key="confirmed"
              className="flex flex-col items-center gap-6 px-8 py-10 rounded-2xl max-w-sm w-full text-center"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <motion.div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: 'rgba(16,185,129,0.15)' }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              >
                <CheckCircle className="h-9 w-9 text-emerald-400" />
              </motion.div>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-white">Email verified!</h1>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Your account is active. Taking you to your dashboard…
                </p>
              </div>
              <Button className="w-full" onClick={() => navigate('/dashboard', { replace: true })}>
                Go to Dashboard
              </Button>
            </motion.div>
          )}

          {mode === 'error' && (
            <motion.div
              key="error"
              className="flex flex-col items-center gap-6 px-8 py-10 rounded-2xl max-w-sm w-full text-center"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: 'rgba(239,68,68,0.15)' }}
              >
                <AlertCircle className="h-9 w-9 text-red-400" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-white">Link expired or invalid</h1>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  This link may have expired, already been used, or opened by an email security
                  scanner. Request a fresh link, or sign in if you already verified.
                </p>
              </div>
              <div className="w-full space-y-3">
                <Button
                  className="w-full"
                  onClick={() => {
                    setMode('pending');
                    navigate('/auth/verify-email', { replace: true });
                  }}
                >
                  Request a new link
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => navigate('/auth', { replace: true })}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    borderColor: 'rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  Sign in
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
