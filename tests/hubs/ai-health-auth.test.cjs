// Regression test for P2-2: ai-health must require an authenticated Appwrite
// user session. Anonymous → 401; valid user JWT → 200 with the unchanged
// response shape. Uses a stubbed global.fetch so no real network calls happen.
const assert = require('node:assert/strict');

const handler = require('../../appwrite-hubs/ai-health/src/main.js');

function mockRes() {
  return {
    _status: 200,
    _data: null,
    json(data, status = 200) { this._data = data; this._status = status; return data; },
  };
}

const origFetch = global.fetch;

(async () => {
  // 1. Anonymous (no JWT) → 401, and /account is never even called.
  let accountCalls = 0;
  global.fetch = async (url) => {
    if (String(url).includes('/account')) accountCalls++;
    return { status: 200 };
  };
  let res = mockRes();
  await handler({ req: { body: JSON.stringify({ __headers: {} }) }, res, log() {} });
  assert.equal(res._status, 401, 'anonymous request is blocked with 401');
  assert.equal(accountCalls, 0, 'no /account validation attempted without a JWT');

  // 2. Valid user JWT (/account → 200) → 200 with unchanged response shape.
  global.fetch = async (url) => {
    if (String(url).includes('/account')) return { status: 200 };
    return { status: 500 }; // provider probes (none run without configured keys)
  };
  res = mockRes();
  await handler({
    req: { body: JSON.stringify({ __headers: { 'X-Appwrite-JWT': 'valid.jwt.token' } }) },
    res,
    log() {},
  });
  assert.equal(res._status, 200, 'authenticated request is allowed');
  assert.ok(res._data && typeof res._data === 'object', 'returns a body');
  assert.equal(typeof res._data.status, 'string', 'shape: status');
  assert.ok('timestamp' in res._data, 'shape: timestamp');
  assert.ok(Array.isArray(res._data.providers), 'shape: providers array');
  assert.ok('latencyMs' in res._data, 'shape: latencyMs');
  assert.ok(!('error' in res._data), 'no error field on success');

  // 3. Invalid/expired JWT (/account → 401) → 401.
  global.fetch = async (url) => {
    if (String(url).includes('/account')) return { status: 401 };
    return { status: 500 };
  };
  res = mockRes();
  await handler({
    req: { body: JSON.stringify({ __headers: { 'X-Appwrite-JWT': 'bad' } }) },
    res,
    log() {},
  });
  assert.equal(res._status, 401, 'invalid JWT is rejected with 401');

  global.fetch = origFetch;
  console.log('[TEST] ai-health authenticated-user-only verified');
})().catch((err) => {
  global.fetch = origFetch;
  console.error(err);
  process.exit(1);
});
