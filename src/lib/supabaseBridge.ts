/**
 * Supabase Token Bridge
 *
 * Exchanges a Kinde access token for a Supabase-signed JWT via the
 * token-exchange edge function. Stores the result in memory so all
 * Supabase calls can attach it as a bearer token.
 */
import { EDGE_FUNCTIONS_URL, EDGE_FUNCTIONS_ANON_KEY } from '@/lib/supabaseConstants';

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
  expiresAt: number; // unix seconds
  lastError: BridgeError | null;
}

const STORAGE_KEY = 'wise_supabase_bridge_state';

function loadState(): BridgeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.supabaseToken && parsed.expiresAt && parsed.expiresAt > Date.now() / 1000 + 60) {
        return { ...parsed, lastError: null };
      }
    }
  } catch {}
  return {
    supabaseToken: null,
    userId: null,
    expiresAt: 0,
    lastError: null,
  };
}

function persistState(s: BridgeState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      supabaseToken: s.supabaseToken,
      userId: s.userId,
      expiresAt: s.expiresAt,
    }));
  } catch {}
}

const state: BridgeState = loadState();

let exchangePromise: Promise<void> | null = null;

/** Registered Kinde token getter — set by AuthContext */
let _getKindeTokenFn: (() => Promise<string | null>) | null = null;

/**
 * Register the Kinde token getter so the bridge can refresh autonomously.
 */
export function setKindeTokenGetter(fn: () => Promise<string | null>): void {
  _getKindeTokenFn = fn;
}

/**
 * Exchange a Kinde access token for a Supabase JWT.
 * Deduplicates concurrent calls (only one in-flight request at a time).
 */
export async function exchangeToken(kindeToken: string): Promise<void> {
  if (exchangePromise) return exchangePromise;

  exchangePromise = (async () => {
    try {
      const url = `${EDGE_FUNCTIONS_URL}/functions/v1/token-exchange`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${kindeToken}`,
            'apikey': EDGE_FUNCTIONS_ANON_KEY,
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
      state.supabaseToken = data.supabaseToken;
      state.userId = data.userId;
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
 */
export async function refreshTokenIfNeeded(): Promise<boolean> {
  // If token is still valid, no-op
  if (getToken()) return true;

  if (!_getKindeTokenFn) {
    console.warn('[SupabaseBridge] No Kinde token getter registered — cannot refresh');
    return false;
  }

  try {
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
 * Get the current Supabase JWT, or null if not available / expired.
 */
export function getToken(): string | null {
  if (!state.supabaseToken) return null;
  // Allow 60s buffer before expiry
  if (Date.now() / 1000 > state.expiresAt - 60) return null;
  return state.supabaseToken;
}

/**
 * Get the deterministic UUID for the current user.
 */
export function getUserId(): string | null {
  return state.userId;
}

/**
 * Check if the bridge has a valid, non-expired token.
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
  state.expiresAt = 0;
  state.lastError = null;
  exchangePromise = null;
  _getKindeTokenFn = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
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
