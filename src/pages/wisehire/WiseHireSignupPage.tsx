import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useAuth } from '@/hooks/useAuth';
import {
  validateInviteToken,
  completeWiseHireSignup,
  WH_INVITE_STORAGE_KEY,
  WH_SIGNUP_REDIRECT_KEY,
} from '@/lib/wisehire/inviteTokenClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertCircle, CheckCircle2, Building2, RefreshCw } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';

const COMPANY_SIZES = [
  { value: '1-10', label: '1–10 employees' },
  { value: '11-50', label: '11–50 employees' },
  { value: '51-200', label: '51–200 employees' },
  { value: '201-500', label: '201–500 employees' },
  { value: '501-1000', label: '501–1,000 employees' },
  { value: '1000+', label: '1,000+ employees' },
];

type InvalidReason = 'not_found' | 'expired' | 'already_used' | 'revoked' | 'invalid_signature' | 'missing_token' | 'server_error';

const REASON_MESSAGES: Record<InvalidReason, string> = {
  not_found: 'This invite link is invalid or does not exist.',
  expired: 'This invite link has expired. Invite links are valid for 72 hours.',
  already_used: 'This invite link has already been used to create an account.',
  revoked: 'This invite link has been revoked. Please contact your administrator.',
  invalid_signature: 'This invite link appears to be tampered with.',
  missing_token: 'No invite token was found in the URL.',
  server_error: 'Something went wrong validating your invite. Please try again.',
};

/** How long to wait for auth + supabaseReady before showing a timeout recovery UI. */
const COMPLETION_TIMEOUT_MS = 12_000;

