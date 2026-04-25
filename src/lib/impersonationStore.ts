/**
 * In-memory impersonation store for DevKit user impersonation.
 *
 * State is intentionally NOT persisted to sessionStorage so it is lost
 * on page reload, which is the desired safety behaviour (admins must
 * explicitly re-start impersonation on each page load).
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

export function isImpersonating(): boolean {
  if (!_state.token) return false;
  if (_state.expiresAt !== null && Date.now() > _state.expiresAt) {
    exitImpersonation();
    return false;
  }
  return true;
}

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
