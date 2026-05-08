/**
 * LEGACY STUB — Supabase / Kinde bridge has been removed.
 *
 * Auth is now Appwrite-Native (see `src/contexts/AuthContext.tsx`).
 * These exports are no-op shims kept only so legacy import sites compile
 * during the Appwrite migration. Anything that actually relied on the
 * bridge (PostgREST data layer, Supabase Edge Functions, Kinde OAuth)
 * will fail at runtime with a clear error — that is intentional.
 *
 * Slated for deletion once every importer has been migrated to Appwrite.
 */

export enum BridgeErrorType {
  OFFLINE_NETWORK = 'OFFLINE_NETWORK',
  AUTH_REJECTION = 'AUTH_REJECTION',
  ACCOUNT_COLLISION = 'ACCOUNT_COLLISION',
  UNKNOWN = 'UNKNOWN',
}

export interface BridgeError {
  type: BridgeErrorType;
  code: string;
  message: string;
}

export async function exchangeToken(_kindeToken: string): Promise<void> {
  /* no-op: Supabase bridge removed */
}

export async function refreshTokenIfNeeded(_force = false): Promise<boolean> {
  return false;
}

export function getToken(): string | null {
  return null;
}

export function getUserId(): string | null {
  return null;
}

export function isReady(): boolean {
  return false;
}

export function clearBridge(): void {
  /* no-op */
}

export function getShadowUserOk(): boolean {
  return false;
}

export function getLastError(): BridgeError | null {
  return null;
}

export function clearLastError(): void {
  /* no-op */
}

export function setUserProfile(_email: string | null, _name: string | null): void {
  /* no-op */
}

export function getStoredEmail(): string | null {
  return null;
}

export function getStoredName(): string | null {
  return null;
}

export function setKindeTokenGetter(_fn: () => Promise<string | null>): void {
  /* no-op */
}

export function setCurrentKindeSub(_sub: string | null): void {
  /* no-op */
}

export function getCachedKindeSub(): string | null {
  return null;
}
