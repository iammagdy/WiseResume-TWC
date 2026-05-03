#!/usr/bin/env node
/**
 * Live signed-payload probes for the two webhook-receiving edge functions
 * the unauthenticated audit cannot positively verify:
 *
 *   - auth-email-hook  (Supabase Auth Hook, Standard Webhooks signature
 *                       over `<webhook-id>.<webhook-timestamp>.<body>`)
 *   - kinde-webhook    (Kinde HMAC-SHA256 hex over the raw body, sent as
 *                       `X-Kinde-Signature: sha256=<hex>` or raw hex)
 *
 * Audit task #61 §6 H4: without these probes we can only confirm the
 * unsigned-bearer 401, not that the signature path actually accepts a
 * properly-signed request.
 *
 * Required env (skipped with a warning if missing):
 *   SUPABASE_AUTH_HOOK_SECRET — same value configured on the deployed
 *                               function. May be raw or `whsec_<base64>`.
 *   KINDE_WEBHOOK_SECRET      — same value configured on the deployed fn.
 *
 * Optional:
 *   SUPABASE_PROJECT_REF (defaults to jnsfmkzgxsviuthaqlyy)
 *   SUPABASE_URL / EXT_SUPABASE_URL (overrides the derived URL)
 *
 * Success criterion is "signature accepted" — i.e. the response is NOT
 * 401. Both functions reach business-logic failures past the signature
 * check (auth-email-hook hits "Unknown email type" → 400 for our probe
 * payload; kinde-webhook acks non-user.created events with 200). Either
 * outcome proves the signature path is alive.
 *
 * Exit codes:
 *   0 — every configured probe passed (or was skipped with secret missing)
 *   1 — at least one probe was attempted and failed (401 / network err)
 *   2 — config error
 */
import { createHmac } from 'node:crypto';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jnsfmkzgxsviuthaqlyy';
const BASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.EXT_SUPABASE_URL ||
  `https://${PROJECT_REF}.supabase.co`
).replace(/\/+$/, '');

const results = [];
let attempted = 0;
let failed = 0;

function logResult(name, status, body, ok, note = '') {
  const verdict = ok ? 'PASS' : 'FAIL';
  const truncated = body.length > 200 ? body.slice(0, 200) + '…' : body;
  console.log(`${verdict}  ${name}  status=${status}  ${note}`);
  console.log(`        body: ${truncated.replace(/\n/g, ' ')}`);
  results.push({ name, status, ok, body: truncated, note });
  if (!ok) failed++;
}

// ── Probe 1: auth-email-hook (Standard Webhooks v1 signature) ──────────────
async function probeAuthEmailHook() {
  const secret = process.env.SUPABASE_AUTH_HOOK_SECRET;
  if (!secret) {
    console.log('SKIP  auth-email-hook  (SUPABASE_AUTH_HOOK_SECRET not set)');
    return;
  }
  attempted++;

  // A payload that will pass the signature check but fail downstream with a
  // recognized "Unknown email type" 400. We deliberately use an unknown
  // email_action_type so we don't risk sending a real email through Resend.
  const payload = JSON.stringify({
    user: { email: 'probe@example.test' },
    email_data: {
      email_action_type: 'audit_probe_unknown_type',
      email: 'probe@example.test',
      token: 'PROBE',
      token_hash: 'PROBE_HASH',
      redirect_to: 'https://resume.thewise.cloud',
    },
  });

  const id = `audit-probe-${Date.now()}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signedContent = `${id}.${timestamp}.${payload}`;

  // Decode whsec_<base64> → raw key bytes; otherwise treat as raw secret.
  let keyBytes;
  if (secret.startsWith('whsec_')) {
    keyBytes = Buffer.from(secret.slice('whsec_'.length), 'base64');
  } else {
    keyBytes = Buffer.from(secret, 'utf8');
  }
  const sig = createHmac('sha256', keyBytes).update(signedContent).digest('base64');

  const url = `${BASE_URL}/functions/v1/auth-email-hook`;
  let res, text;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'webhook-id': id,
        'webhook-timestamp': timestamp,
        'webhook-signature': `v1,${sig}`,
      },
      body: payload,
    });
    text = await res.text();
  } catch (e) {
    logResult('auth-email-hook', 0, String(e), false, 'network error');
    return;
  }

  // Pass = signature accepted (anything other than 401). 400 "Unknown email
  // type" is the expected downstream rejection that proves we got past auth.
  const ok = res.status !== 401;
  logResult(
    'auth-email-hook',
    res.status,
    text,
    ok,
    ok ? 'signature accepted (downstream rejection is expected)' : 'signature REJECTED — secret mismatch?',
  );
}

// ── Probe 2: kinde-webhook (X-Kinde-Signature: sha256=<hex>) ───────────────
async function probeKindeWebhook() {
  const secret = process.env.KINDE_WEBHOOK_SECRET;
  if (!secret) {
    console.log('SKIP  kinde-webhook  (KINDE_WEBHOOK_SECRET not set)');
    return;
  }
  attempted++;

  // Use a non-user.created event so the function acks with 200 and does NOT
  // attempt user provisioning (keeps the probe side-effect-free).
  const payload = JSON.stringify({
    type: 'user.updated',
    event_id: `audit-probe-${Date.now()}`,
    timestamp: new Date().toISOString(),
    data: { user: { id: 'probe-user', email: 'probe@example.test' } },
  });

  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  const url = `${BASE_URL}/functions/v1/kinde-webhook`;

  let res, text;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kinde-Signature': `sha256=${sig}`,
      },
      body: payload,
    });
    text = await res.text();
  } catch (e) {
    logResult('kinde-webhook', 0, String(e), false, 'network error');
    return;
  }

  const ok = res.status !== 401;
  logResult(
    'kinde-webhook',
    res.status,
    text,
    ok,
    ok ? 'signature accepted' : 'signature REJECTED — secret mismatch?',
  );
}

console.log(`Webhook signature probes against ${BASE_URL}`);
console.log('');

await probeAuthEmailHook();
await probeKindeWebhook();

console.log('');
console.log(`Summary: attempted=${attempted}, failed=${failed}`);
if (failed > 0) process.exit(1);
process.exit(0);
