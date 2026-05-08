/**
 * Cached Appwrite JWT helper.
 *
 * Appwrite JWTs expire after 15 minutes. This module caches the JWT for
 * 14 minutes and auto-refreshes on the next call. A single in-flight
 * promise prevents stampede on concurrent calls.
 */
import { account } from '@/lib/appwrite';

const JWT_LIFETIME_MS = 14 * 60 * 1000;

let _cachedJwt: string | null = null;
let _expiresAt = 0;
let _inflight: Promise<string | null> | null = null;

export async function getAppwriteJWT(): Promise<string | null> {
  if (_cachedJwt && Date.now() < _expiresAt) return _cachedJwt;
  if (_inflight) return _inflight;

  _inflight = (async () => {
    try {
      const jwt = await account.createJWT();
      _cachedJwt = jwt.jwt;
      _expiresAt = Date.now() + JWT_LIFETIME_MS;
      return _cachedJwt;
    } catch {
      _cachedJwt = null;
      _expiresAt = 0;
      return null;
    } finally {
      _inflight = null;
    }
  })();

  return _inflight;
}

export function invalidateAppwriteJWT(): void {
  _cachedJwt = null;
  _expiresAt = 0;
}
