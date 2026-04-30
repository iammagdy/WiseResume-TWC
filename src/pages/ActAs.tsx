/**
 * /act-as#<base64(JSON({t,u,e,x}))>
 *
 * Receives the impersonation credentials directly in the URL hash fragment
 * (never sent to any server). Parses them, stores in sessionStorage, then
 * navigates to the dashboard. No server claim round-trip needed, so this
 * works in both dev (Express proxy) and production (Supabase Edge Functions).
 *
 * Hash schema:  btoa(JSON.stringify({ t: access_token, u: user_id, e: email, x: expires_at }))
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, UserX, AlertCircle } from 'lucide-react';
import { startImpersonation } from '@/lib/impersonationStore';

interface ActAsPayload {
  t: string;   // access_token
  u: string;   // user_id
  e: string;   // email
  x: number;   // expires_at (ms)
}

function parseHashPayload(): ActAsPayload {
  const raw = window.location.hash.slice(1);
  if (!raw) throw new Error('No session payload in URL.');
  const decoded = atob(raw);
  const parsed = JSON.parse(decoded) as unknown;
  if (
    typeof parsed !== 'object' || parsed === null ||
    !('t' in parsed) || !('u' in parsed) || !('e' in parsed) || !('x' in parsed)
  ) throw new Error('Malformed session payload.');
  return parsed as ActAsPayload;
}

export default function ActAs() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // StrictMode guard — only run once per tab lifetime
    if (started.current) return;
    started.current = true;

    try {
      const payload = parseHashPayload();
      startImpersonation(payload.t, payload.u, payload.e, payload.x, true);
      // Replace the hash before navigating so the JWT doesn't stay in history
      history.replaceState(null, '', '/act-as');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
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
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Starting Act As session…</p>
      </div>
    </div>
  );
}
