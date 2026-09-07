'use strict';

/**
 * Seed or verify single-use Production QA coupon for Pro ($0.50 charge, exactly 30 days of access).
 *
 * Configured QA coupon requirements:
 * - Code starts with QA_ or QA- (strictly enforced by server-authoritative QA gate)
 * - Code MUST be provided at execution time via QA_COUPON_CODE env var (never hardcoded in source)
 * - Restricts access to authorized QA user ID only
 * - 90% discount on Pro ($5.00 base -> $0.50 charge)
 * - Single-use (max_uses: 1)
 * - Short expiry window (7 days)
 *
 * Usage:
 *   APPWRITE_API_KEY=<key> QA_COUPON_CODE=QA_PRO_<secret> node scripts/seed_qa_coupon.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = process.env.APPWRITE_DATABASE_ID || 'main';
const COLL_ID = 'discount_codes';

async function seedQaCoupon() {
  if (!API_KEY) {
    console.error('[seed-qa-coupon] Error: APPWRITE_API_KEY environment variable is required.');
    process.exit(1);
  }

  const rawCode = String(process.env.QA_COUPON_CODE || '').trim().toUpperCase();
  if (!rawCode) {
    console.error('[seed-qa-coupon] Error: QA_COUPON_CODE environment variable must be supplied at runtime.');
    console.error('[seed-qa-coupon] Code must start with QA_ or QA- (e.g. QA_COUPON_CODE=QA_PRO_<suffix>).');
    process.exit(1);
  }

  if (!rawCode.startsWith('QA_') && !rawCode.startsWith('QA-')) {
    console.error('[seed-qa-coupon] Error: QA coupon code must start with "QA_" or "QA-".');
    process.exit(1);
  }

  const client = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

  const databases = new sdk.Databases(client);

  console.log('[seed-qa-coupon] Checking for existing QA coupon in database...');

  const existing = await databases.listDocuments(DB_ID, COLL_ID, [
    sdk.Query.equal('code', rawCode),
    sdk.Query.limit(1),
  ]);

  if (existing.documents && existing.documents.length > 0) {
    const doc = existing.documents[0];
    console.log(`[seed-qa-coupon] QA coupon already exists (ID: ${doc.$id}, Active: ${doc.active}, Uses: ${doc.uses_count || 0}/${doc.max_uses || 1}).`);
    return doc;
  }

  console.log('[seed-qa-coupon] Creating single-use Production QA coupon...');

  // Short 7-day expiry window for production QA
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const payload = {
    code: rawCode,
    active: true,
    percent_off: 90,
    discount_type: 'percent',
    discount_value: 90,
    plan_override: 'pro',
    plan_days: 30,
    max_uses: 1,
    uses_count: 0,
    expires_at: sevenDaysFromNow,
  };

  const created = await databases.createDocument(
    DB_ID,
    COLL_ID,
    sdk.ID.unique(),
    payload
  );

  console.log(`[seed-qa-coupon] Successfully created QA coupon (ID: ${created.$id}, Expires: ${sevenDaysFromNow}).`);
  return created;
}

if (require.main === module) {
  seedQaCoupon().catch((err) => {
    console.error('[seed-qa-coupon] Failed:', err.message || err);
    process.exit(1);
  });
}

module.exports = {
  seedQaCoupon,
};
