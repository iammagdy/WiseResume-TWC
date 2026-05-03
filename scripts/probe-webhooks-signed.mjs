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
 * Each function gets two probes:
 *
 *   1. POSITIVE — payload signed with the real secret. Assertion is
 *      function-specific (see EXPECTED_POS below) so we know we got past
 *      the signature gate AND landed in the expected business-logic
 *      branch:
 *        auth-email-hook  → 400  ("Unknown email type" — payload uses an
 *                                  unknown email_action_type so we never
 *                                  trigger a real Resend send)
 *        kinde-webhook    → 200  (a non-`user.created` event is acked
 *                                  without invoking provisionUser, so the
 *                                  probe is fully side-effect-free)
 *
 *   2. NEGATIVE — same payload signed with `WRONG_SECRET_DO_NOT_USE`.
 *      Assertion is **401** for both functions: the signature MUST fail
 *      and the function MUST refuse the request.
 *
 * A probe pair passes only if BOTH positive and negative assertions hit
 * their expected status codes. Any deviation fails the run.
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
 * Exit codes:
 *   0 — every configured probe pair passed (or was skipped for a missing
 *       secret — local dev / opt-in CI).
 *   1 — at least one probe pair failed (wrong status, network error).
 *   2 — config error.
 */
import { createHmac } from 'node:crypto';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jnsfmkzgxsviuthaqlyy';
const BASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.EXT_SUPABASE_URL ||
  `https://${PROJECT_REF}.supabase.co`
).replace(/\/+$/, '');

const WRONG_SECRET = 'WRONG_SECRET_DO_NOT_USE';

// Per-endpoint expected status for a *valid* signature. Any other status
// fails the positive probe even if it isn't 401.
const EXPECTED_POS = {
  'auth-email-hook': 200, // signature accepted, probe short-circuit returns 200 (no Resend send)
  'kinde-webhook':   200, // signature accepted, function acks non-user.created event
};
const EXPECTED_NEG = 401;   // both endpoints MUST return 401 on signature mismatch

let attempted = 0;
let failed = 0;

function reportProbe(name, kind, expected, status, body, extra = '') {
  const ok = status === expected;
  const verdict = ok ? 'PASS' : 'FAIL';
  const truncated = (body || '').length > 200 ? body.slice(0, 200) + '…' : (body || '');
  console.log(`  ${verdict}  ${name} [${kind}]  status=${status}  expected=${expected}  ${extra}`);
  if (truncated) console.log(`        body: ${truncated.replace(/\n/g, ' ')}`);
  if (!ok) failed++;
  return ok;
}

// ── Standard Webhooks signing (auth-email-hook) ────────────────────────────
function signStandardWebhook(secret, id, timestamp, body) {
  let keyBytes;
  if (secret.startsWith('whsec_')) {
    keyBytes = Buffer.from(secret.slice('whsec_'.length), 'base64');
  } else {
    keyBytes = Buffer.from(secret, 'utf8');
  }
  return createHmac('sha256', keyBytes)
    .update(`${id}.${timestamp}.${body}`)
    .digest('base64');
}

async function postAuthEmailHook(secret) {
  // The deployed function honours `__probe: true` after signature verification
  // and returns 200 without invoking Resend. See supabase/functions/auth-email-hook/index.ts.
  const payload = JSON.stringify({
    __probe: true,
    user: { email: 'probe@example.test' },
    email_data: {
      email_action_type: 'audit_probe',
      email: 'probe@example.test',
      token: 'PROBE',
      token_hash: 'PROBE_HASH',
      redirect_to: 'https://resume.thewise.cloud',
    },
  });
  const id = `audit-probe-${Date.now()}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sig = signStandardWebhook(secret, id, timestamp, payload);

  const res = await fetch(`${BASE_URL}/functions/v1/auth-email-hook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'webhook-id': id,
      'webhook-timestamp': timestamp,
      'webhook-signature': `v1,${sig}`,
    },
    body: payload,
  });
  return { status: res.status, body: await res.text() };
}

async function probeAuthEmailHook() {
  const secret = process.env.SUPABASE_AUTH_HOOK_SECRET;
  if (!secret) {
    console.log('SKIP  auth-email-hook  (SUPABASE_AUTH_HOOK_SECRET not set)');
    return;
  }
  attempted++;
  console.log('PROBE auth-email-hook');

  // Positive
  try {
    const { status, body } = await postAuthEmailHook(secret);
    reportProbe('auth-email-hook', 'positive', EXPECTED_POS['auth-email-hook'], status, body,
      'valid signature + __probe:true → expected 200 (probe short-circuit, no Resend call)');
  } catch (e) {
    console.log(`  FAIL  auth-email-hook [positive]  network error: ${String(e).slice(0, 120)}`);
    failed++;
  }

  // Negative
  try {
    const { status, body } = await postAuthEmailHook(WRONG_SECRET);
    reportProbe('auth-email-hook', 'negative', EXPECTED_NEG, status, body,
      'wrong-secret signature → expected 401');
  } catch (e) {
    console.log(`  FAIL  auth-email-hook [negative]  network error: ${String(e).slice(0, 120)}`);
    failed++;
  }
}

// ── Kinde HMAC-SHA256 hex (kinde-webhook) ──────────────────────────────────
async function postKindeWebhook(secret) {
  const payload = JSON.stringify({
    type: 'user.updated',
    event_id: `audit-probe-${Date.now()}`,
    timestamp: new Date().toISOString(),
    data: { user: { id: 'probe-user', email: 'probe@example.test' } },
  });
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  const res = await fetch(`${BASE_URL}/functions/v1/kinde-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kinde-Signature': `sha256=${sig}`,
    },
    body: payload,
  });
  return { status: res.status, body: await res.text() };
}

async function probeKindeWebhook() {
  const secret = process.env.KINDE_WEBHOOK_SECRET;
  if (!secret) {
    console.log('SKIP  kinde-webhook  (KINDE_WEBHOOK_SECRET not set)');
    return;
  }
  attempted++;
  console.log('PROBE kinde-webhook');

  // Positive
  try {
    const { status, body } = await postKindeWebhook(secret);
    reportProbe('kinde-webhook', 'positive', EXPECTED_POS['kinde-webhook'], status, body,
      'valid signature on user.updated → expected 200 (no provisionUser call)');
  } catch (e) {
    console.log(`  FAIL  kinde-webhook [positive]  network error: ${String(e).slice(0, 120)}`);
    failed++;
  }

  // Negative
  try {
    const { status, body } = await postKindeWebhook(WRONG_SECRET);
    reportProbe('kinde-webhook', 'negative', EXPECTED_NEG, status, body,
      'wrong-secret signature → expected 401');
  } catch (e) {
    console.log(`  FAIL  kinde-webhook [negative]  network error: ${String(e).slice(0, 120)}`);
    failed++;
  }
}

console.log(`Webhook signature probes against ${BASE_URL}`);
console.log('');

await probeAuthEmailHook();
await probeKindeWebhook();

console.log('');
console.log(`Summary: attempted=${attempted}, failed=${failed}`);
if (failed > 0) process.exit(1);
process.exit(0);
