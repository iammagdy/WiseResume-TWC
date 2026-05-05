/**
 * Shared verifiers for service-to-service Edge Function callers.
 *
 * Two flavours:
 *   1. requireStandardWebhookSignature() — verifies the Standard Webhooks
 *      signature (Webhook-Id / Webhook-Timestamp / Webhook-Signature) used by
 *      Supabase Auth Hooks against a shared secret.
 *   2. requireCronSecret() — verifies a shared `x-cron-secret` header for
 *      cron-triggered functions, in constant time.
 *
 * Both helpers throw a uniform 401 `Response` on failure (including when the
 * server-side secret is missing — that is treated as an auth failure rather
 * than leaking misconfiguration to the caller). Callers should let the thrown
 * Response propagate to the top-level catch and return it as-is.
 */

import { decodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';

/**
 * Build a uniform 401 response. The body is intentionally generic so the
 * caller cannot distinguish "secret not configured" from "wrong header" from
 * "stale timestamp" — all three answer "Unauthorized" with no extra detail.
 */
function unauthorized(headers: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } },
  );
}

/**
 * Constant-time comparison of two byte sequences. Returns false immediately
 * if lengths differ — but only after touching every byte of the shorter input
 * to keep the timing roughly stable for same-length inputs.
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function constantTimeStringEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  // Compare against the longer length to avoid leaking which side is longer.
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    const av = i < ab.length ? ab[i] : 0;
    const bv = i < bb.length ? bb[i] : 0;
    diff |= av ^ bv;
  }
  return diff === 0;
}

/**
 * Verify a Standard Webhooks signature (https://www.standardwebhooks.com/).
 *
 * Headers expected on the request:
 *   - Webhook-Id
 *   - Webhook-Timestamp  (unix seconds)
 *   - Webhook-Signature  (space-separated list of `v1,<base64-sig>` entries)
 *
 * The secret may be either the raw shared secret or prefixed with
 * `whsec_<base64>` (the Standard Webhooks convention used by Supabase Auth
 * Hooks). The base64 portion, if present, is decoded and used as the HMAC key.
 *
 * Throws a 401 Response on any failure (missing headers, stale timestamp,
 * mismatched signature). Returns the verified raw body on success so the
 * caller can JSON.parse it without re-reading the request.
 */
export async function requireStandardWebhookSignature(
  req: Request,
  secret: string | undefined,
  corsHeaders: Record<string, string>,
  options: { toleranceSeconds?: number } = {},
): Promise<string> {
  if (!secret) {
    // Fail closed when not configured. We log server-side so operators can
    // notice the misconfiguration, but the client always sees a generic 401.
    console.error('[webhookAuth] SUPABASE_AUTH_HOOK_SECRET is not configured.');
    throw unauthorized(corsHeaders);
  }

  const id = req.headers.get('webhook-id');
  const timestamp = req.headers.get('webhook-timestamp');
  const signatureHeader = req.headers.get('webhook-signature');

  if (!id || !timestamp || !signatureHeader) {
    throw unauthorized(corsHeaders);
  }

  // Reject stale or future-dated timestamps (default tolerance: 5 minutes).
  const tolerance = options.toleranceSeconds ?? 5 * 60;
  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum)) {
    throw unauthorized(corsHeaders);
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsNum) > tolerance) {
    throw unauthorized(corsHeaders);
  }

  const body = await req.text();
  const signedContent = `${id}.${timestamp}.${body}`;

  // Resolve key bytes. Standard Webhooks recommends `whsec_<base64-secret>`.
  let keyBytes: Uint8Array;
  try {
    if (secret.startsWith('whsec_')) {
      keyBytes = decodeBase64(secret.slice('whsec_'.length));
    } else {
      keyBytes = new TextEncoder().encode(secret);
    }
  } catch {
    throw unauthorized(corsHeaders);
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(signedContent),
  );
  const expected = new Uint8Array(sigBuf);

  // Header is space-separated `version,signature` pairs. Accept any v1 match.
  const candidates = signatureHeader.split(' ').filter(Boolean);
  for (const candidate of candidates) {
    const commaIdx = candidate.indexOf(',');
    if (commaIdx === -1) continue;
    const version = candidate.slice(0, commaIdx);
    const sigB64 = candidate.slice(commaIdx + 1);
    if (version !== 'v1') continue;
    let sigBytes: Uint8Array;
    try {
      sigBytes = decodeBase64(sigB64);
    } catch {
      continue;
    }
    if (timingSafeEqual(expected, sigBytes)) {
      return body;
    }
  }

  throw unauthorized(corsHeaders);
}

