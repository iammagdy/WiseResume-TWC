'use strict';

/**
 * Sets up the three server-authority collections and reconciles permissions on
 * existing WiseHire operational collections:
 *
 *   wisehire_waitlist  — applicants waiting for WiseHire access
 *   wisehire_invites   — one-time invite tokens sent to waitlist applicants
 *   wisehire_accounts  — approved WiseHire recruiter accounts
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_wisehire_collections_schema.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = 'main';

if (!API_KEY) { console.error('✗ APPWRITE_API_KEY is required'); process.exit(1); }

const client    = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const databases = new sdk.Databases(client);

async function collectionExists(id) {
  try { await databases.getCollection(DB_ID, id); return true; }
  catch (e) { if (e.code === 404) return false; throw e; }
}
async function attributeExists(collId, key) {
  try { const r = await databases.listAttributes(DB_ID, collId); return r.attributes.some(a => a.key === key); }
  catch { return false; }
}
async function indexExists(collId, key) {
  try { const r = await databases.listIndexes(DB_ID, collId); return r.indexes.some(i => i.key === key); }
  catch { return false; }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function enforceServerOnlyCollection(collId, fallbackName) {
  const collection = await databases.getCollection(DB_ID, collId);
  await databases.updateCollection(
    DB_ID,
    collId,
    collection.name || fallbackName,
    [],
    false,
    collection.enabled !== false,
  );
  console.log('  ✓ enforced server-only collection access');
}

const OPERATIONAL_COLLECTIONS = [
  'talent_pool_profiles',
  'talent_pool_views',
  'wisehire_applications',
  'wisehire_bulk_screen_jobs',
  'wisehire_candidate_briefs',
  'wisehire_candidate_notes',
  'wisehire_candidates',
  'wisehire_clients',
  'wisehire_companies',
  'wisehire_mask_sessions',
  'wisehire_outreach_emails',
  'wisehire_pipeline_events',
  'wisehire_roles',
  'wisehire_saved_searches',
  'wisehire_scorecard_templates',
  'wisehire_scorecards',
];

async function listAllDocuments(collectionId) {
  const documents = [];
  let cursor = null;
  while (true) {
    const queries = [sdk.Query.limit(100)];
    if (cursor) queries.push(sdk.Query.cursorAfter(cursor));
    const page = await databases.listDocuments(DB_ID, collectionId, queries);
    documents.push(...page.documents);
    if (page.documents.length < 100) break;
    cursor = page.documents[page.documents.length - 1].$id;
  }
  return documents;
}

async function relatedOwner(collectionId, documentId) {
  if (!documentId) return '';
  try {
    const related = await databases.getDocument(DB_ID, collectionId, documentId);
    return String(related.owner_id || '').trim();
  } catch {
    return '';
  }
}

async function resolveOperationalOwner(document) {
  const direct = String(document.owner_id || document.user_id || document.viewer_id || '').trim();
  if (direct) return direct;
  const candidateOwner = await relatedOwner('wisehire_candidates', document.candidate_id);
  if (candidateOwner) return candidateOwner;
  const roleOwner = await relatedOwner('wisehire_roles', document.role_id);
  if (roleOwner) return roleOwner;
  return relatedOwner('wisehire_companies', document.company_id);
}

function ownerPermissions(ownerId) {
  if (!ownerId) return [];
  return [
    sdk.Permission.read(sdk.Role.user(ownerId)),
    sdk.Permission.update(sdk.Role.user(ownerId)),
    sdk.Permission.delete(sdk.Role.user(ownerId)),
  ];
}

async function hardenOperationalCollection(collectionId) {
  if (!(await collectionExists(collectionId))) {
    console.log(`  • ${collectionId} not provisioned; skipped`);
    return;
  }
  const collection = await databases.getCollection(DB_ID, collectionId);
  await databases.updateCollection(
    DB_ID,
    collectionId,
    collection.name || collectionId,
    [sdk.Permission.create(sdk.Role.users())],
    true,
    collection.enabled !== false,
  );

  const documents = await listAllDocuments(collectionId);
  let secured = 0;
  let quarantined = 0;
  for (const document of documents) {
    const ownerId = await resolveOperationalOwner(document);
    await databases.updateDocument(
      DB_ID,
      collectionId,
      document.$id,
      {},
      ownerPermissions(ownerId),
    );
    if (ownerId) secured += 1;
    else quarantined += 1;
  }
  console.log(`  ✓ ${collectionId}: owner-secured=${secured}, server-only unresolved=${quarantined}`);
}

async function hardenOperationalCollections() {
  console.log('\n── WiseHire operational permissions ──');
  for (const collectionId of OPERATIONAL_COLLECTIONS) {
    await hardenOperationalCollection(collectionId);
  }
}

async function ensureStringAttr(collId, key, size, required, defaultVal) {
  if (await attributeExists(collId, key)) { console.log(`  ✓ attribute "${key}" already exists`); return; }
  await databases.createStringAttribute(DB_ID, collId, key, size, required, defaultVal ?? undefined);
  console.log(`  ✓ created string attribute "${key}"`);
  await sleep(500);
}

async function ensureWisehireWaitlist() {
  console.log('\n── wisehire_waitlist ──');
  const COLL = 'wisehire_waitlist';
  if (!(await collectionExists(COLL))) {
    await databases.createCollection(DB_ID, COLL, 'WiseHire Waitlist', [], false);
    console.log('  ✓ created wisehire_waitlist collection');
    await sleep(800);
  } else {
    console.log('  ✓ wisehire_waitlist already exists');
  }
  await enforceServerOnlyCollection(COLL, 'WiseHire Waitlist');
  await ensureStringAttr(COLL, 'email', 254, true);
  await ensureStringAttr(COLL, 'name', 256, false, '');
  await ensureStringAttr(COLL, 'company_name', 256, false, '');
  await ensureStringAttr(COLL, 'company_size', 64, false, '');
  if (!(await indexExists(COLL, 'email_idx'))) {
    await databases.createIndex(DB_ID, COLL, 'email_idx', 'key', ['email']);
    console.log('  ✓ created index on email');
  }
}

async function ensureWisehireInvites() {
  console.log('\n── wisehire_invites ──');
  const COLL = 'wisehire_invites';
  if (!(await collectionExists(COLL))) {
    await databases.createCollection(DB_ID, COLL, 'WiseHire Invites', [], false);
    console.log('  ✓ created wisehire_invites collection');
    await sleep(800);
  } else {
    console.log('  ✓ wisehire_invites already exists');
  }
  await enforceServerOnlyCollection(COLL, 'WiseHire Invites');
  await ensureStringAttr(COLL, 'email', 254, true);
  await ensureStringAttr(COLL, 'token', 128, true);
  await ensureStringAttr(COLL, 'status', 32, false, 'pending');
  await ensureStringAttr(COLL, 'expires_at', 32, false);
  await ensureStringAttr(COLL, 'created_at', 32, false);
  await ensureStringAttr(COLL, 'target_user_id', 36, false);
  if (!(await indexExists(COLL, 'email_idx'))) {
    await databases.createIndex(DB_ID, COLL, 'email_idx', 'key', ['email']);
    console.log('  ✓ created index on email');
  }
  if (!(await indexExists(COLL, 'token_unique'))) {
    await databases.createIndex(DB_ID, COLL, 'token_unique', 'unique', ['token']);
    console.log('  ✓ created unique index on token');
  }
}

async function ensureWisehireAccounts() {
  console.log('\n── wisehire_accounts ──');
  const COLL = 'wisehire_accounts';
  if (!(await collectionExists(COLL))) {
    await databases.createCollection(DB_ID, COLL, 'WiseHire Accounts', [], false);
    console.log('  ✓ created wisehire_accounts collection');
    await sleep(800);
  } else {
    console.log('  ✓ wisehire_accounts already exists');
  }
  await enforceServerOnlyCollection(COLL, 'WiseHire Accounts');
  await ensureStringAttr(COLL, 'user_id', 36, true);
  await ensureStringAttr(COLL, 'email', 254, false);
  await ensureStringAttr(COLL, 'approved_at', 32, false);
  if (!(await indexExists(COLL, 'user_id_unique'))) {
    await databases.createIndex(DB_ID, COLL, 'user_id_unique', 'unique', ['user_id']);
    console.log('  ✓ created unique index on user_id');
  }
}

async function main() {
  console.log(`Setting up WiseHire collections — project=${PROJECT_ID} db=${DB_ID}`);
  await ensureWisehireWaitlist();
  await ensureWisehireInvites();
  await ensureWisehireAccounts();
  await hardenOperationalCollections();
  console.log('\n✅ WiseHire collections schema ready');
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
