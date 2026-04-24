import { useState, useEffect, useCallback, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2, Copy, Eye, EyeOff, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError, EdgeFunctionError } from '@/lib/devkit/edgeResponse';
import { toast } from 'sonner';
import { useIsMounted } from '@/lib/devkit/hooks';

interface StatusResult {
  success: boolean;
  totp_configured: boolean;
  can_auto_update: boolean;
  pending_rotation: {
    generated_at: string;
    generated_by: string;
    expires_at: string;
  } | null;
}

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
  manual_update_reason?: string;
}

type Phase = 'idle' | 'scanning' | 'confirmed_auto' | 'confirmed_manual';

const QR_SIZE = 220;

function TotpQRCode({ otpauthUrl }: { otpauthUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (!containerRef.current || !otpauthUrl) return;

    qrRef.current = new QRCodeStyling({
      width: QR_SIZE,
      height: QR_SIZE,
      type: 'svg',
      data: otpauthUrl,
      margin: 8,
      qrOptions: { errorCorrectionLevel: 'M' },
      dotsOptions: { color: '#000000', type: 'rounded' },
      cornersSquareOptions: { type: 'extra-rounded' },
      backgroundOptions: { color: '#ffffff' },
    });

    containerRef.current.innerHTML = '';
    qrRef.current.append(containerRef.current);
  }, [otpauthUrl]);

  return (
    <div className="rounded-lg border-2 border-border bg-white p-2 shadow-sm inline-block">
      <div ref={containerRef} style={{ width: QR_SIZE, height: QR_SIZE }} />
    </div>
  );
}