/**
 * Verify a cron-triggered request via the `x-cron-secret` header.
 *
 * Always throws 401 on failure (including when CRON_SECRET is not configured)
 * to avoid leaking misconfiguration. Server-side logging records the missing
 * secret so operators can debug.
 *
 * Reads the expected secret from the `CRON_SECRET` env var. For a Vault-aware
 * variant that also falls back to reading from Supabase Vault when the env var
 * is absent, use `requireCronSecretOrVault` instead.
 */
export function requireCronSecret(
  req: Request,
  corsHeaders: Record<string, string>,
): void {
  const expected = Deno.env.get('CRON_SECRET')?.trim();
  if (!expected) {
    console.error('[webhookAuth] CRON_SECRET is not configured.');
    throw unauthorized(corsHeaders);
  }
  const provided = req.headers.get('x-cron-secret')?.trim() ?? '';
  if (!provided || !constantTimeStringEqual(provided, expected)) {
    throw unauthorized(corsHeaders);
  }
}

/**
 * Async variant of `requireCronSecret` that also reads from Supabase Vault
 * when the `CRON_SECRET` env var is absent.
 *
 * Auth priority:
 *   1. `CRON_SECRET` env var (fast path — set via Edge Function Secrets).
 *   2. `cron_secret` row in `vault.decrypted_secrets` (set automatically by
 *      migration 20260606000000_configure_ai_model_catalog_cron.sql).
 *
 * Use this in any edge function whose cron secret may have been auto-seeded
 * in Vault by the migration rather than manually set as an env var.
 */
export async function requireCronSecretOrVault(
  req: Request,
  corsHeaders: Record<string, string>,
  supabaseUrl?: string,
  serviceRoleKey?: string,
): Promise<void> {
  const provided = req.headers.get('x-cron-secret')?.trim() ?? '';
  if (!provided) {
    throw unauthorized(corsHeaders);
  }

  // Fast path: env var is set — no DB round-trip needed.
  const envSecret = Deno.env.get('CRON_SECRET')?.trim();
  if (envSecret) {
    if (!constantTimeStringEqual(provided, envSecret)) {
      throw unauthorized(corsHeaders);
    }
    return;
  }

  // Fallback: read from Supabase Vault. The migration auto-seeds this row so
  // the system works even when CRON_SECRET is not set as an env var.
  const url = supabaseUrl ?? Deno.env.get('SUPABASE_URL') ?? '';
  const key = serviceRoleKey ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !key) {
    console.error('[webhookAuth] CRON_SECRET not set and SUPABASE_URL/SERVICE_ROLE_KEY unavailable for Vault fallback.');
    throw unauthorized(corsHeaders);
  }

  let vaultSecret: string | null = null;
  try {
    const resp = await fetch(
      `${url}/rest/v1/vault_decrypted_secrets?select=decrypted_secret&name=eq.cron_secret&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (resp.ok) {
      const rows = await resp.json() as Array<{ decrypted_secret?: string }>;
      vaultSecret = rows[0]?.decrypted_secret?.trim() ?? null;
    }
  } catch (err) {
    console.error('[webhookAuth] Vault fallback fetch failed:', err);
  }

  if (!vaultSecret) {
    console.error('[webhookAuth] CRON_SECRET not configured (env var absent, Vault row missing or empty).');
    throw unauthorized(corsHeaders);
  }

  if (!constantTimeStringEqual(provided, vaultSecret)) {
    throw unauthorized(corsHeaders);
  }
}
