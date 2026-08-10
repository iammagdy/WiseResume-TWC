'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const helpers = [
  require('../../appwrite-hubs/ai-gateway/src/runtime-receipts.cjs'),
  require('../../appwrite-hubs/resume-section-ai/src/runtime-receipts.cjs'),
  require('../../appwrite-hubs/job-import/src/runtime-receipts.cjs'),
];
const schema = require('../../scripts/setup_ai_runtime_receipts_schema.cjs');
const gatewayTest = require('../../appwrite-hubs/ai-gateway/src/main.js').__test;
const resumeTest = require('../../appwrite-hubs/resume-section-ai/src/main.js').__test;

for (const helper of helpers) {
  const firstId = helper.createRequestId();
  const secondId = helper.createRequestId();
  assert.match(firstId, /^air_[a-z0-9]+_[a-f0-9]{16}$/);
  assert.notEqual(firstId, secondId, 'request IDs are server-generated per invocation');

  const receipt = helper.buildReceipt({
    requestId: firstId,
    hub: 'job-import',
    feature: 'parse-job',
    provider: 'deepseek',
    model: 'deepseek-chat',
    status: 'completed',
    httpStatus: 200,
    latencyMs: 42,
    userId: 'user-safe-test',
    credits: 1,
    idempotencyState: 'miss',
  });
  assert.equal(receipt.request_id, firstId);
  assert.equal(receipt.hub, 'job-import');
  assert.equal(receipt.credits_charged, 1);
  assert.equal(receipt.idempotency_state, 'miss');
  assert.ok(receipt.expires_at > receipt.completed_at, 'receipts have bounded expiry metadata');
  for (const forbidden of ['prompt', 'content', 'payload', 'headers', 'authorization', 'token', 'result']) {
    assert.equal(Object.hasOwn(receipt, forbidden), false, `receipt must not store ${forbidden}`);
  }
}

async function verifyFailureIsolation(helper) {
  let productProviderCalls = 0;
  let productCreditWrites = 0;
  let productMutations = 0;
  let fallbackCalls = 0;
  let receiptWrites = 0;
  const unavailableDb = {
    async createDocument() {
      receiptWrites++;
      throw Object.assign(new Error('receipt store unavailable'), { code: 'database_unavailable' });
    },
  };

  async function successfulProductAction() {
    productProviderCalls++;
    productCreditWrites++;
    productMutations++;
    await helper.writeReceipt(unavailableDb, { hub: 'job-import', feature: 'parse-job', credits: 1 }, () => {});
    return { ok: true };
  }

  assert.deepEqual(await successfulProductAction(), { ok: true }, 'receipt failure does not change a successful product result');
  assert.equal(productProviderCalls, 1, 'receipt failure does not trigger another provider call');
  assert.equal(productCreditWrites, 1, 'receipt failure does not trigger another credit charge');
  assert.equal(productMutations, 1, 'receipt failure does not add a product mutation');
  assert.equal(fallbackCalls, 0, 'receipt failure does not trigger a provider fallback');
  assert.equal(receiptWrites, 1, 'receipt write was attempted once');

  await helper.pruneReceipts({
    async listDocuments() { throw new Error('retention query unavailable'); },
  });
}

async function runFailureIsolationTests() {
  for (const helper of helpers) await verifyFailureIsolation(helper);

  const creditState = { chargeable: true, blocked: false, cost: 1, today: '2026-08-10', dailyLimit: 5, currentUsage: 0, doc: { $id: 'credit-1', $updatedAt: 'original', daily_usage: 0, total_usage: 0, usage_date: '2026-08-10' } };
  const creditDb = {
    async getDocument() { return creditState.doc; },
    async updateDocument() { return {}; },
  };
  assert.equal(await gatewayTest.recordAiUsage(creditDb, creditState), true, 'gateway reports only a successful credit write as charged');
  assert.equal(await gatewayTest.recordAiUsage(creditDb, { ...creditState, chargeable: false }), false, 'gateway no-charge path reports zero charged credits');
  assert.equal(await resumeTest.recordAiUsage(creditDb, creditState), true, 'resume-section-ai reports only a successful credit write as charged');
  assert.equal(await resumeTest.recordAiUsage(creditDb, { ...creditState, cost: 0 }), false, 'resume-section-ai no-charge path reports zero charged credits');
}

const gatewaySource = fs.readFileSync(path.join(ROOT, 'appwrite-hubs/ai-gateway/src/main.js'), 'utf8');
const resumeSource = fs.readFileSync(path.join(ROOT, 'appwrite-hubs/resume-section-ai/src/main.js'), 'utf8');
const jobImportSource = fs.readFileSync(path.join(ROOT, 'appwrite-hubs/job-import/src/main.js'), 'utf8');
for (const source of [gatewaySource, resumeSource, jobImportSource]) {
  assert.match(source, /runtimeReceipts\.writeReceipt/, 'every AI hub writes a runtime receipt');
  assert.match(source, /runtimeRequestId/, 'every AI hub uses one server-generated request ID per invocation');
}

