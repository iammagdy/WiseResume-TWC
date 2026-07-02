'use strict';

/**
 * Idempotent script to ensure that portfolio-related collections
 * have `documentSecurity` enabled (set to true).
 *
 * Enforces security on:
 *   - notifications
 *   - portfolio_visits
 *   - portfolio_history
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_portfolio_security.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = 'main';

if (!API_KEY) {
  console.error('✗ APPWRITE_API_KEY is required');
  process.exit(1);
}

const client    = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const databases = new sdk.Databases(client);

async function enforceSecurity(collId, name) {
  try {
    const col = await databases.getCollection(DB_ID, collId);
    if (!col.documentSecurity) {
      console.log(`Enabling documentSecurity for collection "${collId}"...`);
      await databases.updateCollection(DB_ID, collId, name || col.name, [], true);
      console.log(`✓ Enabled documentSecurity for "${collId}"`);
    } else {
      console.log(`✓ documentSecurity is already enabled (true) for "${collId}"`);
    }
  } catch (e) {
    console.warn(`⚠ Failed to enforce security for "${collId}":`, e.message);
  }
}

async function main() {
  console.log(`Enforcing portfolio and notification collection security — project=${PROJECT_ID} db=${DB_ID}`);
  await enforceSecurity('notifications', 'Notifications');
  await enforceSecurity('portfolio_visits', 'Portfolio Visits');
  await enforceSecurity('portfolio_history', 'portfolio_history');
  console.log('✅ Security configuration complete.');
}

main().catch(e => {
  console.error('✗ Failed:', e.message);
  process.exit(1);
});
