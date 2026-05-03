import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';

/**
 * RevenueCat → WiseResume entitlement reconciliation webhook.
 *
 * RevenueCat is the source of truth for in-app purchases on the new
 * Expo mobile app. This endpoint is registered as a RevenueCat
 * webhook target and is authenticated via the
 * `REVENUECAT_WEBHOOK_AUTH_TOKEN` shared secret (RevenueCat sends it
 * in the Authorization header verbatim — see RC dashboard).
 *
 * The events we care about all map to the same operation:
 *   • INITIAL_PURCHASE / RENEWAL / UNCANCELLATION → set plan = pro|premium
 *   • CANCELLATION / EXPIRATION / SUBSCRIBER_ALIAS → downgrade to free
 *   • PRODUCT_CHANGE → re-derive from the new product identifier
 *
 * The user is matched by RevenueCat's `app_user_id`, which the mobile
 * client sets to the WiseResume bridge user_id at purchase time.
 */
type RcEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'EXPIRATION'
  | 'PRODUCT_CHANGE'
  | 'UNCANCELLATION'
  | 'BILLING_ISSUE'
  | 'SUBSCRIBER_ALIAS'
  | 'NON_RENEWING_PURCHASE'
  | 'TRANSFER';

interface RevenueCatEvent {
  api_version: string;
  event: {
    id: string;
    type: RcEventType;
    app_user_id: string;
    original_app_user_id?: string;
    product_id?: string;
    period_type?: 'NORMAL' | 'TRIAL' | 'INTRO';
    expiration_at_ms?: number;
    purchased_at_ms?: number;
    currency?: string;
    price?: number;
    environment?: 'SANDBOX' | 'PRODUCTION';
  };
}

function mapProductToPlan(productId: string | undefined): 'free' | 'pro' | 'premium' {
  if (!productId) return 'free';
  if (/premium/i.test(productId)) return 'premium';
  if (/pro/i.test(productId)) return 'pro';
  return 'free';
}

serve(wrapHandler('revenuecat-webhook', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH_TOKEN');
  const provided = req.headers.get('authorization');
  if (!expected || provided !== expected) {
    return new Response('Forbidden', { status: 403, headers: corsHeaders });
  }

  let payload: RevenueCatEvent;
  try {
    payload = (await req.json()) as RevenueCatEvent;
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
  }

  const evt = payload.event;
  if (!evt || !evt.app_user_id) {
    return new Response('Missing event/app_user_id', { status: 400, headers: corsHeaders });
  }

  const client = getServiceClient();
  const downgrade = ['CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE'].includes(evt.type);
  const plan = downgrade ? 'free' : mapProductToPlan(evt.product_id);
  const now = new Date().toISOString();

  const { error: subError } = await client.from('subscriptions').upsert(
    {
      user_id: evt.app_user_id,
      plan_name: plan,
      status: downgrade ? 'cancelled' : 'active',
      provider: 'revenuecat',
      provider_subscription_id: evt.id,
      current_period_end: evt.expiration_at_ms
        ? new Date(evt.expiration_at_ms).toISOString()
        : null,
      plan_updated_at: now,
    },
    { onConflict: 'user_id' },
  );

  if (subError) {
    return new Response(JSON.stringify({ error: subError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Best-effort audit trail; never fail the webhook if the audit
  // table is missing on a fresh project.
  await client
    .from('billing_events')
    .insert({
      user_id: evt.app_user_id,
      provider: 'revenuecat',
      event_type: evt.type,
      product_id: evt.product_id ?? null,
      raw: evt,
      received_at: now,
    })
    .then((r) => r, () => null);

  return new Response(JSON.stringify({ ok: true, plan }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}));