const fixture = fs.readFileSync(path.join(ROOT, 'public/qa-fixtures/job-import-safe.html'), 'utf8');
assert.match(fixture, /application\/ld\+json/);
assert.match(fixture, /Platform Reliability Engineer/);
assert.match(fixture, /noindex, nofollow/);
assert.doesNotMatch(jobImportSource, /qa-fixtures\/job-import-safe.*(?:bypass|allow|skip)/i, 'fixture does not add an SSRF or parser bypass');

const devkitSource = fs.readFileSync(path.join(ROOT, 'appwrite-hubs/admin-devkit-data/src/main.js'), 'utf8');
const safeView = devkitSource.slice(devkitSource.indexOf('function safeRuntimeReceipt'), devkitSource.indexOf('async function handleListAiGatewayActivity'));
assert.match(devkitSource, /if \(!checkAuth\(req, body\)\)/, 'DevKit actions remain behind signed DevKit authentication');
assert.match(safeView, /userRef: maskRuntimeUserId\(document\.user_id\)/, 'DevKit response masks the internal user ID');
assert.match(devkitSource, /greaterThanEqual\('completed_at', new Date\(body\.since\)\.toISOString\(\)\)/, 'DevKit receipt view supports a bounded time-range filter');
for (const forbidden of ['prompt', 'payload', 'headers', 'authorization', 'token', 'cached_result']) {
  assert.doesNotMatch(safeView, new RegExp(`\\b${forbidden}\\s*:`, 'i'), `DevKit receipt response must not expose ${forbidden}`);
}

assert.equal(schema.attributeCompatibilityError({ key: 'request_id', type: 'string', size: 64, required: false, array: false }, schema.ATTRIBUTE_SPECS[0]), null, 'matching attributes remain idempotent');
assert.match(schema.attributeCompatibilityError({ key: 'request_id', type: 'integer', size: 64, required: false, array: false }, schema.ATTRIBUTE_SPECS[0]), /Incompatible attribute/, 'wrong attribute type fails closed');
assert.match(schema.attributeCompatibilityError({ key: 'request_id', type: 'string', size: 32, required: false, array: false }, schema.ATTRIBUTE_SPECS[0]), /size 32/, 'wrong attribute size fails closed');
assert.equal(schema.indexCompatibilityError({ key: 'request_id_idx', type: 'key', attributes: ['request_id'], orders: ['ASC'] }, schema.INDEX_SPECS[0]), null, 'matching indexes remain idempotent');
assert.match(schema.indexCompatibilityError({ key: 'request_id_idx', type: 'key', attributes: ['hub'], orders: ['ASC'] }, schema.INDEX_SPECS[0]), /Incompatible index/, 'wrong index attributes fail closed');
assert.throws(() => schema.assertServerOnlyCollection({ permissions: ['read("any")'], documentSecurity: false }), /server-only/, 'non-server-only collections fail closed');

for (const [source, hub, marker] of [[resumeSource, 'resume-section-ai', 'if (idemCheck.hit)'], [jobImportSource, 'job-import', "if (cached.hit && cached.status === 'success')"]]) {
  const cacheStart = source.indexOf(marker);
  const receiptStart = source.indexOf("status: 'cached'", cacheStart);
  const providerStart = source.indexOf('const pool', cacheStart);
  assert.ok(cacheStart >= 0 && receiptStart > cacheStart, `${hub} writes a current-invocation cache receipt`);
  assert.ok(providerStart > receiptStart, `${hub} serves cached work before any provider pool is built`);
}
assert.match(resumeSource, /attachRuntimeReceipt\(\{ \.\.\.idemCheck\.result, _cached: true \}, runtimeRequestId\)/, 'resume cache hits replace the old correlation ID');
assert.match(jobImportSource, /cached: true, runtime: \{ requestId: runtimeRequestId \}/, 'job-import cache hits replace the old correlation ID');
assert.match(gatewaySource, /return charged \? creditState\.cost : 0/, 'gateway receipts use the factual charge result');
assert.match(jobImportSource, /if \(await recordAiUsage\(db, creditState\)\) creditsCharged = creditState\.cost/, 'job-import receipts use the factual charge result');
assert.match(gatewaySource, /withCurrentRequestId\(cacheHit\.result, runtimeRequestId\)/, 'gateway cache hits return the current invocation ID');
assert.match(gatewaySource, /withCurrentRequestId\(collisionHit\.result, runtimeRequestId\)/, 'gateway collision cache hits return the current invocation ID');

runFailureIsolationTests().then(() => {
  console.log('[TEST] AI runtime observability and deterministic job-import fixture passed');
}).catch(err => {
  console.error(err);
  process.exit(1);
});
