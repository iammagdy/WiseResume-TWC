import { useEffect, useLayoutEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Building2, CheckCircle2, Clock3, Mail, ShieldCheck } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { removeSensitiveParamsFromCurrentAddressBar } from '@/lib/security/sensitiveUrlSanitizer';
import {
  clearWiseHireInviteIntent,
  clearWiseHireSignupRedirect,
  completeWiseHireSignup,
  getRememberedWiseHireInvite,
  rememberWiseHireInvite,
  rememberWiseHireSignupRedirect,
  validateInviteToken,
  type InviteFailureReason,
} from '@/lib/wisehire/inviteTokenClient';

const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–1,000', '1,000+'];

const inviteFailureCopy: Record<InviteFailureReason, string> = {
  not_found: 'This invitation was not found. Ask the WiseHire administrator for a new link.',
  expired: 'This invitation has expired. Ask the WiseHire administrator for a new link.',
  already_used: 'This invitation has already been used. Sign in to the account that accepted it.',
  revoked: 'This invitation is no longer active. Ask the WiseHire administrator for a new link.',
  invalid_signature: 'This invitation is invalid. Ask the WiseHire administrator for a new link.',
  missing_token: 'The invitation link is incomplete.',
  server_error: 'We could not validate the invitation. Please try again.',
};

type InviteState =
  | { status: 'checking' }
  | { status: 'none' }
  | { status: 'valid'; email: string; expiresAt: string }
  | { status: 'invalid'; reason: InviteFailureReason };

