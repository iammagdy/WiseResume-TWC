'use strict';

const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');

const DB_ID = process.env.APPWRITE_DATABASE_ID || 'main';

const COLLECTION_SCHEMAS = {
  user_preferences: {
    name: 'User Preferences',
    attributes: [
      { kind: 'string', key: 'user_id', size: 128, required: false },
      { kind: 'string', key: 'language', size: 8, required: false },
    ],
    indexes: [
      { key: 'user_id_idx', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    ],
  },
  jobs: {
    name: 'Jobs',
    attributes: [
      { kind: 'string', key: 'user_id', size: 128, required: false },
      { kind: 'string', key: 'title', size: 512, required: false },
      { kind: 'string', key: 'company', size: 256, required: false },
      { kind: 'string', key: 'company_logo', size: 2048, required: false },
      { kind: 'string', key: 'description', size: 16384, required: false },
      { kind: 'string', key: 'requirements', size: 16384, required: false },
      { kind: 'string', key: 'location', size: 256, required: false },
      { kind: 'string', key: 'salary_range', size: 128, required: false },
      { kind: 'string', key: 'job_type', size: 64, required: false, defaultValue: 'full-time' },
      { kind: 'datetime', key: 'posted_date', required: false },
      { kind: 'string', key: 'source_url', size: 2048, required: false },
      { kind: 'boolean', key: 'is_saved', required: false, defaultValue: true },
    ],
    indexes: [
      { key: 'user_id_idx', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    ],
  },
  job_applications: {
    name: 'Job Applications',
    attributes: [
      { kind: 'string', key: 'user_id', size: 128, required: false },
      { kind: 'string', key: 'job_title', size: 512, required: false },
      { kind: 'string', key: 'company', size: 256, required: false },
      { kind: 'string', key: 'status', size: 64, required: false, defaultValue: 'applied' },
      { kind: 'datetime', key: 'applied_at', required: false },
      { kind: 'string', key: 'url', size: 2048, required: false },
      { kind: 'string', key: 'notes', size: 8192, required: false },
      { kind: 'datetime', key: 'deadline', required: false },
      { kind: 'string', key: 'resume_id', size: 128, required: false },
      { kind: 'string', key: 'cover_letter_id', size: 128, required: false },
      { kind: 'string', key: 'job_feed_item_id', size: 128, required: false },
      { kind: 'string', key: 'source_job_id', size: 128, required: false },
      { kind: 'string', key: 'generated_resume_id', size: 128, required: false },
      { kind: 'string', key: 'generated_cover_letter_id', size: 128, required: false },
    ],
    indexes: [
      { key: 'user_id_idx', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
      { key: 'status_idx', type: 'key', attributes: ['status'], orders: ['ASC'] },
      { key: 'resume_id_idx', type: 'key', attributes: ['resume_id'], orders: ['ASC'] },
      { key: 'user_status_idx', type: 'key', attributes: ['user_id', 'status'], orders: ['ASC', 'ASC'] },
    ],
  },
};

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key || process.env[key]) continue;
    process.env[key] = rest.join('=').replace(/^["']|["']$/g, '');
  }
}

function collectionPermissions() {
  return [sdk.Permission.create(sdk.Role.users())];
}

function normalizeCollectionPermissions() {
  return collectionPermissions();
}

function ownerDocumentPermissions(userId) {
  return [
    sdk.Permission.read(sdk.Role.user(userId)),
    sdk.Permission.update(sdk.Role.user(userId)),
    sdk.Permission.delete(sdk.Role.user(userId)),
  ];
}

function hasExactOwnerPermissions(permissions, userId) {
  const expected = ownerDocumentPermissions(userId);
  const current = Array.isArray(permissions) ? permissions : [];
  return current.length === expected.length && expected.every((permission) => current.includes(permission));
}

function isValidOwnerId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
}

function sameStringSet(a, b) {
  return a.length === b.length && a.every((value) => b.includes(value));
}

function parseCollectionsArg(argv = process.argv.slice(2)) {
  const arg = argv.find((value) => value.startsWith('--collections=') || value.startsWith('--collection='));
  if (!arg) return Object.keys(COLLECTION_SCHEMAS);
  const raw = arg.slice(arg.indexOf('=') + 1).trim();
  const ids = raw.split(',').map((value) => value.trim()).filter(Boolean);
  if (ids.some((value) => value === 'all')) {
    throw new Error('Use explicit collection ids or omit --collections; the all target is not supported here.');
  }
  const unknown = ids.filter((id) => !COLLECTION_SCHEMAS[id]);
  if (unknown.length) throw new Error(`Unknown owner collection id(s): ${unknown.join(', ')}`);
  return [...new Set(ids)];
}

function createDatabases() {
  loadEnvFile('.env.deploy');
  loadEnvFile('.env.local');
  loadEnvFile('.env');

  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_VERIFY_KEY;
  if (!apiKey) throw new Error('APPWRITE_API_KEY is required');

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
  return { databases: new sdk.Databases(client), projectId };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listAttributes(databases, collectionId) {
  const response = await databases.listAttributes(DB_ID, collectionId, [sdk.Query.limit(100)]);
  return response.attributes || [];
}

async function listIndexes(databases, collectionId) {
  const response = await databases.listIndexes(DB_ID, collectionId, [sdk.Query.limit(100)]);
  return response.indexes || [];
}

async function waitForAttribute(databases, collectionId, key, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    const attr = (await listAttributes(databases, collectionId)).find((candidate) => candidate.key === key);
    if (attr?.status === 'available') return;
    if (attr?.status === 'failed') throw new Error(`${collectionId}.${key} attribute failed to build`);
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${collectionId}.${key}`);
}

async function ensureCollection(databases, collectionId, spec) {
  const desiredPermissions = normalizeCollectionPermissions();
  try {
    const current = await databases.getCollection(DB_ID, collectionId);
    const currentPermissions = current.permissions || current.$permissions || [];
    const needsUpdate =
      current.documentSecurity !== true ||
      !sameStringSet(currentPermissions, desiredPermissions);
    if (needsUpdate) {
      await databases.updateCollection(
        DB_ID,
        collectionId,
        current.name || spec.name || collectionId,
        desiredPermissions,
        true,
        current.enabled !== false,
      );
      console.log(`  updated ${collectionId} permissions/documentSecurity`);
    } else {
      console.log(`  ${collectionId} permissions/documentSecurity already correct`);
    }
  } catch (error) {
    if (error.code !== 404) throw error;
    await databases.createCollection(DB_ID, collectionId, spec.name || collectionId, desiredPermissions, true);
    console.log(`  created collection ${collectionId}`);
    await sleep(1500);
  }
}

async function ensureAttribute(databases, collectionId, attr) {
  const existing = (await listAttributes(databases, collectionId)).find((candidate) => candidate.key === attr.key);
  if (existing) {
    if (existing.status !== 'available') await waitForAttribute(databases, collectionId, attr.key);
    console.log(`  ${collectionId}.${attr.key} already exists`);
    return;
  }

  if (attr.kind === 'string') {
    await databases.createStringAttribute(
      DB_ID,
      collectionId,
      attr.key,
      attr.size,
      attr.required === true,
      attr.defaultValue ?? undefined,
    );
  } else if (attr.kind === 'boolean') {
    await databases.createBooleanAttribute(
      DB_ID,
      collectionId,
      attr.key,
      attr.required === true,
      attr.defaultValue ?? undefined,
    );
  } else if (attr.kind === 'datetime') {
    await databases.createDatetimeAttribute(DB_ID, collectionId, attr.key, attr.required === true);
  } else {
    throw new Error(`Unsupported attribute kind: ${attr.kind}`);
  }
  console.log(`  created ${collectionId}.${attr.key}`);
  await waitForAttribute(databases, collectionId, attr.key);
}

async function ensureIndex(databases, collectionId, index) {
  const existing = (await listIndexes(databases, collectionId)).find((candidate) => candidate.key === index.key);
  if (existing) {
    console.log(`  ${collectionId}.${index.key} index already exists`);
    return;
  }
  try {
    await databases.createIndex(DB_ID, collectionId, index.key, index.type, index.attributes, index.orders);
    console.log(`  created ${collectionId}.${index.key} index`);
  } catch (error) {
    if (String(error.message || '').includes('already exists')) {
      console.log(`  ${collectionId}.${index.key} index already exists`);
      return;
    }
    console.warn(`  skipped ${collectionId}.${index.key} index: ${error.message}`);
  }
}

async function ensureOwnerCollection(databases, collectionId) {
  const spec = COLLECTION_SCHEMAS[collectionId];
  console.log(`\nEnsuring ${collectionId}`);
  await ensureCollection(databases, collectionId, spec);
  for (const attr of spec.attributes) {
    await ensureAttribute(databases, collectionId, attr);
  }
  for (const index of spec.indexes) {
    await ensureIndex(databases, collectionId, index);
  }
}

async function runSetup(options = {}) {
  const collectionIds = options.collections || parseCollectionsArg(options.argv);
  const { databases, projectId } = options.databases
    ? { databases: options.databases, projectId: options.projectId || 'test' }
    : createDatabases();

  console.log(`Setting up owner-scoped collections on project=${projectId} db=${DB_ID}`);
  for (const collectionId of collectionIds) {
    await ensureOwnerCollection(databases, collectionId);
  }
  console.log('\nOwner-scoped collection schema ready');
}

if (require.main === module) {
  runSetup().catch((error) => {
    console.error(`Fatal: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  COLLECTION_SCHEMAS,
  collectionPermissions,
  normalizeCollectionPermissions,
  ownerDocumentPermissions,
  hasExactOwnerPermissions,
  isValidOwnerId,
  parseCollectionsArg,
  runSetup,
};
