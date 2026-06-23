'use strict';

// Idempotent schema setup for the `portfolio_visits` collection.
//
// ROOT CAUSE THIS FIXES (visitor count always 0):
// The public visit beacon (api/track-portfolio-view.ts and the mirror in
// server/index.ts) writes these fields to portfolio_visits:
//   username, ref, sections_viewed, sections_timing, time_spent_seconds,
//   device, ab_variant
// and the owner dashboard (src/hooks/usePortfolioAnalytics.ts) READS them back
// via Query.equal('username', ...) + Query.orderDesc('$createdAt').
//
// In production the live collection was provisioned with an unrelated set of
// columns (user_id, portfolio_id, referrer, country, device_type, page,
// utm_source, ...) and ZERO indexes. NONE of the attributes the code writes
// exist, so every createDocument failed with "Unknown attribute" — and because
// the beacon is fire-and-forget (errors swallowed) the failure was silent.
// Result: portfolio_visits had 0 rows and the Visitors tab always showed
// "No visitors yet". The read query also fails because there is no `username`
// attribute / index to match on.
//
// This adds ONLY the missing attributes the read/write contract needs, plus a
// key index on `username` for the dashboard lookup. Every attribute is optional
// (required=false) → additive and backward-compatible. It never changes
// collection permissions or existing documents, and aborts if the collection is
// somehow absent (it will not recreate it). Safe to run repeatedly.
//
// Run with APPWRITE_PROJECT_ID + APPWRITE_API_KEY in the environment:
//   node scripts/setup_portfolio_visits_schema.cjs

const { Client, Databases, DatabasesIndexType: IndexType } = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID || '';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const DB_ID = 'main';
const COLL = 'portfolio_visits';

if (!PROJECT_ID || !API_KEY) {
  console.error('Missing APPWRITE_PROJECT_ID / APPWRITE_API_KEY in environment.');
  process.exit(1);
}

const db = new Databases(new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isDuplicate = (e) => !!e && (e.code === 409 || /already exists/i.test(e.message || ''));
const isMissing = (e) => !!e && (e.code === 404 || /could not be found/i.test(e.message || ''));

// [key, size, isArray] — all optional/nullable, additive and backward-compatible.
// Mirrors the fields written by api/track-portfolio-view.ts plus the optional
// read-model fields mapped in usePortfolioAnalytics.ts (docToVisit).
const STRING_ATTRS = [
  ['username', 64, false],        // owner lookup key (indexed below)
  ['ref', 200, false],            // short-link slug / referrer tag
  ['sections_viewed', 64, true],  // string[] of section names viewed
  ['sections_timing', 8192, false], // JSON: { section: dwellSeconds }
  ['device', 16, false],          // 'desktop' | 'mobile' | 'tablet'
  ['ab_variant', 2, false],       // 'a' | 'b'
  ['short_link_id', 64, false],   // read by docToVisit / source attribution
  ['company_name', 128, false],   // read by docToVisit / recent visits
  ['city', 128, false],           // read by docToVisit
];

// time_spent_seconds is an integer (clamped 0..86400 server-side).
const INT_ATTRS = [
  ['time_spent_seconds', 0, 86400],
];

async function ensureCollectionExists() {
  try {
    await db.getCollection(DB_ID, COLL);
    console.log('✓ collection "portfolio_visits" exists (permissions left untouched)');
  } catch (e) {
    if (isMissing(e)) {
      console.error('✗ collection "portfolio_visits" does not exist — aborting (will not create it).');
      process.exit(1);
    }
    throw e;
  }
}

async function ensureString(key, size, array) {
  try {
    await db.createStringAttribute(DB_ID, COLL, key, size, false, undefined, !!array);
    console.log(`✓ created string "${key}" (size=${size}, array=${!!array}, required=false)`);
    await sleep(500);
  } catch (e) {
    if (isDuplicate(e)) console.log(`• string "${key}" already exists`);
    else throw e;
  }
}

async function ensureInteger(key, min, max) {
  try {
    await db.createIntegerAttribute(DB_ID, COLL, key, false, min, max);
    console.log(`✓ created integer "${key}" (min=${min}, max=${max}, required=false)`);
    await sleep(500);
  } catch (e) {
    if (isDuplicate(e)) console.log(`• integer "${key}" already exists`);
    else throw e;
  }
}

async function ensureIndex(key, attributes) {
  try {
    await db.createIndex(DB_ID, COLL, key, IndexType.Key, attributes, ['ASC']);
    console.log(`✓ created index "${key}" on [${attributes.join(',')}]`);
    await sleep(500);
  } catch (e) {
    if (isDuplicate(e)) console.log(`• index "${key}" already exists`);
    else throw e;
  }
}

(async () => {
  console.log(`Ensuring portfolio_visits schema on project=${PROJECT_ID} db=${DB_ID}`);
  await ensureCollectionExists();
  for (const [key, size, array] of STRING_ATTRS) await ensureString(key, size, array);
  for (const [key, min, max] of INT_ATTRS) await ensureInteger(key, min, max);
  // Index required for the dashboard's Query.equal('username', ...) lookup.
  await ensureIndex('idx_pv_username', ['username']);
  console.log('✅ portfolio_visits schema ready');
})().catch((e) => {
  console.error('portfolio_visits schema setup failed:', e.message || e);
  process.exit(1);
});