export default function WiseHireSignupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, loading: authLoading, user } = useAuth();

  const [inviteToken] = useState(() => (
    searchParams.get('invite')?.trim() || getRememberedWiseHireInvite()
  ));
  const [prefillEmail] = useState(() => searchParams.get('email')?.trim() || '');
  const [inviteState, setInviteState] = useState<InviteState>(() => (
    inviteToken ? { status: 'checking' } : { status: 'none' }
  ));
  const [fullName, setFullName] = useState(user?.name ?? '');
  const [companyName, setCompanyName] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useLayoutEffect(() => {
    if (inviteToken) rememberWiseHireInvite(inviteToken);
    removeSensitiveParamsFromCurrentAddressBar(['invite', 'email']);
  }, [inviteToken]);

  useEffect(() => {
    if (!fullName && user?.name) setFullName(user.name);
  }, [fullName, user?.name]);

  useEffect(() => {
    if (!inviteToken) return;
    let active = true;
    void validateInviteToken(inviteToken).then((result) => {
      if (!active) return;
      if (result.valid) {
        rememberWiseHireInvite(inviteToken, result.expires_at);
        setInviteState({ status: 'valid', email: result.recipient_email, expiresAt: result.expires_at });
        return;
      }
      clearWiseHireInviteIntent();
      setInviteState({ status: 'invalid', reason: result.reason });
    });
    return () => { active = false; };
  }, [inviteToken]);

  const expectedEmail = inviteState.status === 'valid' ? inviteState.email : prefillEmail;
  const signedInWithDifferentEmail = (
    inviteState.status === 'valid'
    && Boolean(user?.email)
    && user!.email.trim().toLowerCase() !== inviteState.email.trim().toLowerCase()
  );

  const startAuth = (mode: 'signup' | 'login') => {
    rememberWiseHireSignupRedirect('/wisehire/signup');
    const params = new URLSearchParams({ mode, redirect: '/wisehire/signup' });
    if (expectedEmail) params.set('email', expectedEmail);
    navigate(`/auth?${params.toString()}`);
  };

  const handleComplete = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!isAuthenticated) {
      startAuth('signup');
      return;
    }
    if (!user?.emailVerification) {
      rememberWiseHireSignupRedirect('/wisehire/signup');
      navigate('/auth/verify-email');
      return;
    }
    if (inviteState.status === 'checking') return;
    if (signedInWithDifferentEmail) {
      setError(`This invitation was sent to ${inviteState.status === 'valid' ? inviteState.email : 'another email address'}. Sign in with that account.`);
      return;
    }
    if (!companyName.trim()) {
      setError('Enter your company name to create the workspace.');
      return;
    }

    setSubmitting(true);
    const result = await completeWiseHireSignup({
      invite_token: inviteState.status === 'valid' ? inviteToken : undefined,
      full_name: fullName.trim() || undefined,
      company_name: companyName.trim(),
      company_size: companySize || undefined,
    });
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || 'WiseHire setup could not be completed.');
      return;
    }

    clearWiseHireInviteIntent();
    clearWiseHireSignupRedirect();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
      queryClient.invalidateQueries({ queryKey: ['me'] }),
      queryClient.invalidateQueries({ queryKey: ['wisehire-account'] }),
    ]);
    navigate('/wisehire/onboarding', { replace: true });
  };

  const busy = authLoading || inviteState.status === 'checking' || submitting;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-blue-950/20 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-slate-800 bg-gradient-to-br from-blue-700 to-indigo-950 p-8 lg:border-b-0 lg:border-r lg:p-10">
            <Link to="/?for=companies" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-100 hover:text-white">
              <Building2 className="h-5 w-5" /> WiseHire
            </Link>
            <h1 className="mt-12 text-3xl font-black tracking-tight sm:text-4xl">Set up your hiring workspace</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-blue-100">
              Accept your invitation, verify the receiving account, and start a seven-day Professional trial. Recruiters remain responsible for every hiring decision.
            </p>
            <div className="mt-10 space-y-4 text-sm text-blue-50">
              <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><span>Invitation and account ownership are checked on the server.</span></div>
              <div className="flex gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0" /><span>The trial starts only after setup succeeds.</span></div>
              <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><span>AI output is evidence for review, not an automated hiring decision.</span></div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Invite-only access</p>
              <h2 className="mt-2 text-2xl font-bold">Complete WiseHire setup</h2>
              {inviteState.status === 'checking' && <p className="mt-2 text-sm text-slate-400">Checking your invitation…</p>}
              {inviteState.status === 'valid' && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-sm text-emerald-100">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Invitation confirmed for <strong>{inviteState.email}</strong>.</span>
                </div>
              )}
              {inviteState.status === 'none' && (
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Already approved by an administrator? Sign in and we will verify that approval before creating a workspace.
                </p>
              )}
              {inviteState.status === 'invalid' && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{inviteFailureCopy[inviteState.reason]}</span>
                </div>
              )}
            </div>

            <form className="space-y-5" onSubmit={handleComplete}>
              <div className="space-y-2">
                <Label htmlFor="wisehire-name" className="text-slate-200">Your name</Label>
                <Input id="wisehire-name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={256} className="border-slate-700 bg-slate-950 text-white" autoComplete="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wisehire-company" className="text-slate-200">Company name</Label>
                <Input id="wisehire-company" value={companyName} onChange={(event) => setCompanyName(event.target.value)} maxLength={256} required className="border-slate-700 bg-slate-950 text-white" autoComplete="organization" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wisehire-size" className="text-slate-200">Company size</Label>
                <select
                  id="wisehire-size"
                  value={companySize}
                  onChange={(event) => setCompanySize(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-offset-slate-950 focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <option value="">Select company size</option>
                  {COMPANY_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>

              {signedInWithDifferentEmail && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Signed in as {user?.email}; this invitation belongs to {inviteState.status === 'valid' ? inviteState.email : 'another account'}.</span>
                </div>
              )}
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

              {isAuthenticated ? (
                <Button type="submit" disabled={busy || signedInWithDifferentEmail} className="w-full bg-blue-600 hover:bg-blue-500">
                  {busy ? <><MiniSpinner size={16} /> Completing setup…</> : user?.emailVerification ? 'Create WiseHire workspace' : 'Verify email to continue'}
                </Button>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button type="button" disabled={busy || inviteState.status === 'invalid'} onClick={() => startAuth('signup')} className="bg-blue-600 hover:bg-blue-500">Create account</Button>
                  <Button type="button" disabled={busy} onClick={() => startAuth('login')} variant="outline" className="border-slate-600 bg-transparent text-white hover:bg-slate-800 hover:text-white">Sign in</Button>
                </div>
              )}
            </form>

            <p className="mt-6 text-xs leading-5 text-slate-500">
              By continuing, you agree to the <Link className="text-slate-300 underline" to="/wisehire/terms-of-service">WiseHire Terms</Link> and acknowledge the <Link className="text-slate-300 underline" to="/wisehire/privacy-policy">Privacy Policy</Link>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
