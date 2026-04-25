import { useState, useEffect, useCallback } from 'react';
import { UserX, X, Loader2 } from 'lucide-react';
import { getImpersonationState, exitImpersonation, subscribe, isImpersonating } from '@/lib/impersonationStore';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { toast } from 'sonner';

export function ActingAsBanner() {
  const [state, setState] = useState(() => ({
    active: isImpersonating(),
    email: getImpersonationState().email,
    userId: getImpersonationState().userId,
    expiresAt: getImpersonationState().expiresAt,
  }));
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const unsub = subscribe(() => {
      setState({
        active: isImpersonating(),
        email: getImpersonationState().email,
        userId: getImpersonationState().userId,
        expiresAt: getImpersonationState().expiresAt,
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!state.active || !state.expiresAt) return;
    const msLeft = state.expiresAt - Date.now();
    if (msLeft <= 0) {
      exitImpersonation();
      return;
    }
    const timer = setTimeout(async () => {
      try {
        await edgeFunctions.functions.invoke('admin-impersonate', {
          headers: devKitAuthHeaders(),
          body: { action: 'exit', target_user_id: state.userId },
        });
      } catch {
        // Non-fatal — still clear locally
      }
      toast.warning('Impersonation session expired', {
        description: 'The 30-minute impersonation session has ended.',
      });
      exitImpersonation();
    }, msLeft);
    return () => clearTimeout(timer);
  }, [state.active, state.expiresAt, state.userId]);

  const handleExit = useCallback(async () => {
    setExiting(true);
    try {
      await edgeFunctions.functions.invoke('admin-impersonate', {
        headers: devKitAuthHeaders(),
        body: { action: 'exit', target_user_id: state.userId },
      });
    } catch {
      // Non-fatal — still exit locally
    } finally {
      setExiting(false);
      exitImpersonation();
    }
  }, [state.userId]);

  if (!state.active) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[70] flex items-center justify-between gap-3 px-4 py-2 bg-red-600 text-white text-sm font-medium shadow-lg">
      <div className="flex items-center gap-2 min-w-0">
        <UserX className="w-4 h-4 shrink-0" />
        <span className="truncate">
          Acting as <span className="font-mono font-bold">{state.email ?? state.userId}</span>
        </span>
      </div>
      <button
        onClick={handleExit}
        disabled={exiting}
        className="flex items-center gap-1.5 shrink-0 rounded-md bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-60"
      >
        {exiting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
        Exit
      </button>
    </div>
  );
}
