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
import { Loader2, AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
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
    if (authLoading || !isAuthenticated || !supabaseReady) return;
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
  }, [isCompleteMode, authLoading, isAuthenticated, supabaseReady, navigate]);

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
    if (authLoading || !supabaseReady || completing) {
      return (
        <WiseHireShell>
          <div className="flex flex-col items-center gap-4 py-8">
            <MiniSpinner size={36} />
            <p className="text-sm text-slate-500">Setting up your WiseHire account…</p>
          </div>
        </WiseHireShell>
      );
    }

    if (completionError) {
      return (
        <WiseHireShell>
          <ErrorBlock message={completionError} />
        </WiseHireShell>
      );
    }

    // Should not reach here normally (navigation happens in effect)
    return null;
  }

  // ── Normal mode: validating ──
  if (validating) {
    return (
      <WiseHireShell>
        <div className="flex flex-col items-center gap-4 py-8">
          <MiniSpinner size={36} />
          <p className="text-sm text-slate-500">Validating your invite…</p>
        </div>
      </WiseHireShell>
    );
  }

  // ── Normal mode: invalid invite ──
  if (invalidReason) {
    return (
      <WiseHireShell>
        <ErrorBlock message={REASON_MESSAGES[invalidReason]} />
      </WiseHireShell>
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
    <WiseHireShell>
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Invite verified — you're on the list
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Set up your WiseHire account
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Creating an account for <span className="font-medium text-slate-700 dark:text-slate-300">{recipientEmail}</span>
          {expiryFormatted && <span className="ml-2 text-xs text-slate-400">· Invite expires {expiryFormatted}</span>}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Your full name</Label>
          <Input
            id="fullName"
            placeholder="Jane Smith"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={submitting}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            value={recipientEmail}
            readOnly
            className="bg-slate-50 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
          />
          <p className="text-xs text-slate-400">This is the email your invite was sent to.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="companyName">
            <Building2 className="inline h-3.5 w-3.5 mr-1 mb-0.5" />
            Company name
          </Label>
          <Input
            id="companyName"
            placeholder="Acme Corp"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="companySize">Company size</Label>
          <Select value={companySize} onValueChange={setCompanySize} disabled={submitting}>
            <SelectTrigger id="companySize">
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
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold"
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

        <p className="text-xs text-center text-slate-400 pt-1">
          By creating an account you agree to the{' '}
          <Link to="/terms-of-service" className="underline hover:text-slate-600">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy-policy" className="underline hover:text-slate-600">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </WiseHireShell>
  );
}

function WiseHireShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#f0f5ff] dark:bg-[#00061a] flex items-start justify-center pt-16 px-4 pb-12">
      <div className="w-full max-w-md">
        {/* WiseHire brand header */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-extrabold tracking-tight text-blue-700 dark:text-blue-400">
            WiseHire
          </span>
          <p className="text-xs text-slate-400 mt-0.5">by thewise.cloud</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
          Invite not valid
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{message}</p>
        <Link to="/waitlist">
          <Button variant="outline" size="sm">
            Join the WiseHire waitlist
          </Button>
        </Link>
      </div>
    </div>
  );
}
