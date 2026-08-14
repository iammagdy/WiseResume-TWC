'use strict';
/**
 * FIX-16: Create Appwrite collections required by the security remediation.
 *
 * Run before deploying affected hubs through the official targeted workflow:
 *   APPWRITE_API_KEY=<key> APPWRITE_PROJECT_ID=<id> node scripts/setup-security-collections.cjs
 *
 * All collections are created in the "main" database.
 * The script is idempotent: existing collections, attributes, and indexes are
 * preserved and skipped. New attributes are polled until Appwrite reports them
 * as available before any dependent index is created.
 *
 * Collections created:
 *   admin_audit_log           - append-only log for admin impersonation events (FIX-08)
 *   email_rate_limits         - persistent email rate limit counters per hashed IP (FIX-10)
 *   portfolio_session_rate_limits - per-IP portfolio chat session creation caps (FIX-09)
 *   portfolio_daily_usage     - per-portfolio daily AI question counters (FIX-09)
 *   credit_locks              - mutex documents for credit check-and-deduct (FIX-12)
 */

const { Client, Databases, Query, DatabasesIndexType: IndexType } = require('node-appwrite');

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID || '';
const API_KEY    = process.env.APPWRITE_API_KEY    || process.env.APPWRITE_FUNCTION_API_KEY    || '';
const DB_ID      = 'main';
const ATTRIBUTE_WAIT_ATTEMPTS = 60;
const ATTRIBUTE_WAIT_MS = 1000;

