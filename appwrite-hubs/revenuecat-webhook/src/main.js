/**
 * revenuecat-webhook
 *
 * Receives RevenueCat webhook events and syncs subscription state to the
 * Appwrite `subscriptions` collection. Verifies the webhook signature using
 * HMAC-SHA256 before processing any payload.
 *
 * Required env vars:
 *   REVENUECAT_WEBHOOK_SECRET  — the secret set in RC dashboard → Integrations → Webhooks
 *   APPWRITE_API_KEY
 *   APPWRITE_ENDPOINT
 *   APPWRITE_PROJECT_ID
 *
 * Supported RC event types:
 *   INITIAL_PURCHASE, RENEWAL, UNCANCELLATION, PRODUCT_CHANGE → set plan + status: active
 *   CANCELLATION, EXPIRATION, BILLING_ISSUE                   → revert plan to free
 */

import { Client, Databases, Query, ID } from 'node-appwrite';
import { createHmac, timingSafeEqual } from 'node:crypto';

const DATABASE_ID = 'main';
const SUBSCRIPTIONS_COLLECTION = 'subscriptions';

// RC event types that grant or keep active access
const GRANT_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'TRANSFER',
]);

// RC event types that revoke access
const REVOKE_EVENTS = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
]);

function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  try {
    const expected = createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

/**
 * Maps RC entitlements object (keyed by entitlement identifier) to a plan string.
 * Highest-tier entitlement wins.
 */
function mapEntitlementsToPlan(entitlements) {
  if (entitlements && typeof entitlements === 'object') {
    if ('premium' in entitlements) return 'premium';
    if ('pro' in entitlements) return 'pro';
  }
  return 'pro'; // fallback if entitlements unclear
}

export default async function handler({ req, res, log, error }) {
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  const appwriteKey = process.env.APPWRITE_API_KEY;
  const appwriteEndpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const appwriteProject = process.env.APPWRITE_PROJECT_ID;

  // Verify signature
  const rawBody = req.body ?? '';
  const signature = req.headers['x-revenuecat-signature'] ?? req.headers['X-RevenueCat-Signature'];
  if (!verifySignature(rawBody, signature, webhookSecret)) {
    error('Webhook signature verification failed');
    return res.json({ ok: false, error: 'Invalid signature' }, 401);
  }

  let payload;
  try {
    payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  } catch {
    return res.json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const event = payload?.event;
  if (!event) return res.json({ ok: false, error: 'Missing event object' }, 400);

  const { type: eventType, app_user_id: appUserId, product_id: productId } = event;

  if (!appUserId) {
    error('Webhook missing app_user_id');
    return res.json({ ok: false, error: 'Missing app_user_id' }, 400);
  }

  log(`RevenueCat event: ${eventType} for user ${appUserId}`);

  if (!GRANT_EVENTS.has(eventType) && !REVOKE_EVENTS.has(eventType)) {
    // Non-subscription events (e.g. SUBSCRIBER_ALIAS) — acknowledge and skip
    log(`Ignoring event type: ${eventType}`);
    return res.json({ ok: true, skipped: true });
  }

  const client = new Client()
    .setEndpoint(appwriteEndpoint)
    .setProject(appwriteProject)
    .setKey(appwriteKey);
  const databases = new Databases(client);

  // Determine new subscription values
  let newPlan;
  let newStatus;
  if (GRANT_EVENTS.has(eventType)) {
    newPlan = mapEntitlementsToPlan(event.entitlement_ids ?? event.entitlements);
    newStatus = 'active';
  } else {
    newPlan = 'free';
    newStatus = 'cancelled';
  }

  try {
    // Find existing subscription document for this user
    const existing = await databases.listDocuments(DATABASE_ID, SUBSCRIPTIONS_COLLECTION, [
      Query.equal('user_id', appUserId),
    ]);

    const updateData = {
      plan: newPlan,
      effective_plan: newPlan,
      status: newStatus,
      // Clear trial fields on real RC subscription events
      trial_plan: null,
      trial_expires_at: null,
    };

    if (existing.total > 0) {
      const docId = existing.documents[0].$id;
      await databases.updateDocument(DATABASE_ID, SUBSCRIPTIONS_COLLECTION, docId, updateData);
      log(`Updated subscription ${docId} → plan=${newPlan}, status=${newStatus}`);
    } else {
      // Create new subscription document
      await databases.createDocument(DATABASE_ID, SUBSCRIPTIONS_COLLECTION, ID.unique(), {
        user_id: appUserId,
        ...updateData,
      });
      log(`Created new subscription for user ${appUserId} → plan=${newPlan}`);
    }

    return res.json({ ok: true });
  } catch (e) {
    error(`Failed to update subscription: ${e.message}`);
    return res.json({ ok: false, error: 'Database update failed' }, 500);
  }
}
