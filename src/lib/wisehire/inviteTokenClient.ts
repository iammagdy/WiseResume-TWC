import { invokeWisehireAccess } from '@/lib/wisehire/wisehireAccessClient';
import { safeInternalRedirect } from '@/lib/security/safeInternalRedirect';

export type InviteFailureReason =
  | 'not_found'
  | 'expired'
  | 'already_used'
  | 'revoked'
  | 'invalid_signature'
  | 'missing_token'
  | 'server_error';

export type ValidateInviteResult =
  | { valid: true; recipient_email: string; expires_at: string }
  | { valid: false; reason: InviteFailureReason };

export async function validateInviteToken(token: string): Promise<ValidateInviteResult> {
  const { data, error } = await invokeWisehireAccess('validate-invite', { token });

  if (error) {
    console.error('[inviteTokenClient] WiseHire invitation validation failed.');
    return { valid: false, reason: 'server_error' };
  }

  return data as ValidateInviteResult;
}

export interface CompleteSignupPayload {
  invite_token?: string;
  full_name?: string;
  company_name?: string;
  company_size?: string;
}

export type CompleteSignupResult =
  | { success: true; already_completed?: boolean }
  | { success: false; error: string };

export async function completeWiseHireSignup(
  payload: CompleteSignupPayload,
): Promise<CompleteSignupResult> {
  const { data, error } = await invokeWisehireAccess('complete-signup', payload as Record<string, unknown>);

  if (error) {
    console.error('[inviteTokenClient] WiseHire signup completion failed.');
    return { success: false, error: error.message ?? 'server_error' };
  }

  return data as CompleteSignupResult;
}

export const WH_INVITE_STORAGE_KEY = 'wh_invite_token';
export const WH_SIGNUP_REDIRECT_KEY = 'wh_signup_redirect';
export const WH_EARLY_ACCESS_CODE_KEY = 'wh_early_access_code';

const INVITE_MAX_STORAGE_MS = 72 * 60 * 60 * 1000;
const REDIRECT_MAX_STORAGE_MS = 72 * 60 * 60 * 1000;

interface StoredInviteIntent {
  token: string;
  expiresAt: number;
}

interface StoredRedirectIntent {
  path: string;
  expiresAt: number;
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * The invite is removed from the URL immediately, then retained only until the
 * server-side invite expiry so email verification can finish in a new tab.
 */
export function rememberWiseHireInvite(token: string, serverExpiresAt?: string): void {
  const normalized = token.trim();
  if (!normalized) return;
  const serverExpiry = serverExpiresAt ? Date.parse(serverExpiresAt) : Number.NaN;
  const expiresAt = Math.min(
    Number.isFinite(serverExpiry) ? serverExpiry : Number.POSITIVE_INFINITY,
    Date.now() + INVITE_MAX_STORAGE_MS,
  );
  try {
    safeStorage()?.setItem(WH_INVITE_STORAGE_KEY, JSON.stringify({ token: normalized, expiresAt }));
  } catch {
    // The current page can still complete signup with its in-memory token.
  }
}

export function getRememberedWiseHireInvite(): string {
  const storage = safeStorage();
  if (!storage) return '';
  try {
    const raw = storage.getItem(WH_INVITE_STORAGE_KEY);
    if (!raw) return '';
    if (!raw.startsWith('{')) return raw.trim();
    const parsed = JSON.parse(raw) as StoredInviteIntent;
    if (!parsed.token || !Number.isFinite(parsed.expiresAt) || parsed.expiresAt <= Date.now()) {
      clearWiseHireInviteIntent();
      return '';
    }
    return parsed.token.trim();
  } catch {
    clearWiseHireInviteIntent();
    return '';
  }
}

export function clearWiseHireInviteIntent(): void {
  try {
    safeStorage()?.removeItem(WH_INVITE_STORAGE_KEY);
    safeStorage()?.removeItem(WH_EARLY_ACCESS_CODE_KEY);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(WH_INVITE_STORAGE_KEY);
      sessionStorage.removeItem(WH_EARLY_ACCESS_CODE_KEY);
    }
  } catch {
    // Best-effort cleanup only.
  }
}

export function rememberWiseHireSignupRedirect(path = '/wisehire/signup'): void {
  const safePath = safeInternalRedirect(path, '/wisehire/signup');
  try {
    safeStorage()?.setItem(WH_SIGNUP_REDIRECT_KEY, JSON.stringify({
      path: safePath,
      expiresAt: Date.now() + REDIRECT_MAX_STORAGE_MS,
    }));
  } catch {
    // The explicit auth redirect still handles same-tab login.
  }
}

export function getRememberedWiseHireSignupRedirect(fallback = '/dashboard'): string {
  const storage = safeStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(WH_SIGNUP_REDIRECT_KEY);
    if (!raw) return fallback;
    if (!raw.startsWith('{')) return safeInternalRedirect(raw, fallback);
    const parsed = JSON.parse(raw) as StoredRedirectIntent;
    if (!Number.isFinite(parsed.expiresAt) || parsed.expiresAt <= Date.now()) {
      clearWiseHireSignupRedirect();
      return fallback;
    }
    return safeInternalRedirect(parsed.path, fallback);
  } catch {
    clearWiseHireSignupRedirect();
    return fallback;
  }
}

export function clearWiseHireSignupRedirect(): void {
  try {
    safeStorage()?.removeItem(WH_SIGNUP_REDIRECT_KEY);
  } catch {
    // Best-effort cleanup only.
  }
}

export type ValidateEarlyAccessResult =
  | { valid: true; recipient_email: string; expires_at: string }
  | { valid: false; error: string; reason: InviteFailureReason };

const inviteErrorMessages: Record<InviteFailureReason, string> = {
  not_found: 'This early access code was not found.',
  expired: 'This early access code has expired.',
  already_used: 'This early access code has already been used.',
  revoked: 'This early access code is no longer active.',
  invalid_signature: 'This early access code is invalid.',
  missing_token: 'Please enter your early access code.',
  server_error: 'We could not validate the code. Please try again.',
};

/** Early-access codes and invite links share one server-owned authority. */
export async function validateEarlyAccessCode(code: string): Promise<ValidateEarlyAccessResult> {
  const result = await validateInviteToken(code);
  if (result.valid) return result;
  return { valid: false, reason: result.reason, error: inviteErrorMessages[result.reason] };
}

export interface CompleteEarlyAccessPayload {
  early_access_code: string;
  full_name?: string;
  company_name?: string;
  company_size?: string;
}

export async function completeEarlyAccessSignup(
  payload: CompleteEarlyAccessPayload,
): Promise<CompleteSignupResult> {
  return completeWiseHireSignup({
    invite_token: payload.early_access_code,
    full_name: payload.full_name,
    company_name: payload.company_name,
    company_size: payload.company_size,
  });
}
