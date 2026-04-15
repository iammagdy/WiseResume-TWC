import { supabase } from '@/integrations/supabase/safeClient';

export type ValidateInviteResult =
  | { valid: true; recipient_email: string; expires_at: string }
  | { valid: false; reason: 'not_found' | 'expired' | 'already_used' | 'revoked' | 'invalid_signature' | 'missing_token' | 'server_error' };

export async function validateInviteToken(token: string): Promise<ValidateInviteResult> {
  const { data, error } = await supabase.functions.invoke('wisehire-validate-invite', {
    body: { token },
  });

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
  const { data, error } = await supabase.functions.invoke('wisehire-complete-signup', {
    body: payload,
  });

  if (error) {
    console.error('[inviteTokenClient] wisehire-complete-signup error:', error);
    return { success: false, error: error.message ?? 'server_error' };
  }

  return data as CompleteSignupResult;
}

/** Session-storage key used to carry the invite token through the Kinde register redirect */
export const WH_INVITE_STORAGE_KEY = 'wh_invite_token';
export const WH_SIGNUP_REDIRECT_KEY = 'wh_signup_redirect';
