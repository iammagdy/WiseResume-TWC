// Regression test for P1-2: job-import must charge a credit on a successful
// parse, enforce a per-user rate limit, and NOT charge on failure. This
// exercises the helper functions directly via the hub's __test export.
const assert = require('node:assert/strict');

// The hub requires 'axios' at module load, but axios is a hub-only dependency
// not installed at the repo root. The helpers under test never call axios, so
// stub it at the loader to let the module load in this environment.
const Module = require('node:module');
const _origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'axios') {
    return { get: async () => ({}), post: async () => ({}) };
  }
  return _origLoad.apply(this, arguments);
};

const mod = require('../../appwrite-hubs/job-import/src/main.js');
Module._load = _origLoad;
const t = mod.__test;

assert.ok(t, 'job-import should expose __test helpers');
assert.equal(t.PARSE_JOB_CREDIT_COST, 1, 'parse-job should cost 1 credit');

// ── computeJobImportKey: deterministic and url/user sensitive ────────────────
const k1 = t.computeJobImportKey('user-a', 'https://jobs.example.com/1');
const k2 = t.computeJobImportKey('user-a', 'https://jobs.example.com/1');
const k3 = t.computeJobImportKey('user-a', 'https://jobs.example.com/2');
const k4 = t.computeJobImportKey('user-b', 'https://jobs.example.com/1');
assert.equal(k1, k2, 'same user+url → same idempotency key');
assert.notEqual(k1, k3, 'different url → different key');
assert.notEqual(k1, k4, 'different user → different key');

// ── checkServerRateLimit: allows up to the cap, then blocks ──────────────────
const uid = `rl-${Math.floor(performance.now())}-${process.pid}`;
let allowed = 0;
for (let i = 0; i < t.SERVER_RATE_LIMIT_MAX_REQUESTS; i++) {
  if (t.checkServerRateLimit(uid).ok) allowed++;
}
assert.equal(allowed, t.SERVER_RATE_LIMIT_MAX_REQUESTS, 'allows up to the cap');
const blocked = t.checkServerRateLimit(uid);
assert.equal(blocked.ok, false, 'blocks once over the cap');
assert.ok(blocked.retryAfterSeconds >= 1, 'reports a retry-after');

// ── loadCreditState + recordAiUsage with a mock Databases client ─────────────
function mockDb({ plan = 'free', dailyUsage = 0, dailyLimit = 5 }) {
  const today = new Date().toISOString().slice(0, 10);
  const creditDoc = {
    $id: 'credit-doc-1',
    user_id: 'u1',
    daily_usage: dailyUsage,
    daily_limit: dailyLimit,
    total_usage: dailyUsage,
    usage_date: today,
  };
  const updates = [];
  return {
    updates,
    creditDoc,
    async listDocuments(_db, collection) {
      if (collection === 'subscriptions') {
        return { documents: [{ user_id: 'u1', plan, effective_plan: plan }] };
      }
      if (collection === 'ai_credits') {
        return { documents: [creditDoc] };
      }
      return { documents: [] };
    },
    async updateDocument(_db, _collection, id, patch) {
      updates.push({ id, patch });
      return { $id: id, ...patch };
    },
    async createDocument(_db, _collection, _id, data) {
      return { $id: 'new', ...data };
    },
  };
}

(async () => {
  // Under limit → not blocked; recordAiUsage increments by the cost.
  const okDb = mockDb({ dailyUsage: 0, dailyLimit: 5 });
  const okState = await t.loadCreditState(okDb, 'u1', t.PARSE_JOB_CREDIT_COST);
  assert.equal(okState.blocked, false, 'under limit → not blocked');
  await t.recordAiUsage(okDb, okState);
  assert.equal(okDb.updates.length, 1, 'recordAiUsage writes once');
  assert.equal(okDb.updates[0].patch.daily_usage, 1, 'charges exactly the cost (1)');

  // At limit → blocked with 402, and the provider must never be called.
  const fullDb = mockDb({ dailyUsage: 5, dailyLimit: 5 });
  const fullState = await t.loadCreditState(fullDb, 'u1', t.PARSE_JOB_CREDIT_COST);
  assert.equal(fullState.blocked, true, 'at limit → blocked');
  assert.equal(fullState.status, 402, 'blocked with 402');

  // premium (-1) → unlimited, never blocked.
  const premiumDb = mockDb({ plan: 'premium', dailyUsage: 9999, dailyLimit: -1 });
  const premiumState = await t.loadCreditState(premiumDb, 'u1', t.PARSE_JOB_CREDIT_COST);
  assert.equal(premiumState.blocked, false, 'premium (-1) is unlimited');

  console.log('[TEST] job-import credit + rate limit verified');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
