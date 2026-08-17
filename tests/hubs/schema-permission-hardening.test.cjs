const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const credits = read('scripts/setup_ai_credits_schema.cjs');
assert.doesNotMatch(credits, /Role\.any\(\)/, 'ai_credits must never grant anonymous collection access');
assert.match(credits, /createCollection\([^;]+\[\], true\)/s, 'ai_credits must use per-document security');
assert.match(credits, /updateCollection\([\s\S]+?\[\],[\s\S]+?true,/s, 'existing ai_credits collections must be reconciled');

for (const creditConsumer of [
  'appwrite-hubs/resume-section-ai/src/main.js',
  'appwrite-hubs/job-import/src/main.js',
]) {
  const source = read(creditConsumer);
  assert.doesNotMatch(source, /doc\.daily_limit\s*\?\?/, `${creditConsumer} must not trust a stored daily_limit override`);
  assert.doesNotMatch(source, /daily_limit:\s*creditState\./, `${creditConsumer} must not persist an authorization limit in usage state`);
}

const remoteJobs = read('scripts/setup_remote_jobs_feed_schema.cjs');
assert.doesNotMatch(remoteJobs, /Role\.any\(\)/, 'remote-jobs collections must not grant anonymous writes or reads');
assert.match(remoteJobs, /read\(sdk\.Role\.users\(\)\)/, 'authenticated users may read the curated feed');
assert.match(remoteJobs, /create\(sdk\.Role\.users\(\)\)/, 'authenticated users may create their own action documents');

const jobSync = read('appwrite-hubs/job-feed-sync/src/main.js');
assert.doesNotMatch(jobSync, /Role\.any\(\)/, 'synced job documents must not add public document access');

const discounts = read('scripts/setup_discount_codes_schema.cjs');
assert.doesNotMatch(discounts, /Role\.any\(\)/, 'coupon codes must not be publicly enumerable');
assert.match(discounts, /createCollection\([^;]+\[\],\s*false,\s*true\)/s, 'discount codes must be server-only with document security disabled');
assert.match(discounts, /updateCollection\([\s\S]+?\[\],[\s\S]+?false,/s, 'existing coupon collections must be reconciled');

console.log('schema permission hardening tests passed');
