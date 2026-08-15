'use strict';

/**
 * Idempotently provisions the server-only, metadata-only AI runtime receipt
 * collection. It never changes incompatible existing schema objects.
 *
 * Required runtime environment: APPWRITE_API_KEY
 */
const sdk = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = 'main';
const COLLECTION_ID = 'ai_runtime_receipts';

const ATTRIBUTE_SPECS = [
  ...[
    ['request_id', 64, true], ['execution_id', 64], ['hub', 64, true], ['feature_id', 64, true],
    ['provider', 32], ['model', 128], ['status', 24, true], ['user_id', 64],
    ['idempotency_state', 24], ['error_class', 64], ['started_at', 32],
    ['completed_at', 32, true], ['expires_at', 32, true],
  ].map(([key, size, required = false]) => ({ key, type: 'string', size, required, array: false })),
  ...['http_status', 'latency_ms', 'credits_charged'].map(key => ({ key, type: 'integer', required: false, array: false, min: 0, max: 999999 })),
  ...['is_fallback', 'is_admin_test'].map(key => ({ key, type: 'boolean', required: false, array: false, default: false })),
];

const INDEX_SPECS = [
  ['request_id_idx', ['request_id']], ['hub_idx', ['hub']], ['feature_idx', ['feature_id']],
  ['status_idx', ['status']], ['completed_at_idx', ['completed_at']], ['expires_at_idx', ['expires_at']],
].map(([key, attributes]) => ({ key, type: 'key', attributes, orders: attributes.map(() => 'ASC') }));

function valuesEqual(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function attributeCompatibilityError(attribute, spec) {
  const issues = [];
  if (attribute.type !== spec.type) issues.push(`type ${attribute.type} (expected ${spec.type})`);
  if (attribute.required !== spec.required) issues.push(`required ${attribute.required} (expected ${spec.required})`);
  if (Boolean(attribute.array) !== spec.array) issues.push(`array ${Boolean(attribute.array)} (expected ${spec.array})`);
  if (spec.size !== undefined && Number(attribute.size) !== spec.size) issues.push(`size ${attribute.size} (expected ${spec.size})`);
  if (spec.min !== undefined && Number(attribute.min) !== spec.min) issues.push(`min ${attribute.min} (expected ${spec.min})`);
  if (spec.max !== undefined && Number(attribute.max) !== spec.max) issues.push(`max ${attribute.max} (expected ${spec.max})`);
  if (spec.default !== undefined && attribute.default !== spec.default) issues.push(`default ${attribute.default} (expected ${spec.default})`);
  return issues.length ? `Incompatible attribute "${spec.key}": ${issues.join(', ')}` : null;
}

function indexCompatibilityError(index, spec) {
  const issues = [];
  if (index.type !== spec.type) issues.push(`type ${index.type} (expected ${spec.type})`);
  if (!valuesEqual(index.attributes, spec.attributes)) issues.push(`attributes ${JSON.stringify(index.attributes)} (expected ${JSON.stringify(spec.attributes)})`);
  if (!valuesEqual(index.orders || [], spec.orders)) issues.push(`orders ${JSON.stringify(index.orders || [])} (expected ${JSON.stringify(spec.orders)})`);
  return issues.length ? `Incompatible index "${spec.key}": ${issues.join(', ')}` : null;
}

function assertServerOnlyCollection(collection) {
  const permissions = collection?.permissions;
  const permissionsIsArray = Array.isArray(permissions);
  const permissionCount = permissionsIsArray ? permissions.length : 'unknown';
  const documentSecurity = collection?.documentSecurity;
  const documentSecurityValue = typeof documentSecurity === 'boolean' ? String(documentSecurity) : `type:${typeof documentSecurity}`;
  if (!permissionsIsArray || permissionCount !== 0 || documentSecurity !== false) {
    throw new Error(
      `Incompatible collection "${COLLECTION_ID}": server-only permissions and documentSecurity=false are required `
      + `(permissionsIsArray=${permissionsIsArray}, permissionCount=${permissionCount}, documentSecurity=${documentSecurityValue})`,
    );
  }
}

function getDatabases() {
  if (!API_KEY) throw new Error('APPWRITE_API_KEY is required');
  const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
  return new sdk.Databases(client);
}

async function getCollectionOrNull(databases) {
  try { return await databases.getCollection(DB_ID, COLLECTION_ID); }
  catch (err) { if (err.code === 404) return null; throw err; }
}

async function ensureAttribute(databases, spec) {
  const result = await databases.listAttributes(DB_ID, COLLECTION_ID);
  const existing = (result.attributes || []).find(attribute => attribute.key === spec.key);
  if (existing) {
    const incompatible = attributeCompatibilityError(existing, spec);
    if (incompatible) throw new Error(incompatible);
    return;
  }
  if (spec.type === 'string') await databases.createStringAttribute(DB_ID, COLLECTION_ID, spec.key, spec.size, spec.required);
  else if (spec.type === 'integer') await databases.createIntegerAttribute(DB_ID, COLLECTION_ID, spec.key, spec.required, spec.min, spec.max);
  else await databases.createBooleanAttribute(DB_ID, COLLECTION_ID, spec.key, spec.required, spec.default);
}

async function ensureIndex(databases, spec) {
  const result = await databases.listIndexes(DB_ID, COLLECTION_ID);
  const existing = (result.indexes || []).find(index => index.key === spec.key);
  if (existing) {
    const incompatible = indexCompatibilityError(existing, spec);
    if (incompatible) throw new Error(incompatible);
    return;
  }
  await databases.createIndex(DB_ID, COLLECTION_ID, spec.key, spec.type, spec.attributes, spec.orders);
}

async function pause() { await new Promise(resolve => setTimeout(resolve, 250)); }

async function run() {
  const databases = getDatabases();
  const existingCollection = await getCollectionOrNull(databases);
  if (existingCollection) assertServerOnlyCollection(existingCollection);
  else {
    await databases.createCollection(DB_ID, COLLECTION_ID, COLLECTION_ID, [], false);
    await pause();
  }

  for (const spec of ATTRIBUTE_SPECS) { await ensureAttribute(databases, spec); await pause(); }
  for (const spec of INDEX_SPECS) { await ensureIndex(databases, spec); await pause(); }

  console.log(`${COLLECTION_ID} schema is ready (server-only collection permissions).`);
}

if (require.main === module) {
  run().catch(err => { console.error(`Schema setup failed: ${err.message}`); process.exit(1); });
}

module.exports = { ATTRIBUTE_SPECS, INDEX_SPECS, attributeCompatibilityError, indexCompatibilityError, assertServerOnlyCollection, run };
