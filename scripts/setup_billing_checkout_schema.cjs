'use strict';

/**
 * Idempotently provisions the server-only storage contract for billing-checkout.
 * This script is intentionally definition-only in Phase 2D-C.2 and is not
 * executed or deployed as part of the non-activating implementation task.
 */
const sdk = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = 'main';

const COLLECTION_SPECS = Object.freeze([
  {
    id: 'billing_checkout_sessions',
    name: 'Billing Checkout Sessions',
    attributes: [
      { key: 'session_key', type: 'string', size: 64, required: true, array: false },
      { key: 'request_key_fingerprint', type: 'string', size: 64, required: true, array: false },
      { key: 'user_id', type: 'string', size: 64, required: true, array: false },
      { key: 'plan', type: 'string', size: 16, required: true, array: false },
      { key: 'environment', type: 'string', size: 16, required: true, array: false },
      { key: 'price_id', type: 'string', size: 128, required: true, array: false },
      { key: 'product_id', type: 'string', size: 128, required: true, array: false },
      { key: 'entitlement_id', type: 'string', size: 64, required: true, array: false },
      { key: 'provider_transaction_id', type: 'string', size: 160, required: false, array: false },
      { key: 'checkout_reference', type: 'string', size: 160, required: false, array: false },
      { key: 'checkout_url', type: 'string', size: 2048, required: false, array: false },
      { key: 'state', type: 'string', size: 24, required: true, array: false },
      { key: 'correlation_id', type: 'string', size: 96, required: true, array: false },
      { key: 'public_reference', type: 'string', size: 96, required: true, array: false },
      { key: 'created_at', type: 'string', size: 32, required: true, array: false },
      { key: 'updated_at', type: 'string', size: 32, required: true, array: false },
      { key: 'expires_at', type: 'string', size: 32, required: true, array: false },
      { key: 'last_error_code', type: 'string', size: 48, required: false, array: false },
    ],
    indexes: [
      { key: 'session_key_unique', type: 'unique', attributes: ['session_key'], orders: ['ASC'] },
      { key: 'public_reference_unique', type: 'unique', attributes: ['public_reference'], orders: ['ASC'] },
      { key: 'user_request_idx', type: 'key', attributes: ['user_id', 'request_key_fingerprint'], orders: ['ASC', 'ASC'] },
      { key: 'user_plan_idx', type: 'key', attributes: ['user_id', 'plan', 'environment'], orders: ['ASC', 'ASC', 'ASC'] },
      { key: 'expires_at_idx', type: 'key', attributes: ['expires_at'], orders: ['ASC'] },
    ],
  },
  {
    id: 'billing_checkout_locks',
    name: 'Billing Checkout Locks',
    attributes: [
      { key: 'scope', type: 'string', size: 16, required: true, array: false },
      { key: 'lock_key', type: 'string', size: 96, required: true, array: false },
      { key: 'user_id', type: 'string', size: 64, required: true, array: false },
      { key: 'plan', type: 'string', size: 16, required: true, array: false },
      { key: 'environment', type: 'string', size: 16, required: false, array: false },
      { key: 'price_id', type: 'string', size: 128, required: false, array: false },
      { key: 'session_id', type: 'string', size: 64, required: false, array: false },
      { key: 'state', type: 'string', size: 16, required: true, array: false },
      { key: 'request_key_fingerprint', type: 'string', size: 64, required: false, array: false },
      { key: 'window_started_at', type: 'string', size: 32, required: true, array: false },
      { key: 'attempt_count', type: 'integer', required: true, array: false, min: 0, max: 1000 },
      { key: 'created_at', type: 'string', size: 32, required: true, array: false },
      { key: 'updated_at', type: 'string', size: 32, required: true, array: false },
      { key: 'expires_at', type: 'string', size: 32, required: true, array: false },
    ],
    indexes: [
      { key: 'lock_key_unique', type: 'unique', attributes: ['lock_key'], orders: ['ASC'] },
      { key: 'user_scope_idx', type: 'key', attributes: ['user_id', 'scope'], orders: ['ASC', 'ASC'] },
      { key: 'expires_at_idx', type: 'key', attributes: ['expires_at'], orders: ['ASC'] },
    ],
  },
]);

