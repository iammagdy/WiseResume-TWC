/**
 * Shared admin authentication middleware for edge functions.
 *
 * Auth is exclusively via the DevKit session token issued by verify-dev-kit
 * after successful password login. The token is HMAC-SHA-256 signed with
 * DEV_KIT_PASSWORD and expires after 8h. The token encodes the admin's email,
 * so the caller is identified WITHOUT calling supabase.auth.getUser(). This
 * means the admin does NOT need to be signed in to the main Supabase app for
 * the DevKit to function.
 *
 * The legacy "Bearer Supabase JWT + raw DEV_KIT_PASSWORD" fallback was removed
 * (Task #10 hardening): it required an active Supabase session in addition to
 * the DevKit password, opened a wider attack surface (any compromised Supabase
 * JWT for an admin email + the password could call admin endpoints), and was
 * a redundant code path now that DevKitSessionProvider always issues the
 * session token before invoking admin functions.
 */

import { getCorsHeaders } from './cors.ts';

async function verifySessionToken(token: string, secretKey: string): Promise<string | null> {
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return null;
    const payloadB64 = token.slice(0, dotIdx);
    const sigHex = token.slice(dotIdx + 1);
    const payload = atob(payloadB64);
    const colonIdx = payload.lastIndexOf(':');
    if (colonIdx === -1) return null;
    const email = payload.slice(0, colonIdx);
    const expiresAt = parseInt(payload.slice(colonIdx + 1), 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return null;
    const keyData = new TextEncoder().encode(secretKey);
    const msgData = new TextEncoder().encode(payload);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
    const valid = await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, msgData);
    if (!valid) return null;
    return email;
  } catch {
    return null;
  }
}

/**
 * Verifies admin identity for an incoming edge function request.
 *
 * Verifies the HMAC-signed session token, extracts the embedded email, and
 * checks it against ADMIN_EMAILS. No Supabase user lookup is needed — the
 * token is the sole source of truth for identity and authentication.
 *
 * @param req         The incoming edge function request.
 * @param password    The DevKit session token issued by verify-dev-kit.
 * @param corsHeaders Optional pre-computed CORS headers to use in error responses.
 *                    When omitted, headers are derived from the request Origin.
 * @returns The verified caller email on success.
 * @throws A Response object with appropriate HTTP status on any failure.
 */
export async function requireAdminAuth(
  req: Request,
  password: string,
  corsHeaders?: Record<string, string>,
): Promise<string> {
  const origin = req.headers.get('Origin');
  const headers = corsHeaders ?? getCorsHeaders(origin);

  const SECRET_PASSWORD = Deno.env.get('DEV_KIT_PASSWORD')?.trim();

  if (!SECRET_PASSWORD) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Admin functions are not configured' }),
      { status: 503, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  const ADMIN_EMAILS = Deno.env.get('ADMIN_EMAILS');
  const allowed = (ADMIN_EMAILS ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) {
    throw new Response(
      JSON.stringify({
        success: false,
        error: 'ADMIN_EMAILS is not configured. Set it in Supabase Edge Function Secrets.',
      }),
      { status: 503, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  if (!password) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  // Verify the HMAC-signed session token. This is the only accepted credential.
  const tokenEmail = await verifySessionToken(password, SECRET_PASSWORD);
  if (tokenEmail === null) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  const normalised = tokenEmail.toLowerCase();
  if (!allowed.includes(normalised)) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Forbidden: email not in admin allowlist' }),
      { status: 403, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  return normalised;
}
