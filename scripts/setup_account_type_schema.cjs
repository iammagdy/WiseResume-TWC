'use strict';

/**
 * Adds the `account_type` field to the existing `profiles` collection.
 * This field controls WiseHire access and must be admin-only.
 *
 * Field:
 *   account_type (str 32, optional) — User account type for product access
 *   Allowed values: 'job_seeker', 'hr'
 *   Default: null (missing field behaves as 'job_seeker')
 *
 * SECURITY: This field is READ-ONLY for normal users. Only admin DevKit
 * functions can modify account_type. User-facing profile updates are
 * filtered through LIVE_PROFILE_ATTRIBUTES whitelist which does NOT
 * include account_type.
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_account_type_schema.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = 'main';
const COLL_ID    = 'profiles';

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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function ensureStringAttr(collId, key, size, required, defaultVal) {
  if (await attributeExists(collId, key)) { 
    console.log(`  ✓ attribute "${key}" already exists`); 
    return; 
  }
  
  console.log(`  + creating attribute "${key}"`);
  await databases.createStringAttribute(DB_ID, collId, key, size, required, defaultVal);
  console.log(`  ✓ attribute "${key}" created`);
  // Wait a bit for Appwrite to register the attribute
  await sleep(1000);
}

async function main() {
  console.log('Setting up account_type field in profiles collection...');
  
  if (!await collectionExists(COLL_ID)) {
    console.error(`✗ Collection "${COLL_ID}" does not exist`);
    process.exit(1);
  }
  
  console.log(`✓ Collection "${COLL_ID}" exists`);
  
  try {
    await ensureStringAttr(COLL_ID, 'account_type', 32, false, null);
    console.log('\n✅ Setup complete: account_type field added to profiles collection');
    console.log('\nSECURITY NOTES:');
    console.log('- account_type is READ-ONLY for normal users');
    console.log('- Only admin DevKit functions can modify account_type');
    console.log('- Allowed values: "job_seeker", "hr"');
    console.log('- Missing/null values behave as "job_seeker"');
  } catch (error) {
    console.error('✗ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
