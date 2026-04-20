/**
 * Supabase Token Bridge
 *
 * Exchanges a Kinde access token for a Supabase-signed JWT via the
 * token-exchange edge function. Stores the result in memory so all
 * Supabase calls can attach it as a bearer token.
 *
 * IMPORTANT: The cached identity (supabaseToken / userId) is bound to the
 * Kinde `sub` it was issued for. When the active Kinde session changes (e.g.
 * sign out + sign in as a different account in the same tab), all getters
 * refuse to return the previous account's values — preventing dashboards
 * from briefly rendering with the wrong tenant's data while the background
 * token exchange catches up.
 */

export enum BridgeErrorType {
  OFFLINE_NETWORK = 'OFFLINE_NETWORK',
  AUTH_REJECTION = 'AUTH_REJECTION',
  UNKNOWN = 'UNKNOWN',
}

interface BridgeError {
  type: BridgeErrorType;
  code: string;
  message: string;
}

interface BridgeState {
  supabaseToken: string | null;
  userId: string | null;
  /** The Kinde `sub` the cached token / userId was issued for. */
  kindeSub: string | null;
  expiresAt: number; // unix seconds
  lastError: BridgeError | null;
}

const STORAGE_KEY = 'wise_supabase_bridge_state';
const LAST_ACTIVE_KEY = 'wr-bridge-last-active';
const IDLE_CLEAR_MS = 4 * 60 * 60 * 1000; // 4 hours

try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(LAST_ACTIVE_KEY); } catch {}

function emptyState(): BridgeState {
  return {
    supabaseToken: null,
    userId: null,
    kindeSub: null,
    expiresAt: 0,
    lastError: null,
  };
}

function loadState(): BridgeState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Require kindeSub on persisted entries — entries without it predate
      // the cross-account leak fix and cannot be safely trusted as belonging
      // to the currently signed-in Kinde user.
      if (
        parsed.supabaseToken &&
        parsed.expiresAt &&
        parsed.expiresAt > Date.now() / 1000 + 60 &&
        parsed.kindeSub
      ) {
        return {
          supabaseToken: parsed.supabaseToken,
          userId: parsed.userId,
          kindeSub: parsed.kindeSub,
          expiresAt: parsed.expiresAt,
          lastError: null,
        };
      }
      // Stale or unbound entry — drop it.
      try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    }
  } catch {}
  return emptyState();
}

function persistState(s: BridgeState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      supabaseToken: s.supabaseToken,
      userId: s.userId,
      kindeSub: s.kindeSub,
      expiresAt: s.expiresAt,
    }));
    updateLastActive();
  } catch {}
}

function updateLastActive(): void {
  try {
    sessionStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch {}
}

const state: BridgeState = loadState();

let exchangePromise: Promise<void> | null = null;

/**
 * The Kinde `sub` of the currently authenticated user, registered by the
 * AuthContext on every render. When this differs from `state.kindeSub`, the
 * bridge refuses to hand out the cached token / userId — they belong to a
 * different account and would leak data across tenants.
 */
let _currentKindeSub: string | null = null;

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      try {
        const raw = sessionStorage.getItem(LAST_ACTIVE_KEY);
        const lastActive = raw ? parseInt(raw, 10) : 0;
        if (lastActive && Date.now() - lastActive > IDLE_CLEAR_MS) {
          clearBridge();
        }
      } catch {}
    }
  });
}

/** Registered Kinde token getter — set by AuthContext */
let _getKindeTokenFn: (() => Promise<string | null>) | null = null;

/**
 * Register the Kinde token getter so the bridge can refresh autonomously.
 */
export function setKindeTokenGetter(fn: () => Promise<string | null>): void {
  _getKindeTokenFn = fn;
}

/**
 * Tell the bridge which Kinde user is currently authenticated. Called by the
 * AuthContext on every render so the bridge can detect account swaps within
 * the same tab. If the cached identity belongs to a different Kinde user,
 * the cache is dropped immediately — `getUserId()`, `getToken()`, and
 * `isReady()` will return null until a fresh exchange completes.
 *
 * Pass `null` when no Kinde user is signed in (e.g. after sign-out).
 */
export function setCurrentKindeSub(sub: string | null): void {
  _currentKindeSub = sub;
  if (sub && state.kindeSub && sub !== state.kindeSub) {
    // Account swap detected — drop the previous account's cached identity.
    state.supabaseToken = null;
    state.userId = null;
    state.kindeSub = null;
    state.expiresAt = 0;
    // Also drop the in-flight exchange handle. Without this, a subsequent
    // `exchangeToken(kindeTokenB)` call would await the previous account's
    // in-flight promise instead of starting a fresh exchange for B. The
    // existing fetch keeps running in the background, but the response is
    // discarded by the race guard inside `exchangeToken` since
    // `_currentKindeSub` no longer matches.
    exchangePromise = null;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  }
}

/**
 * The Kinde `sub` recorded against the cached bridge state, or null if none.
 */
export function getCachedKindeSub(): string | null {
  return state.kindeSub;
}

function isIdentityMismatch(): boolean {
  // If no current Kinde user is registered, fall back to the cached value
  // (covers signed-out reads and unit tests that don't set a current sub).
  if (!_currentKindeSub) return false;
  // If the cache is empty there's nothing to mismatch against.
  if (!state.kindeSub) return false;
  return _currentKindeSub !== state.kindeSub;
}

/**
 * Exchange a Kinde access token for a Supabase JWT.
 * Routes through the Express server proxy at /api/fn/token-exchange
 * so Supabase keys never leave the server.
 * Deduplicates concurrent calls (only one in-flight request at a time).
 */
