/**
 * DevKit2Page.tsx
 *
 * Entry point for /devkit2.
 *
 * Identical session-verification pattern to DevToolsPage.tsx:
 * - Wraps children in DevKitSessionProvider
 * - Calls devKitLogin() once auth settles
 * - Shows a locked/verifying screen until the admin session is confirmed
 * - On unlock, renders DevKit2Shell
 *
 * IMPORTANT:
 * - Does NOT replace /devkit.
 * - Does NOT redirect from /devkit to /devkit2.
 * - Uses the same admin verification contracts as DevToolsPage.
 * - The Cmd+Shift+A shortcut in AppInterior.tsx still navigates to /devkit.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { DevKitSessionProvider, useDevKitSession } from '@/contexts/DevKitSessionContext';
import { devKitLogin } from '@/lib/devkit/devKitClient';
import { useAuth } from '@/hooks/useAuth';
import { DevKit2Shell } from '@/components/dev-kit-v2/DevKit2Shell';

// ─── Inner (needs DevKitSessionProvider in scope) ────────────────────────────

function DevKit2Inner() {
  const navigate = useNavigate();
  const { user, authSettled } = useAuth();
  const { isUnlocked, unlock } = useDevKitSession();

  const [isVerifying, setIsVerifying] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const loginAttemptedRef = useRef(false);

  const requestAdminSession = useCallback(
    async (force = false) => {
      if (isVerifying || (!force && loginAttemptedRef.current)) return;
      loginAttemptedRef.current = true;
      setIsVerifying(true);
      setUnlockError(null);
      try {
        const result = await devKitLogin();
        if (!result.success) {
          const message =
            result.code === 'CONFIG_MISSING'
              ? 'DevKit auth is not configured on Appwrite.'
              : typeof result.error === 'string' && result.error.trim()
                ? result.error
                : 'Access denied. Your Appwrite account needs the admin label (or ADMIN_EMAIL must match on the function).';
          setUnlockError(message);
          toast.error(message);
          return;
        }
        const email = result.session.email ?? user?.email ?? 'admin@thewise.cloud';
        unlock(result.session.token);
        toast.success(`Admin session issued for ${email}. (DevKit v2)`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'DevKit login failed.';
        setUnlockError(message);
        toast.error(message);
      } finally {
        setIsVerifying(false);
      }
    },
    [isVerifying, unlock, user?.email],
  );

  // Pre-warm Appwrite JWT to reduce cold-start latency
  useEffect(() => {
    if (!authSettled) return;
    void import('@/lib/appwriteJWT').then(({ getAppwriteJWT }) => getAppwriteJWT());
  }, [authSettled]);

  useEffect(() => {
    if (isUnlocked || !authSettled) return;
    void requestAdminSession();
  }, [isUnlocked, authSettled, requestAdminSession]);

  // ── Locked / verifying screen ─────────────────────────────────────────────
  if (!isUnlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="space-y-3">
            <div className="mx-auto inline-flex rounded-2xl border border-border bg-card p-4">
              {isVerifying ? (
                <MiniSpinner size={40} className="text-primary" />
              ) : (
                <ShieldCheck className="h-10 w-10 text-primary" />
              )}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              DevKit{' '}
              <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-sm font-semibold text-primary align-middle">
                v2 Preview
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Verifying Appwrite admin session
            </p>
            {user?.email && (
              <p className="text-sm text-muted-foreground">
                Signed in as{' '}
                <span className="font-mono text-foreground">{user.email}</span>
              </p>
            )}
          </div>

          {unlockError ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {unlockError}
              </div>
              <Button
                type="button"
                onClick={() => void requestAdminSession(true)}
                disabled={isVerifying}
                className="w-full"
              >
                {isVerifying && <MiniSpinner size={18} className="mr-2" />}
                Retry admin verification
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="w-full"
              >
                Back to dashboard
              </Button>
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              No password required. Access requires the Appwrite{' '}
              <code className="text-foreground">admin</code> label on your account
              (or a matching <code className="text-foreground">ADMIN_EMAIL</code> on
              the function).
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Unlocked — render the full DevKit2 shell ──────────────────────────────
  return <DevKit2Shell />;
}

// ─── Page export (provides session context) ───────────────────────────────────

export default function DevKit2Page() {
  return (
    <DevKitSessionProvider>
      <DevKit2Inner />
    </DevKitSessionProvider>
  );
}
