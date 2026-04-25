/**
 * kinde-webhook — Receive and process Kinde webhook events.
 *
 * Required env vars:
 *   KINDE_WEBHOOK_SECRET — raw secret configured in the Kinde dashboard.
 *                          Used to verify the HMAC-SHA256 signature on every
 *                          incoming request. Without it this function returns
 *                          401 for all requests.
 *   SUPABASE_URL / EXT_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — used by the
 *                          service-role client for DB writes.
 *
 * How to register in Kinde:
 *   1. Deploy this edge function (URL: <supabase-project-url>/functions/v1/kinde-webhook).
 *   2. In the Kinde dashboard go to Settings → Webhooks → Add endpoint.
 *   3. Set the endpoint URL to the deployed function URL above.
 *   4. Set the signing secret to a strong random value (openssl rand -hex 32).
 *   5. Subscribe to the "user.created" event.
 *   6. Copy the secret and save it as KINDE_WEBHOOK_SECRET in Supabase Edge
 *      Function secrets (Dashboard → Settings → Edge Functions → Secrets).
 *
 * Signature scheme:
 *   Kinde sends X-Kinde-Signature: <hex-encoded HMAC-SHA256 of the raw body>
 *   using the webhook secret as the HMAC key. We verify this in constant time.
 *
 * Idempotency:
 *   provisionUser() is fully idempotent — re-delivering a user.created event
 *   for an already-provisioned user is a safe no-op.
 *
 * Non-user.created events:
 *   Responded to immediately with 200 so Kinde does not retry them.
 */

import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { timingSafeEqual } from '../_shared/webhookAuth.ts';
import { provisionUser, ProvisionError } from '../_shared/provisionUser.ts';

/** Fire-and-forget: insert a row into kinde_events (fails silently). */
function logKindeEvent(
  eventType: string,
  kindeUserId: string,
  email: string,
  payload: Record<string, unknown>,
  provisioningOk: boolean | null,
): void {
  try {
    getServiceClient()
      .from('kinde_events')
      .insert({
        event_type: eventType,
        kinde_user_id: kindeUserId || null,
        email: email || null,
        payload,
        provisioning_ok: provisioningOk,
      })
      .then(() => {})
      .catch(() => {});
  } catch { /* ignore */ }
}

function json(data: unknown, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Verify the X-Kinde-Signature header (HMAC-SHA256 hex over the raw body). */
async function verifyKindeSignature(
  body: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const keyBytes = new TextEncoder().encode(secret);
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
    new TextEncoder().encode(body),
  );
  const expected = new Uint8Array(sigBuf);

  // Accept both raw hex and "sha256=<hex>" prefixed formats.
  const rawHex = signatureHeader.replace(/^sha256=/, '');
  // Validate hex format before converting to avoid crypto errors.
  if (!/^[0-9a-f]+$/i.test(rawHex) || rawHex.length % 2 !== 0) return false;
  const provided = new Uint8Array(
    rawHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)),
  );

  return timingSafeEqual(expected, provided);
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  // Read webhook secret — fail closed if not configured.
  const webhookSecret = Deno.env.get('KINDE_WEBHOOK_SECRET')?.trim();
  if (!webhookSecret) {
    console.error('[kinde-webhook] KINDE_WEBHOOK_SECRET is not configured');
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  // Read raw body before parsing (required for signature verification).
  const rawBody = await req.text();

  // Verify signature.
  const sigHeader = req.headers.get('x-kinde-signature');
  const sigValid = await verifyKindeSignature(rawBody, sigHeader, webhookSecret);
  if (!sigValid) {
    console.warn('[kinde-webhook] Signature verification failed');
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  // Parse payload.
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, corsHeaders);
  }

  const eventType = payload.type as string | undefined;

  // Only process user.created; acknowledge everything else immediately.
  if (eventType !== 'user.created') {
    console.log(`[kinde-webhook] Ignoring event type: ${eventType ?? '(unknown)'}`);
    // Best-effort: extract user identifiers from common Kinde payload shapes.
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const user = (data.user ?? data) as Record<string, unknown>;
    const nonCreatedKindeSub = String(user.id ?? data.user_id ?? '');
    const nonCreatedEmail = String(user.email ?? data.email ?? '');
    logKindeEvent(eventType ?? 'unknown', nonCreatedKindeSub, nonCreatedEmail, payload, null);
    return json({ received: true, processed: false }, 200, corsHeaders);
  }

  // Extract user data from the Kinde payload.
  // Kinde user.created payload shape:
  //   { type, event_id, timestamp, data: { user: { id, email, first_name, last_name, email_verified } } }
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const user = (data.user ?? {}) as Record<string, unknown>;
  const kindeSub = (user.id as string) ?? '';
  const email = (user.email as string) ?? '';
  const emailVerified = (user.email_verified as boolean) === true;
  const eventId = (payload.event_id as string) ?? '(unknown)';

  if (!kindeSub) {
    console.error('[kinde-webhook] user.created event missing user.id', { eventId });
    return json({ error: 'Missing user id in payload' }, 400, corsHeaders);
  }

  console.log(`[kinde-webhook] Processing user.created — kindeSub=${kindeSub}, eventId=${eventId}`);

  try {
    const serviceClient = getServiceClient();
    const result = await provisionUser(serviceClient, kindeSub, email, emailVerified);

    console.log(
      `[kinde-webhook] Provisioned user — userId=${result.userId}, alreadyExisted=${result.alreadyExisted}`,
    );

    logKindeEvent('user.created', kindeSub, email, payload, true);

    return json(
      { received: true, processed: true, userId: result.userId, alreadyExisted: result.alreadyExisted },
      200,
      corsHeaders,
    );
  } catch (err) {
    if (err instanceof ProvisionError) {
      console.error(`[kinde-webhook] ProvisionError: ${err.code} — ${err.message}`, {
        kindeSub,
        eventId,
      });
      // Return 500 so Kinde retries. EMAIL_COLLISION is a permanent failure —
      // return 200 so Kinde stops retrying and logs it for manual review.
      if (err.code === 'EMAIL_COLLISION') {
        console.error('[kinde-webhook] EMAIL_COLLISION — manual review required', {
          kindeSub,
          email,
          eventId,
        });
        logKindeEvent('user.created', kindeSub, email, payload, false);
        return json({ received: true, processed: false, code: err.code }, 200, corsHeaders);
      }
      logKindeEvent('user.created', kindeSub, email, payload, false);
      return json({ error: err.code }, 500, corsHeaders);
    }
    logKindeEvent('user.created', kindeSub, email, payload, false);
    console.error('[kinde-webhook] Unexpected error:', err);
    return json({ error: 'Internal server error' }, 500, corsHeaders);
  }
});
