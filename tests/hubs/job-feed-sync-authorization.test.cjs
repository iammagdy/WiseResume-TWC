const assert = require('node:assert/strict');
const test = require('node:test');

const handler = require('../../appwrite-hubs/job-feed-sync/src/main.js');

test('permission probe returns before feed or database side effects', async () => {
  let logCalls = 0;
  let errorCalls = 0;
  const expected = { ok: true, probe: true };

  const result = await handler({
    req: { body: JSON.stringify({ action: 'permission-probe' }) },
    res: { json: value => value },
    log: () => { logCalls += 1; },
    error: () => { errorCalls += 1; },
  });

  assert.deepEqual(result, expected);
  assert.equal(logCalls, 0);
  assert.equal(errorCalls, 0);
});

test('permission probe matcher rejects malformed or unrelated payloads', () => {
  assert.equal(handler.__test.isPermissionProbe({ body: '{' }), false);
  assert.equal(handler.__test.isPermissionProbe({ body: { action: 'sync' } }), false);
  assert.equal(handler.__test.isPermissionProbe({ body: { action: 'permission-probe' } }), true);
});