export async function exchangeToken(kindeToken: string): Promise<void> {
  if (exchangePromise) return exchangePromise;

  exchangePromise = (async () => {
    try {
      const url = `/api/fn/token-exchange`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${kindeToken}`,
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        const text = await res.text();
        console.error('[SupabaseBridge] Token exchange failed:', res.status, text);
        try {
          const errBody = JSON.parse(text);
          state.lastError = { type: BridgeErrorType.AUTH_REJECTION, code: errBody.code || 'UNKNOWN', message: errBody.message || text };
        } catch {
          state.lastError = { type: BridgeErrorType.AUTH_REJECTION, code: 'UNKNOWN', message: text };
        }
        console.log(`[SupabaseBridge] Error categorized as: ${state.lastError.type} (${state.lastError.code})`);
        return;
      }
      // Clear any previous error on success
      state.lastError = null;

      const data = await res.json();
      // Refuse to accept an exchange response that does not bind the issued
      // identity to a Kinde sub — without it we cannot detect account swaps
      // and would silently downgrade to the pre-fix leak behavior.
      if (!data.kindeSub) {
        console.error('[SupabaseBridge] Exchange response missing kindeSub — refusing to cache');
        state.lastError = {
          type: BridgeErrorType.AUTH_REJECTION,
          code: 'MISSING_KINDE_SUB',
          message: 'Token exchange response did not include kindeSub binding',
        };
        return;
      }
      // Race guard: the user may have swapped Kinde accounts while this
      // exchange was in flight. If the registered current sub no longer
      // matches the identity this token was issued for, discard the
      // response — committing it would re-leak the previous account's
      // userId until the next exchange completes.
      if (_currentKindeSub && _currentKindeSub !== data.kindeSub) {
        console.warn(
          '[SupabaseBridge] Discarding exchange response — Kinde user changed mid-flight',
        );
        return;
      }
      state.supabaseToken = data.supabaseToken;
      state.userId = data.userId;
      state.kindeSub = data.kindeSub;
      state.expiresAt = data.expiresAt;
      persistState(state);
    } catch (err) {
      console.error('[SupabaseBridge] Token exchange error:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        state.lastError = { type: BridgeErrorType.OFFLINE_NETWORK, code: 'OFFLINE', message: 'Network disconnected' };
      } else {
        state.lastError = { type: BridgeErrorType.UNKNOWN, code: 'UNKNOWN', message: String(err) };
      }
      console.log(`[SupabaseBridge] Error categorized as: ${state.lastError.type}`);
      throw err;
    } finally {
      // Always clear the in-flight promise so the next call starts a fresh exchange.
      // Previously this was only cleared on success (supabaseToken truthy) which
      // caused a stale resolved-promise leak on AUTH_REJECTION paths.
      exchangePromise = null;
    }
  })();

  try {
    await exchangePromise;
  } catch {
    exchangePromise = null;
  }
}

/**
 * Refresh the bridge token if expired or about to expire.
 * Uses the registered Kinde token getter. Returns true if token is valid after attempt.
 *
 * Pass `force: true` to bypass the "token still valid" short-circuit. This is
 * required when the server has rejected an apparently-valid token (e.g. 401 /
 * PGRST301) because the local expiry hasn't fired yet but the token is
 * actually unusable (signing-key mismatch, rotated secret, revoked session).
 */
export async function refreshTokenIfNeeded(force = false): Promise<boolean> {
  // If token is still valid and we're not forcing, no-op
  if (!force && getToken()) return true;

  if (!_getKindeTokenFn) {
    console.warn('[SupabaseBridge] No Kinde token getter registered — cannot refresh');
    return false;
  }

  try {
    if (force) {
      // Wipe the cached token so getToken() returns null and exchangeToken
      // is guaranteed to perform a fresh round-trip.
      state.supabaseToken = null;
      state.expiresAt = 0;
      try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    }
    const kindeToken = await _getKindeTokenFn();
    if (!kindeToken) {
      console.warn('[SupabaseBridge] Kinde token getter returned null');
      return false;
    }
    await exchangeToken(kindeToken);
    return getToken() !== null;
  } catch (err) {
    console.error('[SupabaseBridge] refreshTokenIfNeeded failed:', err);
    return false;
  }
}

/**
 * Get the current Supabase JWT, or null if not available / expired / bound
 * to a different Kinde user than the one currently authenticated.
 */
export function getToken(): string | null {
  if (!state.supabaseToken) return null;
  if (isIdentityMismatch()) return null;
  // Allow 60s buffer before expiry
  if (Date.now() / 1000 > state.expiresAt - 60) return null;
  return state.supabaseToken;
}

/**
 * Get the deterministic UUID for the current user, or null if the cached
 * identity belongs to a different Kinde user than the one currently
 * authenticated.
 */
export function getUserId(): string | null {
  if (isIdentityMismatch()) return null;
  return state.userId;
}

/**
 * Check if the bridge has a valid, non-expired token belonging to the
 * currently authenticated Kinde user.
 */
export function isReady(): boolean {
  return getToken() !== null;
}

/**
 * Clear stored token (on sign-out).
 */
export function clearBridge(): void {
  state.supabaseToken = null;
  state.userId = null;
  state.kindeSub = null;
  state.expiresAt = 0;
  state.lastError = null;
  exchangePromise = null;
  _getKindeTokenFn = null;
  _currentKindeSub = null;
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  try { sessionStorage.removeItem(LAST_ACTIVE_KEY); } catch {}
}

/**
 * Get the last bridge error (from token exchange), or null if none.
 */
export function getLastError(): BridgeError | null {
  return state.lastError;
}

/**
 * Clear the last bridge error (e.g. after showing a banner).
 */
export function clearLastError(): void {
  state.lastError = null;
}
