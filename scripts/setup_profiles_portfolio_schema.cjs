'use strict';

// Idempotent schema migration for the `profiles` collection: adds the portfolio
// columns the app writes (and whitelists in useProfile.ts LIVE_PROFILE_ATTRIBUTES)
// but which are MISSING in production, causing portfolio save/publish to fail with
// "Unknown attribute" ("a portfolio field is misconfigured").
//
// Adds ONLY the missing attributes. Does NOT change collection permissions, does
// NOT modify existing documents, and is safe to run repeatedly. The `profiles`
// collection must already exist (it does) — this script never creates it.

const { Client, Databases } = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID || '';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const DB_ID = 'main';
const COLL = 'profiles';

if (!PROJECT_ID || !API_KEY) {
  console.error('Missing APPWRITE_PROJECT_ID / APPWRITE_API_KEY in environment.');
  process.exit(1);
}

const db = new Databases(new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isDuplicate = (e) => !!e && (e.code === 409 || /already exists/i.test(e.message || ''));
const isMissing = (e) => !!e && (e.code === 404 || /could not be found/i.test(e.message || ''));

// String attributes the editor writes (all optional, nullable, no default).
// Large sizes for the stringified-JSON blobs (portfolio_extras is capped at
// ~200 KB by PORTFOLIO_EXTRAS_MAX_BYTES; portfolio_draft mirrors it).
const STRING_ATTRS = [
  ['portfolio_resume_id', 64],
  ['portfolio_style', 64],
  ['portfolio_layout', 64],
  ['portfolio_font', 64],
  ['portfolio_accent_color', 32],
  ['portfolio_sync_mode', 32],
  ['portfolio_meta_title', 256],
  ['portfolio_meta_description', 1024],
  ['availability_headline', 256],
  ['github_url', 512],
  ['website_url', 512],
  ['twitter_url', 512],
  ['contact_email', 254],
  ['portfolio_draft_saved_at', 32],
  ['portfolio_sections', 8000],
  ['portfolio_extras', 24000],
];
const BOOLEAN_ATTRS = [
  ['open_to_work', false],
];

async function ensureCollectionExists() {
  try {
    const col = await db.getCollection(DB_ID, COLL);
    console.log('✓ collection "profiles" exists (permissions left untouched)');
    return col;
  } catch (e) {
    if (isMissing(e)) {
      console.error('✗ collection "profiles" does not exist — aborting (will not create the core profiles collection).');
      process.exit(1);
    }
    throw e;
  }
}

async function ensureString(key, size) {
  try {
    await db.createStringAttribute(DB_ID, COLL, key, size, false); // optional, no default
    console.log(`✓ created string "${key}" (size=${size}, required=false)`);
    await sleep(500);
  } catch (e) {
    if (isDuplicate(e)) console.log(`• string "${key}" already exists`);
    else throw e;
  }
}

async function ensureBoolean(key, def) {
  try {
    await db.createBooleanAttribute(DB_ID, COLL, key, false, def);
    console.log(`✓ created boolean "${key}" (required=false, default=${def})`);
    await sleep(500);
  } catch (e) {
    if (isDuplicate(e)) console.log(`• boolean "${key}" already exists`);
    else throw e;
  }
}

(async () => {
  console.log(`Ensuring profiles portfolio schema on project=${PROJECT_ID} db=${DB_ID}`);
  const collection = await ensureCollectionExists();
  const existingKeys = new Set((collection.attributes || []).map((a) => a.key));

  for (const [key, size] of STRING_ATTRS) {
    if (existingKeys.has(key)) {
      console.log(`• string "${key}" already exists (pre-checked)`);
    } else {
      await ensureString(key, size);
    }
  }
  for (const [key, def] of BOOLEAN_ATTRS) {
    if (existingKeys.has(key)) {
      console.log(`• boolean "${key}" already exists (pre-checked)`);
    } else {
      await ensureBoolean(key, def);
    }
  }
  console.log('✅ profiles portfolio schema ready');
})().catch((e) => {
  console.error('profiles portfolio schema setup failed:', e.message || e);
  process.exit(1);
});
