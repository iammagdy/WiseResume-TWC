import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useAuth } from '@/hooks/useAuth';
import {
  validateEarlyAccessCode,
  completeEarlyAccessSignup,
  WH_EARLY_ACCESS_CODE_KEY,
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
import { Loader2, AlertCircle, CheckCircle2, Building2, Zap } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';

const COMPANY_SIZES = [
  { value: '1-10', label: '1–10 employees' },
  { value: '11-50', label: '11–50 employees' },
  { value: '51-200', label: '51–200 employees' },
  { value: '201-500', label: '201–500 employees' },
  { value: '501-1000', label: '501–1,000 employees' },
  { value: '1000+', label: '1,000+ employees' },
];

export default function WiseHireEarlyAccessPage() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, supabaseReady } = useAuth();
  const { register: kindeRegister } = useKindeAuth();

  const emailFromQuery = searchParams.get('email') ?? '';
  const isCompleteMode = searchParams.get('complete') === '1';

  // Validation state
  const [validating, setValidating] = useState(!isCompleteMode);
  const [validationError, setValidationError] = useState('');
  const [planOverride, setPlanOverride] = useState('');
  const [planDays, setPlanDays] = useState<number | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(emailFromQuery);
  const [companyName, setCompanyName] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Completion state
  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState('');
  const completionTriggered = useRef(false);

  // Timeout guard: surface a recoverable error if auth+supabase haven't settled
  const [completionTimedOut, setCompletionTimedOut] = useState(false);

  useEffect(() => {
    if (!isCompleteMode) return;
    const timer = window.setTimeout(() => {
      setCompletionTimedOut(true);
    }, 12_000);
    return () => clearTimeout(timer);
  }, [isCompleteMode]);

  // Mode 1 — Validate code on mount
  useEffect(() => {
    if (isCompleteMode || !code) return;
    let cancelled = false;
    (async () => {
      setValidating(true);
      const result = await validateEarlyAccessCode(code);
      if (cancelled) return;
      if (result.valid) {
        setPlanOverride(result.plan_override);
        setPlanDays(result.plan_days);
      } else {
        setValidationError(result.error);
      }
      setValidating(false);
    })();
    return () => { cancelled = true; };
  }, [code, isCompleteMode]);

  // Mode 2 — Post-Kinde completion
  useEffect(() => {
    if (!isCompleteMode) return;
    if (authLoading || !isAuthenticated) return;
    if (!supabaseReady && !completionTimedOut) return;
    if (completionTriggered.current) return;
    completionTriggered.current = true;

    const storedCode = sessionStorage.getItem(WH_EARLY_ACCESS_CODE_KEY);
    const storedName = sessionStorage.getItem('wh_ea_full_name') ?? '';
    const storedCompany = sessionStorage.getItem('wh_ea_company_name') ?? '';
    const storedSize = sessionStorage.getItem('wh_ea_company_size') ?? '';

    if (!storedCode) {
      setCompletionError('Could not find your early access code. Please try again from the landing page.');
      return;
    }

    setCompleting(true);
    completeEarlyAccessSignup({
      early_access_code: storedCode,
      full_name: storedName || undefined,
      company_name: storedCompany || undefined,
      company_size: storedSize || undefined,
    }).then((result) => {
      sessionStorage.removeItem(WH_EARLY_ACCESS_CODE_KEY);
      sessionStorage.removeItem(WH_SIGNUP_REDIRECT_KEY);
      sessionStorage.removeItem('wh_ea_email');
      sessionStorage.removeItem('wh_ea_full_name');
      sessionStorage.removeItem('wh_ea_company_name');
      sessionStorage.removeItem('wh_ea_company_size');

      if (result.success) {
        navigate('/wisehire/onboarding', { replace: true });
      } else {
        const errMap: Record<string, string> = {
          invalid_early_access_code: 'Your early access code is not valid.',
          early_access_code_expired: 'Your early access code has expired.',
          early_access_code_exhausted: 'This early access code has reached its maximum uses. Please contact support.',
          company_setup_failed: 'Could not set up your company profile. Please try again or contact support.',
          plan_activation_failed: 'Could not activate your plan. Please try again or contact support.',
          profile_update_failed: 'Could not update your account. Please try again or contact support.',
        };
        setCompletionError(
          errMap[result.error] ?? 'Something went wrong completing your sign-up. Please try again or contact support.',
        );
        setCompleting(false);
      }
    });
  }, [isCompleteMode, authLoading, isAuthenticated, supabaseReady, completionTimedOut, navigate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim()) { setFormError('Please enter your full name.'); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Please enter a valid work email.');
      return;
    }
    if (!companyName.trim()) { setFormError('Please enter your company name.'); return; }
    if (!companySize) { setFormError('Please select your company size.'); return; }

    setSubmitting(true);

    // Persist through Kinde redirect
    sessionStorage.setItem(WH_EARLY_ACCESS_CODE_KEY, code ?? '');
    sessionStorage.setItem(WH_SIGNUP_REDIRECT_KEY, `/wisehire/signup-early-access/${code}`);
    sessionStorage.setItem('wh_ea_email', email.trim());
    sessionStorage.setItem('wh_ea_full_name', fullName.trim());
    sessionStorage.setItem('wh_ea_company_name', companyName.trim());
    sessionStorage.setItem('wh_ea_company_size', companySize);

    kindeRegister({ loginHint: email.trim() });
  }

  const planLabel = planOverride
    ? planOverride.replace('wisehire_', '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'WiseHire';

  const daysLabel = planDays ? `${planDays}-day ` : '';

  // ── Completion mode ──
  if (isCompleteMode) {
    const stillWaiting = authLoading || !isAuthenticated || (!supabaseReady && !completionTimedOut);
    if (stillWaiting || completing) {
      if (completionTimedOut && !isAuthenticated) {
        return (
          <Shell>
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <AlertCircle className="h-8 w-8 text-amber-500" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Taking longer than expected</p>
                <p className="text-sm text-slate-500 mb-4">We couldn't connect your account. Try reloading the page.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors"
                >
                  Reload
                </button>
              </div>
            </div>
          </Shell>
        );
      }
      return (
        <Shell>
          <div className="flex flex-col items-center gap-4 py-8">
            <MiniSpinner size={36} />
            <p className="text-sm text-slate-500">Setting up your WiseHire account…</p>
          </div>
        </Shell>
      );
    }
    if (completionError) {
      return (
        <Shell>
          <ErrorBlock message={completionError} />
        </Shell>
      );
    }
    return null;
  }

  // ── Validating ──
  if (validating) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-8">
          <MiniSpinner size={36} />
          <p className="text-sm text-slate-500">Verifying your early access code…</p>
        </div>
      </Shell>
    );
  }

  // ── Invalid code ──
  if (validationError) {
    return (
      <Shell>
        <ErrorBlock message={validationError} />
      </Shell>
    );
  }

  // ── Valid code — show sign-up form ──
  return (
    <Shell>
      {/* Confirmed banner */}
      <div
        className="flex items-center gap-2 rounded-lg px-4 py-3 mb-6"
        style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)' }}
      >
        <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Early access confirmed — {daysLabel}{planLabel} access ready
        </p>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
          Create your WiseHire account
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Fill in your details and we'll take you straight to the platform.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ea-fullName">Your full name</Label>
          <Input
            id="ea-fullName"
            placeholder="Jane Smith"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={submitting}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ea-email">Work email</Label>
          <Input
            id="ea-email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ea-companyName">
            <Building2 className="inline h-3.5 w-3.5 mr-1 mb-0.5" />
            Company name
          </Label>
          <Input
            id="ea-companyName"
            placeholder="Acme Corp"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ea-companySize">Company size</Label>
          <Select value={companySize} onValueChange={setCompanySize} disabled={submitting}>
            <SelectTrigger id="ea-companySize">
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
            'Create your WiseHire account'
          )}
        </Button>

        <p className="text-xs text-center text-slate-400 pt-1">
          By creating an account you agree to the{' '}
          <Link to="/wisehire/terms-of-service" className="underline hover:text-slate-600">Terms of Service</Link>
          {' '}and{' '}
          <Link to="/wisehire/privacy-policy" className="underline hover:text-slate-600">Privacy Policy</Link>.
        </p>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#f0f5ff] dark:bg-[#00061a] flex items-start justify-center pt-16 px-4 pb-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-2xl font-extrabold tracking-tight text-blue-700 dark:text-blue-400">
            WiseHire
          </span>
          <p className="text-xs text-slate-400 mt-0.5">by thewise.cloud</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
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
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Code not valid</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{message}</p>
        <Link to="/?for=companies">
          <Button variant="outline" size="sm">
            Back to WiseHire
          </Button>
        </Link>
      </div>
    </div>
  );
}
