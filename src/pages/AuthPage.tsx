import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, useReducedMotion } from 'framer-motion';
import { Lock, CheckCircle, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { AppIcon } from '@/components/brand/AppIcon';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';

type FromContext = 'verify-email' | 'reset-password' | null;

const FROM_CONFIG: Record<
  NonNullable<FromContext>,
  { icon: React.ReactNode; title: string; body: string; cta: string }
> = {
  'verify-email': {
    icon: (
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>
    ),
    title: 'Check your inbox to verify your email',
    body: 'We sent a verification link to your email address. Click the link to verify and then sign in.',
    cta: 'Sign In',
  },
  'reset-password': {
    icon: (
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
        <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      </div>
    ),
    title: 'Check your inbox to reset your password',
    body: 'We sent a password reset link to your email address. Follow the link to set a new password.',
    cta: 'Sign In',
  },
};

/** Landing-page hero gradient — same tones used across the dark aesthetic */
const HERO_GRADIENT =
  'linear-gradient(135deg, #0a0a1a 0%, #0f1525 25%, #12101e 50%, #0d1520 75%, #0a0a1a 100%)';

function AnimatedDots() {
  return (
    <div className="flex items-center gap-[6px]">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-[5px] h-[5px] rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.35)' }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/** Full-screen branded redirect screen — shown while the Kinde SDK builds the OAuth URL. */
function BrandedRedirectScreen({ mode }: { mode: string | null }) {
  const prefersReduced = useReducedMotion();

  const statusText =
    mode === 'login' ? 'Signing you in securely\u2026' : 'Taking you to sign up\u2026';

  if (prefersReduced) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-5"
        style={{ background: HERO_GRADIENT }}
      >
        <AppIcon size={56} />
        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {statusText}
        </p>
        <p className="text-xs flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <Lock size={10} />
          Your data is encrypted and secure
        </p>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: HERO_GRADIENT }}
    >
      {/* Ambient glow blobs — pure CSS, no WebGL */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: 600,
          height: 600,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 50%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -60%)',
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          width: 400,
          height: 400,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(99,102,241,0.06) 0%, rgba(99,102,241,0.01) 50%, transparent 70%)',
          top: '60%',
          left: '55%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Logo + spinner ring */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full border-2"
          style={{
            borderColor: 'rgba(255,255,255,0.08)',
            borderTopColor: 'hsl(var(--primary))',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.0, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute"
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <AppIcon size={48} />
        </motion.div>
      </div>

      {/* Status text + trust signal */}
      <motion.div
        className="flex flex-col items-center gap-3 mt-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
      >
        <p
          className="text-sm font-medium tracking-wide"
          style={{ color: 'rgba(255,255,255,0.75)' }}
        >
          {statusText}
        </p>
        <AnimatedDots />
        <p
          className="text-xs flex items-center gap-1.5 mt-1"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          <Lock size={10} />
          Your data is encrypted and secure
        </p>
      </motion.div>
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { login: kindeLogin, register: kindeRegister } = useKindeAuth();
  const triggered = useRef(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const mode = searchParams.get('mode');
  const plan = searchParams.get('plan');
  const fromParam = searchParams.get('from') as FromContext;
  const fromConfig = fromParam && FROM_CONFIG[fromParam] ? FROM_CONFIG[fromParam] : null;
  const isForgotPassword = mode === 'forgot-password';

  useEffect(() => {
    if (searchParams.get('reason') === 'session_expired') {
      toast.info('Your session has expired. Please sign in again.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    navigate(redirectTo, { replace: true });
  }, [isAuthenticated, authLoading, navigate, redirectTo]);

  useEffect(() => {
    // When a ?from= context is present or mode=forgot-password, don't
    // auto-trigger Kinde — show the contextual UI instead.
    if (fromConfig || isForgotPassword) return;
    if (authLoading || isAuthenticated || triggered.current) return;
    triggered.current = true;

    if (plan) {
      try { sessionStorage.setItem('wr-intent-plan', plan); } catch { /* ignore */ }
    }

    void (async () => {
      try {
        if (mode === 'login') {
          await kindeLogin({ prompt: 'login' });
        } else {
          await kindeRegister();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const inIframe = window.self !== window.top;
        if (inIframe && msg.toLowerCase().includes('popup')) {
          // Running inside an iframe (e.g. Replit preview) — the browser blocks
          // popups from iframes. Show a prompt to open the app in its own tab.
          setPopupBlocked(true);
        } else {
          toast.error('Authentication is not available right now. Please try again later.');
        }
      }
    })();
  }, [authLoading, isAuthenticated, mode, plan, kindeLogin, kindeRegister, fromConfig, isForgotPassword]);

  // ── Contextual post-action card (verify-email / reset-password) ──────────
  if (fromConfig) {
    return (
      <div
        className="relative isolate min-h-[100dvh] flex flex-col overflow-hidden"
        style={{ background: HERO_GRADIENT }}
      >
        {/* Ambient glow blob */}
        <div
          className="pointer-events-none absolute"
          style={{
            width: 500,
            height: 500,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
        <OfflineBanner />
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
          <motion.div
            className="flex flex-col items-center gap-6 px-8 py-10 rounded-2xl max-w-sm w-full text-center"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {fromConfig.icon}
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-white">{fromConfig.title}</h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {fromConfig.body}
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                triggered.current = false;
                void Promise.resolve(kindeLogin({ prompt: 'login' })).catch(() => {
                  toast.error('Unable to sign in. Please try again or contact support.');
                });
              }}
            >
              {fromConfig.cta}
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Forgot password form ──────────────────────────────────────────────────
  if (isForgotPassword) {
    const handleForgotSubmit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = forgotEmail.trim();
      if (!trimmed) return;
      setForgotLoading(true);
      try {
        await edgeFunctions.functions.invoke('send-password-reset', {
          body: { email: trimmed },
        });
        navigate('/auth?from=reset-password', { replace: true });
      } catch {
        toast.error('Something went wrong. Please try again.');
      } finally {
        setForgotLoading(false);
      }
    };

    return (
      <div
        className="relative isolate min-h-[100dvh] flex flex-col overflow-hidden"
        style={{ background: HERO_GRADIENT }}
      >
        <div
          className="pointer-events-none absolute"
          style={{
            width: 500, height: 500, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)',
            top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          }}
        />
        <OfflineBanner />
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
          <motion.div
            className="flex flex-col gap-6 px-8 py-10 rounded-2xl max-w-sm w-full"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <button
              onClick={() => navigate('/auth?mode=login', { replace: true })}
              className="flex items-center gap-1.5 text-xs self-start"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </button>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-white">Reset your password</h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Enter your email and we'll send you a reset link.
              </p>
            </div>
            <form onSubmit={handleForgotSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                autoFocus
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-red-500/50"
              />
              <Button type="submit" className="w-full" disabled={forgotLoading}>
                {forgotLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </span>
                ) : (
                  'Send reset link'
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Popup-blocked fallback (Replit preview / sandboxed iframe) ───────────
  if (popupBlocked) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-6 px-6"
        style={{ background: HERO_GRADIENT }}
      >
        <AppIcon size={56} />
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <p className="text-base font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Open the app in its own tab
          </p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Sign-in requires a full browser window. Click below to continue.
          </p>
        </div>
        <Button
          onClick={() => window.open(window.location.href, '_blank')}
          className="mt-2"
        >
          Open in new tab
        </Button>
      </div>
    );
  }

  // ── Redirect loading screen ───────────────────────────────────────────────
  return (
    <>
      {/* Fixed wrapper ensures the banner stacks above the full-screen overlay */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <OfflineBanner />
      </div>
      <BrandedRedirectScreen mode={mode} />
    </>
  );
}
