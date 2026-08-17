'use strict';

/**
 * Server-authoritative resume-share schema and migration.
 *
 * - resume_shares/share_comments/rate limits are server-only.
 * - resumes remain client-owner writable, but have no collection-level read;
 *   every existing document is normalized to exact owner permissions.
 * - legacy raw share tokens are replaced in-place by SHA-256 digests while the
 *   original link keeps working (the server hashes the URL token for lookup).
 * - legacy plaintext share passwords are upgraded to scrypt at rest. Historical
 *   sha256 hashes are upgraded on the next successful password verification.
 *
 * Existing-document mutation is explicit:
 *   node scripts/setup_resume_share_security_schema.cjs --apply-existing
 */

const crypto = require('crypto');
const sdk = require('node-appwrite');

const DB_ID = process.env.APPWRITE_DATABASE_ID || 'main';
const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID || '';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const APPLY_EXISTING = process.argv.includes('--apply-existing');
const PAGE_LIMIT = 100;

if (!PROJECT_ID || !API_KEY) {
  console.error('Missing APPWRITE_PROJECT_ID / APPWRITE_API_KEY.');
  process.exit(1);
}

const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const db = new sdk.Databases(client);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isMissing = (err) => err?.code === 404 || /could not be found/i.test(err?.message || '');
const isDuplicate = (err) => err?.code === 409 || /already exists|duplicate/i.test(err?.message || '');

const COLLECTIONS = {
  resume_shares: {
    name: 'Resume Shares',
    permissions: [],
    documentSecurity: true,
    attributes: [
      ['string', 'user_id', 128],
      ['string', 'resume_id', 128],
      ['string', 'token', 128],
      ['string', 'token_hash', 64],
      ['string', 'token_prefix', 16],
      ['boolean', 'is_active', true],
      ['string', 'password', 512],
      ['string', 'password_hash', 512],
      ['boolean', 'has_password', false],
      ['integer', 'access_version', 1, 2_147_483_647, 1],
      ['datetime', 'expires_at'],
      ['integer', 'view_count', 0, 2_147_483_647, 0],
    ],
    indexes: [
      ['idx_rs_token_hash', sdk.DatabasesIndexType.Unique, ['token_hash']],
      ['idx_rs_user', sdk.DatabasesIndexType.Key, ['user_id']],
      ['idx_rs_resume', sdk.DatabasesIndexType.Key, ['resume_id']],
      ['idx_rs_user_resume', sdk.DatabasesIndexType.Key, ['user_id', 'resume_id']],
    ],
  },
  share_comments: {
    name: 'Share Comments',
    permissions: [],
    documentSecurity: true,
    attributes: [
      ['string', 'share_id', 128],
      ['string', 'author_name', 80],
      ['string', 'content', 1000],
      ['string', 'section', 32],
      ['boolean', 'is_resolved', false],
    ],
    indexes: [
      ['idx_sc_share', sdk.DatabasesIndexType.Key, ['share_id']],
      ['idx_sc_share_resolved', sdk.DatabasesIndexType.Key, ['share_id', 'is_resolved']],
    ],
  },
  resume_share_rate_limits: {
    name: 'Resume Share Rate Limits',
    permissions: [],
    documentSecurity: true,
    attributes: [
      ['string', 'bucket', 32],
      ['string', 'key_hash', 64],
      ['integer', 'count', 0, 1_000_000, 0],
      ['datetime', 'reset_at'],
    ],
    indexes: [
      ['idx_rsrl_reset', sdk.DatabasesIndexType.Key, ['reset_at']],
    ],
  },
};

function sameSet(a, b) {
  const left = Array.isArray(a) ? a : [];
  const right = Array.isArray(b) ? b : [];
  return left.length === right.length && left.every((value) => right.includes(value));
}