export default function WiseHireSignupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, supabaseReady } = useAuth();
  const { register: kindeRegister } = useKindeAuth();

  const inviteToken = searchParams.get('invite') ?? '';
  const isCompleteMode = searchParams.get('complete') === '1';

  // Validation state
  const [validating, setValidating] = useState(!isCompleteMode);
  const [invalidReason, setInvalidReason] = useState<InvalidReason | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  // Form state
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Completion state
  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState('');
  const completionTriggered = useRef(false);

  /* Timeout guard: if auth + supabase haven't settled within COMPLETION_TIMEOUT_MS
     we surface a recoverable "Taking longer than expected" UI so the user is never
     stuck in an infinite spinner. */
  const [completionTimedOut, setCompletionTimedOut] = useState(false);

  useEffect(() => {
    if (!isCompleteMode) return;
    const timer = window.setTimeout(() => {
      setCompletionTimedOut(true);
    }, COMPLETION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isCompleteMode]);

  // Mode 1: Normal invite validation (not authenticated, invite token in URL)
  useEffect(() => {
    if (isCompleteMode) return;
    if (!inviteToken) {
      setInvalidReason('missing_token');
      setValidating(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setValidating(true);
      const result = await validateInviteToken(inviteToken);
      if (cancelled) return;
      if (result.valid) {
        setRecipientEmail(result.recipient_email);
        setExpiresAt(result.expires_at);
      } else {
        setInvalidReason(result.reason);
      }
      setValidating(false);
    })();
    return () => { cancelled = true; };
  }, [inviteToken, isCompleteMode]);

  // Mode 2: Post-Kinde-register completion (user is now authenticated)
  useEffect(() => {
    if (!isCompleteMode) return;
    /* Wait for auth to settle. If supabaseReady is also required but hasn't
       resolved yet, the completionTimedOut flag lets us proceed after the grace
       period so the user is never stuck in an infinite spinner. */
    if (authLoading || !isAuthenticated) return;
    if (!supabaseReady && !completionTimedOut) return;
    if (completionTriggered.current) return;
    completionTriggered.current = true;

    const storedToken = sessionStorage.getItem(WH_INVITE_STORAGE_KEY);
    const storedName = sessionStorage.getItem('wh_full_name') ?? '';
    const storedCompany = sessionStorage.getItem('wh_company_name') ?? '';
    const storedSize = sessionStorage.getItem('wh_company_size') ?? '';

    if (!storedToken) {
      setCompletionError('Could not find your invite token. Please use your original invite link.');
      return;
    }

    setCompleting(true);
    completeWiseHireSignup({
      invite_token: storedToken,
      full_name: storedName || undefined,
      company_name: storedCompany || undefined,
      company_size: storedSize || undefined,
    }).then((result) => {
      sessionStorage.removeItem(WH_INVITE_STORAGE_KEY);
      sessionStorage.removeItem(WH_SIGNUP_REDIRECT_KEY);
      sessionStorage.removeItem('wh_full_name');
      sessionStorage.removeItem('wh_company_name');
      sessionStorage.removeItem('wh_company_size');

      if (result.success) {
        navigate('/wisehire/onboarding', { replace: true });
      } else {
        setCompletionError(
          result.error === 'invite_expired'
            ? 'Your invite link expired before you could complete registration.'
            : result.error === 'invite_already_used'
            ? 'This invite was already used. If this is your account, try signing in.'
            : 'Something went wrong completing your sign-up. Please try again or contact support.',
        );
        setCompleting(false);
      }
    });
  }, [isCompleteMode, authLoading, isAuthenticated, supabaseReady, completionTimedOut, navigate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!companyName.trim()) {
      setFormError('Please enter your company name.');
      return;
    }
    if (!companySize) {
      setFormError('Please select your company size.');
      return;
    }

    setSubmitting(true);

    // Store invite data in sessionStorage to survive the Kinde redirect
    sessionStorage.setItem(WH_INVITE_STORAGE_KEY, inviteToken);
    sessionStorage.setItem(WH_SIGNUP_REDIRECT_KEY, '/wisehire/signup');
    sessionStorage.setItem('wh_full_name', fullName.trim());
    sessionStorage.setItem('wh_company_name', companyName.trim());
    sessionStorage.setItem('wh_company_size', companySize);

    // Trigger Kinde registration
    kindeRegister({ loginHint: recipientEmail });
  }

  // ── Completion mode loading ──
  if (isCompleteMode) {
    /* Spinner while auth is in flight — but bail out if timeout fired and
       neither auth nor completion has progressed (avoids indefinite wait). */
    const stillWaiting = authLoading || !isAuthenticated || (!supabaseReady && !completionTimedOut);

    if (stillWaiting || completing) {
      /* If we've timed out but are still stuck (not even authenticated),
         surface a recoverable error instead of spinning forever. */
      if (completionTimedOut && !isAuthenticated) {
        return (
          <SignupShell>
            <TimedOutBlock onRetry={() => window.location.reload()} />
          </SignupShell>
        );
      }
      return (
        <SignupShell>
          <div className="flex flex-col items-center gap-4 py-8">
            <MiniSpinner size={36} />
            <p className="text-sm text-slate-300">Setting up your WiseHire account…</p>
            {completionTimedOut && (
              <p className="text-xs text-slate-400 max-w-xs text-center">
                This is taking a bit longer than usual. Hang tight…
              </p>
            )}
          </div>
        </SignupShell>
      );
    }

    if (completionError) {
      return (
        <SignupShell>
          <ErrorBlock message={completionError} />
        </SignupShell>
      );
    }

    // Should not reach here normally (navigation happens in effect)
    return null;
  }

  // ── Normal mode: validating ──
  if (validating) {
    return (
      <SignupShell>
        <div className="flex flex-col items-center gap-4 py-8">
          <MiniSpinner size={36} />
          <p className="text-sm text-slate-300">Validating your invite…</p>
        </div>
      </SignupShell>
    );
  }

  // ── Normal mode: invalid invite ──
  if (invalidReason) {
    return (
      <SignupShell>
        <ErrorBlock message={REASON_MESSAGES[invalidReason]} />
      </SignupShell>
    );
  }

  // ── Normal mode: valid invite → show form ──
  const expiryFormatted = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <SignupShell>
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Invite verified — you're on the list
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          Set up your WiseHire account
        </h1>
        <p className="text-sm text-slate-400">
          Creating an account for <span className="font-medium text-slate-200">{recipientEmail}</span>
          {expiryFormatted && <span className="ml-2 text-xs text-slate-500">· Invite expires {expiryFormatted}</span>}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="text-slate-300">Your full name</Label>
          <Input
            id="fullName"
            placeholder="Jane Smith"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={submitting}
            autoFocus
            className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-slate-300">Work email</Label>
          <Input
            id="email"
            value={recipientEmail}
            readOnly
            className="bg-slate-800/30 border-slate-700 text-slate-400 cursor-not-allowed"
          />
          <p className="text-xs text-slate-500">This is the email your invite was sent to.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="companyName" className="text-slate-300">
            <Building2 className="inline h-3.5 w-3.5 mr-1 mb-0.5" />
            Company name
          </Label>
          <Input
            id="companyName"
            placeholder="Acme Corp"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={submitting}
            className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="companySize" className="text-slate-300">Company size</Label>
          <Select value={companySize} onValueChange={setCompanySize} disabled={submitting}>
            <SelectTrigger id="companySize" className="bg-slate-800/60 border-slate-700 text-white">
              <SelectValue placeholder="Select company size" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formError && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Redirecting to create account…
            </>
          ) : (
            'Create my account'
          )}
        </Button>

        <p className="text-xs text-center text-slate-500 pt-1">
          By creating an account you agree to the{' '}
          <Link to="/wisehire/terms-of-service" className="underline hover:text-slate-300">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/wisehire/privacy-policy" className="underline hover:text-slate-300">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </SignupShell>
  );
}

