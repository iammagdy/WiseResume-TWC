import { getLastError, BridgeErrorType } from '@/lib/supabaseBridge';

const SESSION_EXPIRED_DEBOUNCE_MS = 60_000;
let lastSessionExpiredAt = 0;

/**
 * Dispatch the app:session-expired custom event at most once per debounce
 * window, and only when the bridge error indicates a genuine auth rejection
 * (not a network/offline/unknown failure).
 */
export function dispatchSessionExpiredOnce() {
  const lastErr = getLastError();
  if (
    lastErr?.type === BridgeErrorType.OFFLINE_NETWORK ||
    lastErr?.type === BridgeErrorType.UNKNOWN
  ) {
    return;
  }
  const now = Date.now();
  if (now - lastSessionExpiredAt > SESSION_EXPIRED_DEBOUNCE_MS) {
    lastSessionExpiredAt = now;
    window.dispatchEvent(new CustomEvent('app:session-expired'));
  }
}
