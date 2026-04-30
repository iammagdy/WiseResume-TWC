import { useState, useEffect, useCallback } from 'react';
import { UserX, X, Loader2 } from 'lucide-react';
import { getImpersonationState, exitImpersonation, subscribe, isImpersonating, isNewTabSession } from '@/lib/impersonationStore';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { toast } from 'sonner';

const ACT_AS_CHANNEL = 'wr_act_as';

async function callExit(userId: string | null): Promise<void> {
  try {
    await edgeFunctions.functions.invoke('admin-impersonate', {
      headers: devKitAuthHeaders(),
      body: { action: 'exit', target_user_id: userId },
    });
  } catch {
    // non-fatal — banner clears locally regardless
  }
}

function broadcastSessionEnd(email: string | null, userId: string | null) {
  try {
    const ch = new BroadcastChannel(ACT_AS_CHANNEL);
    ch.postMessage({ type: 'session_ended', email, userId });
    ch.close();
  } catch {
    // BroadcastChannel not available (e.g. private browsing — non-fatal)
  }
}

export function ActingAsBanner() {
  const [state, setState] = useState(() => ({
    active: isImpersonating(),
    email: getImpersonationState().email,
    userId: getImpersonationState().userId,
    expiresAt: getImpersonationState().expiresAt,
    newTab: isNewTabSession(),
  }));
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const unsub = subscribe(() => {
      setState({
        active: isImpersonating(),
        email: getImpersonationState().email,
        userId: getImpersonationState().userId,
        expiresAt: getImpersonationState().expiresAt,
        newTab: isNewTabSession(),
      });
    });
    return unsub;
  }, []);

  // In new-tab mode: broadcast session_ended when this tab is closed/unloaded
  useEffect(() => {
    if (!state.newTab || !state.active) return;
    const { email, userId } = state;
    const handleUnload = () => broadcastSessionEnd(email, userId);
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [state.newTab, state.active, state.email, state.userId]);

  // Auto-exit when JWT expires
  useEffect(() => {
    if (!state.active || !state.expiresAt) return;
    const msLeft = state.expiresAt - Date.now();
    if (msLeft <= 0) {
      void callExit(state.userId).finally(() => {
        broadcastSessionEnd(state.email, state.userId);
        exitImpersonation();
      });
      return;
    }
    const timer = setTimeout(async () => {
      await callExit(state.userId);
      toast.warning('Act As session expired', {
        description: 'The 30-minute session has ended.',
      });
      broadcastSessionEnd(state.email, state.userId);
      exitImpersonation();
      if (state.newTab) window.close();
    }, msLeft);
    return () => clearTimeout(timer);
  }, [state.active, state.expiresAt, state.userId, state.newTab]);

  const handleExit = useCallback(async () => {
    setExiting(true);
    try { await callExit(state.userId); } finally {
      broadcastSessionEnd(state.email, state.userId);
      setExiting(false);
      exitImpersonation();
      if (state.newTab) window.close();
    }
  }, [state.userId, state.newTab, state.email]);

  if (!state.active) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[70] flex items-center justify-between gap-3 px-4 py-2 bg-red-600 text-white text-sm font-medium shadow-lg">
      <div className="flex items-center gap-2 min-w-0">
        <UserX className="w-4 h-4 shrink-0" />
        <span className="truncate">
          Acting as <span className="font-mono font-bold">{state.email ?? state.userId}</span>
        </span>
      </div>
      {state.newTab ? (
        <span className="shrink-0 text-xs text-white/80">Close this tab to end session</span>
      ) : (
        <button
          onClick={handleExit}
          disabled={exiting}
          className="flex items-center gap-1.5 shrink-0 rounded-md bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-60"
        >
          {exiting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
          Exit
        </button>
      )}
    </div>
  );
}
