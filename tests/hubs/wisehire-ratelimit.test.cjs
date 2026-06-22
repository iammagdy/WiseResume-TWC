// Regression test for P2-4 / P2-5: the wisehire-gateway in-memory rate limiter
// throttles per key, and the client-IP extractor reads x-forwarded-for safely.
const assert = require('node:assert/strict');

// axios is a hub-only dependency not installed at the repo root; stub it so the
// module loads. The functions under test never call axios.
const Module = require('node:module');
const _origLoad = Module._load;
Module._load = function (request) {
  if (request === 'axios') return { get: async () => ({}), post: async () => ({}) };
  return _origLoad.apply(this, arguments);
};
const mod = require('../../appwrite-hubs/wisehire-gateway/src/main.js');
Module._load = _origLoad;

const t = mod._test;
assert.ok(t && typeof t.rateLimitExceeded === 'function', 'should expose rateLimitExceeded');

// Allows up to `max`, then blocks. Use a unique key to avoid cross-test state.
const key = `test-${process.pid}-${Math.floor(performance.now())}`;
let blockedCount = 0;
for (let i = 0; i < 5; i++) {
  if (t.rateLimitExceeded(key, 5, 60_000)) blockedCount++;
}
assert.equal(blockedCount, 0, 'first 5 within the window are allowed');
assert.equal(t.rateLimitExceeded(key, 5, 60_000), true, '6th request is blocked');

// Independent keys do not interfere.
assert.equal(t.rateLimitExceeded(`${key}-other`, 5, 60_000), false, 'distinct key is independent');

// clientIpFrom: takes the first x-forwarded-for entry, falls back sensibly.
assert.equal(t.clientIpFrom({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } }), '1.2.3.4');
assert.equal(t.clientIpFrom({ headers: { 'x-real-ip': '9.9.9.9' } }), '9.9.9.9');
assert.equal(t.clientIpFrom({ headers: {} }), 'unknown');

console.log('[TEST] wisehire rate limit + client IP verified');
