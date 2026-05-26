/**
 * revenuecat-webhook
 *
 * Receives RevenueCat webhook events and syncs subscription state to the
 * Appwrite `subscriptions` collection. Verifies the configured RevenueCat
 * Authorization header value before processing any payload.
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
import { timingSafeEqual } from 'node:crypto';

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

function verifyAuthorization(authHeader, secret) {
  if (!authHeader || !secret) return false;
  try {
    const a = Buffer.from(authHeader);
    const b = Buffer.from(secret);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function parseWebhookPayload(body) {
  if (typeof body === 'string') {
    const raw = body.trim();
    if (!raw) throw new Error('Empty body');
    return JSON.parse(raw);
  }
  if (body && typeof body === 'object') {
    return body;
  }
  throw new Error('Missing body');
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

async function processRevenueCatPayload(payload, databases, log, error) {
  const event = payload?.event;
  if (!event) return { body: { ok: false, error: 'Missing event object' }, status: 400 };

  const { type: eventType, app_user_id: appUserId } = event;

  if (!appUserId) {
    error('Webhook missing app_user_id');
    return { body: { ok: false, error: 'Missing app_user_id' }, status: 400 };
  }

  log(`RevenueCat event: ${eventType} for user ${appUserId}`);

  if (!GRANT_EVENTS.has(eventType) && !REVOKE_EVENTS.has(eventType)) {
    // Non-subscription events (e.g. SUBSCRIBER_ALIAS) — acknowledge and skip
    log(`Ignoring event type: ${eventType}`);
    return { body: { ok: true, skipped: true } };
  }

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

    return { body: { ok: true } };
  } catch (e) {
    error(`Failed to update subscription: ${e.message}`);
    return { body: { ok: false, error: 'Database update failed' }, status: 500 };
  }
}

export { verifyAuthorization, parseWebhookPayload, mapEntitlementsToPlan, processRevenueCatPayload };

export default async function handler({ req, res, log, error }) {
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  const appwriteKey = process.env.APPWRITE_API_KEY;
  const appwriteEndpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const appwriteProject = process.env.APPWRITE_PROJECT_ID;

  // Verify Authorization header (RC sends whatever you configure as Authorization header value)
  const authHeader = req.headers['authorization'] ?? req.headers['Authorization'] ?? '';
  if (!verifyAuthorization(authHeader, webhookSecret)) {
    error('Webhook authorization failed');
    return res.json({ ok: false, error: 'Unauthorized' }, 401);
  }

  let payload;
  try {
    payload = parseWebhookPayload(req.body);
  } catch {
    return res.json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const client = new Client()
    .setEndpoint(appwriteEndpoint)
    .setProject(appwriteProject)
    .setKey(appwriteKey);
  const databases = new Databases(client);
  const result = await processRevenueCatPayload(payload, databases, log, error);
  return res.json(result.body, result.status || 200);
}
