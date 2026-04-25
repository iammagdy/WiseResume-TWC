// admin-rotate-totp: Two-step TOTP secret rotation for DevKit, plus
// first-time bootstrap wizard support.
//
// Actions (require an authenticated DevKit session):
//   status     — returns whether ADMIN_TOTP_SECRET is configured and whether a pending rotation exists
//   request    — generates a fresh TOTP secret, stores it pending in app_settings, returns QR code
//   confirm    — verifies the admin's new TOTP code; if valid, updates the secret via Supabase
//                Management API (requires a management token + project ref — see below), or
//                returns the new secret for manual update if those are not configured
//   cancel     — discards the pending rotation
//
// Actions (UNAUTHENTICATED — only valid when ADMIN_TOTP_SECRET is unset):
//   bootstrap_status   — returns { totp_configured, can_auto_update } with no auth.
//                        Lets the DevKit page detect "fresh install" and auto-launch
//                        the setup wizard without first failing a login.
//   bootstrap_request  — gated by email ∈ ADMIN_EMAILS + DEV_KIT_PASSWORD match.
//                        Generates a Base32 secret, stores it encrypted in the
//                        existing pending-rotation slot, returns the secret + QR URI.
//   bootstrap_confirm  — gated by email ∈ ADMIN_EMAILS + DEV_KIT_PASSWORD match
//                        + 6-digit code matching the pending secret. Promotes the
//                        secret to ADMIN_TOTP_SECRET via the Management API and
//                        clears the pending slot. If the Management API is not
//                        configured, returns the secret value for manual entry
//                        instead of silently failing.
//
// Bootstrap actions hard-refuse once ADMIN_TOTP_SECRET exists — rotation must
// then go through the authenticated rotation panel — and are rate-limited per
// IP via rpc_rate_limits (a handful of attempts per hour). Every attempt is
// logged to audit_logs.
//
// Management API credentials (set as edge function secrets):
//   SUPABASE_MANAGEMENT_TOKEN — preferred name for the Supabase personal access token.
//                               Falls back to ADMIN_MANAGEMENT_TOKEN when Supabase blocks the
//                               SUPABASE_ prefix on user-defined secrets (which it often does).
//   SUPABASE_PROJECT_REF      — preferred name for the project ref (e.g. jnsfmkzgxsviuthaqlyy).
//                               Falls back to extracting the ref from the built-in SUPABASE_URL.
//
// Auth: rotation actions require a valid DevKit session token in
// `Authorization: Bearer <token>`. Bootstrap actions intentionally do not.

import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { encrypt, decrypt } from '../_shared/encryption.ts';
import { escapeHtml } from '../_shared/htmlEscape.ts';

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
  for (const delta of [-2n, -1n, 0n, 1n, 2n]) {
    const expected = await hotpCode(secret, counter + delta);
    if (expected === userCode.trim()) return true;
  }
  return false;
}

// ---------- DevKit-password constant-time compare (mirrors verify-dev-kit) ----------

async function hmacPasswordEqual(a: string, b: string): Promise<boolean> {
  const fixedMessage = new TextEncoder().encode('wiseresume-devkit-auth');
  const [macA, macB] = await Promise.all([a, b].map(async (pw) => {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(pw), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, fixedMessage);
    return Array.from(new Uint8Array(sig)).map(x => x.toString(16).padStart(2, '0')).join('');
  }));
  return macA === macB;
}

// ---------- Management API helper ----------

function resolveProjectRef(): string | undefined {
  const explicit = Deno.env.get('SUPABASE_PROJECT_REF')?.trim();
  if (explicit) return explicit;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  if (!supabaseUrl) return undefined;
  try {
    const hostname = new URL(supabaseUrl).hostname;
    return hostname.split('.')[0] || undefined;
  } catch {
    return undefined;
  }
}

function resolveManagementToken(): string | undefined {
  return (
    Deno.env.get('SUPABASE_MANAGEMENT_TOKEN')?.trim() ||
    Deno.env.get('ADMIN_MANAGEMENT_TOKEN')?.trim()
  );
}

