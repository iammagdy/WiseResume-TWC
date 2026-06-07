/**
 * /act-as#<encoded>.<sig>
 *
 * Receives a signed impersonation token in the URL hash fragment (never sent to
 * any server by the browser). Verifies the HMAC signature and expiry server-side
 * before activating any impersonation state, then navigates to the dashboard.
 *
 * Hash schema:  base64url(JSON({ t, u, e, x, iat })).<hmac-sha256-sig>
 */
import { useEffect, useState } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { useNavigate } from 'react-router-dom';
import { UserX, AlertCircle } from 'lucide-react';
import { startImpersonation } from '@/lib/impersonationStore';
import { appwriteFunctions } from '@/lib/appwrite-functions';

interface VerifyResponse {
  success: boolean;
  nonce?: string;
  userId?: string;
  email?: string;
  expiresAt?: number;
  error?: string;
}

export default function ActAs() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.location.hash.slice(1);
    if (!raw) {
      setError('No session payload in URL.');
      return;
    }

    (async () => {
      const result = await appwriteFunctions.invoke<VerifyResponse>('admin-impersonate', {
        body: { action: 'verify', token: raw },
      });

      if (result.error || !result.data?.success) {
        setError(result.data?.error || result.error?.message || 'Invalid or expired session token.');
        return;
      }

      const { nonce, userId, email, expiresAt } = result.data;
      if (!nonce || !userId || !email || !expiresAt) {
        setError('Malformed session response from server.');
        return;
      }

      // Remove the token from the URL bar before activating the session.
      history.replaceState(null, '', '/act-as');
      startImpersonation(nonce, userId, email, expiresAt, true);
      navigate('/dashboard', { replace: true });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center p-8">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <h1 className="text-xl font-semibold">Could not start Act As session</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground">
            Go back to the DevKit and click "Act As" again.
          </p>
          <button onClick={() => window.close()} className="text-sm underline text-muted-foreground hover:text-foreground">
            Close this tab
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <UserX className="w-8 h-8 text-red-500" />
          <MiniSpinner size={24} className="text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Starting Act As session…</p>
      </div>
    </div>
  );
}