export function TotpRotationPanel() {
  const isMounted = useIsMounted();

  const [status, setStatus] = useState<StatusResult | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [notDeployed, setNotDeployed] = useState(false);

  const [phase, setPhase] = useState<Phase>('idle');
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [secretB32, setSecretB32] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const [totpInput, setTotpInput] = useState('');
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [manualReason, setManualReason] = useState<string | null>(null);

  const [requestLoading, setRequestLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    setNotDeployed(false);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-rotate-totp', {
        headers: devKitAuthHeaders(),
        body: { action: 'status' },
      });
      const result = unwrapAdminResponse<StatusResult>(tuple, 'admin-rotate-totp');
      if (!isMounted()) return;
      setStatus(result);
      if (result.pending_rotation && phase === 'idle') {
        setPhase('scanning');
      }
    } catch (e) {
      if (!isMounted()) return;
      if (e instanceof EdgeFunctionError && e.notDeployed) {
        setNotDeployed(true);
        return;
      }
      setStatusError(formatEdgeError(e, 'Failed to load TOTP status'));
    } finally {
      if (isMounted()) setStatusLoading(false);
    }
  }, [isMounted, phase]);

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRequestRotation = async () => {
    setRequestLoading(true);
    setConfirmError(null);
    setOtpauthUrl(null);
    setSecretB32(null);
    setTotpInput('');
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-rotate-totp', {
        headers: devKitAuthHeaders(),
        body: { action: 'request' },
      });
      const result = unwrapAdminResponse<RequestResult>(tuple, 'admin-rotate-totp');
      if (!isMounted()) return;
      setOtpauthUrl(result.otpauth_url);
      setSecretB32(result.secret_b32);
      setExpiresAt(result.expires_at);
      setPhase('scanning');
    } catch (e) {
      if (!isMounted()) return;
      toast.error(formatEdgeError(e, 'Failed to start rotation'));
    } finally {
      if (isMounted()) setRequestLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!totpInput.trim() || totpInput.trim().length !== 6) {
      setConfirmError('Enter your 6-digit code from the new QR code.');
      return;
    }
    setConfirmLoading(true);
    setConfirmError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-rotate-totp', {
        headers: devKitAuthHeaders(),
        body: { action: 'confirm', totp_code: totpInput.trim() },
      });
      const result = unwrapAdminResponse<ConfirmResult>(tuple, 'admin-rotate-totp');
      if (!isMounted()) return;
      if (result.automated) {
        setPhase('confirmed_auto');
        toast.success('TOTP secret rotated', { description: 'Your authenticator app is now enrolled with the new secret.' });
      } else {
        setManualSecret(result.new_secret ?? null);
        setManualReason(result.manual_update_reason ?? null);
        setPhase('confirmed_manual');
        toast.warning('Manual update required', { description: 'Copy the new secret below and set it in your Supabase secrets.' });
      }
      await fetchStatus();
    } catch (e) {
      if (!isMounted()) return;
      setConfirmError(formatEdgeError(e, 'Confirmation failed'));
    } finally {
      if (isMounted()) setConfirmLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      await edgeFunctions.functions.invoke('admin-rotate-totp', {
        headers: devKitAuthHeaders(),
        body: { action: 'cancel' },
      });
      if (!isMounted()) return;
      setPhase('idle');
      setOtpauthUrl(null);
      setSecretB32(null);
      setTotpInput('');
      setConfirmError(null);
      await fetchStatus();
    } catch (e) {
      if (!isMounted()) return;
      toast.error(formatEdgeError(e, 'Failed to cancel rotation'));
    } finally {
      if (isMounted()) setCancelLoading(false);
    }
  };

  const handleReset = () => {
    setPhase('idle');
    setOtpauthUrl(null);
    setSecretB32(null);
    setManualSecret(null);
    setManualReason(null);
    setTotpInput('');
    setConfirmError(null);
    setShowSecret(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied to clipboard`),
      () => toast.error('Failed to copy to clipboard'),
    );
  };

  if (notDeployed) {
    return (
      <div className="p-6 rounded-xl bg-muted/50 border border-border text-sm text-center text-muted-foreground space-y-1">
        <ShieldCheck className="w-7 h-7 mx-auto mb-2 opacity-40" />
        <p className="font-medium">TOTP rotation function not yet deployed</p>
        <p className="text-xs">Deploy the <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">admin-rotate-totp</code> edge function to enable this feature.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enrollment status card */}
      <div className="rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            TOTP Enrollment Status
          </h3>
          <Button variant="ghost" size="sm" onClick={fetchStatus} disabled={statusLoading} className="h-7 w-7 p-0">
            <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {statusError && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">{statusError}</div>
        )}

        {statusLoading && !status && (
          <div className="h-10 rounded-lg bg-muted/50 animate-pulse" />
        )}

        {status && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              {status.totp_configured ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Active — ADMIN_TOTP_SECRET is configured
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  Not configured — ADMIN_TOTP_SECRET is missing
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {status.can_auto_update
                ? 'Automatic secret update is available (Supabase Management API configured).'
                : 'Automatic update not available — after confirmation you will receive the new secret to set manually.'}
            </p>
          </div>
        )}
      </div>

      {/* Rotation flow */}
      {phase === 'idle' && (
        <div className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Rotate TOTP Secret</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Use this when you get a new phone or need to re-enroll your authenticator app.
              Your current session stays valid throughout this process.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              After generating a new secret, you must scan the new QR code and confirm it within 30 minutes.
              Do not navigate away from this page until you have confirmed.
            </span>
          </div>
          <Button
            onClick={handleRequestRotation}
            disabled={requestLoading}
            variant="outline"
            className="gap-2"
          >
            {requestLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            {requestLoading ? 'Generating…' : 'Generate New TOTP Secret'}
          </Button>
        </div>
      )}

      {phase === 'scanning' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">Scan New QR Code</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={cancelLoading}
              className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1"
            >
              {cancelLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
              Cancel
            </Button>
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Open your authenticator app and add a new account by scanning the QR code below.</p>
            {expiresAt && (
              <p>
                This QR code expires at{' '}
                <span className="font-medium text-foreground">
                  {new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                . Do not close this page until you have confirmed.
              </p>
            )}
          </div>

          {/* QR code rendered locally — secret never sent to any external service */}
          {otpauthUrl ? (
            <div className="flex flex-col items-center gap-4">
              <TotpQRCode otpauthUrl={otpauthUrl} />
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/50 border border-border text-sm text-center space-y-2">
              <p className="text-muted-foreground text-xs">
                A rotation was started earlier but the QR code is no longer available (page was refreshed or session was interrupted).
              </p>
              <Button
                onClick={handleRequestRotation}
                disabled={requestLoading}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
              >
                {requestLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                {requestLoading ? 'Generating…' : 'Generate New QR Code'}
              </Button>
            </div>
          )}

          {/* Secret (manual entry fallback) */}
          {secretB32 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Can&apos;t scan? Enter this key manually in your authenticator:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-xs bg-muted rounded-md px-3 py-2 overflow-hidden select-all">
                  {showSecret ? secretB32 : '•'.repeat(Math.min(secretB32.length, 32))}
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setShowSecret(s => !s)}>
                  {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => copyToClipboard(secretB32, 'Secret')}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Confirmation code */}
          <div className="space-y-2">
            <p className="text-xs font-medium">After scanning, enter a code from the new enrollment to confirm:</p>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpInput}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setTotpInput(digits);
                  setConfirmError(null);
                }}
                placeholder="123456"
                className="w-32 font-mono text-center tracking-widest"
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              />
              <Button
                onClick={handleConfirm}
                disabled={confirmLoading || totpInput.length !== 6}
                className="gap-1.5"
              >
                {confirmLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {confirmLoading ? 'Verifying…' : 'Confirm'}
              </Button>
            </div>
            {confirmError && (
              <p className="text-xs text-destructive">{confirmError}</p>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRequestRotation}
            disabled={requestLoading}
            className="gap-1.5 text-xs"
          >
            {requestLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Generate a different QR code
          </Button>
        </div>
      )}

      {phase === 'confirmed_auto' && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="text-sm font-semibold">TOTP Secret Rotated</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            The new ADMIN_TOTP_SECRET has been saved automatically. Your authenticator app is now
            enrolled with the new secret. All future logins will use the new code.
          </p>
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
            <RotateCcw className="w-3.5 h-3.5" />
            Rotate again
          </Button>
        </div>
      )}

      {phase === 'confirmed_manual' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-sm font-semibold">Manual Update Required</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Your authenticator app was successfully enrolled, but the secret could not be saved
            automatically. You must set the new value as the{' '}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">ADMIN_TOTP_SECRET</code>{' '}
            Supabase Edge Function secret manually.
          </p>
          {manualReason && (
            <p className="text-xs text-muted-foreground italic">Reason: {manualReason}</p>
          )}
          {manualSecret && (
            <div className="space-y-1">
              <p className="text-xs font-medium">New secret (base32):</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-xs bg-muted rounded-md px-3 py-2 break-all select-all">
                  {showSecret ? manualSecret : '•'.repeat(Math.min(manualSecret.length, 32))}
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setShowSecret(s => !s)}>
                  {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => copyToClipboard(manualSecret, 'Secret')}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                In Supabase Dashboard → Edge Functions → Secrets, set{' '}
                <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">ADMIN_TOTP_SECRET</code>{' '}
                to this value.
              </p>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
            <RotateCcw className="w-3.5 h-3.5" />
            Rotate again
          </Button>
        </div>
      )}
    </div>
  );
}