async function ensureCollection(id, spec) {
  try {
    const current = await db.getCollection(DB_ID, id);
    const currentPermissions = current.permissions || current.$permissions || [];
    if (current.documentSecurity !== spec.documentSecurity || !sameSet(currentPermissions, spec.permissions)) {
      await db.updateCollection(DB_ID, id, current.name || spec.name, spec.permissions, spec.documentSecurity, current.enabled !== false);
      console.log(`updated ${id} permissions/documentSecurity`);
    }
  } catch (err) {
    if (!isMissing(err)) throw err;
    await db.createCollection(DB_ID, id, spec.name, spec.permissions, spec.documentSecurity);
    console.log(`created ${id}`);
    await sleep(750);
  }
}

async function existingAttributes(collectionId) {
  const result = await db.listAttributes(DB_ID, collectionId, [sdk.Query.limit(100)]);
  return new Set((result.attributes || []).map((attr) => attr.key));
}

async function waitForAttribute(collectionId, key) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = await db.listAttributes(DB_ID, collectionId, [sdk.Query.limit(100)]);
    const attr = (result.attributes || []).find((candidate) => candidate.key === key);
    if (attr?.status === 'available') return;
    if (attr?.status === 'failed') throw new Error(`${collectionId}.${key} failed to build`);
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${collectionId}.${key}`);
}

async function ensureAttributes(collectionId, definitions) {
  const existing = await existingAttributes(collectionId);
  for (const [type, key, a, b, c] of definitions) {
    if (existing.has(key)) continue;
    if (type === 'string') await db.createStringAttribute(DB_ID, collectionId, key, a, false);
    else if (type === 'boolean') await db.createBooleanAttribute(DB_ID, collectionId, key, false, a);
    else if (type === 'datetime') await db.createDatetimeAttribute(DB_ID, collectionId, key, false);
    else if (type === 'integer') await db.createIntegerAttribute(DB_ID, collectionId, key, false, a, b, c);
    else throw new Error(`Unsupported attribute type: ${type}`);
    console.log(`created ${collectionId}.${key}`);
    await waitForAttribute(collectionId, key);
  }
}

async function ensureIndexes(collectionId, definitions) {
  const result = await db.listIndexes(DB_ID, collectionId, [sdk.Query.limit(100)]);
  const existing = new Set((result.indexes || []).map((index) => index.key));
  for (const [key, type, attributes] of definitions) {
    if (existing.has(key)) continue;
    try {
      await db.createIndex(DB_ID, collectionId, key, type, attributes);
      console.log(`created ${collectionId}.${key}`);
      await sleep(500);
    } catch (err) {
      if (!isDuplicate(err)) throw err;
    }
  }
}

function ownerPermissions(userId) {
  return [
    sdk.Permission.read(sdk.Role.user(userId)),
    sdk.Permission.update(sdk.Role.user(userId)),
    sdk.Permission.delete(sdk.Role.user(userId)),
  ];
}

function validOwnerId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
}

async function ensureResumeCollectionPrivacy() {
  const resume = await db.getCollection(DB_ID, 'resumes');
  const permissions = [sdk.Permission.create(sdk.Role.users())];
  const current = resume.permissions || resume.$permissions || [];
  if (resume.documentSecurity !== true || !sameSet(current, permissions)) {
    await db.updateCollection(DB_ID, 'resumes', resume.name || 'Resumes', permissions, true, resume.enabled !== false);
    console.log('updated resumes to owner-document security (create:users only)');
  }
}

async function listAll(collectionId, visitor) {
  let cursor;
  do {
    const queries = [sdk.Query.limit(PAGE_LIMIT), sdk.Query.orderAsc('$id')];
    if (cursor) queries.push(sdk.Query.cursorAfter(cursor));
    const page = await db.listDocuments(DB_ID, collectionId, queries);
    const docs = page.documents || [];
    for (const doc of docs) await visitor(doc);
    cursor = docs.length === PAGE_LIMIT ? docs[docs.length - 1].$id : undefined;
  } while (cursor);
}

async function preflightExistingData() {
  const problems = {
    invalidResumeOwner: 0,
    invalidShareOwner: 0,
    activeShareWithoutToken: 0,
    protectedShareWithoutVerifier: 0,
  };
  await listAll('resumes', async (resume) => {
    if (!validOwnerId(resume.user_id)) problems.invalidResumeOwner += 1;
  });
  try {
    await db.getCollection(DB_ID, 'resume_shares');
    await listAll('resume_shares', async (share) => {
      if (!validOwnerId(share.user_id)) problems.invalidShareOwner += 1;
      if (share.is_active === true && !share.token_hash && !share.token) problems.activeShareWithoutToken += 1;
      if (share.has_password === true && !share.password_hash && !share.password) problems.protectedShareWithoutVerifier += 1;
    });
  } catch (err) {
    if (!isMissing(err)) throw err;
  }
  const total = Object.values(problems).reduce((sum, value) => sum + value, 0);
  if (total > 0) {
    console.error(`OWNER_ACTION_REQUIRED preflight=${JSON.stringify(problems)}`);
    throw new Error('Resume-share security migration preflight failed; no collection permissions were changed.');
  }
  console.log('existing-data preflight passed');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function tokenStorageMarker(tokenHash) {
  return `h_${tokenHash.slice(0, 14)}`;
}

function scryptPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 32, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$v=1$N=16384$r=8$p=1$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

async function migrateExistingDocuments() {
  const counts = { resumes: 0, shares: 0, comments: 0, skipped: 0 };
  await listAll('resumes', async (resume) => {
    if (!validOwnerId(resume.user_id)) {
      counts.skipped += 1;
      return;
    }
    const wanted = ownerPermissions(resume.user_id);
    if (!sameSet(resume.$permissions || [], wanted)) {
      await db.updateDocument(DB_ID, 'resumes', resume.$id, {}, wanted);
      counts.resumes += 1;
    }
  });

  await listAll('resume_shares', async (share) => {
    const payload = {};
    const rawToken = typeof share.token === 'string' ? share.token : '';
    if (!share.token_hash && rawToken) {
      const digest = hashToken(rawToken);
      payload.token_hash = digest;
      payload.token = tokenStorageMarker(digest);
      payload.token_prefix = rawToken.slice(0, 8);
    }
    if (!share.password_hash && typeof share.password === 'string' && share.password) {
      payload.password_hash = share.password.startsWith('sha256:')
        ? share.password
        : scryptPassword(share.password);
      payload.password = null;
      payload.has_password = true;
    } else if ((share.password_hash || share.password) && share.has_password !== true) {
      payload.has_password = true;
    }
    const hasDocumentPermissions = Array.isArray(share.$permissions) && share.$permissions.length > 0;
    if (Object.keys(payload).length || hasDocumentPermissions) {
      await db.updateDocument(DB_ID, 'resume_shares', share.$id, payload, []);
      counts.shares += 1;
    }
  });

  await listAll('share_comments', async (comment) => {
    if (Array.isArray(comment.$permissions) && comment.$permissions.length > 0) {
      await db.updateDocument(DB_ID, 'share_comments', comment.$id, {}, []);
      counts.comments += 1;
    }
  });

  console.log(`migrated resumes=${counts.resumes} shares=${counts.shares} comments=${counts.comments} skipped_invalid_owner=${counts.skipped}`);
  if (counts.skipped) {
    console.error('OWNER_ACTION_REQUIRED: resume documents with invalid/missing user_id were not made readable.');
    process.exitCode = 2;
  }
}

async function run() {
  console.log(`Securing resume shares on project=${PROJECT_ID} db=${DB_ID} applyExisting=${APPLY_EXISTING}`);
  if (APPLY_EXISTING) await preflightExistingData();
  for (const [id, spec] of Object.entries(COLLECTIONS)) {
    await ensureCollection(id, spec);
    await ensureAttributes(id, spec.attributes);
    await ensureIndexes(id, spec.indexes);
  }
  await ensureResumeCollectionPrivacy();
  if (APPLY_EXISTING) await migrateExistingDocuments();
  else console.log('dry schema mode: existing tokens/passwords/document permissions were not migrated');
  console.log('resume-share security schema ready');
}

if (require.main === module) {
  run().catch((err) => {
    console.error(`Fatal: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  COLLECTIONS,
  ownerPermissions,
  hashToken,
  tokenStorageMarker,
  scryptPassword,
  sameSet,
};