function valuesEqual(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function attributeCompatibilityError(attribute, spec, collectionId = 'collection') {
  const issues = [];
  if (attribute.type !== spec.type) issues.push(`type ${attribute.type} (expected ${spec.type})`);
  if (attribute.required !== spec.required) issues.push(`required ${attribute.required} (expected ${spec.required})`);
  if (Boolean(attribute.array) !== spec.array) issues.push(`array ${Boolean(attribute.array)} (expected ${spec.array})`);
  if (spec.size !== undefined && Number(attribute.size) !== spec.size) issues.push(`size ${attribute.size} (expected ${spec.size})`);
  if (spec.min !== undefined && Number(attribute.min) !== spec.min) issues.push(`min ${attribute.min} (expected ${spec.min})`);
  if (spec.max !== undefined && Number(attribute.max) !== spec.max) issues.push(`max ${attribute.max} (expected ${spec.max})`);
  return issues.length ? `Incompatible attribute "${collectionId}.${spec.key}": ${issues.join(', ')}` : null;
}

function indexCompatibilityError(index, spec, collectionId = 'collection') {
  const issues = [];
  if (index.type !== spec.type) issues.push(`type ${index.type} (expected ${spec.type})`);
  if (!valuesEqual(index.attributes, spec.attributes)) issues.push(`attributes ${JSON.stringify(index.attributes)} (expected ${JSON.stringify(spec.attributes)})`);
  if (!valuesEqual(index.orders || [], spec.orders)) issues.push(`orders ${JSON.stringify(index.orders || [])} (expected ${JSON.stringify(spec.orders)})`);
  return issues.length ? `Incompatible index "${collectionId}.${spec.key}": ${issues.join(', ')}` : null;
}

function assertServerOnlyCollection(collection, collectionId) {
  const permissions = collection?.$permissions;
  if (!Array.isArray(permissions) || permissions.length !== 0 || collection?.documentSecurity !== false) {
    throw new Error(`Incompatible collection "${collectionId}": server-only permissions and documentSecurity=false are required.`);
  }
}

function getDatabases() {
  if (!API_KEY) throw new Error('APPWRITE_API_KEY is required');
  const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
  return new sdk.Databases(client);
}

async function getCollectionOrNull(databases, collectionId) {
  try { return await databases.getCollection(DB_ID, collectionId); }
  catch (error) { if (error?.code === 404) return null; throw error; }
}

async function ensureAttribute(databases, collectionId, spec) {
  const result = await databases.listAttributes(DB_ID, collectionId);
  const existing = (result.attributes || []).find(attribute => attribute.key === spec.key);
  if (existing) {
    const incompatible = attributeCompatibilityError(existing, spec, collectionId);
    if (incompatible) throw new Error(incompatible);
    return;
  }
  if (spec.type === 'string') await databases.createStringAttribute(DB_ID, collectionId, spec.key, spec.size, spec.required);
  else if (spec.type === 'integer') await databases.createIntegerAttribute(DB_ID, collectionId, spec.key, spec.required, spec.min, spec.max);
  else throw new Error(`Unsupported attribute type ${spec.type}`);
}

async function ensureIndex(databases, collectionId, spec) {
  const result = await databases.listIndexes(DB_ID, collectionId);
  const existing = (result.indexes || []).find(index => index.key === spec.key);
  if (existing) {
    const incompatible = indexCompatibilityError(existing, spec, collectionId);
    if (incompatible) throw new Error(incompatible);
    return;
  }
  await databases.createIndex(DB_ID, collectionId, spec.key, spec.type, spec.attributes, spec.orders);
}

async function pause() { await new Promise(resolve => setTimeout(resolve, 250)); }

async function ensureCollection(databases, spec) {
  const existing = await getCollectionOrNull(databases, spec.id);
  if (existing) assertServerOnlyCollection(existing, spec.id);
  else {
    await databases.createCollection(DB_ID, spec.id, spec.name, [], false);
    await pause();
  }
  for (const attribute of spec.attributes) { await ensureAttribute(databases, spec.id, attribute); await pause(); }
  for (const index of spec.indexes) { await ensureIndex(databases, spec.id, index); await pause(); }
}

async function run() {
  const databases = getDatabases();
  for (const spec of COLLECTION_SPECS) await ensureCollection(databases, spec);
  console.log('Billing checkout schemas are ready (server-only collections).');
}

if (require.main === module) {
  run().catch(error => { console.error(`Billing checkout schema setup failed: ${error.message}`); process.exit(1); });
}

module.exports = {
  DB_ID,
  COLLECTION_SPECS,
  valuesEqual,
  attributeCompatibilityError,
  indexCompatibilityError,
  assertServerOnlyCollection,
  ensureCollection,
  run,
};
