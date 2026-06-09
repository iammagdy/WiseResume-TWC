#!/usr/bin/env node
'use strict';
/**
 * FIX-16: Create Appwrite collections required by the security remediation.
 *
 * Run once after deployment:
 *   APPWRITE_API_KEY=<key> APPWRITE_PROJECT_ID=<id> node scripts/setup-security-collections.cjs
 *
 * All collections are created in the "main" database.
 * The script is idempotent â€” it skips creation if the collection already exists.
 *
 * Collections created:
 *   admin_audit_log           â€” append-only log for admin impersonation events (FIX-08)
 *   email_rate_limits         â€” persistent email rate limit counters per hashed IP (FIX-10)
 *   portfolio_session_rate_limits â€” per-IP portfolio chat session creation caps (FIX-09)
 *   portfolio_daily_usage     â€” per-portfolio daily AI question counters (FIX-09)
 *   credit_locks              â€” mutex documents for credit check-and-deduct (FIX-12)
 */

const { Client, Databases, DatabasesIndexType: IndexType } = require('node-appwrite');

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID || '';
const API_KEY    = process.env.APPWRITE_API_KEY    || process.env.APPWRITE_FUNCTION_API_KEY    || '';
const DB_ID      = 'main';

if (!PROJECT_ID || !API_KEY) {
  console.error('[setup] APPWRITE_PROJECT_ID and APPWRITE_API_KEY must be set');
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const db = new Databases(client);

async function ensureCollection(collectionId, name, attributes, indexes = []) {
  let exists = false;
  try {
    await db.getCollection(DB_ID, collectionId);
    exists = true;
  } catch (e) {
    if (e.code !== 404 && !/could not be found/i.test(e.message || '')) throw e;
  }

  if (exists) {
    console.log(`[setup] Collection "${collectionId}" already exists â€” skipping`);
    return;
  }

  await db.createCollection(DB_ID, collectionId, name, []);
  console.log(`[setup] Created collection "${collectionId}"`);

  for (const attr of attributes) {
    const { type, key, required = false, defaultVal = null, size, min, max } = attr;
    if (type === 'string') {
      await db.createStringAttribute(DB_ID, collectionId, key, size || 256, required, defaultVal);
    } else if (type === 'integer') {
      await db.createIntegerAttribute(DB_ID, collectionId, key, required, min, max, defaultVal);
    } else if (type === 'boolean') {
      await db.createBooleanAttribute(DB_ID, collectionId, key, required, defaultVal);
    } else if (type === 'datetime') {
      await db.createDatetimeAttribute(DB_ID, collectionId, key, required, defaultVal);
    }
    console.log(`  [setup] Added attribute "${key}" (${type})`);
    await new Promise(r => setTimeout(r, 300));
  }

  for (const idx of indexes) {
    await db.createIndex(DB_ID, collectionId, idx.key, idx.type || IndexType.Key, idx.attributes, idx.orders);
    console.log(`  [setup] Added index "${idx.key}"`);
    await new Promise(r => setTimeout(r, 300));
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
    { key: 'idx_aal_action',    type: IndexType.Key, attributes: ['action'],    orders: ['ASC'] },
    { key: 'idx_aal_target',    type: IndexType.Key, attributes: ['target_user_id'], orders: ['ASC'] },
    { key: 'idx_aal_created',   type: IndexType.Key, attributes: ['created_at'], orders: ['DESC'] },
  ]);

  await ensureCollection('email_rate_limits', 'Email Rate Limits', [
    { type: 'integer',  key: 'count',    required: true, defaultVal: 0, min: 0, max: 1000 },
    { type: 'string',   key: 'reset_at', required: true, size: 32 },
  ]);

  await ensureCollection('portfolio_session_rate_limits', 'Portfolio Session Rate Limits', [
    { type: 'integer',  key: 'count',    required: true, defaultVal: 0, min: 0, max: 1000 },
    { type: 'string',   key: 'reset_at', required: true, size: 32 },
  ]);

  await ensureCollection('portfolio_daily_usage', 'Portfolio Daily Usage', [
    { type: 'string',   key: 'owner_user_id',  required: true,  size: 36 },
    { type: 'string',   key: 'date',           required: true,  size: 10 },
    { type: 'integer',  key: 'question_count', required: true, defaultVal: 0, min: 0, max: 100000 },
  ], [
    { key: 'idx_pdu_owner', type: IndexType.Key, attributes: ['owner_user_id'], orders: ['ASC'] },
    { key: 'idx_pdu_date',  type: IndexType.Key, attributes: ['date'],          orders: ['DESC'] },
  ]);

  await ensureCollection('credit_locks', 'Credit Locks', [
    { type: 'string', key: 'locked_at',      required: true,  size: 32 },
    { type: 'string', key: 'lock_expires_at',required: true,  size: 32 },
  ]);

  console.log('[setup] Done.');
}

main().catch(err => { console.error('[setup] Fatal:', err.message); process.exit(1); });
