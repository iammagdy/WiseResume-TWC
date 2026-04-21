/**
 * Shared admin authentication middleware for edge functions.
 *
 * Auth is exclusively via the DevKit session token issued by verify-dev-kit
 * after successful password + TOTP login. The token is HMAC-SHA-256 signed
 * with DEV_KIT_PASSWORD; the signed payload is `email:sessionId:expiresAt`.
 *
 * The token MUST be sent in the `Authorization: Bearer <token>` request
 * header (AUTH-5 / audit finding M6 — body transport removed). After the
 * HMAC signature verifies, the session is looked up in the
 * `admin_sessions` table (AUTH-5 / audit finding H2): rows that are
 * revoked or past expires_at are rejected.
 *
 * On every successful call we update last_used_at + ip on the session row
 * so admins can audit and revoke individual sessions.
 */

import { getCorsHeaders } from './cors.ts';
import { getServiceClient } from './dbClient.ts';

interface VerifiedSession {
  email: string;
  sessionId: string;
}

async function verifySessionToken(
  token: string,
  secretKey: string,
): Promise<VerifiedSession | null> {
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return null;
    const payloadB64 = token.slice(0, dotIdx);
    const sigHex = token.slice(dotIdx + 1);

    // AUTH-5 / audit finding H3: validate the hex signature before slicing.
    // Previously a malformed sigHex (empty / odd length / non-hex) would crash
    // inside `sigHex.match(/.{2}/g)!.map(...)` via the non-null assertion.
    if (!sigHex || sigHex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(sigHex)) {
      return null;
    }

    let payload: string;
    try {
      payload = atob(payloadB64);
    } catch {
      return null;
    }

    // payload format: email:sessionId:expiresAt
    // We split from the right so that emails containing ':' (none in practice
    // but be defensive) don't break parsing.
    const lastColon = payload.lastIndexOf(':');
    if (lastColon === -1) return null;
    const expiresAt = parseInt(payload.slice(lastColon + 1), 10);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

    const rest = payload.slice(0, lastColon);
    const sessionColon = rest.lastIndexOf(':');
    if (sessionColon === -1) return null;
    const email = rest.slice(0, sessionColon);
    const sessionId = rest.slice(sessionColon + 1);
    if (!email || !sessionId) return null;

    const keyData = new TextEncoder().encode(secretKey);
    const msgData = new TextEncoder().encode(payload);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBytes = new Uint8Array(
      (sigHex.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16)),
    );
    const valid = await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, msgData);
    if (!valid) return null;
    return { email, sessionId };
  } catch {
    return null;
  }
}

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get('Authorization') ?? req.headers.get('authorization');
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1].trim();
  return token || null;
}

function clientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-real-ip')
    ?? null;
}

/**
 * Verifies admin identity for an incoming edge function request.
 *
 * Reads the DevKit session token from `Authorization: Bearer <token>`,
 * verifies the HMAC signature, looks the session up in `admin_sessions`,
 * and confirms the embedded email is in ADMIN_EMAILS. Updates
 * last_used_at + ip on the session row on success.
 *
 * @returns The verified caller email on success.
 * @throws A Response object (401/403/503) on any failure.
 */
export async function requireAdminAuth(
  req: Request,
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

  const token = extractBearerToken(req);
  if (!token) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  const verified = await verifySessionToken(token, SECRET_PASSWORD);
  if (!verified) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  const normalised = verified.email.toLowerCase();
  if (!allowed.includes(normalised)) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Forbidden: email not in admin allowlist' }),
      { status: 403, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  // AUTH-5 / audit finding H2: enforce per-session revocation via DB lookup.
  const supabase = getServiceClient();
  const { data: session, error } = await supabase
    .from('admin_sessions')
    .select('id, email, expires_at, revoked_at')
    .eq('id', verified.sessionId)
    .maybeSingle();

  if (error || !session) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  if (session.revoked_at !== null && session.revoked_at !== undefined) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Session revoked' }),
      { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  if (new Date(session.expires_at as string).getTime() < Date.now()) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Session expired' }),
      { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  // Best-effort touch — don't fail the request if it doesn't write.
  try {
    await supabase
      .from('admin_sessions')
      .update({
        last_used_at: new Date().toISOString(),
        ip: clientIp(req),
        user_agent: req.headers.get('user-agent') ?? null,
      })
      .eq('id', verified.sessionId);
  } catch (touchErr) {
    console.warn('[adminAuth] failed to update last_used_at', touchErr);
  }

  return normalised;
}
