'use strict';

/**
 * Idempotently provisions the two server-only PayPal collections.
 * This script is repository-controlled and intentionally unexecuted in Phase 2.
 * Required runtime environment when explicitly approved for a deployment:
 * APPWRITE_API_KEY
 */
const sdk = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = 'main';

const COLLECTION_SPECS = Object.freeze([
  {
    id: 'paypal_subscription_state',
    name: 'PayPal Subscription State',
    attributes: [
      { key: 'user_id', type: 'string', size: 64, required: true, array: false },
      { key: 'plan', type: 'string', size: 16, required: true, array: false },
      { key: 'subscription_id', type: 'string', size: 64, required: true, array: false },
      { key: 'plan_id', type: 'string', size: 64, required: true, array: false },
      { key: 'environment', type: 'string', size: 16, required: true, array: false },
      { key: 'status', type: 'string', size: 32, required: true, array: false },
      { key: 'expires_at', type: 'string', size: 32, required: false, array: false },
      { key: 'will_renew', type: 'boolean', required: false, array: false, default: true },
      { key: 'grace_period_expires_at', type: 'string', size: 32, required: false, array: false },
      { key: 'latest_event_id', type: 'string', size: 128, required: true, array: false },
      { key: 'latest_event_type', type: 'string', size: 64, required: true, array: false },
      { key: 'latest_event_timestamp_ms', type: 'integer', required: true, array: false, min: 0, max: 9999999999999 },
      { key: 'updated_at', type: 'string', size: 32, required: true, array: false },
    ],
    indexes: [
      { key: 'user_id_unique', type: 'unique', attributes: ['user_id'], orders: ['ASC'] },
      { key: 'subscription_id_idx', type: 'key', attributes: ['subscription_id'], orders: ['ASC'] },
      { key: 'latest_event_idx', type: 'key', attributes: ['latest_event_timestamp_ms'], orders: ['DESC'] },
    ],
  },
  {
    id: 'paypal_event_ledger',
    name: 'PayPal Event Ledger',
    attributes: [
      { key: 'event_id', type: 'string', size: 128, required: true, array: false },
      { key: 'event_type', type: 'string', size: 64, required: true, array: false },
      { key: 'user_id', type: 'string', size: 64, required: false, array: false },
      { key: 'subscription_id', type: 'string', size: 64, required: false, array: false },
      { key: 'event_timestamp_ms', type: 'integer', required: true, array: false, min: 0, max: 9999999999999 },
      { key: 'received_at', type: 'string', size: 32, required: true, array: false },
      { key: 'processing_status', type: 'string', size: 24, required: true, array: false },
      { key: 'ordering_key', type: 'string', size: 160, required: true, array: false },
      { key: 'outcome_code', type: 'string', size: 48, required: true, array: false },
      { key: 'expires_at', type: 'string', size: 32, required: true, array: false },
    ],
    indexes: [
      { key: 'event_id_unique', type: 'unique', attributes: ['event_id'], orders: ['ASC'] },
      { key: 'user_order_idx', type: 'key', attributes: ['user_id', 'event_timestamp_ms'], orders: ['ASC', 'DESC'] },
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
  if (spec.default !== undefined && attribute.default !== spec.default) issues.push(`default ${attribute.default} (expected ${spec.default})`);
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
  const permissionsIsArray = Array.isArray(permissions);
  const permissionCount = permissionsIsArray ? permissions.length : 'unknown';
  const documentSecurity = collection?.documentSecurity;
  if (!permissionsIsArray || permissionCount !== 0 || documentSecurity !== false) {
    throw new Error(
      `Incompatible collection "${collectionId}": server-only permissions and documentSecurity=false are required `
      + `(permissionsIsArray=${permissionsIsArray}, permissionCount=${permissionCount}, documentSecurity=${typeof documentSecurity === 'boolean' ? documentSecurity : `type:${typeof documentSecurity}`})`,
    );
  }
}

function getDatabases() {
  if (!API_KEY) throw new Error('APPWRITE_API_KEY is required');
  const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
  return new sdk.Databases(client);
}

async function getCollectionOrNull(databases, collectionId) {
  try { return await databases.getCollection(DB_ID, collectionId); }
  catch (err) { if (err.code === 404) return null; throw err; }
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
  else if (spec.type === 'boolean') await databases.createBooleanAttribute(DB_ID, collectionId, spec.key, spec.required, spec.default);
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
  console.log('PayPal provider-state schemas are ready (server-only collections).');
}

if (require.main === module) {
  run().catch(err => { console.error(`PayPal schema setup failed: ${err.message}`); process.exit(1); });
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