if (!PROJECT_ID || !API_KEY) {
  console.error('[setup] APPWRITE_PROJECT_ID and APPWRITE_API_KEY must be set');
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const db = new Databases(client);

function isDuplicate(e) {
  return e.code === 409 || /already exists|duplicate/i.test(e.message || '');
}

function isNotFound(e) {
  return e.code === 404 || /could not be found|not found/i.test(e.message || '');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listAttributes(collectionId) {
  const response = await db.listAttributes(DB_ID, collectionId, [Query.limit(100)]);
  return response.attributes || [];
}

async function waitForAttribute(collectionId, key) {
  for (let attempt = 0; attempt < ATTRIBUTE_WAIT_ATTEMPTS; attempt += 1) {
    const attribute = (await listAttributes(collectionId)).find((candidate) => candidate.key === key);
    if (attribute?.status === 'available') return;
    if (attribute?.status === 'failed') {
      throw new Error(`${collectionId}.${key} attribute failed to build`);
    }
    await sleep(ATTRIBUTE_WAIT_MS);
  }
  throw new Error(`Timed out waiting for ${collectionId}.${key} to become available`);
}

async function listIndexes(collectionId) {
  const response = await db.listIndexes(DB_ID, collectionId, [Query.limit(100)]);
  return response.indexes || [];
}

async function ensureAttribute(collectionId, attr) {
  const existing = (await listAttributes(collectionId)).find((candidate) => candidate.key === attr.key);
  if (existing) {
    if (existing.status !== 'available') await waitForAttribute(collectionId, attr.key);
    console.log(`  [setup] Attribute “${attr.key}” already exists — skipping`);
    return;
  }

  const defaultValue = attr.defaultVal ?? undefined;
  try {
    if (attr.type === 'string') {
      await db.createStringAttribute(DB_ID, collectionId, attr.key, attr.size || 256, attr.required === true, defaultValue);
    } else if (attr.type === 'integer') {
      await db.createIntegerAttribute(DB_ID, collectionId, attr.key, attr.required === true, attr.min, attr.max, defaultValue);
    } else if (attr.type === 'boolean') {
      await db.createBooleanAttribute(DB_ID, collectionId, attr.key, attr.required === true, defaultValue);
    } else if (attr.type === 'datetime') {
      await db.createDatetimeAttribute(DB_ID, collectionId, attr.key, attr.required === true, defaultValue);
    } else {
      throw new Error(`Unsupported attribute type: ${attr.type}`);
    }
    console.log(`  [setup] Added attribute “${attr.key}” (${attr.type})`);
  } catch (e) {
    if (!isDuplicate(e)) throw e;
    console.log(`  [setup] Attribute “${attr.key}” was created concurrently — waiting`);
  }
  await waitForAttribute(collectionId, attr.key);
}

async function ensureIndex(collectionId, idx) {
  const existing = (await listIndexes(collectionId)).find((candidate) => candidate.key === idx.key);
  if (existing) {
    console.log(`  [setup] Index “${idx.key}” already exists — skipping`);
    return;
  }
  try {
    await db.createIndex(DB_ID, collectionId, idx.key, idx.type || IndexType.Key, idx.attributes, idx.orders);
    console.log(`  [setup] Added index “${idx.key}”`);
  } catch (e) {
    if (!isDuplicate(e)) throw e;
    console.log(`  [setup] Index “${idx.key}” already exists — skipping`);
  }
}

async function ensureCollection(collectionId, name, attributes, indexes = []) {
  try {
    await db.getCollection(DB_ID, collectionId);
    console.log(`[setup] Collection “${collectionId}” already exists — checking attributes`);
  } catch (e) {
    if (!isNotFound(e)) throw e;
    await db.createCollection(DB_ID, collectionId, name, []);
    console.log(`[setup] Created collection “${collectionId}”`);
    await sleep(500);
  }

  for (const attr of attributes) {
    await ensureAttribute(collectionId, attr);
  }

  // Appwrite indexes depend on attributes being in the available state. Every
  // attribute has been confirmed above before any dependent index is created.
  for (const idx of indexes) {
    await ensureIndex(collectionId, idx);
  }
}

async function main() {
  console.log(`[setup] Connecting to ${ENDPOINT}, project=${PROJECT_ID}`);

  await ensureCollection('admin_audit_log', 'Admin Audit Log', [
    { type: 'string',   key: 'action',          required: true,  size: 64 },
    { type: 'string',   key: 'target_user_id',  required: false, size: 36 },
    { type: 'string',   key: 'target_email',    required: false, size: 254 },
    { type: 'string',   key: 'nonce',           required: false, size: 64 },
    { type: 'string',   key: 'expires_at',      required: false, size: 32 },
    { type: 'string',   key: 'created_at',      required: true,  size: 32 },
  ], [
    { key: 'idx_aal_action',  type: IndexType.Key, attributes: ['action'],         orders: ['ASC'] },
    { key: 'idx_aal_target',  type: IndexType.Key, attributes: ['target_user_id'], orders: ['ASC'] },
    { key: 'idx_aal_created', type: IndexType.Key, attributes: ['created_at'],     orders: ['DESC'] },
  ]);

  await ensureCollection('email_rate_limits', 'Email Rate Limits', [
    { type: 'integer', key: 'count',    required: true, min: 0, max: 1000 },
    { type: 'string',  key: 'reset_at', required: true, size: 32 },
  ]);

  await ensureCollection('portfolio_session_rate_limits', 'Portfolio Session Rate Limits', [
    { type: 'integer', key: 'count',    required: true, min: 0, max: 1000 },
    { type: 'string',  key: 'reset_at', required: true, size: 32 },
  ]);

  await ensureCollection('portfolio_daily_usage', 'Portfolio Daily Usage', [
    { type: 'string',  key: 'owner_user_id', required: true, size: 36 },
    { type: 'string',  key: 'date',          required: true, size: 10 },
    { type: 'integer', key: 'question_count', required: true, min: 0, max: 100000 },
  ], [
    { key: 'idx_pdu_owner', type: IndexType.Key, attributes: ['owner_user_id'], orders: ['ASC'] },
    { key: 'idx_pdu_date',  type: IndexType.Key, attributes: ['date'],          orders: ['DESC'] },
  ]);

  // Appwrite rejects required integer attributes that also specify a default.
  // Keep this optional for compatibility with existing documents; the gateway
  // creates new sessions at zero and backfills missing legacy values before the
  // atomic reservation increment.
  await ensureCollection('chat_sessions', 'Chat Sessions', [
    { type: 'integer', key: 'question_count', required: false, min: 0, max: 10 },
  ]);

  await ensureCollection('admin_reset_request_nonces', 'Admin Reset Request Nonces', [
    { type: 'string', key: 'nonce',          required: true,  size: 128 },
    { type: 'string', key: 'target_user_id', required: true,  size: 64 },
    { type: 'string', key: 'target_email',   required: true,  size: 254 },
    { type: 'string', key: 'actor_user_id', required: false, size: 64 },
    { type: 'string', key: 'created_at',     required: true,  size: 32 },
    { type: 'string', key: 'expires_at',     required: true,  size: 32 },
  ], [
    { key: 'idx_arn_expires', type: IndexType.Key, attributes: ['expires_at'], orders: ['ASC'] },
  ]);

  await ensureCollection('credit_locks', 'Credit Locks', [
    { type: 'string', key: 'locked_at',       required: true, size: 32 },
    { type: 'string', key: 'lock_expires_at', required: true, size: 32 },
  ]);

  await ensureCollection('pdf_export_rate_limits', 'PDF Export Rate Limits', [
    { type: 'string',   key: 'owner_user_id', required: true, size: 64 },
    { type: 'string',   key: 'window_key',    required: true, size: 32 },
    { type: 'integer',  key: 'slot',          required: true, min: 0, max: 10 },
    { type: 'datetime', key: 'expires_at',    required: true },
  ], [
    { key: 'idx_perl_expires', type: IndexType.Key, attributes: ['expires_at'], orders: ['ASC'] },
  ]);

  await ensureCollection('pdf_export_active_leases', 'PDF Export Active Leases', [
    { type: 'string',   key: 'owner_key',  required: true, size: 64 },
    { type: 'string',   key: 'scope',      required: true, size: 64 },
    { type: 'integer',  key: 'slot',       required: true, min: 0, max: 16 },
    { type: 'datetime', key: 'created_at', required: true },
    { type: 'datetime', key: 'expires_at', required: true },
  ], [
    { key: 'idx_pael_expires', type: IndexType.Key, attributes: ['expires_at'], orders: ['ASC'] },
  ]);

  console.log('[setup] Done.');
}

main().catch((err) => {
  console.error('[setup] Fatal:', err.message);
  process.exit(1);
});
