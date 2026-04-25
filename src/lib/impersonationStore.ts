/**
 * In-memory impersonation store for DevKit user impersonation.
 *
 * State is intentionally NOT persisted to sessionStorage so it is lost
 * on page reload, which is the desired safety behaviour (admins must
 * explicitly re-start impersonation on each page load).
 *
 * Design note: `isImpersonating()` and `getImpersonationToken()` are
 * pure checks — they NEVER auto-clear state on expiry.  Expiry-driven
 * clearing is centralised exclusively in the ActingAsBanner component,
 * which first calls the server exit endpoint (writing the audit log)
 * and THEN calls `exitImpersonation()`.  This guarantees the exit audit
 * entry is written before state is cleared, preventing a race where a
 * background Supabase call triggers `isImpersonating()` at the exact
 * expiry instant and silently drops the exit log.
 */

interface ImpersonationState {
  token: string | null;
  userId: string | null;
  email: string | null;
  expiresAt: number | null;
}

let _state: ImpersonationState = {
  token: null,
  userId: null,
  email: null,
  expiresAt: null,
};

const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach((fn) => fn());
}

export function startImpersonation(
  token: string,
  userId: string,
  email: string,
  expiresAt: number,
): void {
  _state = { token, userId, email, expiresAt };
  _notify();
}

export function exitImpersonation(): void {
  _state = { token: null, userId: null, email: null, expiresAt: null };
  _notify();
}

/**
 * Pure check — returns true when a valid, non-expired impersonation session
 * is active.  Does NOT modify state; callers that need expiry-driven clearing
 * should use the ActingAsBanner component which serialises exit-audit +
 * state-clear correctly.
 */
export function isImpersonating(): boolean {
  if (!_state.token) return false;
  if (_state.expiresAt !== null && Date.now() > _state.expiresAt) return false;
  return true;
}

/**
 * Pure check — returns the impersonation token if an active, non-expired
 * session exists; otherwise null.  Does NOT modify state.
 */
export function getImpersonationToken(): string | null {
  if (!isImpersonating()) return null;
  return _state.token;
}

export function getImpersonationState(): Readonly<ImpersonationState> {
  return { ..._state };
}

export function subscribe(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
