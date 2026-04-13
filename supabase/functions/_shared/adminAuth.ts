/**
 * Shared admin authentication middleware for edge functions.
 *
 * Auth is handled in two paths:
 *
 * PRIMARY (session token path — no Supabase session required):
 *   The DevKit session token is issued by verify-dev-kit after successful password
 *   login. It is HMAC-SHA-256 signed with DEV_KIT_PASSWORD and expires after 8h.
 *   The token encodes the admin's email, so the caller is identified WITHOUT calling
 *   supabase.auth.getUser(). This means the admin does NOT need to be signed in to
 *   the main Supabase app for the DevKit to function.
 *
 * FALLBACK (raw password / legacy):
 *   If no valid session token is provided, the function falls back to verifying a
 *   Supabase Bearer JWT (to identify the caller's email) and comparing the raw
 *   DEV_KIT_PASSWORD directly. This path requires an active Supabase session.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

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
 * PRIMARY PATH (session token):
 *   Verifies the HMAC-signed session token, extracts the embedded email, and checks
 *   it against ADMIN_EMAILS. No Supabase user lookup is needed — the token is the
 *   sole source of truth for identity and authentication.
 *
 * FALLBACK PATH (raw password):
 *   If the session token is absent or invalid, falls back to verifying the caller's
 *   Supabase JWT + comparing the raw DEV_KIT_PASSWORD. This requires an active
 *   Supabase session and is kept for backward compatibility only.
 *
 * @param req      The incoming edge function request.
 * @param password Either a session token (primary) or the raw admin password (legacy).
 * @returns The verified caller email on success.
 * @throws A Response object with appropriate HTTP status on any failure.
 */
export async function requireAdminAuth(req: Request, password: string): Promise<string> {
  const SECRET_PASSWORD = Deno.env.get('DEV_KIT_PASSWORD')?.trim();

  if (!SECRET_PASSWORD) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Admin functions are not configured' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!password) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ── PRIMARY PATH: Session token (self-contained, no Supabase session required) ──
  const tokenEmail = await verifySessionToken(password, SECRET_PASSWORD);
  if (tokenEmail !== null) {
    const normalised = tokenEmail.toLowerCase();
    if (!allowed.includes(normalised)) {
      throw new Response(
        JSON.stringify({ success: false, error: 'Forbidden: email not in admin allowlist' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    return normalised;
  }

  // ── FALLBACK PATH: Raw password + Supabase Bearer JWT ──
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const bearerToken = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: `Bearer ${bearerToken}` } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const callerEmail = user?.email?.toLowerCase() ?? null;

  if (!callerEmail) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!allowed.includes(callerEmail)) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Forbidden: email not in admin allowlist' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (password !== SECRET_PASSWORD) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return callerEmail;
}
