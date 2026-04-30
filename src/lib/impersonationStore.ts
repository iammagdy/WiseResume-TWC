/**
 * In-memory impersonation store for DevKit user impersonation.
 *
 * Two modes:
 *   "same-tab"  — admin stays in the DevKit tab; token lives in memory only.
 *   "new-tab"   — admin opened an /act-as?t=<otp> popup; token is persisted
 *                 to sessionStorage so it survives route changes within that tab
 *                 but is automatically lost when the tab closes.
 *
 * isNewTabSession() returns true when the current page was bootstrapped via
 * the /act-as claim flow, so ActingAsBanner can show "close this tab to end".
 */

const SESSION_KEY = 'wr_imp_session';

interface ImpersonationState {
  token: string | null;
  userId: string | null;
  email: string | null;
  expiresAt: number | null;
}

function readSessionStorage(): ImpersonationState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImpersonationState & { expiresAt: number };
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

const _persisted = readSessionStorage();

let _state: ImpersonationState = _persisted ?? {
  token: null, userId: null, email: null, expiresAt: null,
};

let _isNewTab = !!_persisted;

const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach((fn) => fn());
}

export function startImpersonation(
  token: string,
  userId: string,
  email: string,
  expiresAt: number,
  newTab = false,
): void {
  _state = { token, userId, email, expiresAt };
  _isNewTab = newTab;
  if (newTab) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(_state));
    } catch { /* ignore */ }
  }
  _notify();
}

export function exitImpersonation(): void {
  _state = { token: null, userId: null, email: null, expiresAt: null };
  _isNewTab = false;
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  _notify();
}

export function isNewTabSession(): boolean {
  return _isNewTab;
}

export function isImpersonating(): boolean {
  if (!_state.token) return false;
  if (_state.expiresAt !== null && Date.now() > _state.expiresAt) return false;
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