async function updateSupabaseSecret(name: string, value: string): Promise<{ ok: boolean; error?: string }> {
  const managementToken = resolveManagementToken();
  const projectRef = resolveProjectRef();

  if (!managementToken || !projectRef) {
    return { ok: false, error: 'SUPABASE_MANAGEMENT_TOKEN (or ADMIN_MANAGEMENT_TOKEN) not configured, or project ref could not be determined' };
  }

  const tokenSource = Deno.env.get('SUPABASE_MANAGEMENT_TOKEN')?.trim()
    ? 'SUPABASE_MANAGEMENT_TOKEN'
    : 'ADMIN_MANAGEMENT_TOKEN';
  const refSource = Deno.env.get('SUPABASE_PROJECT_REF')?.trim()
    ? 'SUPABASE_PROJECT_REF'
    : 'SUPABASE_URL (derived)';
  console.log(`[admin-rotate-totp] updateSupabaseSecret: token source=${tokenSource}, ref source=${refSource}, project=${projectRef}`);

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

// ---------- Rotation notification email ----------

const ROTATION_NOTIFY_FROM = 'WiseResume Security <notifications@thewise.cloud>';

async function sendRotationNotification(params: {
  toEmail: string;
  rotatedAt: string;
  automated: boolean;
  manualReason?: string | null;
}): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim();
  if (!apiKey) {
    console.warn('[admin-rotate-totp] RESEND_API_KEY not configured — skipping rotation notification email');
    return;
  }

  const { toEmail, rotatedAt, automated, manualReason } = params;
  const mode = automated ? 'automatic' : 'manual';
  const subject = `WiseResume admin TOTP secret rotated (${mode})`;

  const safeEmail = escapeHtml(toEmail);
  const safeWhen = escapeHtml(rotatedAt);
  const safeMode = escapeHtml(mode);
  const safeReason = manualReason ? escapeHtml(manualReason) : '';

  const modeBlurb = automated
    ? 'The new secret was applied automatically via the Supabase Management API. No further action is required.'
    : 'The Management API update did not run, so the new secret was returned in the DevKit UI for manual entry into Supabase secrets.';

  const html = `<!doctype html>
<html><body style="font-family: -apple-system, Segoe UI, sans-serif; color: #111; line-height: 1.5;">
  <h2 style="margin: 0 0 12px;">Admin TOTP secret rotated</h2>
  <p>The DevKit admin TOTP secret was rotated for <strong>${safeEmail}</strong>.</p>
  <ul>
    <li><strong>When:</strong> ${safeWhen}</li>
    <li><strong>Type:</strong> ${safeMode}</li>
  </ul>
  <p>${escapeHtml(modeBlurb)}</p>
  ${safeReason ? `<p style="color:#666;font-size:12px;"><strong>Manual update reason:</strong> ${safeReason}</p>` : ''}
  <p style="color:#666;font-size:12px;margin-top:24px;">
    If you did not perform this rotation, treat this as a security incident: revoke active DevKit sessions and rotate <code>DEV_KIT_PASSWORD</code> immediately.
  </p>
</body></html>`;

  const text = [
    'Admin TOTP secret rotated',
    '',
    `Account: ${toEmail}`,
    `When:    ${rotatedAt}`,
    `Type:    ${mode}`,
    '',
    modeBlurb,
    manualReason ? `\nManual update reason: ${manualReason}` : '',
    '',
    'If you did not perform this rotation, treat it as a security incident:',
    'revoke active DevKit sessions and rotate DEV_KIT_PASSWORD immediately.',
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: ROTATION_NOTIFY_FROM,
        to: [toEmail],
        subject,
        html,
        text,
      }),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`[admin-rotate-totp] rotation notification email failed (${response.status}):`, errText);
    }
  } catch (err) {
    console.warn('[admin-rotate-totp] rotation notification email threw (non-fatal):', err);
  }
}

// ---------- Bootstrap rate limiting (IP-keyed via rpc_rate_limits) ----------

const BOOTSTRAP_RATE_ENDPOINT = 'devkit-totp-bootstrap';
const BOOTSTRAP_WINDOW_SECONDS = 60 * 60; // 1 hour
const BOOTSTRAP_MAX_ATTEMPTS = 10;        // per IP per hour

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
}

