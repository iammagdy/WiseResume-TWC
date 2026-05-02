import { getServiceClient } from '../_shared/dbClient.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
async function hmacVerify(message: string, signature: string, secret: string): Promise<boolean> {
  const keyData = new TextEncoder().encode(secret);
  const msgData = new TextEncoder().encode(message);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, msgData);
  const expected = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

function json(data: unknown, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(wrapHandler("wisehire-validate-invite", async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { token } = body as { token?: string };

    if (!token?.trim()) {
      return json({ valid: false, reason: 'missing_token' }, 400, corsHeaders);
    }

    const WISEHIRE_INVITE_SECRET =
      Deno.env.get('WISEHIRE_INVITE_SECRET') ?? Deno.env.get('DEV_KIT_PASSWORD') ?? '';

    if (!WISEHIRE_INVITE_SECRET) {
      console.error('[wisehire-validate-invite] WISEHIRE_INVITE_SECRET not configured');
      return json({ valid: false, reason: 'server_error' }, 500, corsHeaders);
    }

    const supabase = getServiceClient();

    const { data: invite, error: fetchErr } = await supabase
      .from('wisehire_invites')
      .select('token, token_signature, recipient_email, expires_at, used_at, is_revoked')
      .eq('token', token.trim())
      .maybeSingle();

    if (fetchErr) {
      console.error('[wisehire-validate-invite] DB fetch error:', fetchErr.message);
      return json({ valid: false, reason: 'server_error' }, 500, corsHeaders);
    }

    if (!invite) {
      return json({ valid: false, reason: 'not_found' }, 200, corsHeaders);
    }

    if (invite.is_revoked) {
      return json({ valid: false, reason: 'revoked' }, 200, corsHeaders);
    }

    if (invite.used_at) {
      return json({ valid: false, reason: 'already_used' }, 200, corsHeaders);
    }

    if (new Date(invite.expires_at) < new Date()) {
      return json({ valid: false, reason: 'expired' }, 200, corsHeaders);
    }

    const signatureOk = await hmacVerify(invite.token, invite.token_signature, WISEHIRE_INVITE_SECRET);
    if (!signatureOk) {
      console.warn('[wisehire-validate-invite] HMAC signature mismatch for token', token);
      return json({ valid: false, reason: 'invalid_signature' }, 200, corsHeaders);
    }

    return json(
      { valid: true, recipient_email: invite.recipient_email, expires_at: invite.expires_at },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error('[wisehire-validate-invite]', err);
    return json({ valid: false, reason: 'server_error' }, 500, corsHeaders);
  }
}));
