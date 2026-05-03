import { invokeWisehireAccess } from '@/lib/wisehire/wisehireAccessClient';

export type ValidateInviteResult =
  | { valid: true; recipient_email: string; expires_at: string }
  | { valid: false; reason: 'not_found' | 'expired' | 'already_used' | 'revoked' | 'invalid_signature' | 'missing_token' | 'server_error' };

export async function validateInviteToken(token: string): Promise<ValidateInviteResult> {
  const { data, error } = await invokeWisehireAccess('validate-invite', { token });

  if (error) {
    console.error('[inviteTokenClient] wisehire-validate-invite error:', error);
    return { valid: false, reason: 'server_error' };
  }

  return data as ValidateInviteResult;
}

export interface CompleteSignupPayload {
  invite_token: string;
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
  const { data, error } = await invokeWisehireAccess('complete-signup', payload as unknown as Record<string, unknown>);

  if (error) {
    console.error('[inviteTokenClient] wisehire-complete-signup error:', error);
    return { success: false, error: error.message ?? 'server_error' };
  }

  return data as CompleteSignupResult;
}

/** Session-storage key used to carry the invite token through the Kinde register redirect */
export const WH_INVITE_STORAGE_KEY = 'wh_invite_token';
export const WH_SIGNUP_REDIRECT_KEY = 'wh_signup_redirect';

/** Session-storage key used to carry the early access code through the Kinde register redirect */
export const WH_EARLY_ACCESS_CODE_KEY = 'wh_early_access_code';

export type ValidateEarlyAccessResult =
  | { valid: true; plan_override: string; plan_days: number | null }
  | { valid: false; error: string };

export async function validateEarlyAccessCode(code: string): Promise<ValidateEarlyAccessResult> {
  const { data, error } = await invokeWisehireAccess('validate-early-access', { code });

  if (error) {
    console.error('[inviteTokenClient] wisehire-validate-early-access error:', error);
    return { valid: false, error: 'Failed to validate code. Please try again.' };
  }

  return data as ValidateEarlyAccessResult;
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
  const { data, error } = await invokeWisehireAccess('complete-signup', payload as unknown as Record<string, unknown>);

  if (error) {
    console.error('[inviteTokenClient] wisehire-complete-signup (early access) error:', error);
    return { success: false, error: error.message ?? 'server_error' };
  }

  return data as CompleteSignupResult;
}
