// admin-rotate-totp: Two-step TOTP secret rotation for DevKit.
//
// Actions:
//   status  — returns whether ADMIN_TOTP_SECRET is configured and whether a pending rotation exists
//   request — generates a fresh TOTP secret, stores it pending in app_settings, returns QR code
//   confirm — verifies the admin's new TOTP code; if valid, updates the secret via Supabase
//             Management API (requires SUPABASE_MANAGEMENT_TOKEN + SUPABASE_PROJECT_REF), or
//             returns the new secret for manual update if those are not configured
//   cancel  — discards the pending rotation
//
// Auth: requires a valid DevKit session token in Authorization: Bearer <token>

import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// ---------- TOTP helpers ----------

function base32Encode(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const str = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  let idx = 0;
  const output = new Uint8Array(Math.floor((str.length * 5) / 8));
  for (const char of str) {
    const pos = alphabet.indexOf(char);
    if (pos < 0) continue;
    value = (value << 5) | pos;
    bits += 5;
    if (bits >= 8) {
      output[idx++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  return output.slice(0, idx);
}

async function hotpCode(secret: Uint8Array, counter: bigint): Promise<string> {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setBigUint64(0, counter, false);
  const key = await crypto.subtle.importKey(
    'raw', secret, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, buf);
  const bytes = new Uint8Array(sig);
  const offset = bytes[19] & 0x0f;
  const code =
    (((bytes[offset] & 0x7f) << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) %
    1_000_000;
  return code.toString().padStart(6, '0');
}

async function verifyTotp(secretB32: string, userCode: string): Promise<boolean> {
  const secret = base32Decode(secretB32);
  const counter = BigInt(Math.floor(Date.now() / 1000 / 30));
  for (const delta of [-1n, 0n, 1n]) {
    const expected = await hotpCode(secret, counter + delta);
    if (expected === userCode.trim()) return true;
  }
  return false;
}

// ---------- Management API helper ----------

async function updateSupabaseSecret(name: string, value: string): Promise<{ ok: boolean; error?: string }> {
  const managementToken = Deno.env.get('SUPABASE_MANAGEMENT_TOKEN')?.trim();
  const projectRef = Deno.env.get('SUPABASE_PROJECT_REF')?.trim();

  if (!managementToken || !projectRef) {
    return { ok: false, error: 'SUPABASE_MANAGEMENT_TOKEN or SUPABASE_PROJECT_REF not configured' };
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/secrets`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${managementToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ name, value }]),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    return { ok: false, error: `Management API returned ${response.status}: ${body}` };
  }
  return { ok: true };
}

// ---------- Handler ----------

interface PendingRotation {
  secret: string;
  generated_at: string;
  generated_by: string;
  expires_at: string;
}

const PENDING_KEY = 'admin_totp_pending_rotation';
const ROTATION_TTL_MINUTES = 30;
const ISSUER = 'WiseResume';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let callerEmail: string;
    try {
      callerEmail = await requireAdminAuth(req, corsHeaders);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const body = await req.json();
    const { action, totp_code } = body as { action?: string; totp_code?: string };

    const supabase = getServiceClient();

    // ---------- status ----------
    if (action === 'status') {
      const isConfigured = !!Deno.env.get('ADMIN_TOTP_SECRET')?.trim();
      const canAutoUpdate = !!(
        Deno.env.get('SUPABASE_MANAGEMENT_TOKEN')?.trim() &&
        Deno.env.get('SUPABASE_PROJECT_REF')?.trim()
      );

      const { data: pendingRow } = await supabase
        .from('app_settings')
        .select('value, updated_at')
        .eq('key', PENDING_KEY)
        .maybeSingle();

      let pendingRotation: null | { generated_at: string; generated_by: string; expires_at: string } = null;
      if (pendingRow?.value) {
        const p = pendingRow.value as PendingRotation;
        if (new Date(p.expires_at) > new Date()) {
          pendingRotation = {
            generated_at: p.generated_at,
            generated_by: p.generated_by,
            expires_at: p.expires_at,
          };
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          totp_configured: isConfigured,
          can_auto_update: canAutoUpdate,
          pending_rotation: pendingRotation,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---------- request ----------
    if (action === 'request') {
      const newSecretBytes = crypto.getRandomValues(new Uint8Array(20));
      const newSecretB32 = base32Encode(newSecretBytes);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + ROTATION_TTL_MINUTES * 60 * 1000);

      const pendingValue: PendingRotation = {
        secret: newSecretB32,
        generated_at: now.toISOString(),
        generated_by: callerEmail,
        expires_at: expiresAt.toISOString(),
      };

      const { error: upsertErr } = await supabase
        .from('app_settings')
        .upsert({ key: PENDING_KEY, value: pendingValue }, { onConflict: 'key' });

      if (upsertErr) {
        console.error('[admin-rotate-totp] failed to store pending:', upsertErr);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to store pending rotation: ' + upsertErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const otpauthUrl =
        `otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent(callerEmail)}` +
        `?secret=${newSecretB32}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=30`;

      return new Response(
        JSON.stringify({
          success: true,
          otpauth_url: otpauthUrl,
          secret_b32: newSecretB32,
          expires_at: expiresAt.toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---------- confirm ----------
    if (action === 'confirm') {
      if (!totp_code || typeof totp_code !== 'string' || totp_code.trim().length !== 6) {
        return new Response(
          JSON.stringify({ success: false, error: 'A 6-digit authenticator code is required.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: pendingRow, error: fetchErr } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', PENDING_KEY)
        .maybeSingle();

      if (fetchErr) {
        console.error('[admin-rotate-totp] failed to fetch pending:', fetchErr);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to retrieve pending rotation.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!pendingRow?.value) {
        return new Response(
          JSON.stringify({ success: false, error: 'No pending TOTP rotation found. Please request a new one.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const pending = pendingRow.value as PendingRotation;

      if (new Date(pending.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: 'The pending rotation has expired. Please request a new one.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isValid = await verifyTotp(pending.secret, totp_code.trim());
      if (!isValid) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid code — make sure you scanned the new QR code and that your device clock is accurate.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // TOTP verified — attempt to update via Management API
      const updateResult = await updateSupabaseSecret('ADMIN_TOTP_SECRET', pending.secret);

      // Clean up pending regardless
      await supabase.from('app_settings').delete().eq('key', PENDING_KEY);

      // Write audit log.
      // user_id is null (no target user — admin is rotating their own secret).
      // target_email in metadata is the fallback the audit-logs reader uses to
      // display the actor email when user_id is null.
      const auditInsert = await supabase.from('audit_logs').insert({
        user_id: null,
        action: 'totp_rotated',
        category: 'security',
        metadata: {
          target_email: callerEmail,
          rotated_by: callerEmail,
          automated_update: updateResult.ok,
          update_error: updateResult.error ?? null,
          rotated_at: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      });

      if (auditInsert.error) {
        console.warn('[admin-rotate-totp] audit log write failed (non-fatal):', auditInsert.error);
      }

      if (updateResult.ok) {
        return new Response(
          JSON.stringify({ success: true, automated: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Automated update failed — return secret for manual update
      return new Response(
        JSON.stringify({
          success: true,
          automated: false,
          new_secret: pending.secret,
          manual_update_reason: updateResult.error,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---------- cancel ----------
    if (action === 'cancel') {
      await supabase.from('app_settings').delete().eq('key', PENDING_KEY);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[admin-rotate-totp] unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
