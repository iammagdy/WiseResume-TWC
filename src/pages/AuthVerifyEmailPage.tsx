import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Mail, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
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

const HERO_GRADIENT = 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0d0d1e 100%)';

type PageMode = 'pending' | 'confirming' | 'confirmed' | 'error';

/**
 * AuthVerifyEmailPage — dual-mode email verification page.
 *
 * Mode 1 — Pending (no ?secret= in URL):
 *   User just signed up and needs to check their inbox.
 *   Provides a "Resend email" button that calls account.createVerification().
 *
 * Mode 2 — Confirming (?userId=...&secret=... in URL):
 *   User clicked the link in their verification email (Appwrite callback).
 *   Calls account.updateVerification(userId, secret), then redirects to dashboard.
 */
export default function AuthVerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { data: meData, refetch: refetchMe } = useMe();
  const queryClient = useQueryClient();

  const secret = searchParams.get('secret');
  const userId = searchParams.get('userId');
  const [mode, setMode] = useState<PageMode>(secret && userId ? 'confirming' : 'pending');
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmedOnce = useRef(false);

  // Redirect already-verified authenticated users straight to dashboard.
  useEffect(() => {
    if (authLoading || !isAuthenticated || !meData?.profile) return;
    const profile = meData.profile as Record<string, unknown>;
    if (profile.email_verified === true) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, isAuthenticated, meData, navigate]);

  // Auto-confirm when Appwrite callback params are present in the URL.
  useEffect(() => {
    if (!secret || !userId || confirmedOnce.current) return;
    confirmedOnce.current = true;

    void (async () => {
      try {
        setMode('confirming');
        await account.updateVerification(userId, secret);
        // Invalidate meData so the verified status propagates instantly.
        await queryClient.invalidateQueries({ queryKey: ['me'] });
        await refetchMe();
        setMode('confirmed');
        // Hard reload after the "confirmed" flash so AuthContext re-fetches
        // account.get() with the fresh emailVerification: true state.
        setTimeout(() => {
          try { sessionStorage.removeItem('wr_auth_user'); } catch {}
          window.location.replace('/dashboard');
        }, 2200);
      } catch (err) {
        console.error('[AuthVerifyEmailPage] confirm failed:', err);
        const msg =
          err instanceof AppwriteException
            ? err.message
            : 'Verification failed. The link may have expired — request a new one below.';
        toast.error(msg);
        setMode('error');
      }
    })();
  }, [secret, userId, queryClient, refetchMe, navigate]);

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
      // Send branded verification email via our own Resend-powered function.
      // This bypasses Appwrite's template system (which had a {{url}} substitution bug).
      const { error: fnError } = await appwriteFunctions.invoke('send-verification-email');
      if (fnError) throw new Error(fnError.message);
      toast.success('Verification email sent — check your inbox.');
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
  }, [resending, resendCooldown, startCooldown]);

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
          {/* ── Pending mode ─────────────────────────────────────────────── */}
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
                      . Click it to activate your account.
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
                      <Loader2 className="h-4 w-4 animate-spin" />
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
                {isAuthenticated && (
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="text-xs w-full text-center"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    Skip for now
                  </button>
                )}
              </div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Didn't get it? Check your spam folder.
              </p>
            </motion.div>
          )}

          {/* ── Confirming mode ───────────────────────────────────────────── */}
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
              <Loader2 className="h-12 w-12 animate-spin text-red-400" />
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-white">Verifying your email…</h1>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Just a moment.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Confirmed mode ────────────────────────────────────────────── */}
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
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
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

          {/* ── Error mode ────────────────────────────────────────────────── */}
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
                  This verification link has expired or already been used.
                  Request a new one below.
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
                {isAuthenticated && (
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="text-xs w-full text-center"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    Skip for now
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
