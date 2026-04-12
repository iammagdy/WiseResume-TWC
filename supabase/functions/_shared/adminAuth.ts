/**
 * Shared admin authentication middleware for edge functions.
 * Verifies: (1) signed session token bound to caller JWT, (2) caller JWT, (3) caller email in ADMIN_EMAILS allowlist.
 *
 * Session tokens are issued by verify-dev-kit on successful password login.
 * They are HMAC-SHA-256 signed with DEV_KIT_PASSWORD and expire after 8 hours.
 * The raw password is never retained on the client after the initial unlock.
 *
 * Token-auth path: token email must match JWT caller email (prevents token theft/replay by different user).
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
 * Verifies admin identity. Always validates the Bearer JWT and fetches caller email first.
 * Then:
 *   - If `password` is a valid session token: verifies HMAC + expiry + tokenEmail === callerEmail + allowlist.
 *   - Otherwise: falls back to raw-password comparison + allowlist (for backward compatibility).
 *
 * @param req     The incoming edge function request.
 * @param password  Either a session token (new path) or the raw admin password (legacy fallback).
 * @returns The verified caller email on success.
 * @throws A Response object with appropriate HTTP status on any failure.
 */
export async function requireAdminAuth(req: Request, password: string): Promise<string> {
  const SECRET_PASSWORD = Deno.env.get('DEV_KIT_PASSWORD');

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

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Authorization header with Bearer token required' }),
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
      JSON.stringify({ success: false, error: 'Authorization header with Bearer token required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!allowed.includes(callerEmail)) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Forbidden: email not in admin allowlist' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const tokenEmail = await verifySessionToken(password, SECRET_PASSWORD);
  if (tokenEmail !== null) {
    if (tokenEmail.toLowerCase() !== callerEmail) {
      throw new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    return callerEmail;
  }

  if (password !== SECRET_PASSWORD) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return callerEmail;
}