async function bootstrapRateLimit(ip: string): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const supabase = getServiceClient();
  const windowStart = new Date(Date.now() - BOOTSTRAP_WINDOW_SECONDS * 1000).toISOString();

  const { count, error: countError } = await supabase
    .from('rpc_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('endpoint', BOOTSTRAP_RATE_ENDPOINT)
    .gte('created_at', windowStart);

  if (countError) {
    console.warn('[admin-rotate-totp] bootstrap rate-limit count failed (failing open):', countError);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const used = count ?? 0;
  if (used >= BOOTSTRAP_MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: BOOTSTRAP_WINDOW_SECONDS };
  }

  const { error: insertError } = await supabase
    .from('rpc_rate_limits')
    .insert({ ip_address: ip, endpoint: BOOTSTRAP_RATE_ENDPOINT });
  if (insertError) {
    console.warn('[admin-rotate-totp] bootstrap rate-limit insert failed (continuing):', insertError);
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

async function logBootstrapAttempt(
  action: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = getServiceClient();
    const { error } = await supabase.from('audit_logs').insert({
      user_id: null,
      action,
      category: 'security',
      metadata: {
        ...metadata,
        recorded_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[admin-rotate-totp] bootstrap audit log failed (non-fatal):', error);
    }
  } catch (err) {
    console.warn('[admin-rotate-totp] bootstrap audit log threw (non-fatal):', err);
  }
}

// ---------- Handler ----------

interface PendingRotation {
  secret: string;
  encrypted: boolean;
  generated_at: string;
  generated_by: string;
  expires_at: string;
}

const PENDING_KEY = 'admin_totp_pending_rotation';
const ROTATION_TTL_MINUTES = 30;
const ISSUER = 'WiseResume';

const BOOTSTRAP_ACTIONS = new Set(['bootstrap_status', 'bootstrap_request', 'bootstrap_confirm']);

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const { action, totp_code, email, password } = body as {
      action?: string;
      totp_code?: string;
      email?: string;
      password?: string;
    };

    const supabase = getServiceClient();

    // ---------- Bootstrap actions (no admin session required) ----------
    if (action && BOOTSTRAP_ACTIONS.has(action)) {
      return await handleBootstrap(req, corsHeaders, supabase, {
        action,
        totp_code,
        email,
        password,
      });
    }

    // ---------- All other actions require an authenticated admin ----------
    let callerEmail: string;
    try {
      callerEmail = await requireAdminAuth(req, corsHeaders);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    // ---------- status ----------
    if (action === 'status') {
      const isConfigured = !!Deno.env.get('ADMIN_TOTP_SECRET')?.trim();
      const canAutoUpdate = !!(
        resolveManagementToken() &&
        resolveProjectRef()
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

      let secretToStore = newSecretB32;
      let isEncrypted = false;
      try {
        secretToStore = await encrypt(newSecretB32);
        isEncrypted = true;
      } catch (encErr: unknown) {
        if (encErr instanceof Error && (encErr as { code?: string }).code === 'encryption_not_configured') {
          console.warn('[admin-rotate-totp] ' + encErr.message + ' — storing pending TOTP secret as plain text');
        } else {
          throw encErr;
        }
      }

      const pendingValue: PendingRotation = {
        secret: secretToStore,
        encrypted: isEncrypted,
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

      let pendingSecret = pending.secret;
      if (pending.encrypted) {
        try {
          pendingSecret = await decrypt(pending.secret);
        } catch (decErr: unknown) {
          console.error('[admin-rotate-totp] failed to decrypt pending secret — API_KEY_ENCRYPTION_SECRET may have changed:', decErr);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to decrypt pending rotation secret. The encryption key may have changed — please cancel and request a new rotation.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const isValid = await verifyTotp(pendingSecret, totp_code.trim());
      if (!isValid) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid code — make sure you scanned the new QR code and that your device clock is accurate.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // TOTP verified — attempt to update via Management API
      const updateResult = await updateSupabaseSecret('ADMIN_TOTP_SECRET', pendingSecret);
      const rotatedAt = new Date().toISOString();

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
          rotated_at: rotatedAt,
        },
        created_at: rotatedAt,
      });

      if (auditInsert.error) {
        console.warn('[admin-rotate-totp] audit log write failed (non-fatal):', auditInsert.error);
      }

      // Fire-and-forget notification email so the admin gets a confirmation
      // even if the rotation was triggered without their knowledge. We await
      // it here (rather than truly fire-and-forget) so the edge function
      // doesn't terminate before the request finishes; the helper itself
      // swallows any send errors so they can't break the rotation response.
      await sendRotationNotification({
        toEmail: callerEmail,
        rotatedAt,
        automated: updateResult.ok,
        manualReason: updateResult.ok ? null : updateResult.error ?? null,
      });

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
          new_secret: pendingSecret,
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

// ---------- Bootstrap handler (no admin session) ----------

interface BootstrapInput {
  action: string;
  totp_code?: string;
  email?: string;
  password?: string;
}

type ServiceClient = ReturnType<typeof getServiceClient>;

async function handleBootstrap(
  req: Request,
  corsHeaders: Record<string, string>,
  supabase: ServiceClient,
  input: BootstrapInput,
): Promise<Response> {
  const ip = clientIp(req);
  const userAgent = req.headers.get('user-agent') ?? null;

  // bootstrap_status: cheap, unauthenticated, only reveals presence/absence
  // of the secret + whether automatic update is wired. Safe to expose.
  if (input.action === 'bootstrap_status') {
    const isConfigured = !!Deno.env.get('ADMIN_TOTP_SECRET')?.trim();
    const canAutoUpdate = !!(resolveManagementToken() && resolveProjectRef());
    return new Response(
      JSON.stringify({
        success: true,
        totp_configured: isConfigured,
        can_auto_update: canAutoUpdate,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Hard-refuse if the secret already exists — once bootstrapped, rotation
  // must go through the authenticated rotation panel.
  if (Deno.env.get('ADMIN_TOTP_SECRET')?.trim()) {
    await logBootstrapAttempt('totp_bootstrap_blocked', {
      reason: 'already_configured',
      action: input.action,
      attempted_email: typeof input.email === 'string' ? input.email.toLowerCase() : null,
      ip,
      user_agent: userAgent,
    });
    return new Response(
      JSON.stringify({
        success: false,
        reason: 'already_configured',
        error: 'ADMIN_TOTP_SECRET is already configured. Use the rotation panel inside DevKit to change it.',
      }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Rate limit by IP. We count every bootstrap_request / bootstrap_confirm
  // attempt in the same window so a brute-force loop on either action is
  // bounded.
  const rate = await bootstrapRateLimit(ip);
  if (!rate.allowed) {
    await logBootstrapAttempt('totp_bootstrap_blocked', {
      reason: 'rate_limited',
      action: input.action,
      ip,
      user_agent: userAgent,
    });
    return new Response(
      JSON.stringify({
        success: false,
        reason: 'rate_limited',
        retry_after_seconds: rate.retryAfterSeconds,
        error: 'Too many setup attempts from this address. Please wait a while and try again.',
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const SECRET_PASSWORD = Deno.env.get('DEV_KIT_PASSWORD')?.trim();
  if (!SECRET_PASSWORD) {
    return new Response(
      JSON.stringify({
        success: false,
        reason: 'devkit_password_missing',
        error: 'DEV_KIT_PASSWORD is not configured. Set it in Supabase Edge Function secrets before running setup.',
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const adminEmailsRaw = Deno.env.get('ADMIN_EMAILS') ?? '';
  const allowedEmails = adminEmailsRaw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowedEmails.length === 0) {
    return new Response(
      JSON.stringify({
        success: false,
        reason: 'admin_emails_missing',
        error: 'ADMIN_EMAILS is not configured. Set it in Supabase Edge Function secrets before running setup.',
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (typeof input.email !== 'string' || !input.email.trim() ||
      typeof input.password !== 'string' || !input.password) {
    return new Response(
      JSON.stringify({
        success: false,
        reason: 'missing_credentials',
        error: 'Email and DevKit password are required.',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const callerEmail = input.email.trim().toLowerCase();

  if (!allowedEmails.includes(callerEmail)) {
    await logBootstrapAttempt('totp_bootstrap_failed', {
      reason: 'email_not_allowed',
      action: input.action,
      attempted_email: callerEmail,
      ip,
      user_agent: userAgent,
    });
    return new Response(
      JSON.stringify({
        success: false,
        reason: 'email_not_allowed',
        error: 'This email is not in the admin allow-list.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const passwordOk = await hmacPasswordEqual(input.password.trim(), SECRET_PASSWORD);
  if (!passwordOk) {
    await logBootstrapAttempt('totp_bootstrap_failed', {
      reason: 'invalid_password',
      action: input.action,
      attempted_email: callerEmail,
      ip,
      user_agent: userAgent,
    });
    return new Response(
      JSON.stringify({
        success: false,
        reason: 'invalid_password',
        error: 'Incorrect DevKit password.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ---------- bootstrap_request ----------
  if (input.action === 'bootstrap_request') {
    const newSecretBytes = crypto.getRandomValues(new Uint8Array(20));
    const newSecretB32 = base32Encode(newSecretBytes);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ROTATION_TTL_MINUTES * 60 * 1000);

    let secretToStore = newSecretB32;
    let isEncrypted = false;
    try {
      secretToStore = await encrypt(newSecretB32);
      isEncrypted = true;
    } catch (encErr: unknown) {
      if (encErr instanceof Error && (encErr as { code?: string }).code === 'encryption_not_configured') {
        console.warn('[admin-rotate-totp] bootstrap: ' + encErr.message + ' — storing pending TOTP secret as plain text');
      } else {
        throw encErr;
      }
    }

    const pendingValue: PendingRotation = {
      secret: secretToStore,
      encrypted: isEncrypted,
      generated_at: now.toISOString(),
      generated_by: callerEmail,
      expires_at: expiresAt.toISOString(),
    };

    const { error: upsertErr } = await supabase
      .from('app_settings')
      .upsert({ key: PENDING_KEY, value: pendingValue }, { onConflict: 'key' });

    if (upsertErr) {
      console.error('[admin-rotate-totp] bootstrap: failed to store pending:', upsertErr);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to store pending bootstrap secret: ' + upsertErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await logBootstrapAttempt('totp_bootstrap_requested', {
      attempted_email: callerEmail,
      target_email: callerEmail,
      ip,
      user_agent: userAgent,
    });

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

  // ---------- bootstrap_confirm ----------
  if (input.action === 'bootstrap_confirm') {
    if (!input.totp_code || typeof input.totp_code !== 'string' || input.totp_code.trim().length !== 6) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'invalid_totp_format',
          error: 'A 6-digit authenticator code is required.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: pendingRow, error: fetchErr } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', PENDING_KEY)
      .maybeSingle();

    if (fetchErr) {
      console.error('[admin-rotate-totp] bootstrap: failed to fetch pending:', fetchErr);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to retrieve pending setup secret.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingRow?.value) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'no_pending_secret',
          error: 'No pending setup secret found. Please restart the wizard.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pending = pendingRow.value as PendingRotation;

    if (new Date(pending.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'pending_expired',
          error: 'The setup secret has expired. Please restart the wizard.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let pendingSecret = pending.secret;
    if (pending.encrypted) {
      try {
        pendingSecret = await decrypt(pending.secret);
      } catch (decErr: unknown) {
        console.error('[admin-rotate-totp] bootstrap: failed to decrypt pending secret:', decErr);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to decrypt pending setup secret. Please restart the wizard.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const isValid = await verifyTotp(pendingSecret, input.totp_code.trim());
    if (!isValid) {
      await logBootstrapAttempt('totp_bootstrap_failed', {
        reason: 'invalid_totp',
        attempted_email: callerEmail,
        ip,
        user_agent: userAgent,
      });
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'invalid_totp',
          error: 'Invalid code — make sure you scanned the QR code and that your device clock is accurate.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Code matches — try to write ADMIN_TOTP_SECRET via Management API.
    const updateResult = await updateSupabaseSecret('ADMIN_TOTP_SECRET', pendingSecret);

    if (updateResult.ok) {
      // Promoted — clear the pending slot.
      await supabase.from('app_settings').delete().eq('key', PENDING_KEY);
      await logBootstrapAttempt('totp_bootstrap_confirmed', {
        attempted_email: callerEmail,
        target_email: callerEmail,
        automated_update: true,
        ip,
        user_agent: userAgent,
      });
      return new Response(
        JSON.stringify({ success: true, automated: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Management API not configured (or failed). Keep the pending slot so a
    // retry from the same wizard session can promote without re-enrolling
    // the authenticator app, and surface the secret + the env var name so
    // the admin can paste it into Supabase manually.
    await logBootstrapAttempt('totp_bootstrap_confirmed', {
      attempted_email: callerEmail,
      target_email: callerEmail,
      automated_update: false,
      update_error: updateResult.error ?? null,
      ip,
      user_agent: userAgent,
    });

    return new Response(
      JSON.stringify({
        success: true,
        automated: false,
        new_secret: pendingSecret,
        secret_name: 'ADMIN_TOTP_SECRET',
        manual_update_reason: updateResult.error,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: false, error: `Unknown bootstrap action: ${input.action}` }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