/** Full-screen WiseHire-branded shell for the signup/invite flow.
 *  Uses an animated deep-blue gradient background to match the WiseHire
 *  product identity on the landing page. */
function SignupShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(135deg, #020b1a 0%, #0a1628 40%, #0d1f3c 100%)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'clamp(48px,8vh,80px) 16px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Keyframe for the animated glow orbs */}
      <style>{`
        @keyframes wh-signup-pulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.9; transform: translate(-50%, -50%) scale(1.12); }
        }
        @keyframes wh-signup-pulse2 {
          0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.55; transform: translate(-50%, -50%) scale(1.1); }
        }
      `}</style>

      {/* Ambient glow — primary blue orb at top */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.22) 0%, transparent 70%)',
          top: '-100px',
          left: '50%',
          animation: 'wh-signup-pulse 5s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      {/* Ambient glow — secondary indigo orb bottom-right */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 70%)',
          bottom: '-100px',
          right: '-100px',
          animation: 'wh-signup-pulse2 6s ease-in-out infinite 1.5s',
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: '448px', position: 'relative', zIndex: 1 }}>
        {/* WiseHire logo mark */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src="/favicon-wisehire.png"
            alt="WiseHire"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              margin: '0 auto 12px',
              display: 'block',
              boxShadow: '0 0 24px rgba(59,130,246,0.4)',
            }}
          />
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em' }}>
            WiseHire
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(148,163,184,0.7)', marginTop: '2px' }}>
            by thewise.cloud
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: 'clamp(24px, 4vw, 36px)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.15)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
        <AlertCircle className="h-8 w-8 text-red-400" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white mb-1">
          Invite not valid
        </h2>
        <p className="text-sm text-slate-400 mb-4">{message}</p>
        <Link to="/waitlist">
          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800">
            Join the WiseHire waitlist
          </Button>
        </Link>
      </div>
    </div>
  );
}

function TimedOutBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
        <AlertCircle className="h-8 w-8 text-amber-400" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white mb-1">
          Taking longer than expected
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          We couldn't finish connecting your account. This usually resolves with a quick reload.
        </p>
        <Button
          onClick={onRetry}
          className="bg-blue-600 hover:bg-blue-500 text-white"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      </div>
    </div>
  );
}
