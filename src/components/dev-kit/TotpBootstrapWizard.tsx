import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TotpQRCode } from './TotpQRCode';

interface RequestResult {
  success: boolean;
  otpauth_url: string;
  secret_b32: string;
  expires_at: string;
}

interface ConfirmResult {
  success: boolean;
  automated?: boolean;
  new_secret?: string;
  secret_name?: string;
  manual_update_reason?: string;
}

type Step = 'credentials' | 'scan' | 'verify' | 'manual_followup' | 'done';

export interface TotpBootstrapWizardProps {
  initialEmail?: string;
  onCancel: () => void;
  /**
   * Called once setup is complete (either automated or after the admin says
   * they've manually pasted the secret). Receives the email so the parent
   * can pre-fill the login form.
   */
  onComplete: (email: string) => void;
}

const STEP_LABELS: Record<Exclude<Step, 'manual_followup' | 'done'>, string> = {
  credentials: 'Verify identity',
  scan: 'Scan QR code',
  verify: 'Confirm code',
};

export function TotpBootstrapWizard({ initialEmail, onCancel, onComplete }: TotpBootstrapWizardProps) {
  const [step, setStep] = useState<Step>('credentials');

  // Step 1: credentials
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);

  // Step 2/3: enrolment
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [secretB32, setSecretB32] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  // Step 3: confirm
  const [totpCode, setTotpCode] = useState('');
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Manual fallback (Management API not configured)
  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [manualSecretName, setManualSecretName] = useState<string>('ADMIN_TOTP_SECRET');
  const [manualReason, setManualReason] = useState<string | null>(null);
  const [retryLoading, setRetryLoading] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied to clipboard`),
      () => toast.error('Failed to copy to clipboard'),
    );
  };

  const handleCredentialsSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      setCredentialsError('Enter your admin email and DevKit password.');
      return;
    }

    setRequestLoading(true);
    setCredentialsError(null);

    try {
      const tuple = await edgeFunctions.functions.invoke('admin-rotate-totp', {
        body: {
          action: 'bootstrap_request',
          email: trimmedEmail,
          password: password.trim(),
        },
      });
      const result = unwrapAdminResponse<RequestResult>(tuple, 'admin-rotate-totp');
      setOtpauthUrl(result.otpauth_url);
      setSecretB32(result.secret_b32);
      setStep('scan');
    } catch (err) {
      const msg = formatEdgeError(err, 'Could not start setup');
      // Server returns a structured reason for already-configured / rate-limited.
      if (msg.toLowerCase().includes('already configured')) {
        setCredentialsError('A TOTP secret is already configured. Use the regular login.');
      } else if (msg.toLowerCase().includes('too many')) {
        setCredentialsError(msg);
      } else if (msg.toLowerCase().includes('not in the admin')) {
        setCredentialsError('This email is not in the admin allow-list.');
      } else if (msg.toLowerCase().includes('incorrect devkit password')) {
        setCredentialsError('Incorrect DevKit password.');
      } else {
        setCredentialsError(msg);
      }
    } finally {
      setRequestLoading(false);
    }
  };

  const handleConfirm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = totpCode.trim();
    if (code.length !== 6) {
      setConfirmError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    setConfirmLoading(true);
    setConfirmError(null);

    try {
      const tuple = await edgeFunctions.functions.invoke('admin-rotate-totp', {
        body: {
          action: 'bootstrap_confirm',
          email: email.trim(),
          password: password.trim(),
          totp_code: code,
        },
      });
      const result = unwrapAdminResponse<ConfirmResult>(tuple, 'admin-rotate-totp');

      if (result.automated) {
        setStep('done');
        toast.success('DevKit setup complete', {
          description: 'You can now sign in with your authenticator code.',
        });
        // Brief celebration screen, then drop into login.
        setTimeout(() => onComplete(email.trim()), 1200);
        return;
      }

      // Management API not wired up — show manual paste fallback.
      setManualSecret(result.new_secret ?? secretB32);
      setManualSecretName(result.secret_name ?? 'ADMIN_TOTP_SECRET');
      setManualReason(result.manual_update_reason ?? null);
      setStep('manual_followup');
    } catch (err) {
      setConfirmError(formatEdgeError(err, 'Could not verify code'));
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleManualRetry = async () => {
    setRetryLoading(true);
    try {
      // Cheap unauthenticated probe — once the admin has pasted ADMIN_TOTP_SECRET
      // into Supabase, this flips to totp_configured=true and we can hand off to
      // the regular login form. We deliberately do NOT re-call bootstrap_confirm
      // here, because once the secret exists the server hard-refuses with
      // already_configured (409) — which is the success case for this flow.
      const tuple = await edgeFunctions.functions.invoke('admin-rotate-totp', {
        body: { action: 'bootstrap_status' },
      });
      const result = unwrapAdminResponse<{ totp_configured?: boolean }>(tuple, 'admin-rotate-totp');
      if (result.totp_configured) {
        setStep('done');
        toast.success('Setup confirmed');
        setTimeout(() => onComplete(email.trim()), 1000);
      } else {
        // Secret not visible to the edge function yet. Could be propagation
        // delay or the admin hasn't actually saved it. Let the user retry.
        toast.info('Secret not detected yet', {
          description: 'Supabase can take a few seconds to apply a new secret. Try again shortly, or continue and the login form will tell you if it is still missing.',
        });
      }
    } catch (err) {
      toast.error(formatEdgeError(err, 'Could not verify setup'));
    } finally {
      setRetryLoading(false);
    }
  };

  const handleManualSkipToLogin = () => {
    onComplete(email.trim());
  };

  const renderStepIndicator = () => {
    const steps: Array<Exclude<Step, 'manual_followup' | 'done'>> = ['credentials', 'scan', 'verify'];
    const currentIndex =
      step === 'credentials' ? 0
      : step === 'scan' ? 1
      : step === 'verify' ? 2
      : step === 'done' ? 3
      : 2; // manual_followup sits at the verify step

    return (
      <div className="flex items-center justify-center gap-1.5">
        {steps.map((s, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className={cn(
                  'flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold transition-colors',
                  isDone
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                    ? 'bg-primary/20 text-primary border border-primary/40'
                    : 'bg-muted text-muted-foreground border border-border'
                )}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium hidden sm:inline',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {STEP_LABELS[s]}
              </span>
              {idx < steps.length - 1 && <div className="w-4 sm:w-8 h-px bg-border" />}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-5">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mx-auto">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Set up DevKit access</h1>
          <p className="text-xs text-muted-foreground mt-1">
            One-time setup of your authenticator code for admin sign-in.
          </p>
        </div>
        {step !== 'done' && step !== 'manual_followup' && renderStepIndicator()}
      </div>

      {/* Step 1: credentials */}
      {step === 'credentials' && (
        <form
          onSubmit={handleCredentialsSubmit}
          className="bg-card border border-border rounded-2xl p-5 shadow-lg space-y-4"
        >
          <p className="text-xs text-muted-foreground">
            Confirm you&apos;re an admin on this install. We&apos;ll then generate a
            QR code for your authenticator app.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Admin email</label>
            <Input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setCredentialsError(null); }}
              disabled={requestLoading}
              autoFocus
              autoComplete="username"
              className={cn('h-11', credentialsError && 'border-destructive ring-1 ring-destructive/20')}
            />
            <p className="text-[10px] text-muted-foreground pl-0.5">Must be in your ADMIN_EMAILS list.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">DevKit password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="DEV_KIT_PASSWORD secret"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setCredentialsError(null); }}
                disabled={requestLoading}
                autoComplete="off"
                className={cn(
                  'h-11 pr-10',
                  credentialsError && 'border-destructive ring-1 ring-destructive/20'
                )}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword(s => !s)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {credentialsError && (
            <p className="text-xs text-destructive font-medium pl-0.5">{credentialsError}</p>
          )}

          <Button
            type="submit"
            disabled={requestLoading || !email.trim() || !password.trim()}
            className="w-full h-11 font-semibold"
          >
            {requestLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating QR code…</>
            ) : (
              <>Continue<ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel setup
          </button>
        </form>
      )}

      {/* Step 2: scan QR */}
      {step === 'scan' && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-lg space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-primary" />
              Scan with your authenticator
            </p>
            <p className="text-xs text-muted-foreground">
              Open Google Authenticator (or similar) → <span className="font-medium">Add account → Scan QR code</span>.
            </p>
          </div>

          {otpauthUrl && (
            <div className="flex justify-center">
              <TotpQRCode otpauthUrl={otpauthUrl} size={200} />
            </div>
          )}

          {secretB32 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Can&apos;t scan? Enter this key manually:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-[11px] bg-muted rounded-md px-3 py-2 break-all select-all">
                  {showSecret ? secretB32 : '•'.repeat(Math.min(secretB32.length, 32))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => setShowSecret(s => !s)}
                >
                  {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => copyToClipboard(secretB32, 'Secret')}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('credentials')}
              className="flex-1 h-11"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
            <Button
              type="button"
              onClick={() => setStep('verify')}
              className="flex-1 h-11 font-semibold"
            >
              Next<ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: verify code */}
      {step === 'verify' && (
        <form
          onSubmit={handleConfirm}
          className="bg-card border border-border rounded-2xl p-5 shadow-lg space-y-4"
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-primary" />
              Confirm the 6-digit code
            </p>
            <p className="text-xs text-muted-foreground">
              Type the current code shown in your authenticator app for the new entry.
            </p>
          </div>

          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            value={totpCode}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6);
              setTotpCode(v);
              setConfirmError(null);
            }}
            disabled={confirmLoading}
            autoFocus
            autoComplete="one-time-code"
            className={cn(
              'h-12 font-mono tracking-[0.5em] text-center text-lg',
              confirmError && 'border-destructive ring-1 ring-destructive/20'
            )}
          />

          {confirmError && (
            <p className="text-xs text-destructive font-medium pl-0.5">{confirmError}</p>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('scan')}
              disabled={confirmLoading}
              className="flex-1 h-11"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
            <Button
              type="submit"
              disabled={confirmLoading || totpCode.length !== 6}
              className="flex-1 h-11 font-semibold"
            >
              {confirmLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-1.5" />Finish setup</>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Manual fallback: Management API not configured */}
      {step === 'manual_followup' && (
        <div className="bg-card border border-amber-500/30 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">One more manual step</p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                Your authenticator is enrolled, but we couldn&apos;t save the secret automatically.
              </p>
            </div>
          </div>

          {manualReason && (
            <p className="text-[11px] text-muted-foreground italic">{manualReason}</p>
          )}

          {manualSecret && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">
                Add this secret in Supabase Edge Function secrets:
              </p>
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Name</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-xs bg-muted rounded-md px-3 py-2">
                    {manualSecretName}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0"
                    onClick={() => copyToClipboard(manualSecretName, 'Secret name')}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Value</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-[11px] bg-muted rounded-md px-3 py-2 break-all select-all">
                    {showSecret ? manualSecret : '•'.repeat(Math.min(manualSecret.length, 32))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0"
                    onClick={() => setShowSecret(s => !s)}
                  >
                    {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0"
                    onClick={() => copyToClipboard(manualSecret, 'Secret value')}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside pl-1">
            <li>Open Supabase Dashboard → Edge Functions → Secrets.</li>
            <li>Add a new secret with the name and value above.</li>
            <li>Save, then come back here and continue.</li>
          </ol>

          <Button
            type="button"
            onClick={handleManualRetry}
            disabled={retryLoading}
            className="w-full h-11 font-semibold"
          >
            {retryLoading ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Checking…</>
            ) : (
              <>I&apos;ve added it, check now<RefreshCw className="w-4 h-4 ml-2" /></>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleManualSkipToLogin}
            className="w-full h-10 font-medium"
          >
            Continue to login<ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="bg-card border border-green-500/30 rounded-2xl p-5 shadow-lg text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 mx-auto">
            <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-sm font-semibold text-foreground">Setup complete</p>
          <p className="text-xs text-muted-foreground">
            Sending you to the login screen…
          </p>
        </div>
      )}
    </div>
  );
}
